import type { UserRole, UserStatus } from '@repo/shared/types';

/**
 * 当前登录用户信息
 */
export interface AuthUser {
  /**
   * 用户主键 ID
   */
  id: number;
  /**
   * 登录账号
   */
  account: string;
  /**
   * 展示姓名
   */
  name: string;
  /**
   * 系统角色（ADMIN 仅进入成员管理，MEMBER 进入研发工作台）
   */
  role: UserRole;
  /**
   * 账号状态
   */
  status: UserStatus;
  /**
   * 岗位或角色说明
   */
  title: string;
  /**
   * 头像背景色
   */
  avatarColor: string;
  /**
   * 可选头像 URL
   */
  avatarUrl?: string;
}

/**
 * 登录表单数据结构
 */
export interface LoginFormModel {
  /**
   * 登录账号
   */
  account: string;
  /**
   * 登录密码
   */
  password: string;
}
