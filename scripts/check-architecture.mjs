import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';

import { getWorkspaceApplications, readWorkspaceConfig } from './workspace-config.mjs';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.vue', '.js', '.mjs', '.cjs']);
const IGNORED_DIRECTORIES = new Set(['node_modules', 'dist', 'coverage', '.turbo', '.rsbuild', '.rstest', 'generated']);
const WORKSPACE_ROOT = resolve(import.meta.dirname, '..');
const workspaceApplications = getWorkspaceApplications(readWorkspaceConfig(WORKSPACE_ROOT));

const getImportSpecifiers = (source) => {
  const specifiers = [];
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  patterns.forEach((pattern) => {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  });

  return specifiers;
};

const getSourceFiles = (directory) => {
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];

  readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        return;
      }

      files.push(...getSourceFiles(entryPath));
      return;
    }

    if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
      files.push(entryPath);
    }
  });

  return files;
};

const getFiles = (directory) => {
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];

  readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        return;
      }

      files.push(...getFiles(entryPath));
      return;
    }

    files.push(entryPath);
  });

  return files;
};

const getWorkspacePath = (filePath) => relative(WORKSPACE_ROOT, filePath).split(sep).join('/');

const importsWebDirectory = (specifier, directories) => {
  return directories.some((directory) => specifier === `@/${directory}` || specifier.startsWith(`@/${directory}/`));
};

const violations = [];

const reportViolation = (filePath, specifier, reason) => {
  violations.push(`${getWorkspacePath(filePath)} -> ${specifier}: ${reason}`);
};

const webApplicationRoots = workspaceApplications
  .filter((application) => application.kind === 'web')
  .map((application) => ({
    name: application.name,
    sourceRoot: join(WORKSPACE_ROOT, application.path, 'src'),
    prefix: `${application.path}/src/`,
  }));

webApplicationRoots.forEach(({ prefix, sourceRoot }) => {
  getSourceFiles(sourceRoot).forEach((filePath) => {
    const workspacePath = getWorkspacePath(filePath);
    const source = readFileSync(filePath, 'utf8');
    const specifiers = getImportSpecifiers(source);

    if (workspacePath.includes('/hooks/')) {
      violations.push(`${workspacePath}: Vue 组合式逻辑目录统一命名为 composables，禁止创建 hooks`);
    }

    if (workspacePath === `${prefix}setup.ts`) {
      violations.push(`${workspacePath}: 应用启动装配统一维护在 bootstrap 目录，禁止创建根 setup.ts`);
    }

    specifiers.forEach((specifier) => {
      if (specifier === '@repo/database' || specifier.startsWith('@repo/database/')) {
        reportViolation(filePath, specifier, '浏览器应用不得依赖 Prisma 或数据库包');
      }

      if (specifier.startsWith('@/navigation/') || specifier.startsWith('@/feedback/')) {
        reportViolation(filePath, specifier, 'navigation 与 feedback 必须从目录 barrel 入口导入');
      }

      if (workspacePath.startsWith(`${prefix}utils/`)) {
        const forbiddenPackages = ['vue', 'vue-router', 'pinia', '@lucide/vue'];
        const forbiddenDirectories = [
          'api',
          'components',
          'feedback',
          'navigation',
          'router',
          'services',
          'stores',
          'views',
        ];
        if (forbiddenPackages.includes(specifier) || importsWebDirectory(specifier, forbiddenDirectories)) {
          reportViolation(filePath, specifier, 'utils 只能保存与框架、运行环境和业务无关的纯工具');
        }
      }

      if (workspacePath.startsWith(`${prefix}services/`)) {
        const forbiddenPackages = ['vue', 'vue-router', 'pinia', '@lucide/vue'];
        const forbiddenDirectories = ['components', 'feedback', 'router', 'stores', 'views'];
        if (forbiddenPackages.includes(specifier) || importsWebDirectory(specifier, forbiddenDirectories)) {
          reportViolation(filePath, specifier, 'services 必须通过注入协议使用 UI、Router 和 Store');
        }
      }

      if (workspacePath.startsWith(`${prefix}components/base/`)) {
        const forbiddenDirectories = ['api', 'navigation', 'router', 'stores', 'views'];
        if (importsWebDirectory(specifier, forbiddenDirectories)) {
          reportViolation(filePath, specifier, '基础组件不得依赖业务接口、导航、路由或业务状态');
        }
      }

      if (workspacePath.startsWith(`${prefix}composables/`) && importsWebDirectory(specifier, ['api'])) {
        reportViolation(filePath, specifier, '调用业务接口的 Composable 应放到对应页面附近');
      }
    });
  });
});

const serverApplicationRoots = workspaceApplications
  .filter((application) => application.kind === 'server')
  .map((application) => join(WORKSPACE_ROOT, application.path, 'src'));

serverApplicationRoots.forEach((serverSourceRoot) => {
  getSourceFiles(serverSourceRoot).forEach((filePath) => {
    getImportSpecifiers(readFileSync(filePath, 'utf8')).forEach((specifier) => {
      if (
        specifier === '@repo/shared' ||
        specifier === '@repo/shared/utils' ||
        specifier.startsWith('@repo/shared/utils/')
      ) {
        reportViolation(filePath, specifier, 'NestJS 服务只能从 @repo/shared/types 导入跨端类型');
      }

      if (specifier === '@repo/charts' || specifier.startsWith('@repo/charts/')) {
        reportViolation(filePath, specifier, 'NestJS 服务不得导入浏览器图表包 @repo/charts');
      }
    });
  });
});

const packagesRoot = join(WORKSPACE_ROOT, 'packages');
getFiles(packagesRoot).forEach((filePath) => {
  const workspacePath = getWorkspacePath(filePath);
  if (/(?:\.d\.ts|\.d\.ts\.map|\.js|\.js\.map)$/.test(workspacePath)) {
    violations.push(`${workspacePath}: packages 手写目录禁止出现 TypeScript 编译产物，构建结果只能写入 dist`);
  }
});

getSourceFiles(packagesRoot).forEach((filePath) => {
  getImportSpecifiers(readFileSync(filePath, 'utf8')).forEach((specifier) => {
    if (specifier.startsWith('@/') || specifier.startsWith('apps/')) {
      reportViolation(filePath, specifier, 'packages 不得反向依赖任何应用源码');
    }
  });
});

if (violations.length) {
  console.error('架构边界检查失败：');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exitCode = 1;
} else {
  console.log('架构边界检查通过。');
}
