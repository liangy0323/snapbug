import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/stores';

import { adminRoutes } from './modules/admin';
import { authRoutes } from './modules/auth';
import { workspaceRoutes } from './modules/workspace';

/**
 * 统一装配应用路由与角色隔离守卫。
 */
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...authRoutes,
    ...workspaceRoutes,
    ...adminRoutes,
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login',
    },
  ],
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.name === 'Login') {
    if (!authStore.isAuthenticated) {
      return true;
    }
    return authStore.isAdmin ? '/admin/users' : '/dashboard';
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'Login',
      query: { redirect: to.fullPath },
    };
  }

  const requiredRole = to.meta.role;
  if (requiredRole === 'ADMIN' && !authStore.isAdmin) {
    return '/dashboard';
  }
  if (requiredRole === 'MEMBER' && authStore.isAdmin) {
    return '/admin/users';
  }

  return true;
});

const appTitle = document.title;
router.afterEach((to, _from, failure) => {
  if (failure) return;
  const title = to.meta.title;
  document.title = typeof title === 'string' ? `${title} - ${appTitle}` : appTitle;
});

export default router;
