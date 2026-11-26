import type { RouteRecordRaw } from 'vue-router';

/**
 * 普通成员研发工作台路由
 */
export const workspaceRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/member-layout/index.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true, role: 'MEMBER' },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '工作台',
          requiresAuth: true,
          role: 'MEMBER',
        },
      },
      {
        path: 'bugs',
        name: 'Bugs',
        component: () => import('@/views/bugs/index.vue'),
        meta: {
          title: 'Bug 追踪',
          requiresAuth: true,
          role: 'MEMBER',
        },
      },
      {
        path: 'notes',
        name: 'Notes',
        component: () => import('@/views/notes/index.vue'),
        meta: {
          title: '个人笔记',
          requiresAuth: true,
          role: 'MEMBER',
        },
      },
      {
        path: 'plans',
        name: 'Plans',
        component: () => import('@/views/plans/index.vue'),
        meta: {
          title: '工作计划',
          requiresAuth: true,
          role: 'MEMBER',
        },
      },
    ],
  },
];
