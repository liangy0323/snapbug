import { loadEnv } from '@rsbuild/core';

/**
 * Rsbuild 允许使用的应用环境模式
 */
const APP_ENV_LIST = ['development', 'test', 'production'] as const;

/**
 * 通过校验的构建环境
 */
export interface AppBuildEnv {
  /**
   * 当前构建环境，用于控制开发和生产差异
   */
  appEnv: AppEnv;

  /**
   * 注入浏览器源码的 API 服务基础地址
   */
  apiBaseUrl: string;
  /** 是否启用离线缓存 */
  offlineCacheEnabled: boolean;
}

/**
 * 判断环境变量是否属于支持的构建模式
 *
 * @param value `.env.*` 中读取到的 `APP_ENV`
 * @returns 是否可以安全收窄为 `AppEnv`
 */
const isAppEnv = (value: string | undefined): value is AppEnv => {
  return APP_ENV_LIST.includes(value as AppEnv);
};

/**
 * 加载并校验构建环境
 *
 * `APP_ENV` 必须与 Rsbuild CLI 的 env mode 一致，避免读取一套环境文件却向浏览器注入另一套环境标识。
 * `API_BASE_URL` 可在应用接入后端时配置。
 *
 * @param mode Rsbuild CLI 传入的环境文件模式
 * @returns 已通过校验、可用于生成 Rsbuild 配置的环境变量
 * @throws 环境模式非法、不一致或离线缓存开关值非法时抛出错误
 */
export const loadAppEnv = (mode = 'development'): AppBuildEnv => {
  loadEnv({
    mode,
  });

  const { APP_ENV, API_BASE_URL = '', OFFLINE_CACHE_ENABLED = 'false' } = process.env;

  if (!isAppEnv(APP_ENV)) {
    throw new Error(`APP_ENV must be one of ${APP_ENV_LIST.join(', ')}`);
  }

  if (APP_ENV !== mode) {
    throw new Error(`APP_ENV(${APP_ENV}) must match Rsbuild env mode(${mode})`);
  }

  if (OFFLINE_CACHE_ENABLED !== 'true' && OFFLINE_CACHE_ENABLED !== 'false') {
    throw new Error('OFFLINE_CACHE_ENABLED must be true or false');
  }

  return {
    appEnv: APP_ENV,
    apiBaseUrl: API_BASE_URL,
    offlineCacheEnabled: OFFLINE_CACHE_ENABLED === 'true',
  };
};
