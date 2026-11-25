/**
 * 健康检查响应中的服务标识
 *
 * 与 workspace.config.json 中 server 应用名称保持一致。
 */
export const HEALTH_SERVICE_NAME: string = 'api';

/**
 * 浏览器跨域请求允许使用的 HTTP 方法
 */
export const SERVER_CORS_METHODS: string[] = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
