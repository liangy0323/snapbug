import js from '@eslint/js';
import prettier from '@vue/eslint-config-prettier';
import { globalIgnores } from 'eslint/config';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import tseslint from 'typescript-eslint';

import { getWorkspaceApplications, readWorkspaceConfig } from './scripts/workspace-config.mjs';

/**
 * 从自动导入声明文件中提取全局变量名
 *
 * Rsbuild 的 unplugin-auto-import 会把 Vue、Vue Router 与 Pinia API 写入
 * `auto-imports.d.ts`。ESLint 不读取该声明，这里解析出变量名注册为全局只读，避免源码中的
 * 自动导入被误报为 undefined。
 *
 * @param dtsPath 自动导入声明文件的绝对路径
 * @returns 变量名到 readonly 的映射；文件不存在时返回空对象
 */
const createAutoImportGlobals = (dtsPath) => {
  if (!existsSync(dtsPath)) {
    return {};
  }

  const autoImportDts = readFileSync(dtsPath, 'utf-8');
  const names = [...autoImportDts.matchAll(/^\s*const\s+([A-Za-z_$][\w$]*)\s*:/gm)].map((match) => match[1]);

  return Object.fromEntries(names.map((name) => [name, 'readonly']));
};

/**
 * Web 应用自动导入的全局变量
 */
const webVueAutoImportGlobals = createAutoImportGlobals(join(import.meta.dirname, 'apps/web/auto-imports.d.ts'));

/**
 * 配置表中所有 NestJS 服务的源码范围
 */
const serverSourceGlobs = getWorkspaceApplications(readWorkspaceConfig(import.meta.dirname))
  .filter((app) => app.kind === 'server')
  .map((app) => `${app.path}/src/**/*.ts`);

/**
 * SnapBug 仓库级 ESLint 扁平配置
 */
export default tseslint.config(
  globalIgnores([
    '**/dist/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/.turbo/**',
    '**/.rsbuild/**',
    '**/.rstest/**',
    'packages/database/generated/prisma/**',
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettier,
  {
    files: ['**/*.{ts,tsx,vue,mjs,cjs}'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'vue/no-mutating-props': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...webVueAutoImportGlobals,
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'vue',
              allowTypeImports: true,
              message: 'Vue 运行时 API 必须使用自动导入；仅允许 import type。',
            },
            {
              name: 'pinia',
              allowTypeImports: true,
              message: 'Pinia 运行时 API 必须使用自动导入；仅允许 import type。',
            },
            {
              name: 'vue-router',
              importNames: ['onBeforeRouteLeave', 'onBeforeRouteUpdate', 'useLink', 'useRoute', 'useRouter'],
              message: 'Vue Router Composable 必须使用自动导入。',
            },
          ],
        },
      ],
    },
  },
  /**
   * 入口文件显式调用 createApp 等挂载 API
   */
  {
    files: ['apps/web/src/index.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  /**
   * Service Worker 模板运行在 WorkerGlobalScope
   */
  {
    files: ['apps/web/build/runtime/offline/sw-template.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    files: [
      ...serverSourceGlobs,
      'apps/web/build/**/*.ts',
      'apps/web/tests/**/*.ts',
      'packages/*/src/**/*.ts',
      'packages/*/*.ts',
      'scripts/**/*.{js,mjs,cjs}',
      '*.{js,mjs,cjs,ts}',
      'apps/*/*.{js,mjs,cjs,ts}',
      'packages/*/*.{js,mjs,cjs,ts}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
