import { withRsbuildConfig } from '@rstest/adapter-rsbuild';
import { defineConfig } from '@rstest/core';
import { getBaseConfig } from './build/rsbuild.base.config';

/**
 * 复用应用的 Vue、Sass 和别名配置，使用独立产物目录运行 Node 单元测试。
 */
export default defineConfig({
  extends: withRsbuildConfig({
    config: getBaseConfig({ appEnv: 'test', apiBaseUrl: '', offlineCacheEnabled: false }),
    configPath: './build/rsbuild.base.config.ts',
  }),
  include: ['tests/unit/**/*.test.ts'],
  testEnvironment: 'node',
  output: { distPath: '.rstest' },
  source: {
    define: {
      'import.meta.env.DEV': JSON.stringify(false),
    },
  },
});
