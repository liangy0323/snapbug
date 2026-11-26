<template>
  <base-drawer v-model="drawerVisible" direction="rtl" :size="560">
    <template #header="{ titleId }">
      <div class="bug-drawer__head">
        <span class="bug-drawer__code">{{ bug?.code }}</span>
        <span v-if="bug?.aiOptimized" :id="titleId" class="bug-drawer__tag">AI 优化</span>
        <span v-if="project" class="bug-drawer__project">{{ project.name }}</span>
      </div>
      <base-button v-if="bug" variant="soft" size="sm" icon="CalendarDays" @click="handleAddToTodayPlan">
        加入今日计划
      </base-button>
    </template>

    <div v-if="bug" class="bug-drawer__body">
      <h2 class="bug-drawer__title">{{ bug.title }}</h2>

      <!-- 可直接编辑的元信息栏 -->
      <div class="bug-drawer__meta-grid">
        <div class="bug-drawer__meta-cell">
          <span class="bug-drawer__meta-label">当前状态</span>
          <base-select :model-value="bug.status" :options="statusOptions" variant="pill" @change="handleStatusChange" />
        </div>

        <div class="bug-drawer__meta-cell">
          <span class="bug-drawer__meta-label">指派人</span>
          <base-select
            :model-value="bug.assigneeId"
            :options="assigneeOptions"
            size="sm"
            @change="handleAssigneeChange"
          />
        </div>

        <div class="bug-drawer__meta-cell">
          <span class="bug-drawer__meta-label">优先级</span>
          <base-select
            :model-value="bug.priority"
            :options="priorityOptions"
            size="sm"
            @change="handlePriorityChange"
          />
        </div>
      </div>

      <div class="bug-drawer__sub-meta">
        <span>提单人：{{ creator?.name || '成员' }}</span>
        <span>创建于 {{ bug.createdAt }}</span>
        <span>最近更新 {{ bug.updatedAt }}</span>
      </div>

      <!-- 问题描述 -->
      <section class="bug-drawer__section">
        <h3 class="bug-drawer__section-title">问题描述</h3>
        <div class="bug-drawer__desc">{{ bug.description }}</div>
      </section>

      <!-- 媒体附件 -->
      <section v-if="bug.attachments.length > 0" class="bug-drawer__section">
        <h3 class="bug-drawer__section-title">媒体附件（{{ bug.attachments.length }}）</h3>
        <div class="bug-drawer__attachments">
          <button
            v-for="(att, idx) in bug.attachments"
            :key="att.id"
            type="button"
            class="bug-drawer__att-card"
            @click="handlePreviewAttachment(att, idx)"
          >
            <img v-if="att.type === 'IMAGE'" :src="att.url" :alt="att.name" class="bug-drawer__att-thumb" />
            <div v-else class="bug-drawer__att-video">
              <video :src="att.url" class="bug-drawer__att-thumb" muted preload="metadata" />
              <span class="bug-drawer__att-play"><base-icon icon="Play" :size="16" /></span>
            </div>
            <span class="bug-drawer__att-name">{{ att.name }}</span>
          </button>
        </div>
      </section>

      <!-- 活动与评论融合时间线 -->
      <section class="bug-drawer__section">
        <h3 class="bug-drawer__section-title">处理记录与评论（{{ timeline.length }}）</h3>
        <div class="bug-drawer__timeline">
          <div
            v-for="item in timeline"
            :key="item.id"
            class="bug-drawer__event"
            :class="{ 'bug-drawer__event--comment': item.type === 'COMMENT' }"
          >
            <span
              class="bug-drawer__event-avatar"
              :style="{ backgroundColor: getMember(item.actorId)?.avatarColor || '#86909c' }"
            >
              {{ getMember(item.actorId)?.name?.[0] || 'U' }}
            </span>
            <div class="bug-drawer__event-main">
              <div class="bug-drawer__event-head">
                <span class="bug-drawer__event-actor">{{ getMember(item.actorId)?.name || '成员' }}</span>
                <span class="bug-drawer__event-time">{{ item.createdAt }}</span>
              </div>
              <p class="bug-drawer__event-text">{{ item.content }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <div v-if="bug" class="bug-drawer__composer">
        <base-input
          v-model="commentDraft"
          placeholder="补充排查结论、修复说明或验收反馈（按 Enter 发送）"
          size="sm"
          @enter="handleSubmitComment"
        />
        <base-button variant="primary" size="sm" icon="Send" @click="handleSubmitComment">发送</base-button>
      </div>
    </template>

    <base-image-preview v-model="imagePreviewVisible" :images="imageAttachments" :initial-index="imagePreviewIndex" />

    <base-dialog v-model="videoVisible" :title="activeVideo?.name || '视频播放'" :width="720" destroy-on-close>
      <video v-if="activeVideo" :src="activeVideo.url" class="bug-drawer__video-player" controls autoplay />
    </base-dialog>
  </base-drawer>
</template>

<script setup lang="ts">
import { message } from '@/feedback';
import { useWorkspaceStore } from '@/stores';

import type { BugPriority, BugStatus } from '@repo/shared/types';
import type { BugAttachmentItem, ImagePreviewItem, SelectOption, SelectValue } from '@/types';

const workspaceStore = useWorkspaceStore();
const { activeBug: bug, activeMembers } = storeToRefs(workspaceStore);

const commentDraft = ref('');
const imagePreviewVisible = ref(false);
const imagePreviewIndex = ref(0);
const activeVideo = ref<BugAttachmentItem | null>(null);

const drawerVisible = computed<boolean>({
  get: () => bug.value !== null,
  set: (val) => {
    if (!val) {
      workspaceStore.closeBugDetail();
      commentDraft.value = '';
    }
  },
});

const videoVisible = computed<boolean>({
  get: () => activeVideo.value !== null,
  set: (val) => {
    if (!val) {
      activeVideo.value = null;
    }
  },
});

const project = computed(() => (bug.value ? workspaceStore.getProjectById(bug.value.projectId) : undefined));
const creator = computed(() => (bug.value ? workspaceStore.getMemberById(bug.value.creatorId) : undefined));
const timeline = computed(() => (bug.value ? workspaceStore.getActivitiesByBugId(bug.value.id) : []));

const imageAttachments = computed<ImagePreviewItem[]>(() =>
  (bug.value?.attachments ?? [])
    .filter((item) => item.type === 'IMAGE')
    .map((item) => ({ src: item.url, alt: item.name })),
);

const statusOptions: SelectOption<BugStatus>[] = [
  { label: '待处理', value: 'OPEN', tone: 'danger' },
  { label: '处理中', value: 'PROGRESS', tone: 'primary' },
  { label: '待验证', value: 'VERIFY', tone: 'warning' },
  { label: '已关闭', value: 'CLOSED', tone: 'success' },
  { label: '已忽略', value: 'IGNORED', tone: 'muted' },
];

const priorityOptions: SelectOption<BugPriority>[] = [
  { label: 'P0 紧急', value: 'P0', tone: 'danger' },
  { label: 'P1 重要', value: 'P1', tone: 'warning' },
  { label: 'P2 一般', value: 'P2', tone: 'primary' },
];

const assigneeOptions = computed<SelectOption<number>[]>(() =>
  activeMembers.value.map((item) => ({ label: item.name, value: item.id, description: item.title })),
);

const getMember = (userId: number) => workspaceStore.getMemberById(userId);

const handleStatusChange = (value: SelectValue): void => {
  if (!bug.value || typeof value !== 'string') {
    return;
  }
  const { autoReassignedTo } = workspaceStore.updateBugStatus(bug.value.id, value as BugStatus);
  if (autoReassignedTo) {
    message.warning(`已切换至「待验证」，系统已自动回指提单人 ${autoReassignedTo} 验收`);
  } else {
    message.success('状态已更新');
  }
};

const handleAssigneeChange = (value: SelectValue): void => {
  if (!bug.value || typeof value !== 'number') {
    return;
  }
  workspaceStore.updateBugAssignee(bug.value.id, value);
  message.success(`已转派给 ${getMember(value)?.name ?? '成员'}`);
};

const handlePriorityChange = (value: SelectValue): void => {
  if (!bug.value || typeof value !== 'string') {
    return;
  }
  workspaceStore.updateBugPriority(bug.value.id, value as BugPriority);
  message.success('优先级已更新');
};

const handleAddToTodayPlan = (): void => {
  if (!bug.value) {
    return;
  }
  const { existed } = workspaceStore.addBugToTodayPlan(bug.value);
  if (existed) {
    message.info(`${bug.value.code} 已在今日工作计划中`);
  } else {
    message.success(`已将 ${bug.value.code} 加入今日工作计划`);
  }
};

const handlePreviewAttachment = (att: BugAttachmentItem, _idx: number): void => {
  if (att.type === 'IMAGE') {
    const imgIdx = imageAttachments.value.findIndex((item) => item.src === att.url);
    imagePreviewIndex.value = Math.max(0, imgIdx);
    imagePreviewVisible.value = true;
    return;
  }
  activeVideo.value = att;
};

const handleSubmitComment = (): void => {
  if (!bug.value || !commentDraft.value.trim()) {
    return;
  }
  workspaceStore.addBugComment(bug.value.id, commentDraft.value);
  commentDraft.value = '';
  message.success('评论已发布');
};
</script>

<style lang="scss" src="./index.scss" scoped></style>
