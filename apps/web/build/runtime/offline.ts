import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import packageJson from '../../package.json' with { type: 'json' };

import type { RsbuildPlugin } from '@rsbuild/core';

/**
 * 应用离线缓存配置
 */
export interface OfflineCacheOptions {
  /**
   * 是否启用 Service Worker 离线缓存
   */
  enabled?: boolean;

  /**
   * 允许启用离线缓存的构建环境
   */
  env?: Array<AppEnv>;

  /**
   * Service Worker 的输出文件名
   */
  swFilename?: string;

  /**
   * 是否预缓存应用的 HTML 入口
   */
  precacheHtml?: boolean;

  /**
   * 是否预缓存图片、字体和站点图标等静态资产
   */
  precacheAssets?: boolean;

  /**
   * 新 Worker 安装完成后是否派发应用更新事件
   */
  notifyUpdateReady?: boolean;
}

/**
 * 已补齐默认值的离线缓存配置
 */
interface ResolvedOfflineOptions {
  /**
   * 是否启用离线缓存
   */
  enabled: boolean;

  /**
   * 允许启用的构建环境
   */
  env: Array<AppEnv>;

  /**
   * Service Worker 输出文件名
   */
  swFilename: string;

  /**
   * 是否预缓存 HTML
   */
  precacheHtml: boolean;

  /**
   * 是否预缓存静态资产
   */
  precacheAssets: boolean;

  /**
   * 是否通知前端存在新 Worker
   */
  notifyUpdateReady: boolean;
}

/**
 * Rsbuild 资产源码的最小读取协议
 */
interface AssetSource {
  /**
   * 读取当前资产内容
   */
  source: () => string | Buffer;
}

/**
 * Rsbuild 资产处理阶段需要使用的最小参数协议
 */
interface ProcessAssetsParams {
  /**
   * 当前构建已经生成的资产集合
   */
  assets: Record<string, AssetSource>;

  /**
   * 更新或新增构建资产的编译接口
   */
  compilation: {
    /**
     * 替换同名构建资产
     */
    updateAsset: (name: string, source: AssetSource) => void;

    /**
     * 新增构建资产
     */
    emitAsset: (name: string, source: AssetSource) => void;
  };

  /**
   * Rsbuild 提供的原始文本资产构造器
   */
  sources: {
    /**
     * 根据字符串创建构建资产
     */
    RawSource: new (content: string) => AssetSource;
  };
}

/**
 * 离线缓存使用的稳定应用名称和缓存前缀
 */
const APP_NAME = packageJson.name;

// 保留原 Worker 地址，让已注册的 Worker 更新后结束离线请求拦截。
const DISABLED_WORKER = `self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim().then(() => self.registration.unregister()));
});
`;

/**
 * 网络不可用且入口页面没有缓存时显示的兜底文档
 */
const OFFLINE_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>网络不可用</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #666;
        background: #f5f5f5;
      }
      strong {
        color: #087f5b;
        font-size: 18px;
      }
      p {
        margin: 10px 0 0;
        color: #999;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <strong>当前网络不可用</strong>
    <p>请检查网络连接后刷新页面</p>
  </body>
</html>
`;

/**
 * 合并离线缓存默认配置
 *
 * 默认关闭离线缓存，test 和 production 构建可以显式开启。
 *
 * @param offline 调用方传入的局部配置
 * @returns 字段完整的离线缓存配置
 */
const resolveOfflineOptions = (offline?: OfflineCacheOptions): ResolvedOfflineOptions => ({
  enabled: offline?.enabled ?? false,
  env: offline?.env ?? ['test', 'production'],
  swFilename: offline?.swFilename ?? 'sw.js',
  precacheHtml: offline?.precacheHtml ?? true,
  precacheAssets: offline?.precacheAssets ?? true,
  notifyUpdateReady: offline?.notifyUpdateReady ?? true,
});

/**
 * 将静态资源前缀转换为 Service Worker 可使用的路径作用域
 *
 * @param assetPrefix Rsbuild 输出资源前缀，可以是站点路径或完整 URL
 * @returns 以斜杠结尾的部署基础路径
 */
const normalizeBasePath = (assetPrefix: string): string => {
  if (!assetPrefix || assetPrefix === 'auto') {
    return '/';
  }

  try {
    const url = new URL(assetPrefix, 'https://localhost');
    const pathname = url.pathname || '/';
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  } catch {
    return assetPrefix.endsWith('/') ? assetPrefix : `${assetPrefix}/`;
  }
};

/**
 * 将构建资产名称转换为相对 Service Worker 作用域的路径
 *
 * @param assetName 构建资产名称
 * @returns 使用正斜杠且以 `./` 开头的资源路径
 */
const toScopePath = (assetName: string): string => `./${assetName.split('\\').join('/')}`;

/**
 * 新增或替换构建资产
 *
 * @param params 当前资产集合、编译接口和目标资产内容
 */
const upsertAsset = (params: {
  assets: Record<string, AssetSource>;
  compilation: ProcessAssetsParams['compilation'];
  sources: ProcessAssetsParams['sources'];
  name: string;
  content: string;
}): void => {
  const source = new params.sources.RawSource(params.content);
  if (params.assets[params.name]) {
    params.compilation.updateAsset(params.name, source);
  } else {
    params.compilation.emitAsset(params.name, source);
  }
  params.assets[params.name] = source;
};

/**
 * 创建离线缓存构建插件
 *
 * 开启时生成 `offline.html` 和 `sw.js`，并把最终 JS、CSS、入口 HTML 以及可选静态资产写入预缓存清单。
 * 关闭时在原 Worker 地址输出停用脚本。
 * gzip 副本、Service Worker 自身和业务接口响应不会进入预缓存。
 *
 * @param resolved 已补齐默认值的离线缓存配置
 * @returns 可注册到 Rsbuild 的离线缓存插件
 */
const createOfflinePlugin = (resolved: ResolvedOfflineOptions): RsbuildPlugin => {
  const documentAllowlist = ['./index.html'];

  return {
    name: `${APP_NAME}:offline-cache`,
    apply: 'build',
    setup(api) {
      api.processAssets({ stage: 'optimize-hash', targets: ['web'] }, (rawParams) => {
        const { assets, compilation, sources } = rawParams as unknown as ProcessAssetsParams;
        if (!resolved.enabled) {
          upsertAsset({ assets, compilation, sources, name: resolved.swFilename, content: DISABLED_WORKER });
          return;
        }

        upsertAsset({ assets, compilation, sources, name: 'offline.html', content: OFFLINE_HTML });

        const precacheSet = new Set<string>();
        Object.keys(assets).forEach((assetName) => {
          const scopePath = toScopePath(assetName);

          if (scopePath.endsWith('.gz') || scopePath === `./${resolved.swFilename}`) {
            return;
          }

          if (/\.(?:js|css)$/.test(scopePath)) {
            precacheSet.add(scopePath);
            return;
          }

          if (resolved.precacheAssets && /\.(?:png|jpe?g|gif|svg|webp|woff2?|ttf|eot|ico)$/.test(scopePath)) {
            precacheSet.add(scopePath);
            return;
          }

          if (resolved.precacheHtml && documentAllowlist.includes(scopePath)) {
            precacheSet.add(scopePath);
          }
        });

        precacheSet.add('./offline.html');
        const precache = Array.from(precacheSet).sort();
        const hash = createHash('sha256');
        precache.forEach((scopePath) => {
          hash.update(scopePath);
          hash.update(assets[scopePath.slice(2)].source());
        });

        const buildId = `${APP_NAME}-${hash.digest('hex').slice(0, 8)}`;
        const swTemplatePath = resolve(process.cwd(), './build/runtime/offline/sw-template.js');
        const swContent = readFileSync(swTemplatePath, 'utf8')
          .replace("'__APP_NAME__'", JSON.stringify(APP_NAME))
          .replace("'__BUILD_ID__'", JSON.stringify(buildId))
          .replace("'__CACHE_PREFIX__'", JSON.stringify(APP_NAME))
          .replace("['__PRECACHE__']", JSON.stringify(precache))
          .replace("['__DOCUMENT_ALLOWLIST__']", JSON.stringify(documentAllowlist));

        upsertAsset({ assets, compilation, sources, name: resolved.swFilename, content: swContent });
      });
    },
  };
};

/**
 * 创建离线缓存的构建集成
 *
 * 开启时同时返回注册入口、编译期常量和产物插件，保证生成的 Worker 与注册路径一致。
 *
 * @param env 当前构建环境
 * @param assetPrefix Rsbuild 静态资源前缀
 * @param offline 离线缓存配置
 * @returns 支持的构建环境返回 Rsbuild 集成，关闭时只输出停用脚本
 */
export const buildOfflineIntegration = (
  env: AppEnv,
  assetPrefix: string,
  offline?: OfflineCacheOptions,
): {
  preEntry: Array<string>;
  define: Record<string, string>;
  plugin: RsbuildPlugin;
} | null => {
  const resolved = resolveOfflineOptions(offline);
  if (!resolved.env.includes(env)) {
    return null;
  }

  const plugin = createOfflinePlugin(resolved);
  if (!resolved.enabled) {
    return { preEntry: [], define: {}, plugin };
  }

  const basePath = normalizeBasePath(assetPrefix);

  return {
    preEntry: [resolve(process.cwd(), './build/runtime/offline/register.ts')],
    define: {
      __OFFLINE_SW_URL__: JSON.stringify(`${basePath}${resolved.swFilename}`),
      __OFFLINE_SW_SCOPE__: JSON.stringify(basePath),
      __OFFLINE_NOTIFY_UPDATE__: JSON.stringify(resolved.notifyUpdateReady),
    },
    plugin,
  };
};
