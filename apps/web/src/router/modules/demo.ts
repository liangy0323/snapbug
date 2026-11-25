import type { RouteRecordRaw } from 'vue-router';

/**
 * 脚手架的示例路由，用于验证布局、页面懒加载和基础组件。
 */
export const demoRoutes: RouteRecordRaw[] = [
  {
    path: '',
    name: 'DemoHome',
    component: () => import('@/views/home/index.vue'),
    meta: { title: '首页' },
  },
  {
    path: 'components',
    name: 'DemoComponents',
    component: () => import('@/views/components/index.vue'),
    meta: { title: '基础组件' },
  },
];
