<template>
  <base-dialog v-model="visible" title="工作汇报生成器" :width="680">
    <div class="work-report">
      <div class="work-report__bar">
        <div class="work-report__tabs">
          <button
            type="button"
            class="work-report__tab"
            :class="{ 'work-report__tab--active': reportType === 'monthly' }"
            @click="switchType('monthly')"
          >
            月报（默认）
          </button>
          <button
            type="button"
            class="work-report__tab"
            :class="{ 'work-report__tab--active': reportType === 'weekly' }"
            @click="switchType('weekly')"
          >
            周报
          </button>
        </div>

        <div class="work-report__period">
          <base-button size="sm" :variant="periodOffset === 0 ? 'soft' : 'default'" @click="switchOffset(0)">
            {{ reportType === 'monthly' ? '本月' : '本周' }}
          </base-button>
          <base-button size="sm" :variant="periodOffset === -1 ? 'soft' : 'default'" @click="switchOffset(-1)">
            {{ reportType === 'monthly' ? '上月' : '上周' }}
          </base-button>
        </div>
      </div>

      <div class="work-report__stats">
        <div class="work-report__stat">
          <span class="work-report__stat-label">推进解决 Bug</span>
          <span class="work-report__stat-val">{{ draft.resolvedCount }}</span>
        </div>
        <div class="work-report__stat">
          <span class="work-report__stat-label">已验收闭环</span>
          <span class="work-report__stat-val">{{ draft.closedCount }}</span>
        </div>
        <div class="work-report__stat">
          <span class="work-report__stat-label">完成计划项</span>
          <span class="work-report__stat-val">{{ draft.planDoneCount }}</span>
        </div>
        <div class="work-report__stat">
          <span class="work-report__stat-label">技术笔记沉淀</span>
          <span class="work-report__stat-val">{{ draft.noteCount }}</span>
        </div>
      </div>

      <div class="work-report__editor-bar">
        <div class="work-report__segmented">
          <button
            type="button"
            class="work-report__seg-btn"
            :class="{ 'work-report__seg-btn--active': viewMode === 'preview' }"
            @click="viewMode = 'preview'"
          >
            Markdown 预览
          </button>
          <button
            type="button"
            class="work-report__seg-btn"
            :class="{ 'work-report__seg-btn--active': viewMode === 'edit' }"
            @click="viewMode = 'edit'"
          >
            编辑原文
          </button>
        </div>

        <div class="work-report__ai-actions">
          <base-button v-if="isPolished" variant="ghost" size="sm" icon="Undo2" @click="handleRestoreDraft">
            还原草稿
          </base-button>
          <base-button variant="soft" size="sm" icon="Sparkles" :loading="aiLoading" @click="handleAiPolish">
            {{ aiLoading ? 'AI 润色中...' : 'AI 一键润色' }}
          </base-button>
        </div>
      </div>

      <div v-if="viewMode === 'preview'" class="work-report__preview">
        <base-markdown-preview :content="markdownText" />
      </div>
      <base-input v-else v-model="markdownText" type="textarea" :rows="12" />
    </div>

    <template #footer="{ close }">
      <base-button @click="close">关闭</base-button>
      <base-button variant="primary" icon="Copy" @click="handleCopyReport">一键复制汇报</base-button>
    </template>
  </base-dialog>
</template>

<script setup lang="ts">
import { message } from '@/feedback';
import { useWorkspaceStore } from '@/stores';

import type { ReportType } from '@repo/shared/types';

const workspaceStore = useWorkspaceStore();
const { workReportDialogVisible: visible } = storeToRefs(workspaceStore);

const reportType = ref<ReportType>('monthly');
const periodOffset = ref<0 | -1>(0);
const viewMode = ref<'preview' | 'edit'>('preview');
const markdownText = ref('');
const rawDraftText = ref('');
const isPolished = ref(false);
const aiLoading = ref(false);

const draft = computed(() => workspaceStore.buildWorkReportDraft(reportType.value, periodOffset.value));

const regenerateDraft = (): void => {
  rawDraftText.value = draft.value.markdown;
  markdownText.value = draft.value.markdown;
  isPolished.value = false;
};

watch(visible, (opened) => {
  if (opened) {
    regenerateDraft();
  }
});

const switchType = (next: ReportType): void => {
  reportType.value = next;
  regenerateDraft();
};

const switchOffset = (offset: 0 | -1): void => {
  periodOffset.value = offset;
  regenerateDraft();
};

const handleAiPolish = async (): Promise<void> => {
  aiLoading.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 420));
    markdownText.value = [
      `# ${draft.value.periodLabel}（AI 精炼版）`,
      '',
      `> 本周期围绕稳定性治理与体验优化持续交付，累计推进解决 **${draft.value.resolvedCount}** 项核心缺陷，完成 **${draft.value.closedCount}** 项验收闭环与 **${draft.value.planDoneCount}** 项重点排期任务。`,
      '',
      '## 关键成果亮点',
      '- **高优缺陷快速止血**：优先攻克订单导出超时 500、弱网 SSE 断连泄漏等 P0/P1 风险问题，保障核心交易链路稳定。',
      '- **研发协作提效**：通过「待验证自动回指」与工作计划联动，缩短问题排查到测试验收的流转耗时。',
      `- **团队知识沉淀**：同步整理 **${draft.value.noteCount}** 篇排查与工程实践笔记，降低后续同类问题复发成本。`,
      '',
      '## 后续推进计划',
      '- 持续清空当前待处理的高优先级 Bug，跟进已提测缺陷闭环。',
      '- 完成下一阶段核心联调与性能指标复核。',
    ].join('\n');
    isPolished.value = true;
    message.success('AI 润色完成，可随时还原原始草稿');
  } finally {
    aiLoading.value = false;
  }
};

const handleRestoreDraft = (): void => {
  markdownText.value = rawDraftText.value;
  isPolished.value = false;
  message.info('已还原为统计草稿');
};

const handleCopyReport = async (): Promise<void> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(markdownText.value);
    }
    message.success('已复制汇报全文到剪贴板');
  } catch {
    message.warning('当前环境不支持自动复制，请切换至编辑模式手动复制');
  }
};
</script>

<style lang="scss" src="./index.scss" scoped></style>
