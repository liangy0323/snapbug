<template>
  <section class="page-bugs">
    <div class="page-bugs__card">
      <!-- 顶部工具栏 -->
      <div class="page-bugs__toolbar">
        <div class="page-bugs__toolbar-left">
          <div class="page-bugs__project-picker">
            <base-select
              v-model="selectedProjectId"
              :options="projectOptions"
              size="sm"
              filterable
              clearable
              placeholder="全部项目"
            />
          </div>
          <base-button size="sm" icon="FolderPlus" @click="handleOpenCreateProject">新建项目</base-button>

          <div class="page-bugs__tabs" role="tablist">
            <button
              type="button"
              class="page-bugs__tab"
              :class="{ 'page-bugs__tab--active': scopeTab === 'all' }"
              @click="scopeTab = 'all'"
            >
              全部
            </button>
            <button
              type="button"
              class="page-bugs__tab"
              :class="{ 'page-bugs__tab--active': scopeTab === 'mine' }"
              @click="scopeTab = 'mine'"
            >
              指派给我
            </button>
            <button
              type="button"
              class="page-bugs__tab"
              :class="{ 'page-bugs__tab--active': scopeTab === 'created' }"
              @click="scopeTab = 'created'"
            >
              我提交的
            </button>
          </div>
        </div>

        <div class="page-bugs__toolbar-right">
          <div class="page-bugs__search">
            <base-input v-model="keyword" size="sm" prefix-icon="Search" clearable placeholder="搜索标题或 BUG-xxx" />
          </div>
          <div class="page-bugs__status-filter">
            <base-select v-model="statusFilter" :options="statusOptions" size="sm" clearable placeholder="全部状态" />
          </div>
          <div class="page-bugs__view-toggle">
            <button
              type="button"
              class="page-bugs__vt-btn"
              :class="{ 'page-bugs__vt-btn--active': viewMode === 'table' }"
              @click="viewMode = 'table'"
            >
              <base-icon icon="List" :size="14" />
              <span>列表</span>
            </button>
            <button
              type="button"
              class="page-bugs__vt-btn"
              :class="{ 'page-bugs__vt-btn--active': viewMode === 'card' }"
              @click="viewMode = 'card'"
            >
              <base-icon icon="LayoutGrid" :size="14" />
              <span>卡片</span>
            </button>
          </div>
          <base-button variant="primary" size="sm" icon="Plus" @click="openCreateBugDialog">提 Bug</base-button>
        </div>
      </div>

      <!-- 列表视图 -->
      <template v-if="pagedBugs.length > 0">
        <div v-if="viewMode === 'table'" class="page-bugs__table">
          <div class="page-bugs__table-head">
            <span>编号</span>
            <span>问题标题</span>
            <span>所属项目</span>
            <span>优先级</span>
            <span>当前状态</span>
            <span>指派人</span>
            <span>更新时间</span>
          </div>

          <div v-for="bug in pagedBugs" :key="bug.id" class="page-bugs__row" @click="openBugDetail(bug.id)">
            <span class="page-bugs__code">{{ bug.code }}</span>
            <span class="page-bugs__title-cell">
              <span class="page-bugs__title-text">{{ bug.title }}</span>
              <span v-if="bug.aiOptimized" class="page-bugs__ai-tag">AI</span>
              <base-icon v-if="bug.attachments.length > 0" icon="Paperclip" :size="13" class="page-bugs__att-icon" />
            </span>
            <span class="page-bugs__project-tag">{{ getProjectName(bug.projectId) }}</span>
            <span class="page-bugs__prio" :class="`page-bugs__prio--${bug.priority.toLowerCase()}`">
              <i class="page-bugs__prio-dot" />
              {{ bug.priority }}
            </span>
            <div @click.stop>
              <base-select
                :model-value="bug.status"
                :options="statusOptions"
                variant="pill"
                @change="(val) => handleInlineStatusChange(bug.id, val)"
              />
            </div>
            <span class="page-bugs__assignee">
              <span
                class="page-bugs__avatar"
                :style="{ backgroundColor: getMember(bug.assigneeId)?.avatarColor || '#86909c' }"
              >
                {{ getMember(bug.assigneeId)?.name?.[0] || 'U' }}
              </span>
              <span>{{ getMember(bug.assigneeId)?.name || '成员' }}</span>
            </span>
            <span class="page-bugs__time">{{ bug.updatedAt }}</span>
          </div>
        </div>

        <!-- 卡片视图 -->
        <div v-else class="page-bugs__card-grid">
          <article
            v-for="bug in pagedBugs"
            :key="bug.id"
            class="page-bugs__bug-card"
            :class="`page-bugs__bug-card--${bug.priority.toLowerCase()}`"
            @click="openBugDetail(bug.id)"
          >
            <div class="page-bugs__bug-card-top">
              <div class="page-bugs__bug-card-tags">
                <span class="page-bugs__code">{{ bug.code }}</span>
                <span class="page-bugs__project-tag">{{ getProjectName(bug.projectId) }}</span>
                <span v-if="bug.aiOptimized" class="page-bugs__ai-tag">AI 优化</span>
              </div>
              <div @click.stop>
                <base-select
                  :model-value="bug.status"
                  :options="statusOptions"
                  variant="pill"
                  @change="(val) => handleInlineStatusChange(bug.id, val)"
                />
              </div>
            </div>

            <h3 class="page-bugs__bug-card-title">{{ bug.title }}</h3>
            <p class="page-bugs__bug-card-desc">{{ bug.description }}</p>

            <div class="page-bugs__bug-card-foot">
              <span class="page-bugs__assignee">
                <span
                  class="page-bugs__avatar"
                  :style="{ backgroundColor: getMember(bug.assigneeId)?.avatarColor || '#86909c' }"
                >
                  {{ getMember(bug.assigneeId)?.name?.[0] || 'U' }}
                </span>
                <span>{{ getMember(bug.assigneeId)?.name }}</span>
              </span>
              <span class="page-bugs__prio" :class="`page-bugs__prio--${bug.priority.toLowerCase()}`">
                {{ bug.priority }} · {{ bug.updatedAt }}
              </span>
            </div>
          </article>
        </div>

        <div class="page-bugs__pagination">
          <base-pagination v-model="currentPage" :total="filteredBugs.length" :page-size="pageSize" />
        </div>
      </template>

      <base-empty v-else title="暂无匹配的缺陷记录" description="尝试切换项目、清空关键词或直接提交一条新 Bug">
        <template #action>
          <div class="page-bugs__empty-actions">
            <base-button size="sm" @click="handleResetFilters">重置筛选</base-button>
            <base-button variant="primary" size="sm" @click="openCreateBugDialog">快速提 Bug</base-button>
          </div>
        </template>
      </base-empty>
    </div>

    <!-- 新建项目弹窗 -->
    <base-dialog v-model="projectDialogVisible" title="新建协作项目" :width="460" destroy-on-close>
      <base-form
        ref="projectFormRef"
        :model="projectForm"
        :rules="projectRules"
        @submit="handleCreateProject(projectFormRef)"
      >
        <base-form-item label="项目名称" prop="name">
          <base-input v-model="projectForm.name" placeholder="例如：开放平台 API 网关" clearable :maxlength="40" />
        </base-form-item>
        <base-form-item label="项目简介（可选）">
          <base-input
            v-model="projectForm.description"
            type="textarea"
            :rows="3"
            placeholder="简述负责范围或关联仓库..."
          />
        </base-form-item>
      </base-form>
      <template #footer="{ close }">
        <base-button @click="close">取消</base-button>
        <base-button variant="primary" @click="handleCreateProject(projectFormRef)">创建项目</base-button>
      </template>
    </base-dialog>
  </section>
</template>

<script setup lang="ts">
import { useBugList } from './composables/use-bug-list';

import type { FormInstance } from '@/types';

const projectFormRef = useTemplateRef<FormInstance | null>('projectFormRef');

const {
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
  openCreateBugDialog,
  openBugDetail,
  getMember,
  getProjectName,
} = useBugList();
</script>

<style lang="scss" src="./index.scss" scoped></style>
