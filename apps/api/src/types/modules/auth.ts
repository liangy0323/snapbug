import type { UserRole } from '@repo/shared/types';

/**
 * JWT 鉴权通过后注入请求上下文的当前用户信息
 */
export interface AuthenticatedUser {
  id: number;
  account: string;
  name: string;
  role: UserRole;
}
