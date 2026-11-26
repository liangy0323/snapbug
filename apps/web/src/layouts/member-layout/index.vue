<template>
  <div class="member-layout">
    <header class="member-layout__topbar">
      <router-link to="/dashboard" class="member-layout__brand">
        <span class="member-layout__brand-word">SnapBug<i class="member-layout__brand-dot" /></span>
        <span class="member-layout__brand-slash">/</span>
        <span class="member-layout__brand-sub">R&amp;D Workspace</span>
      </router-link>

      <div class="member-layout__topbar-right">
        <base-button variant="primary" size="sm" icon="Plus" @click="workspaceStore.openCreateBugDialog()">
          提 Bug (C)
        </base-button>

        <button
          type="button"
          class="member-layout__icon-btn"
          :title="isDark ? '切换亮色模式' : '切换暗黑模式'"
          :aria-label="isDark ? '切换亮色模式' : '切换暗黑模式'"
          @click="toggleTheme"
        >
          <base-icon :icon="isDark ? 'Sun' : 'Moon'" :size="18" />
        </button>

        <div class="member-layout__hover-wrap">
          <button type="button" class="member-layout__icon-btn" aria-label="站内通知">
            <base-icon icon="Bell" :size="18" />
            <span v-if="unreadNotificationCount > 0" class="member-layout__badge">
              {{ unreadNotificationCount > 99 ? '99+' : unreadNotificationCount }}
            </span>
          </button>
          <div class="member-layout__hover-menu">
            <div class="member-layout__popover member-layout__notif-box">
              <div class="member-layout__popover-head">
                <span class="member-layout__popover-title">通知中心（{{ unreadNotificationCount }} 未读）</span>
                <button
                  v-if="unreadNotificationCount > 0"
                  type="button"
                  class="member-layout__link-btn"
                  @click="handleMarkAllRead"
                >
                  全部已读
                </button>
              </div>
              <div v-if="visibleNotifications.length > 0" class="member-layout__notif-scroll">
                <button
                  v-for="item in visibleNotifications"
                  :key="item.id"
                  type="button"
                  class="member-layout__notif-row"
                  :class="{ 'member-layout__notif-row--unread': !item.isRead }"
                  @click="handleClickNotification(item)"
                >
                  <span class="member-layout__notif-dot" />
                  <span class="member-layout__notif-main">
                    <span class="member-layout__notif-title">{{ item.title }}</span>
                    <span class="member-layout__notif-sub">{{ item.summary }} · {{ item.createdAt }}</span>
                  </span>
                </button>
              </div>
              <base-empty v-else title="暂无通知" description="指派、评论与待验证回指会实时推送" compact />
            </div>
          </div>
        </div>

        <div class="member-layout__hover-wrap">
          <div class="member-layout__user-trigger">
            <span class="member-layout__avatar" :style="{ backgroundColor: currentUser?.avatarColor || '#1b74ff' }">
              {{ currentUser?.name?.[0] || 'U' }}
            </span>
            <span class="member-layout__user-name">{{ currentUser?.name || '成员' }}</span>
          </div>

          <div class="member-layout__hover-menu">
            <div class="member-layout__popover member-layout__user-box">
              <div class="member-layout__user-head">
                <div class="member-layout__user-head-name">{{ currentUser?.name }}</div>
                <div class="member-layout__user-head-meta">{{ currentUser?.title }} · @{{ currentUser?.account }}</div>
              </div>
              <div class="member-layout__user-list">
                <button type="button" class="member-layout__drop-item" @click="workspaceStore.openWorkReportDialog()">
                  <base-icon icon="FileText" :size="15" />
                  <span>生成工作汇报</span>
                </button>
                <button type="button" class="member-layout__drop-item" @click="workspaceStore.openProfileDialog()">
                  <base-icon icon="KeyRound" :size="15" />
                  <span>资料与修改密码</span>
                </button>
                <div class="member-layout__drop-line" />
                <button
                  type="button"
                  class="member-layout__drop-item member-layout__drop-item--danger"
                  @click="handleLogout"
                >
                  <base-icon icon="LogOut" :size="15" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="member-layout__body">
      <aside class="member-layout__sidebar" aria-label="工作台主导航">
        <div>
          <div class="member-layout__side-group">研发工作台</div>
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="member-layout__side-item"
            active-class="member-layout__side-item--active"
          >
            <span class="member-layout__side-left">
              <base-icon :icon="item.icon" :size="17" />
              <span>{{ item.label }}</span>
            </span>
            <span v-if="item.count !== undefined && item.count > 0" class="member-layout__side-count">
              {{ item.count }}
            </span>
          </router-link>
        </div>

        <div class="member-layout__sidebar-foot">
          <span>快捷键 C 提 Bug</span>
        </div>
      </aside>

      <main class="member-layout__canvas">
        <router-view />
      </main>
    </div>

    <!-- 全局复用业务弹层 -->
    <bug-create-dialog />
    <bug-detail-drawer />
    <work-report-dialog />
    <profile-dialog />
  </div>
</template>

<script setup lang="ts">
/**
 * 导入组件
 */
import BugCreateDialog from '@/components/business/bug-create-dialog/index.vue';
import BugDetailDrawer from '@/components/business/bug-detail-drawer/index.vue';
import ProfileDialog from '@/components/business/profile-dialog/index.vue';
import WorkReportDialog from '@/components/business/work-report-dialog/index.vue';

/**
 * 导入 composables
 */
import { useTheme } from '@/composables/use-theme';

/**
 * 导入 store
 */
import { useAuthStore, useWorkspaceStore } from '@/stores';

/**
 * 导入工具类
 */
import { message } from '@/feedback';

/**
 * 导入类型声明
 */
import type { BaseIconName, NotificationItem } from '@/types';

const router = useRouter();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();
const { currentUser } = storeToRefs(authStore);
const { bugs, plans, today, visibleNotifications, unreadNotificationCount } = storeToRefs(workspaceStore);
const { isDark, toggleTheme } = useTheme();

const myPendingBugCount = computed<number>(
  () =>
    bugs.value.filter((b) => b.assigneeId === currentUser.value?.id && (b.status === 'OPEN' || b.status === 'PROGRESS'))
      .length,
);

const todayPendingPlanCount = computed<number>(
  () => plans.value.filter((p) => p.planDate === today.value && !p.completed).length,
);

const navItems = computed<Array<{ to: string; label: string; icon: BaseIconName; count?: number }>>(() => [
  { to: '/dashboard', label: '工作台', icon: 'LayoutDashboard' },
  { to: '/bugs', label: 'Bug 追踪', icon: 'Bug', count: myPendingBugCount.value },
  { to: '/notes', label: '个人笔记', icon: 'NotebookPen' },
  { to: '/plans', label: '工作计划', icon: 'CalendarDays', count: todayPendingPlanCount.value },
]);

const handleClickNotification = (item: NotificationItem): void => {
  workspaceStore.markNotificationRead(item.id);
  workspaceStore.openBugDetail(item.bugId);
};

const handleMarkAllRead = (): void => {
  workspaceStore.markAllNotificationsRead();
  message.success('已全部标记为已读');
};

const handleLogout = async (): Promise<void> => {
  authStore.logout();
  message.info('已退出登录');
  await router.replace('/login');
};

/**
 * 全局快捷键 C 快速唤起提 Bug 弹窗（输入态下自动忽略）
 */
const handleGlobalKeydown = (event: KeyboardEvent): void => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.key.toLowerCase() !== 'c') {
    return;
  }
  const target = event.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return;
  }
  event.preventDefault();
  workspaceStore.openCreateBugDialog();
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<style lang="scss" src="./index.scss" scoped></style>
