<template>
  <div class="admin-layout">
    <header class="admin-layout__topbar">
      <div class="admin-layout__brand">
        <span class="admin-layout__brand-word">SnapBug<i class="admin-layout__brand-dot" /></span>
        <span class="admin-layout__brand-slash">/</span>
        <span class="admin-layout__brand-sub">Admin Console</span>
      </div>

      <div class="admin-layout__right">
        <base-button variant="ghost" size="sm" :icon="isDark ? 'Sun' : 'Moon'" @click="toggleTheme">
          {{ isDark ? '亮色' : '暗黑' }}
        </base-button>
        <span class="admin-layout__user">
          <span class="admin-layout__avatar" :style="{ backgroundColor: currentUser?.avatarColor || '#722ed1' }">
            {{ currentUser?.name?.[0] || 'A' }}
          </span>
          <span>{{ currentUser?.name || '超级管理员' }}</span>
        </span>
        <base-button variant="ghost" size="sm" icon="LogOut" @click="handleLogout">退出</base-button>
      </div>
    </header>

    <main class="admin-layout__canvas">
      <div class="admin-layout__inner">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * 导入 composables
 */
import { useTheme } from '@/composables/use-theme';

/**
 * 导入 store
 */
import { useAuthStore } from '@/stores';

/**
 * 导入工具类
 */
import { message } from '@/feedback';

const router = useRouter();
const authStore = useAuthStore();
const { currentUser } = storeToRefs(authStore);
const { isDark, toggleTheme } = useTheme();

const handleLogout = async (): Promise<void> => {
  authStore.logout();
  message.info('已退出管理员控制台');
  await router.replace('/login');
};
</script>

<style lang="scss" src="./index.scss" scoped></style>
