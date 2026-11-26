import type { MaybeRefOrGetter } from 'vue';
import type { EscapeStackEntry } from '@/types';

const escapeStack: EscapeStackEntry[] = [];
let keydownBound = false;

/**
 * 全局 Escape 按键分发器：仅触发当前最顶层激活弹层的关闭回调
 */
const handleGlobalKeydown = (event: KeyboardEvent): void => {
  if (event.key !== 'Escape' || escapeStack.length === 0) {
    return;
  }

  const topEntry = escapeStack[escapeStack.length - 1];
  if (!topEntry) {
    return;
  }

  event.stopPropagation();
  topEntry.handler();
};

const ensureListenerBound = (): void => {
  if (keydownBound || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('keydown', handleGlobalKeydown);
  keydownBound = true;
};

const cleanupListenerIfEmpty = (): void => {
  if (!keydownBound || escapeStack.length > 0 || typeof window === 'undefined') {
    return;
  }

  window.removeEventListener('keydown', handleGlobalKeydown);
  keydownBound = false;
};

/**
 * 弹层 Escape 关闭栈
 *
 * 确保在抽屉上打开确认框或弹窗内展开下拉菜单时，按 Esc 只关闭最顶层浮层。
 */
export const useEscapeStack = (active: MaybeRefOrGetter<boolean>, onEscape: () => void) => {
  const entryId = Symbol('escape-entry');

  const removeEntry = (): void => {
    const index = escapeStack.findIndex((item) => item.id === entryId);
    if (index !== -1) {
      escapeStack.splice(index, 1);
    }
    cleanupListenerIfEmpty();
  };

  const pushEntry = (): void => {
    removeEntry();
    escapeStack.push({ id: entryId, handler: onEscape });
    ensureListenerBound();
  };

  watch(
    () => toValue(active),
    (isActive) => {
      if (isActive) {
        pushEntry();
      } else {
        removeEntry();
      }
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    removeEntry();
  });
};

/**
 * 仅用于单元测试重置全局 Escape 栈
 */
export const resetEscapeStackForTest = (): void => {
  escapeStack.length = 0;
  cleanupListenerIfEmpty();
};
