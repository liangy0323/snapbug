import { defineConfig } from '@rsbuild/core';
import { mergeRsbuildConfig } from '@rsbuild/core';

import { getBaseConfig } from './rsbuild.base.config';
import { loadAppEnv } from './runtime/env';

import type { RsbuildConfig } from '@rsbuild/core';

/**
 * 创建开发环境配置
 *
 * 默认使用 Rsbuild 的开发端口，可用 `PORT` 或 CLI 的 `--port` 覆盖。
 */
export default defineConfig(({ envMode }) => {
  const port = Number(process.env.PORT ?? '8081');
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const devConf: RsbuildConfig = {
    server: {
      port,
      compress: false,
      open: process.env.PLAYWRIGHT_TEST !== '1',
    },
    dev: {
      hmr: true,
      progressBar: true,
      lazyCompilation: false,
    },
  };

  const baseConf: RsbuildConfig = getBaseConfig(loadAppEnv(envMode));
  const config: RsbuildConfig = mergeRsbuildConfig(baseConf, devConf);

  return config;
});
