import { defineConfig } from '@rsbuild/core';
import { mergeRsbuildConfig } from '@rsbuild/core';
import { pluginImageCompress } from '@rsbuild/plugin-image-compress';
import CompressionPlugin from 'compression-webpack-plugin';

import { getBaseConfig } from './rsbuild.base.config';
import { loadAppEnv } from './runtime/env';

import type { RsbuildConfig } from '@rsbuild/core';

/**
 * 创建生产构建配置
 *
 * 在共享配置之上配置拆包、CSS 路径、图片压缩和 gzip 预压缩。
 * 生产环境关闭自动 polyfill，浏览器兼容范围由项目运行要求统一控制。
 */
export default defineConfig(({ envMode }) => {
  const prodConf: RsbuildConfig = {
    /**
     * 让 Rspack 按依赖关系复用入口和异步 chunk 的公共模块。
     */
    splitChunks: {
      preset: 'none',
      chunks: 'all',
    },

    /**
     * CSS 抽取和静态资源预压缩
     *
     * 服务器可直接返回同路径的 `.gz` 文件，避免运行时重复压缩；小于 10KB 或压缩收益不足的资源不会生成副本。
     */
    tools: {
      cssExtract: {
        loaderOptions: {
          /**
           * CSS 独立输出到 css/ 目录，需要回退一级才能正确引用图片和字体
           */
          publicPath: '../',
        },
        pluginOptions: {
          ignoreOrder: true,
        },
      },
      rspack: {
        plugins: [
          new CompressionPlugin({
            test: /\.(js|css)$/,
            filename: '[path][base].gz',
            algorithm: 'gzip',
            threshold: 10240,
            minRatio: 0.8,
          }),
        ],
      },
    },

    plugins: [pluginImageCompress()],

    /**
     * 关闭构建工具自动 polyfill，避免向现代浏览器产物注入未评估的兼容代码。
     */
    output: {
      polyfill: 'off',
    },
  };

  const baseConf: RsbuildConfig = getBaseConfig(loadAppEnv(envMode));
  const config: RsbuildConfig = mergeRsbuildConfig(baseConf, prodConf);

  return config;
});
