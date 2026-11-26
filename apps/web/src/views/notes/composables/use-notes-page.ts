import { confirm, message } from '@/feedback';
import { useWorkspaceStore } from '@/stores';

import type { NoteEditorMode, NoteItem } from '@/types';

const stripMarkdownSnippet = (markdown: string): string => {
  return (
    markdown
      .replace(/```[\s\S]*?```/g, ' [代码片段] ')
      .replace(/[#>*`_\-[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 68) || '暂无正文内容'
  );
};

const extractBulletSummary = (title: string, content: string): string[] => {
  const headings = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^#{1,3}\s+/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/, '').trim())
    .slice(0, 2);

  const listItems = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
    .map((line) =>
      line
        .replace(/^([-*]|\d+\.)\s+/, '')
        .replace(/\*\*/g, '')
        .trim(),
    )
    .slice(0, 3);

  if (listItems.length >= 2) {
    return listItems;
  }

  return [
    `核心主题：围绕「${title || '未命名笔记'}」沉淀排查结论与实现规范。`,
    headings[0] ? `重点章节：${headings.join(' / ')}。` : '建议补充复现步骤与关键代码片段以便后续回溯。',
    '后续行动：可将该排查结论直接同步至关联 Bug 评论或月报草稿。',
  ];
};

/**
 * 个人笔记页面状态、自动保存、AI 提炼与删除确认逻辑
 */
export const useNotesPage = () => {
  const workspaceStore = useWorkspaceStore();

  const keyword = ref('');
  const editorMode = ref<NoteEditorMode>('split');
  const selectedNoteId = ref<number | null>(workspaceStore.notes[0]?.id ?? null);
  const draftTitle = ref('');
  const draftContent = ref('');
  const saveState = ref<'saved' | 'saving'>('saved');
  const aiSummarizing = ref(false);
  const aiSummaryBullets = ref<string[]>([]);

  let saveTimer: number | null = null;
  let aiTimer: number | null = null;
  let hydrating = false;

  const filteredNotes = computed<NoteItem[]>(() => {
    const query = keyword.value.trim().toLowerCase();
    if (!query) {
      return workspaceStore.notes;
    }
    return workspaceStore.notes.filter(
      (item) => item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query),
    );
  });

  const activeNote = computed<NoteItem | null>(() => {
    if (selectedNoteId.value === null) {
      return null;
    }
    return workspaceStore.notes.find((item) => item.id === selectedNoteId.value) ?? null;
  });

  const clearSaveTimer = (): void => {
    if (saveTimer !== null) {
      window.clearTimeout(saveTimer);
      saveTimer = null;
    }
  };

  const flushDraft = (): void => {
    clearSaveTimer();
    if (selectedNoteId.value === null) {
      return;
    }
    const target = workspaceStore.notes.find((item) => item.id === selectedNoteId.value);
    if (!target) {
      return;
    }
    if (target.title !== draftTitle.value || target.content !== draftContent.value) {
      workspaceStore.updateNote(target.id, {
        title: draftTitle.value.trim() || '未命名技术笔记',
        content: draftContent.value,
      });
    }
    saveState.value = 'saved';
  };

  const hydrateDraft = (note: NoteItem | null): void => {
    hydrating = true;
    draftTitle.value = note?.title ?? '';
    draftContent.value = note?.content ?? '';
    saveState.value = 'saved';
    aiSummaryBullets.value = [];
    hydrating = false;
  };

  watch(
    activeNote,
    (note) => {
      hydrateDraft(note);
    },
    { immediate: true },
  );

  watch([draftTitle, draftContent], () => {
    if (hydrating || selectedNoteId.value === null) {
      return;
    }
    saveState.value = 'saving';
    clearSaveTimer();
    saveTimer = window.setTimeout(() => {
      flushDraft();
    }, 350);
  });

  const handleSelectNote = (noteId: number): void => {
    if (selectedNoteId.value === noteId) {
      return;
    }
    flushDraft();
    selectedNoteId.value = noteId;
  };

  const handleCreateNote = (): void => {
    flushDraft();
    keyword.value = '';
    const created = workspaceStore.createNote();
    selectedNoteId.value = created.id;
    editorMode.value = 'split';
    message.success('已新建空白笔记');
  };

  const handleAiSummarize = (): void => {
    if (!activeNote.value || aiSummarizing.value) {
      return;
    }
    if (!draftContent.value.trim()) {
      message.warning('请先录入笔记内容再使用 AI 提炼');
      return;
    }

    aiSummarizing.value = true;
    if (aiTimer !== null) {
      window.clearTimeout(aiTimer);
    }
    aiTimer = window.setTimeout(() => {
      aiSummaryBullets.value = extractBulletSummary(draftTitle.value, draftContent.value);
      aiSummarizing.value = false;
      aiTimer = null;
      message.success('AI 要点提炼完成');
    }, 450);
  };

  const handleInsertSummary = (): void => {
    if (aiSummaryBullets.value.length === 0) {
      return;
    }
    const block = ['> **AI 提炼要点**', ...aiSummaryBullets.value.map((line) => `> - ${line}`), ''].join('\n');
    draftContent.value = `${block}\n${draftContent.value}`;
    aiSummaryBullets.value = [];
    flushDraft();
    message.success('已插入笔记顶部');
  };

  const handleDeleteNote = async (): Promise<void> => {
    const target = activeNote.value;
    if (!target) {
      return;
    }
    const confirmed = await confirm({
      title: '删除个人笔记',
      content: `确定永久删除「${target.title}」吗？删除后无法恢复。`,
      type: 'danger',
      confirmText: '确认删除',
    });
    if (!confirmed) {
      return;
    }
    clearSaveTimer();
    workspaceStore.deleteNote(target.id);
    selectedNoteId.value = workspaceStore.notes[0]?.id ?? null;
    message.success('笔记已删除');
  };

  onBeforeUnmount(() => {
    flushDraft();
    if (aiTimer !== null) {
      window.clearTimeout(aiTimer);
      aiTimer = null;
    }
  });

  return {
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
  };
};
