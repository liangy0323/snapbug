import { pluginVue } from '@rsbuild/plugin-vue';
import { pluginSass } from '@rsbuild/plugin-sass';
import { resolve } from 'path';

import Components from 'unplugin-vue-components/rspack';
import AutoImport from 'unplugin-auto-import/rspack';

import { buildOfflineIntegration } from './runtime/offline';
import { createVersionPlugin } from './runtime/version';

import type { RsbuildConfig } from '@rsbuild/core';
import type { AppBuildEnv } from './runtime/env';

/**
 * 创建开发和生产共用的 Rsbuild 配置
 *
 * 负责加载并校验环境变量、定义浏览器入口和产物路径，并注册版本检测、离线缓存、
 * API 自动导入和基础组件自动导入能力。开发与生产配置在此基础上继续合并。
 *
 * @param env 应用的构建环境配置
 * @returns 可与开发或生产差异配置合并的 Rsbuild 公共配置
 */
export const getBaseConfig = (env: AppBuildEnv): RsbuildConfig => {
  /**
   * 默认部署在站点根路径，版本清单和 Worker 使用相同的路径前缀。
   */
  const assetPrefix = '/';
  const isDev: boolean = env.appEnv === 'development' || process.env.PLAYWRIGHT_TEST === '1';

  /**
   * 版本清单和 Service Worker 使用的部署基础路径
   */
  const basePath = assetPrefix.endsWith('/') ? assetPrefix : `${assetPrefix}/`;

  /**
   * test 和 production 构建按环境变量控制离线缓存，开发环境和 Playwright dev server 跳过集成。
   */
  const offlineIntegration = isDev
    ? null
    : buildOfflineIntegration(env.appEnv, assetPrefix, { enabled: env.offlineCacheEnabled });

  const config: RsbuildConfig = {
    /**
     * 浏览器入口与编译期变量
     *
     * 环境值由 `loadAppEnv` 加载后再注入浏览器源码。
     */
    source: {
      entry: {
        index: resolve(process.cwd(), './src/index.ts'),
      },
      // 应用启动时注册版本检查，此处只添加 Service Worker 的注册入口。
      preEntry: offlineIntegration?.preEntry ?? [],
      define: {
        'import.meta.env.APP_ENV': JSON.stringify(env.appEnv),
        'import.meta.env.OFFLINE_CACHE_ENABLED': JSON.stringify(!isDev && env.offlineCacheEnabled),
        'import.meta.env.API_BASE_URL': JSON.stringify(env.apiBaseUrl),
        __APP_VERSION_URL__: JSON.stringify(`${basePath}version.json`),
        __APP_VERSION_SW_SCOPE__: JSON.stringify(basePath),
        ...(offlineIntegration?.define ?? {}),
      },
    },

    /**
     * 构建产物目录与文件命名
     *
     * 开发环境使用稳定名称方便调试，部署产物使用内容 hash 支持长期缓存。
     */
    output: {
      assetPrefix,
      distPath: {
        root: resolve(process.cwd(), './dist'),
        css: 'css',
        cssAsync: 'css',
        js: 'js',
        jsAsync: 'js',
        font: 'font',
        image: 'images',
      },
      filenameHash: true,
      filename: {
        css: isDev ? '[name].css' : '[name]-[contenthash:8].css',
        js: isDev ? '[name].js' : '[name]-[contenthash:8].js',
        image: '[hash][ext][query]',
        font: '[name][ext]',
      },
    },

    /**
     * 应用源码的模块解析规则
     */
    resolve: {
      extensions: ['.vue', '.ts', '.js', '.mjs'],
      alias: {
        '@': resolve(process.cwd(), './src'),
      },
    },

    /**
     * Vue、Sass、离线缓存和版本产物插件
     */
    plugins: [
      pluginVue(),
      pluginSass(),
      ...(offlineIntegration ? [offlineIntegration.plugin] : []),
      createVersionPlugin(env.appEnv),
    ],

    /**
     * Rspack 自动导入能力
     */
    tools: {
      rspack: {
        plugins: [
          /**
           * 自动导入 Vue、Vue Router、Pinia 的运行时 API。
           * 生成的 `auto-imports.d.ts` 只由插件维护。
           */
          AutoImport({
            imports: ['vue', 'vue-router', 'pinia'],
            dts: resolve(process.cwd(), './auto-imports.d.ts'),
          }),

          /**
           * 自动扫描 `components/base` 基础组件。
           * 其他业务组件目录不进入全局扫描，调用方必须显式导入。
           */
          Components({
            dirs: [resolve(process.cwd(), './src/components/base')],
            dts: resolve(process.cwd(), './components.d.ts'),
          }),
        ],
      },
    },

    /**
     * HTML 模板与默认标题
     */
    html: {
      template: resolve(process.cwd(), './index.html'),
      title: 'SnapBug',
      favicon: resolve(process.cwd(), 'public/favicon.ico'),
    },
  };

  return config;
};
