import type { RouteRecordRaw } from 'vue-router';

/**
 * 超级管理员专属控制台路由
 */
export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: () => import('@/layouts/admin-layout/index.vue'),
    redirect: '/admin/users',
    meta: { requiresAuth: true, role: 'ADMIN' },
    children: [
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/users/index.vue'),
        meta: { title: '成员管理', requiresAuth: true, role: 'ADMIN' },
      },
    ],
  },
];
