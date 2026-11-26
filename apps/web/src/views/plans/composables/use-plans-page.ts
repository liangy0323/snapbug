import { message } from '@/feedback';
import { useWorkspaceStore } from '@/stores';

import type { PlanItem } from '@/types';

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const;

const parseIsoDate = (iso: string): Date => {
  const [year = 2026, month = 1, day = 1] = iso.split('-').map((part) => Number(part));
  return new Date(year, month - 1, day);
};

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 工作计划页面状态与按日任务管理逻辑
 */
export const usePlansPage = () => {
  const workspaceStore = useWorkspaceStore();

  const selectedDate = ref<string>(workspaceStore.today);
  const newTimeSlot = ref('');
  const newTitle = ref('');

  const isToday = computed<boolean>(() => selectedDate.value === workspaceStore.today);

  const displayDateLabel = computed<string>(() => {
    const date = parseIsoDate(selectedDate.value);
    const weekday = WEEKDAY_NAMES[date.getDay()] ?? '';
    return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 · ${weekday}`;
  });

  const dayPlans = computed<PlanItem[]>(() => {
    return workspaceStore.plans
      .filter((item) => item.planDate === selectedDate.value)
      .slice()
      .sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return a.timeSlot.localeCompare(b.timeSlot);
      });
  });

  const totalCount = computed<number>(() => dayPlans.value.length);
  const completedCount = computed<number>(() => dayPlans.value.filter((item) => item.completed).length);
  const pendingCount = computed<number>(() => totalCount.value - completedCount.value);
  const progressPercent = computed<number>(() => {
    if (totalCount.value === 0) {
      return 0;
    }
    return Math.round((completedCount.value / totalCount.value) * 100);
  });

  const shiftDate = (offsetDays: number): void => {
    const target = parseIsoDate(selectedDate.value);
    target.setDate(target.getDate() + offsetDays);
    selectedDate.value = toIsoDate(target);
  };

  const resetToday = (): void => {
    selectedDate.value = workspaceStore.today;
  };

  const handleAddPlan = (): void => {
    const title = newTitle.value.trim();
    if (!title) {
      message.warning('请输入工作计划内容');
      return;
    }

    workspaceStore.addPlan({
      planDate: selectedDate.value,
      title,
      timeSlot: newTimeSlot.value.trim() || undefined,
    });
    newTitle.value = '';
    newTimeSlot.value = '';
    message.success('已添加到当日计划');
  };

  const handleTogglePlan = (planId: number): void => {
    workspaceStore.togglePlanCompleted(planId);
  };

  const handleDeletePlan = (planId: number): void => {
    workspaceStore.deletePlan(planId);
    message.success('计划条目已移除');
  };

  const handleOpenBug = (bugId: number): void => {
    workspaceStore.openBugDetail(bugId);
  };

  return {
    selectedDate,
    newTimeSlot,
    newTitle,
    isToday,
    displayDateLabel,
    dayPlans,
    totalCount,
    completedCount,
    pendingCount,
    progressPercent,
    shiftDate,
    resetToday,
    handleAddPlan,
    handleTogglePlan,
    handleDeletePlan,
    handleOpenBug,
  };
};
