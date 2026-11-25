import { createRouter, createWebHistory } from 'vue-router';
import { demoRoutes } from './modules/demo';

/**
 * 统一装配公共布局和各模块路由。History 部署需要为页面地址提供 HTML 回退。
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/index.vue'),
      children: demoRoutes,
    },
  ],
});

const appTitle = document.title;
router.afterEach((to, _from, failure) => {
  if (failure) return;
  const title = to.meta.title;
  document.title = typeof title === 'string' ? `${title} - ${appTitle}` : appTitle;
});

export default router;
