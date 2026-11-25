/**
 * 统一成功响应包装结构
 *
 * @template T 业务载荷类型
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * 统一错误响应结构
 */
export interface ApiErrorResponse {
  code: number;
  message: string;
  details?: string[];
}
