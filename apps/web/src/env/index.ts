/**
 * 获取构建时注入的业务环境。
 */
export const getAppEnv = (): AppEnv => import.meta.env.APP_ENV;

/**
 * 获取当前构建生效的离线缓存开关。
 */
export const isOfflineCacheEnabled = (): boolean => import.meta.env.OFFLINE_CACHE_ENABLED;

/**
 * 是否为开发环境
 * 由 Rsbuild 内置的 `import.meta.env.DEV` 提供，构建时静态替换。
 */
export const isDev = (): boolean => import.meta.env.DEV;
