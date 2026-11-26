<template>
  <base-dialog v-model="visible" title="快速提交 Bug" :width="620" destroy-on-close>
    <base-form ref="formRef" :model="form" :rules="rules" @submit="handleSubmit">
      <div class="bug-create__grid">
        <base-form-item label="所属项目" prop="projectId">
          <base-select v-model="form.projectId" :options="projectOptions" filterable placeholder="请选择所属项目" />
        </base-form-item>

        <base-form-item label="优先级" prop="priority">
          <base-select v-model="form.priority" :options="priorityOptions" />
        </base-form-item>

        <base-form-item label="指派给" prop="assigneeId">
          <base-select v-model="form.assigneeId" :options="assigneeOptions" filterable placeholder="选择处理人" />
        </base-form-item>
      </div>

      <base-form-item label="问题标题" prop="title">
        <base-input
          v-model="form.title"
          placeholder="一句话概括问题现象，例如：订单导出未选时间范围时接口返回 500"
          clearable
          :maxlength="80"
          show-word-limit
        />
      </base-form-item>

      <base-form-item label="问题描述" prop="description">
        <div class="bug-create__ai-bar">
          <span class="bug-create__ai-tip">口语化输入即可，点击右侧可由 AI 整理为标准复现结构</span>
          <div class="bug-create__ai-actions">
            <base-button
              v-if="originalDescription"
              variant="ghost"
              size="sm"
              icon="Undo2"
              @click="handleRestoreOriginal"
            >
              还原原文
            </base-button>
            <base-button variant="soft" size="sm" icon="Sparkles" :loading="aiLoading" @click="handleAiOptimize">
              {{ aiLoading ? 'AI 整理中...' : 'AI 一键优化' }}
            </base-button>
          </div>
        </div>
        <base-input
          v-model="form.description"
          type="textarea"
          :rows="5"
          placeholder="简述复现路径、报错信息或预期表现..."
        />
      </base-form-item>

      <base-form-item label="图片 / 视频附件（可选，支持 Ctrl+V 粘贴截图）">
        <base-upload
          v-model="uploadFiles"
          media-type="media"
          value-type="file"
          :max-count="6"
          :max-size-m-b="50"
          @reject="handleUploadReject"
        />
      </base-form-item>
    </base-form>

    <template #footer="{ close }">
      <base-button @click="close">取消</base-button>
      <base-button variant="primary" @click="handleSubmit">提交 Bug</base-button>
    </template>
  </base-dialog>
</template>

<script setup lang="ts">
import { message } from '@/feedback';
import { useWorkspaceStore } from '@/stores';

import type { BugPriority } from '@repo/shared/types';
import type { BugAttachmentItem, FormInstance, FormRules, SelectOption, SelectValue, UploadModelValue } from '@/types';

const workspaceStore = useWorkspaceStore();
const { createBugDialogVisible: visible, projects, activeMembers, lastSelectedProjectId } = storeToRefs(workspaceStore);

const formRef = useTemplateRef<FormInstance | null>('formRef');
const aiLoading = ref(false);
const aiOptimized = ref(false);
const originalDescription = ref('');
const uploadFiles = ref<UploadModelValue>([]);

const form = reactive<{
  projectId: SelectValue;
  title: string;
  description: string;
  priority: SelectValue;
  assigneeId: SelectValue;
}>({
  projectId: lastSelectedProjectId.value,
  title: '',
  description: '',
  priority: 'P1',
  assigneeId: 2,
});

const rules: FormRules<typeof form> = {
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  title: [
    { required: true, message: '请输入问题标题', trigger: 'blur' },
    { min: 4, message: '标题至少输入 4 个字符', trigger: 'blur' },
  ],
  description: [{ required: true, message: '请补充问题描述', trigger: 'blur' }],
  assigneeId: [{ required: true, message: '请选择指派人', trigger: 'change' }],
};

const projectOptions = computed<SelectOption<number>[]>(() =>
  projects.value.map((item) => ({ label: item.name, value: item.id })),
);

const assigneeOptions = computed<SelectOption<number>[]>(() =>
  activeMembers.value.map((item) => ({ label: item.name, value: item.id, description: item.title })),
);

const priorityOptions: SelectOption<BugPriority>[] = [
  { label: 'P0 紧急', value: 'P0', tone: 'danger' },
  { label: 'P1 重要', value: 'P1', tone: 'warning' },
  { label: 'P2 一般', value: 'P2', tone: 'primary' },
];

const resetFormState = (): void => {
  form.projectId = lastSelectedProjectId.value || projects.value[0]?.id || null;
  form.title = '';
  form.description = '';
  form.priority = 'P1';
  form.assigneeId = activeMembers.value[0]?.id ?? null;
  uploadFiles.value = [];
  originalDescription.value = '';
  aiOptimized.value = false;
};

watch(visible, (opened) => {
  if (opened) {
    resetFormState();
  }
});

const handleAiOptimize = async (): Promise<void> => {
  const raw = form.description.trim() || form.title.trim();
  if (!raw) {
    message.warning('请先输入标题或简短问题描述再使用 AI 优化');
    return;
  }

  aiLoading.value = true;
  try {
    if (!originalDescription.value) {
      originalDescription.value = form.description;
    }
    await new Promise((resolve) => setTimeout(resolve, 420));
    form.description = [
      '【问题描述】',
      raw,
      '',
      '【复现步骤】',
      '1. 进入对应业务模块并保持当前测试数据；',
      '2. 按上述条件触发目标交互或提交请求；',
      '3. 观察页面反馈与控制台网络响应。',
      '',
      '【实际结果】',
      '功能异常或报错，阻塞正常操作流程。',
      '',
      '【预期结果】',
      '操作响应正常，异常场景给出明确可读提示。',
    ].join('\n');
    aiOptimized.value = true;
    message.success('AI 已将描述整理为标准四段结构');
  } finally {
    aiLoading.value = false;
  }
};

const handleRestoreOriginal = (): void => {
  form.description = originalDescription.value;
  originalDescription.value = '';
  aiOptimized.value = false;
  message.info('已还原为原始输入');
};

const handleUploadReject = (reason: string): void => {
  message.warning(reason);
};

const buildAttachmentsFromFiles = (): BugAttachmentItem[] => {
  const list = Array.isArray(uploadFiles.value) ? uploadFiles.value : uploadFiles.value ? [uploadFiles.value] : [];
  return list
    .filter((item): item is File => typeof item !== 'string')
    .map((file, idx) => ({
      id: Date.now() + idx,
      type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
      name: file.name,
      url: typeof URL !== 'undefined' ? URL.createObjectURL(file) : '',
      size: file.size,
    }));
};

const handleSubmit = async (): Promise<void> => {
  const valid = await formRef.value?.validate();
  if (!valid || typeof form.projectId !== 'number' || typeof form.assigneeId !== 'number') {
    return;
  }

  const created = workspaceStore.createBug({
    projectId: form.projectId,
    title: form.title,
    description: form.description,
    originalDescription: originalDescription.value || undefined,
    aiOptimized: aiOptimized.value,
    priority: (form.priority as BugPriority) || 'P1',
    assigneeId: form.assigneeId,
    attachments: buildAttachmentsFromFiles(),
  });

  visible.value = false;
  message.success(`已提交 ${created.code}，并通知指派人处理`);
};
</script>

<style lang="scss" scoped>
.bug-create {
  &__grid {
    display: grid;
    grid-template-columns: 1.3fr 0.85fr 1fr;
    gap: 12px;
  }

  &__ai-bar {
    margin-bottom: 8px;
    padding: 8px 12px;
    border-left: 3px solid var(--color-primary);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    background-color: var(--color-primary-tint);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__ai-tip {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__ai-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
}

@media (max-width: 640px) {
  .bug-create__grid {
    grid-template-columns: 1fr;
  }
}
</style>
