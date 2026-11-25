/**
 * SnapBug 开发环境初始化脚本
 *
 * 负责同步 Web 开发配置中的 API 地址、收集 PostgreSQL 本地凭据、启动 Compose 数据库、幂等创建目标数据库，
 * 生成不会提交到 Git 的 apps/api/.env.development、执行 Prisma migration，并初始化默认超级管理员账号。
 */

import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cancel, confirm, intro, isCancel, log, outro, password, text } from '@clack/prompts';
import pg from 'pg';

import { getWorkspaceApplications, readWorkspaceConfig } from './workspace-config.mjs';

const { Client } = pg;

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDirectory, '..');
const workspaceApplications = getWorkspaceApplications(readWorkspaceConfig(repoRoot));
const webApplication = workspaceApplications.find((app) => app.kind === 'web' && app.name === 'web');
const apiApplication = workspaceApplications.find((app) => app.kind === 'server' && app.name === 'api');

if (!webApplication || !apiApplication) {
  throw new Error('workspace.config.json 必须注册 web 与 api，才能初始化完整本地环境。');
}

const webDirectory = resolve(repoRoot, webApplication.path);
const apiDirectory = resolve(repoRoot, apiApplication.path);
const webDevelopmentPath = resolve(webDirectory, '.env.development');
const apiDevelopmentPath = resolve(apiDirectory, '.env.development');

const POSTGRES_HOST = '127.0.0.1';
const POSTGRES_PORT = 5432;
const POSTGRES_USER = 'postgres';
const DEFAULT_DATABASE_NAME = 'snapbug';
const SETUP_DATABASE_PASSWORD_ENV = 'SETUP_DATABASE_PASSWORD';
const SETUP_DATABASE_NAME_ENV = 'SETUP_DATABASE_NAME';
const SETUP_ADMIN_PASSWORD_ENV = 'SETUP_ADMIN_PASSWORD';
const isNonInteractive = process.argv.includes('--non-interactive');

const DEFAULT_ADMIN_ACCOUNT = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const DATABASE_READY_TIMEOUT_MS = 30_000;

const printHelp = () => {
  process.stdout.write(`SnapBug 本地环境初始化\n\n`);
  process.stdout.write(
    `  pnpm setup                    同步 Web 开发 API 地址，创建服务端本地配置、数据库、表结构和默认超管\n`,
  );
  process.stdout.write(`  pnpm setup --non-interactive  使用环境变量执行同一套初始化流程\n\n`);
  process.stdout.write(`非交互模式环境变量：\n`);
  process.stdout.write(`  ${SETUP_DATABASE_PASSWORD_ENV}    PostgreSQL postgres 用户密码（必填）\n`);
  process.stdout.write(`  ${SETUP_DATABASE_NAME_ENV}        数据库名称，默认 ${DEFAULT_DATABASE_NAME}\n`);
  process.stdout.write(`  ${SETUP_ADMIN_PASSWORD_ENV}       默认超管 admin 密码，默认 ${DEFAULT_ADMIN_PASSWORD}\n`);
};

const isDockerComposeAvailable = () => {
  const result = spawnSync('docker', ['compose', 'version'], {
    cwd: repoRoot,
    stdio: 'ignore',
    windowsHide: true,
  });

  return result.status === 0;
};

const isPostgresPortOpen = () => {
  return new Promise((resolvePromise) => {
    const socket = createConnection({ host: POSTGRES_HOST, port: POSTGRES_PORT });
    let settled = false;

    const settle = (isOpen) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolvePromise(isOpen);
    };

    socket.setTimeout(500);
    socket.once('connect', () => settle(true));
    socket.once('timeout', () => settle(false));
    socket.once('error', () => settle(false));
  });
};

const runCommand = (command, args, env) => {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env,
      shell: false,
      stdio: 'inherit',
      windowsHide: true,
    });

    child.once('error', rejectPromise);
    child.once('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} 执行失败，退出码 ${code ?? 1}。`));
    });
  });
};

const runPnpmCommand = (args, env) => {
  const lifecyclePnpmCliPath = process.env.npm_execpath;
  if (lifecyclePnpmCliPath) {
    return runCommand(process.execPath, [lifecyclePnpmCliPath, ...args], env);
  }

  if (process.platform === 'win32') {
    const adjacentPnpmCliPath = resolve(dirname(process.execPath), 'node_modules/pnpm/bin/pnpm.mjs');
    if (!existsSync(adjacentPnpmCliPath)) {
      throw new Error('无法定位 pnpm CLI，请使用 pnpm setup 运行初始化脚本。');
    }

    return runCommand(process.execPath, [adjacentPnpmCliPath, ...args], env);
  }

  return runCommand('pnpm', args, env);
};

const syncWebDevelopmentApiPort = () => {
  if (!existsSync(webDevelopmentPath)) {
    throw new Error('缺少 apps/web/.env.development，请恢复仓库中的 Web development 配置。');
  }

  const expectedApiBaseUrl = `http://127.0.0.1:${apiApplication.localPort}/api`;
  const currentContent = readFileSync(webDevelopmentPath, 'utf-8');
  const apiBaseUrlPattern = /^API_BASE_URL=.*$/m;
  const currentApiBaseUrl = currentContent.match(apiBaseUrlPattern)?.[0];

  if (currentApiBaseUrl === `API_BASE_URL=${expectedApiBaseUrl}`) {
    return false;
  }

  const nextContent = apiBaseUrlPattern.test(currentContent)
    ? currentContent.replace(apiBaseUrlPattern, `API_BASE_URL=${expectedApiBaseUrl}`)
    : `${currentContent.trimEnd()}\nAPI_BASE_URL=${expectedApiBaseUrl}\n`;
  writeFileSync(webDevelopmentPath, nextContent, 'utf-8');
  return true;
};

const writeApiDevelopmentEnv = (databaseUrl, jwtSecret) => {
  const webLocalPort = webApplication.localPort;
  const apiDevelopmentEnv = [
    '# SnapBug API 本地开发环境配置，由 pnpm setup 生成。',
    `DATABASE_URL="${databaseUrl}"`,
    `CORS_ORIGINS="http://localhost:${webLocalPort},http://127.0.0.1:${webLocalPort}"`,
    `JWT_SECRET="${jwtSecret}"`,
    'JWT_EXPIRES_IN="7d"',
    '',
  ].join('\n');

  writeFileSync(apiDevelopmentPath, apiDevelopmentEnv, { encoding: 'utf-8', mode: 0o600 });
};

const delay = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

const connectToPostgres = async (databasePassword) => {
  const deadline = Date.now() + DATABASE_READY_TIMEOUT_MS;
  let lastError;

  while (Date.now() < deadline) {
    const client = new Client({
      host: POSTGRES_HOST,
      port: POSTGRES_PORT,
      user: POSTGRES_USER,
      password: databasePassword,
      database: 'postgres',
      connectionTimeoutMillis: 2_000,
    });

    try {
      await client.connect();
      return client;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '28P01') {
        throw new Error('PostgreSQL 密码验证失败；已有数据卷需要输入创建该数据卷时使用的原密码。', {
          cause: error,
        });
      }

      lastError = error;
      await client.end().catch(() => undefined);
      await delay(500);
    }
  }

  const detail = lastError instanceof Error ? `：${lastError.message}` : '';
  throw new Error(`PostgreSQL 在 ${DATABASE_READY_TIMEOUT_MS / 1_000} 秒内未就绪${detail}`);
};

const ensureDatabaseExists = async (client, databaseName) => {
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if (result.rowCount > 0) {
    return false;
  }

  await client.query(`CREATE DATABASE "${databaseName}"`);
  return true;
};

const validateDatabasePassword = (value) => {
  if (!value) {
    return '数据库密码不能为空';
  }

  if (value.includes('\n') || value.includes('\r')) {
    return '数据库密码不能包含换行符';
  }

  return undefined;
};

const validateAdminPassword = (value) => {
  if (!value) {
    return '管理员初始密码不能为空';
  }

  if (value.length < 6 || value.length > 64) {
    return '管理员初始密码长度必须为 6 到 64 位';
  }

  if (value.includes('\n') || value.includes('\r')) {
    return '管理员初始密码不能包含换行符';
  }

  return undefined;
};

const normalizeDatabaseName = (value) => {
  const databaseName = value?.trim() || DEFAULT_DATABASE_NAME;
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(databaseName)) {
    throw new Error('数据库名只能包含字母、数字和下划线，且不能以数字开头');
  }

  return databaseName;
};

const readNonInteractiveSetupConfig = () => {
  const databasePassword = process.env[SETUP_DATABASE_PASSWORD_ENV];
  const passwordError = validateDatabasePassword(databasePassword);
  if (passwordError) {
    throw new Error(`${SETUP_DATABASE_PASSWORD_ENV}：${passwordError}`);
  }

  const adminPassword = process.env[SETUP_ADMIN_PASSWORD_ENV] || DEFAULT_ADMIN_PASSWORD;
  const adminPasswordError = validateAdminPassword(adminPassword);
  if (adminPasswordError) {
    throw new Error(`${SETUP_ADMIN_PASSWORD_ENV}：${adminPasswordError}`);
  }

  return {
    databaseName: normalizeDatabaseName(process.env[SETUP_DATABASE_NAME_ENV]),
    databasePassword,
    adminPassword,
  };
};

const promptForSetupConfig = async () => {
  const databasePassword = await password({
    message: '输入本地 PostgreSQL 的 postgres 用户密码',
    clearOnError: true,
    validate: validateDatabasePassword,
  });

  if (isCancel(databasePassword)) {
    return null;
  }

  const databaseName = await text({
    message: '输入本地数据库名称',
    initialValue: DEFAULT_DATABASE_NAME,
    defaultValue: DEFAULT_DATABASE_NAME,
    validate: (value) => {
      try {
        normalizeDatabaseName(value);
        return undefined;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    },
  });

  if (isCancel(databaseName)) {
    return null;
  }

  const adminPassword = await text({
    message: `设置默认超管 ${DEFAULT_ADMIN_ACCOUNT} 初始密码（直接回车使用 ${DEFAULT_ADMIN_PASSWORD}）`,
    initialValue: DEFAULT_ADMIN_PASSWORD,
    defaultValue: DEFAULT_ADMIN_PASSWORD,
    validate: validateAdminPassword,
  });

  if (isCancel(adminPassword)) {
    return null;
  }

  return {
    databaseName: normalizeDatabaseName(databaseName),
    databasePassword,
    adminPassword,
  };
};

const confirmLocalEnvOverwrite = async () => {
  if (!existsSync(apiDevelopmentPath)) {
    return true;
  }

  if (isNonInteractive) {
    throw new Error('非交互初始化拒绝覆盖已有 apps/api/.env.development，请先显式删除对应文件。');
  }

  log.warn('检测到已有 apps/api/.env.development，继续执行将会覆盖。');
  const shouldOverwrite = await confirm({
    message: '确认使用本次输入重新生成本地配置？',
    initialValue: false,
  });

  return isCancel(shouldOverwrite) ? null : shouldOverwrite;
};

const main = async () => {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }

  intro('SnapBug 本地环境初始化');

  const shouldWriteEnv = await confirmLocalEnvOverwrite();
  if (!shouldWriteEnv) {
    cancel('未覆盖已有本地配置。');
    return;
  }

  const webDevelopmentUpdated = syncWebDevelopmentApiPort();
  log.info(
    webDevelopmentUpdated
      ? 'Web development 的 API 端口已根据 workspace.config.json 更新。'
      : 'Web development 的 API 端口与 workspace.config.json 一致。',
  );

  const setupConfig = isNonInteractive ? readNonInteractiveSetupConfig() : await promptForSetupConfig();
  if (!setupConfig) {
    cancel('已取消初始化。');
    return;
  }

  const { adminPassword, databaseName, databasePassword } = setupConfig;

  if (await isPostgresPortOpen()) {
    log.info('检测到本机 127.0.0.1:5432 已有 PostgreSQL 服务，将直接复用。');
  } else if (isDockerComposeAvailable()) {
    log.info('正在启动 Compose 中的 PostgreSQL...');
    await runCommand('docker', ['compose', 'up', '-d', 'postgres'], {
      ...process.env,
      POSTGRES_DB: databaseName,
      POSTGRES_USER,
      POSTGRES_PASSWORD: databasePassword,
      POSTGRES_PORT: String(POSTGRES_PORT),
    });
  } else {
    log.warn('未检测到本机 PostgreSQL 或 Docker Compose，将等待 127.0.0.1:5432 上的 PostgreSQL 启动。');
  }

  const client = await connectToPostgres(databasePassword);
  let databaseCreated;

  try {
    databaseCreated = await ensureDatabaseExists(client, databaseName);
  } finally {
    await client.end();
  }

  log.success(databaseCreated ? `数据库 ${databaseName} 已创建。` : `数据库 ${databaseName} 已存在，将继续初始化。`);

  const encodedPassword = encodeURIComponent(databasePassword);
  const encodedDatabaseName = encodeURIComponent(databaseName);
  const databaseUrl = `postgresql://${POSTGRES_USER}:${encodedPassword}@localhost:${POSTGRES_PORT}/${encodedDatabaseName}?schema=public`;
  const jwtSecret = randomBytes(32).toString('hex');
  writeApiDevelopmentEnv(databaseUrl, jwtSecret);
  log.success('apps/api/.env.development 已生成。');

  log.info('正在执行 Prisma migration，创建或更新全部表结构...');
  await runPnpmCommand(['--filter', '@repo/database', 'db:migrate'], {
    ...process.env,
    DATABASE_URL: databaseUrl,
  });

  log.info(`正在初始化默认超级管理员 ${DEFAULT_ADMIN_ACCOUNT}...`);
  await runPnpmCommand(['--filter', '@repo/database', 'db:seed'], {
    ...process.env,
    DATABASE_URL: databaseUrl,
    INIT_ADMIN_ACCOUNT: DEFAULT_ADMIN_ACCOUNT,
    INIT_ADMIN_PASSWORD: adminPassword,
  });

  log.success(`默认超管种子已执行：首次创建账号为 ${DEFAULT_ADMIN_ACCOUNT}，已有账号不会重置密码。`);
  outro('服务端环境、数据库、表结构和初始数据均已就绪，现在可以运行 pnpm dev。');
};

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  log.error(message);
  process.exitCode = 1;
});
