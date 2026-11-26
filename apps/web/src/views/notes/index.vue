<template>
  <div class="notes-page">
    <aside class="notes-sidebar">
      <div class="notes-sidebar__header">
        <base-input v-model="keyword" size="sm" prefix-icon="Search" clearable placeholder="搜索笔记标题或正文..." />
        <base-button variant="primary" size="sm" icon="Plus" @click="handleCreateNote">新建</base-button>
      </div>

      <div class="notes-sidebar__list">
        <template v-if="filteredNotes.length > 0">
          <button
            v-for="item in filteredNotes"
            :key="item.id"
            type="button"
            class="notes-sidebar__item"
            :class="{ 'notes-sidebar__item--active': item.id === selectedNoteId }"
            @click="handleSelectNote(item.id)"
          >
            <div class="notes-sidebar__item-title">{{ item.title || '未命名技术笔记' }}</div>
            <p class="notes-sidebar__item-snippet">{{ stripMarkdownSnippet(item.content) }}</p>
            <span class="notes-sidebar__item-time">{{ item.updatedAt }}</span>
          </button>
        </template>
        <base-empty v-else compact title="没有找到相关笔记" description="更换关键词或点击右上角新建一篇私有笔记" />
      </div>
    </aside>

    <section class="notes-editor">
      <template v-if="activeNote">
        <header class="notes-editor__header">
          <input
            v-model="draftTitle"
            type="text"
            class="notes-editor__title-input"
            placeholder="请输入笔记标题..."
            maxlength="80"
          />

          <div class="notes-editor__toolbar">
            <div class="notes-editor__meta">
              <span
                class="notes-editor__save-dot"
                :class="{ 'notes-editor__save-dot--saving': saveState === 'saving' }"
              />
              <span>{{ saveState === 'saving' ? '正在保存...' : `已自动保存 · ${activeNote.updatedAt}` }}</span>
            </div>

            <div class="notes-editor__actions">
              <div class="notes-editor__modes" role="tablist" aria-label="编辑模式切换">
                <button
                  type="button"
                  class="notes-editor__mode-btn"
                  :class="{ 'notes-editor__mode-btn--active': editorMode === 'edit' }"
                  @click="editorMode = 'edit'"
                >
                  编辑
                </button>
                <button
                  type="button"
                  class="notes-editor__mode-btn"
                  :class="{ 'notes-editor__mode-btn--active': editorMode === 'split' }"
                  @click="editorMode = 'split'"
                >
                  分栏
                </button>
                <button
                  type="button"
                  class="notes-editor__mode-btn"
                  :class="{ 'notes-editor__mode-btn--active': editorMode === 'preview' }"
                  @click="editorMode = 'preview'"
                >
                  预览
                </button>
              </div>

              <base-button variant="soft" size="sm" icon="Sparkles" :loading="aiSummarizing" @click="handleAiSummarize">
                AI 提炼
              </base-button>
              <base-button variant="danger" size="sm" icon="Trash2" @click="handleDeleteNote">删除</base-button>
            </div>
          </div>
        </header>

        <div v-if="aiSummaryBullets.length > 0" class="notes-editor__ai-banner">
          <div class="notes-editor__ai-head">
            <span class="notes-editor__ai-title">
              <base-icon icon="Sparkles" :size="14" />
              AI 要点提炼结果
            </span>
            <div class="notes-editor__ai-ops">
              <base-button size="sm" variant="primary" @click="handleInsertSummary">插入笔记顶部</base-button>
              <base-button size="sm" variant="ghost" @click="aiSummaryBullets = []">收起</base-button>
            </div>
          </div>
          <ul class="notes-editor__ai-list">
            <li v-for="(bullet, index) in aiSummaryBullets" :key="index">{{ bullet }}</li>
          </ul>
        </div>

        <div class="notes-editor__body" :class="`notes-editor__body--${editorMode}`">
          <div v-if="editorMode !== 'preview'" class="notes-editor__pane notes-editor__pane--source">
            <textarea
              v-model="draftContent"
              class="notes-editor__textarea"
              placeholder="使用 Markdown 记录排查步骤、SQL 或代码片段..."
              spellcheck="false"
            />
          </div>

          <div v-if="editorMode !== 'edit'" class="notes-editor__pane notes-editor__pane--preview">
            <base-markdown-preview v-if="draftContent.trim()" :content="draftContent" />
            <base-empty v-else compact title="暂无可预览内容" description="在左侧输入 Markdown 内容后将实时渲染预览" />
          </div>
        </div>
      </template>

      <div v-else class="notes-editor__empty">
        <base-empty title="尚未选中笔记" description="从左侧列表选择一篇技术笔记，或立即新建一篇私有 Markdown 笔记">
          <template #action>
            <base-button variant="primary" icon="Plus" @click="handleCreateNote">新建笔记</base-button>
          </template>
        </base-empty>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useNotesPage } from './composables/use-notes-page';

const {
  keyword,
  editorMode,
  selectedNoteId,
  filteredNotes,
  activeNote,
  draftTitle,
  draftContent,
  saveState,
  aiSummarizing,
  aiSummaryBullets,
  stripMarkdownSnippet,
  handleSelectNote,
  handleCreateNote,
  handleAiSummarize,
  handleInsertSummary,
  handleDeleteNote,
} = useNotesPage();
</script>

<style scoped lang="scss" src="./index.scss"></style>
