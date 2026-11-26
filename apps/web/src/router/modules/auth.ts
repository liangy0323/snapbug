import type { RouteRecordRaw } from 'vue-router';

/**
 * 认证相关独立全屏路由
 */
export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/login/index.vue'),
    meta: { title: '登录', public: true },
  },
];
