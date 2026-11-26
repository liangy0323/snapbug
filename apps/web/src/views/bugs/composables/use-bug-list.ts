import { message } from '@/feedback';
import { useAuthStore, useWorkspaceStore } from '@/stores';

import type { BugStatus } from '@repo/shared/types';
import type { FormInstance, FormRules, SelectOption, SelectValue } from '@/types';

/**
 * Bug 追踪页筛选、双视图切换、分页与新建项目逻辑
 */
export const useBugList = () => {
  const authStore = useAuthStore();
  const workspaceStore = useWorkspaceStore();
  const { currentUser } = storeToRefs(authStore);
  const { projects, bugs } = storeToRefs(workspaceStore);

  const selectedProjectId = ref<SelectValue>(null);
  const scopeTab = ref<'mine' | 'created' | 'all'>('all');
  const statusFilter = ref<SelectValue>(null);
  const keyword = ref('');
  const viewMode = ref<'table' | 'card'>('table');
  const currentPage = ref(1);
  const pageSize = 8;

  const projectDialogVisible = ref(false);
  const projectForm = reactive({ name: '', description: '' });
  const projectRules: FormRules<typeof projectForm> = {
    name: [
      { required: true, message: '请输入项目名称', trigger: 'blur' },
      { min: 2, message: '项目名称至少 2 个字符', trigger: 'blur' },
    ],
  };

  const projectOptions = computed<SelectOption<number>[]>(() =>
    projects.value.map((item) => ({
      label: item.name,
      value: item.id,
      description: `${bugs.value.filter((b) => b.projectId === item.id && b.status !== 'CLOSED' && b.status !== 'IGNORED').length} 活跃`,
    })),
  );

  const statusOptions: SelectOption<BugStatus>[] = [
    { label: '待处理', value: 'OPEN', tone: 'danger' },
    { label: '处理中', value: 'PROGRESS', tone: 'primary' },
    { label: '待验证', value: 'VERIFY', tone: 'warning' },
    { label: '已关闭', value: 'CLOSED', tone: 'success' },
    { label: '已忽略', value: 'IGNORED', tone: 'muted' },
  ];

  const filteredBugs = computed(() => {
    const uid = currentUser.value?.id;
    const q = keyword.value.trim().toLowerCase();

    return bugs.value.filter((item) => {
      if (typeof selectedProjectId.value === 'number' && item.projectId !== selectedProjectId.value) {
        return false;
      }
      if (scopeTab.value === 'mine' && item.assigneeId !== uid) {
        return false;
      }
      if (scopeTab.value === 'created' && item.creatorId !== uid) {
        return false;
      }
      if (typeof statusFilter.value === 'string' && item.status !== statusFilter.value) {
        return false;
      }
      if (q && !item.title.toLowerCase().includes(q) && !item.code.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  });

  const pagedBugs = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    return filteredBugs.value.slice(start, start + pageSize);
  });

  watch([selectedProjectId, scopeTab, statusFilter, keyword], () => {
    currentPage.value = 1;
  });

  const handleInlineStatusChange = (bugId: number, value: SelectValue): void => {
    if (typeof value !== 'string') {
      return;
    }
    const { autoReassignedTo } = workspaceStore.updateBugStatus(bugId, value as BugStatus);
    if (autoReassignedTo) {
      message.warning(`已切换至「待验证」，系统已自动回指提单人 ${autoReassignedTo} 验收`);
    } else {
      message.success('Bug 状态已更新');
    }
  };

  const handleOpenCreateProject = (): void => {
    projectForm.name = '';
    projectForm.description = '';
    projectDialogVisible.value = true;
  };

  const handleCreateProject = async (formRef: FormInstance | null): Promise<void> => {
    const valid = await formRef?.validate();
    if (!valid) {
      return;
    }
    const created = workspaceStore.createProject(projectForm);
    selectedProjectId.value = created.id;
    projectDialogVisible.value = false;
    message.success(`已创建项目「${created.name}」`);
  };

  const handleResetFilters = (): void => {
    selectedProjectId.value = null;
    scopeTab.value = 'all';
    statusFilter.value = null;
    keyword.value = '';
  };

  return {
    selectedProjectId,
    scopeTab,
    statusFilter,
    keyword,
    viewMode,
    currentPage,
    pageSize,
    projectOptions,
    statusOptions,
    filteredBugs,
    pagedBugs,
    projectDialogVisible,
    projectForm,
    projectRules,
    handleInlineStatusChange,
    handleOpenCreateProject,
    handleCreateProject,
    handleResetFilters,
    openCreateBugDialog: () =>
      workspaceStore.openCreateBugDialog(
        typeof selectedProjectId.value === 'number' ? selectedProjectId.value : undefined,
      ),
    openBugDetail: workspaceStore.openBugDetail,
    getMember: workspaceStore.getMemberById,
    getProjectName: (projectId: number) => workspaceStore.getProjectById(projectId)?.name ?? '',
  };
};
