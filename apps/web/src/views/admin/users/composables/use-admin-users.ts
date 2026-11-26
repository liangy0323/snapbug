import { confirm, message } from '@/feedback';
import { useWorkspaceStore } from '@/stores';

import type {
  FormInstance,
  FormRules,
  MemberFormModel,
  MemberImportPreviewRow,
  ResetPasswordFormModel,
  SelectOption,
  SelectValue,
  TeamMember,
  UploadModelValue,
} from '@/types';

const STATUS_OPTIONS: SelectOption<'ACTIVE' | 'DISABLED'>[] = [
  { label: '启用中', value: 'ACTIVE', tone: 'success' },
  { label: '已禁用', value: 'DISABLED', tone: 'muted' },
];

const ACCOUNT_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

/**
 * 超管成员管理页状态、表单校验、禁用确认与 Excel 批量导入预检逻辑
 */
export const useAdminUsers = () => {
  const workspaceStore = useWorkspaceStore();

  const keyword = ref('');
  const statusFilter = ref<SelectValue>(null);
  const currentPage = ref(1);
  const pageSize = 8;

  // 新增 / 编辑成员弹层
  const memberDialogVisible = ref(false);
  const editingMemberId = ref<number | null>(null);
  const memberFormRef = ref<FormInstance | null>(null);
  const memberForm = reactive<MemberFormModel>({
    account: '',
    name: '',
    title: '',
    password: '',
  });

  // 重置密码弹层
  const resetDialogVisible = ref(false);
  const resetTargetMember = ref<TeamMember | null>(null);
  const resetFormRef = ref<FormInstance | null>(null);
  const resetForm = reactive<ResetPasswordFormModel>({
    newPassword: '',
    confirmPassword: '',
  });

  // Excel 批量导入弹层
  const importDialogVisible = ref(false);
  const importFile = ref<UploadModelValue>(null);
  const importPreviewRows = ref<MemberImportPreviewRow[]>([]);
  const importParsing = ref(false);

  const isEditing = computed<boolean>(() => editingMemberId.value !== null);

  const totalMembersCount = computed<number>(() => workspaceStore.members.length);
  const activeMembersCount = computed<number>(
    () => workspaceStore.members.filter((item) => item.status === 'ACTIVE').length,
  );
  const disabledMembersCount = computed<number>(() => totalMembersCount.value - activeMembersCount.value);

  const filteredMembers = computed<TeamMember[]>(() => {
    const query = keyword.value.trim().toLowerCase();
    return workspaceStore.members.filter((item) => {
      if (statusFilter.value && item.status !== statusFilter.value) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        item.name.toLowerCase().includes(query) ||
        item.account.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query)
      );
    });
  });

  const pagedMembers = computed<TeamMember[]>(() => {
    const start = (currentPage.value - 1) * pageSize;
    return filteredMembers.value.slice(start, start + pageSize);
  });

  watch([keyword, statusFilter], () => {
    currentPage.value = 1;
  });

  const memberRules = computed<FormRules<MemberFormModel>>(() => ({
    account: [
      { required: true, message: '请输入登录账号' },
      {
        validator: (value) => {
          const text = String(value ?? '').trim();
          if (!ACCOUNT_PATTERN.test(text)) {
            return '账号仅支持 3~32 位字母、数字、下划线或连字符';
          }
          return true;
        },
      },
    ],
    name: [
      { required: true, message: '请输入成员姓名' },
      { min: 2, max: 20, message: '姓名长度需在 2~20 个字符之间' },
    ],
    title: [{ required: true, message: '请输入岗位职责' }],
    password: isEditing.value
      ? []
      : [
          { required: true, message: '请设置初始登录密码' },
          { min: 6, max: 32, message: '初始密码长度需在 6~32 位之间' },
        ],
  }));

  const resetRules: FormRules<ResetPasswordFormModel> = {
    newPassword: [
      { required: true, message: '请输入新密码' },
      { min: 6, max: 32, message: '密码长度需在 6~32 位之间' },
    ],
    confirmPassword: [
      { required: true, message: '请再次确认新密码' },
      {
        validator: (value) => {
          if (String(value ?? '') !== resetForm.newPassword) {
            return '两次输入的密码不一致';
          }
          return true;
        },
      },
    ],
  };

  const openCreateMember = (): void => {
    editingMemberId.value = null;
    memberForm.account = '';
    memberForm.name = '';
    memberForm.title = '';
    memberForm.password = '';
    memberDialogVisible.value = true;
    nextTick(() => {
      memberFormRef.value?.clearValidate();
    });
  };

  const openEditMember = (member: TeamMember): void => {
    editingMemberId.value = member.id;
    memberForm.account = member.account;
    memberForm.name = member.name;
    memberForm.title = member.title;
    memberForm.password = '';
    memberDialogVisible.value = true;
    nextTick(() => {
      memberFormRef.value?.clearValidate();
    });
  };

  const handleSubmitMember = async (): Promise<void> => {
    const valid = await memberFormRef.value?.validate();
    if (!valid) {
      return;
    }

    if (editingMemberId.value !== null) {
      workspaceStore.updateMember(editingMemberId.value, {
        name: memberForm.name,
        title: memberForm.title,
      });
      memberDialogVisible.value = false;
      message.success('成员资料已更新');
      return;
    }

    const result = workspaceStore.addMember({
      account: memberForm.account,
      name: memberForm.name,
      title: memberForm.title,
    });
    if (!result.ok) {
      message.error(result.message ?? '新增成员失败');
      return;
    }

    memberDialogVisible.value = false;
    message.success(`已创建成员「${memberForm.name.trim()}」`);
  };

  const openResetPassword = (member: TeamMember): void => {
    resetTargetMember.value = member;
    resetForm.newPassword = '';
    resetForm.confirmPassword = '';
    resetDialogVisible.value = true;
    nextTick(() => {
      resetFormRef.value?.clearValidate();
    });
  };

  const handleSubmitReset = async (): Promise<void> => {
    const valid = await resetFormRef.value?.validate();
    if (!valid || !resetTargetMember.value) {
      return;
    }
    resetDialogVisible.value = false;
    message.success(`已重置「${resetTargetMember.value.name}」的登录密码`);
  };

  const handleToggleStatus = async (member: TeamMember): Promise<void> => {
    const isDisabling = member.status === 'ACTIVE';
    const confirmed = await confirm({
      title: isDisabling ? '禁用成员账号' : '重新启用成员',
      content: isDisabling
        ? `禁用后「${member.name}（${member.account}）」将立即无法登录工作台，历史 Bug 与评论记录仍会保留。`
        : `确认重新启用「${member.name}（${member.account}）」的登录权限吗？`,
      type: isDisabling ? 'danger' : 'info',
      confirmText: isDisabling ? '确认禁用' : '确认启用',
    });
    if (!confirmed) {
      return;
    }
    workspaceStore.toggleMemberStatus(member.id);
    message.success(isDisabling ? `已禁用账号 ${member.account}` : `已重新启用账号 ${member.account}`);
  };

  const buildPreviewRows = (
    rawRows: { account: string; name: string; title: string; password: string }[],
  ): MemberImportPreviewRow[] => {
    const existingSet = new Set(workspaceStore.members.map((item) => item.account.toLowerCase()));
    const seenInFile = new Set<string>();

    return rawRows.map((row, index) => {
      const account = row.account.trim().toLowerCase();
      const name = row.name.trim();
      const title = row.title.trim() || '研发工程师';
      const password = row.password.trim();
      let error: string | undefined;

      if (!account || !ACCOUNT_PATTERN.test(account)) {
        error = '账号格式不合法（需 3~32 位字母或数字）';
      } else if (existingSet.has(account)) {
        error = `账号 ${account} 已存在`;
      } else if (seenInFile.has(account)) {
        error = `表格内账号 ${account} 重复`;
      } else if (!name) {
        error = '姓名不能为空';
      } else if (password.length < 6) {
        error = '初始密码不足 6 位';
      }

      if (account) {
        seenInFile.add(account);
      }

      return {
        rowNum: index + 2,
        account,
        name,
        title,
        password,
        valid: !error,
        error,
      };
    });
  };

  const parseUploadedFile = async (file: File): Promise<void> => {
    importParsing.value = true;
    try {
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.csv')) {
        const text = await file.text();
        const lines = text
          .replace(/^\uFEFF/, '')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        const dataLines = lines.slice(1);
        if (dataLines.length > 0) {
          const parsed = dataLines.map((line) => {
            const [account = '', name = '', title = '', password = ''] = line.split(',').map((cell) => cell.trim());
            return { account, name, title, password };
          });
          importPreviewRows.value = buildPreviewRows(parsed);
          return;
        }
      }

      // .xlsx / .xls 在静态阶段模拟服务端解析预检结果，直观呈现合法行与冲突行反馈
      importPreviewRows.value = buildPreviewRows([
        { account: 'wanghao', name: '王浩', title: '后端开发', password: 'Init@2026' },
        { account: 'liuyue', name: '刘悦', title: '测试工程师', password: 'Init@2026' },
        { account: 'linmo', name: '林默', title: '前端开发', password: 'Init@2026' },
        { account: 'zhao_xin', name: '赵欣', title: '全栈开发', password: '123' },
      ]);
    } finally {
      importParsing.value = false;
    }
  };

  watch(importFile, (value) => {
    if (value instanceof File) {
      void parseUploadedFile(value);
      return;
    }
    importPreviewRows.value = [];
  });

  const validImportRows = computed<MemberImportPreviewRow[]>(() =>
    importPreviewRows.value.filter((item) => item.valid),
  );
  const invalidImportRows = computed<MemberImportPreviewRow[]>(() =>
    importPreviewRows.value.filter((item) => !item.valid),
  );

  const openImportDialog = (): void => {
    importFile.value = null;
    importPreviewRows.value = [];
    importDialogVisible.value = true;
  };

  const handleDownloadTemplate = (): void => {
    const csv = [
      '\uFEFFaccount,name,title,password',
      'wanghao,王浩,后端开发,Init@2026',
      'liuyue,刘悦,测试工程师,Init@2026',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'snapbug-members-template.csv';
    link.click();
    URL.revokeObjectURL(url);
    message.success('导入模板已开始下载');
  };

  const handleConfirmImport = (): void => {
    if (validImportRows.value.length === 0) {
      message.warning('当前没有可导入的合法成员行');
      return;
    }

    let imported = 0;
    validImportRows.value.forEach((row) => {
      const res = workspaceStore.addMember({
        account: row.account,
        name: row.name,
        title: row.title,
      });
      if (res.ok) {
        imported += 1;
      }
    });

    importDialogVisible.value = false;
    importFile.value = null;
    importPreviewRows.value = [];
    message.success(`已成功批量导入 ${imported} 名成员`);
  };

  return {
    STATUS_OPTIONS,
    keyword,
    statusFilter,
    currentPage,
    pageSize,
    totalMembersCount,
    activeMembersCount,
    disabledMembersCount,
    filteredMembers,
    pagedMembers,
    memberDialogVisible,
    isEditing,
    memberFormRef,
    memberForm,
    memberRules,
    resetDialogVisible,
    resetTargetMember,
    resetFormRef,
    resetForm,
    resetRules,
    importDialogVisible,
    importFile,
    importPreviewRows,
    importParsing,
    validImportRows,
    invalidImportRows,
    openCreateMember,
    openEditMember,
    handleSubmitMember,
    openResetPassword,
    handleSubmitReset,
    handleToggleStatus,
    openImportDialog,
    handleDownloadTemplate,
    handleConfirmImport,
  };
};
