/**
 * 验证 pnpm setup 是否完成 SnapBug 数据库结构与默认超管初始化
 */

import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

import pg from 'pg';

const { Client } = pg;
const localEnvPath = new URL('../apps/api/.env.development', import.meta.url);

if (!process.env.DATABASE_URL && existsSync(localEnvPath)) {
  loadEnvFile(localEnvPath);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('verify:setup 需要注入 DATABASE_URL，或先执行 pnpm setup 生成本地服务端配置。');
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();

  const adminResult = await client.query(`
    SELECT account, role
    FROM users
    WHERE role = 'ADMIN'
  `);
  if (adminResult.rowCount < 1) {
    throw new Error('未找到 role = ADMIN 的超级管理员记录。');
  }

  const tablesResult = await client.query(`
    SELECT to_regclass('public.users') AS users,
           to_regclass('public.projects') AS projects,
           to_regclass('public.project_members') AS project_members,
           to_regclass('public.bugs') AS bugs,
           to_regclass('public.bug_attachments') AS bug_attachments,
           to_regclass('public.bug_activities') AS bug_activities,
           to_regclass('public.notifications') AS notifications,
           to_regclass('public.notes') AS notes,
           to_regclass('public.plans') AS plans,
           to_regclass('public.bug_code_seq') AS bug_code_seq
  `);
  const tables = tablesResult.rows[0];
  const missingTables = Object.entries(tables ?? {})
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingTables.length > 0) {
    throw new Error(`核心表结构或序列未完整创建，缺失：${missingTables.join('、')}`);
  }

  process.stdout.write('Setup 验证通过：9 张核心表、bug_code_seq 序列与默认超级管理员均已就绪。\n');
} finally {
  await client.end().catch(() => undefined);
}
