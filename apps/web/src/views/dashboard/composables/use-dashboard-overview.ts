import { useTheme } from '@/composables/use-theme';
import { useAuthStore, useWorkspaceStore } from '@/stores';

import type { BaseIconName, SelectOption, SelectValue } from '@/types';

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

const formatIso = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * 工作台聚合统计、周日历计划与快捷操作编排
 */
export const useDashboardOverview = () => {
  const router = useRouter();
  const authStore = useAuthStore();
  const workspaceStore = useWorkspaceStore();
  const { currentUser } = storeToRefs(authStore);
  const { projects, bugs, notes, plans, activeMembers, today } = storeToRefs(workspaceStore);
  const { isDark, toggleTheme } = useTheme();

  const selectedProjectId = ref<SelectValue>(null);
  const selectedDate = ref<string>(today.value);

  const projectFilterOptions = computed<SelectOption<number>[]>(() =>
    projects.value.map((item) => ({ label: item.name, value: item.id })),
  );

  const scopedBugs = computed(() => {
    if (typeof selectedProjectId.value === 'number') {
      return bugs.value.filter((item) => item.projectId === selectedProjectId.value);
    }
    return bugs.value;
  });

  const statusSeries = computed(() => {
    const list = scopedBugs.value;
    return [
      { name: '待处理', value: list.filter((b) => b.status === 'OPEN').length, color: '#f53f3f' },
      { name: '处理中', value: list.filter((b) => b.status === 'PROGRESS').length, color: '#1b74ff' },
      { name: '待验证', value: list.filter((b) => b.status === 'VERIFY').length, color: '#ff7d00' },
      { name: '已关闭', value: list.filter((b) => b.status === 'CLOSED').length, color: '#00b42a' },
      { name: '已忽略', value: list.filter((b) => b.status === 'IGNORED').length, color: '#86909c' },
    ];
  });

  const activeBugTotal = computed(
    () => scopedBugs.value.filter((b) => b.status !== 'CLOSED' && b.status !== 'IGNORED').length,
  );

  const myAssignedCount = computed(
    () =>
      scopedBugs.value.filter(
        (b) => b.assigneeId === currentUser.value?.id && (b.status === 'OPEN' || b.status === 'PROGRESS'),
      ).length,
  );

  const closedCount = computed(() => scopedBugs.value.filter((b) => b.status === 'CLOSED').length);
  const verifyCount = computed(() => scopedBugs.value.filter((b) => b.status === 'VERIFY').length);

  /**
   * 近 7 日日期与趋势序列
   */
  const trendDates = computed<string[]>(() => {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
    return dates;
  });

  const createdSeries = computed<number[]>(() => {
    const base = [2, 4, 3, 5, 2, 3, Math.max(1, scopedBugs.value.filter((b) => b.status === 'OPEN').length)];
    return typeof selectedProjectId.value === 'number' ? base.map((n) => Math.max(0, Math.ceil(n / 2))) : base;
  });

  const closedSeries = computed<number[]>(() => {
    const base = [1, 3, 2, 4, 3, 2, Math.max(1, closedCount.value)];
    return typeof selectedProjectId.value === 'number' ? base.map((n) => Math.max(0, Math.ceil(n / 2))) : base;
  });

  /**
   * 当前周 7 天日历条
   */
  const weekDays = computed(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() + mondayOffset + idx);
      const iso = formatIso(d);
      const hasPlan = plans.value.some((p) => p.planDate === iso);
      return {
        iso,
        weekday: WEEK_DAYS[d.getDay()],
        dayNum: d.getDate(),
        hasPlan,
      };
    });
  });

  const selectedDayPlans = computed(() => plans.value.filter((p) => p.planDate === selectedDate.value));

  const recentNotes = computed(() => notes.value.slice(0, 4));
  const recentPendingBugs = computed(() =>
    bugs.value.filter((b) => b.status === 'OPEN' || b.status === 'PROGRESS' || b.status === 'VERIFY').slice(0, 5),
  );

  const greetingText = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  });

  const quickTiles = computed<Array<{ label: string; icon: BaseIconName; action: () => void }>>(() => [
    { label: '快速提 Bug', icon: 'Plus', action: () => workspaceStore.openCreateBugDialog() },
    { label: 'Bug 追踪', icon: 'Bug', action: () => void router.push('/bugs') },
    { label: '新建笔记', icon: 'NotebookPen', action: () => void router.push('/notes') },
    { label: '工作计划', icon: 'CalendarDays', action: () => void router.push('/plans') },
    { label: '工作汇报', icon: 'FileText', action: () => workspaceStore.openWorkReportDialog() },
    { label: isDark.value ? '亮色主题' : '暗黑主题', icon: isDark.value ? 'Sun' : 'Moon', action: toggleTheme },
  ]);

  return {
    currentUser,
    activeMembers,
    selectedProjectId,
    selectedDate,
    projectFilterOptions,
    scopedBugs,
    statusSeries,
    activeBugTotal,
    myAssignedCount,
    closedCount,
    verifyCount,
    trendDates,
    createdSeries,
    closedSeries,
    weekDays,
    selectedDayPlans,
    recentNotes,
    recentPendingBugs,
    greetingText,
    quickTiles,
    openBugDetail: workspaceStore.openBugDetail,
    togglePlanCompleted: workspaceStore.togglePlanCompleted,
    getProjectName: (projectId: number) => workspaceStore.getProjectById(projectId)?.name ?? '',
  };
};
