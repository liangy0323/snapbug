import type { MaybeRefOrGetter } from 'vue';

const LOCK_CLASS_NAME = 'snapbug-scroll-locked';

let lockCount = 0;
let savedPaddingRight = '';

/**
 * 计算当前页面垂直滚动条宽度，防止锁定滚动时页面内容水平抖动
 */
const getScrollbarWidth = (): number => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0;
  }

  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
};

/**
 * 累加滚动锁引用计数
 */
const acquireLock = (): void => {
  if (typeof document === 'undefined') {
    return;
  }

  if (lockCount === 0) {
    const scrollbarWidth = getScrollbarWidth();
    savedPaddingRight = document.body.style.paddingRight;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.classList.add(LOCK_CLASS_NAME);
  }

  lockCount += 1;
};

/**
 * 释放滚动锁引用计数，仅当全部弹层关闭时恢复滚动
 */
const releaseLock = (): void => {
  if (typeof document === 'undefined' || lockCount <= 0) {
    return;
  }

  lockCount -= 1;
  if (lockCount === 0) {
    document.body.classList.remove(LOCK_CLASS_NAME);
    document.body.style.paddingRight = savedPaddingRight;
    savedPaddingRight = '';
  }
};

/**
 * 引用计数式页面滚动锁
 *
 * 借鉴 Element Plus useLockscreen，并采用引用计数支持多层弹窗/抽屉/确认框叠加而不互相干扰。
 */
export const useScrollLock = (locked: MaybeRefOrGetter<boolean>) => {
  let holdingLock = false;

  const unlock = (): void => {
    if (!holdingLock) {
      return;
    }

    holdingLock = false;
    releaseLock();
  };

  const lock = (): void => {
    if (holdingLock) {
      return;
    }

    holdingLock = true;
    acquireLock();
  };

  watch(
    () => toValue(locked),
    (shouldLock) => {
      if (shouldLock) {
        lock();
      } else {
        unlock();
      }
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    unlock();
  });

  return {
    lock,
    unlock,
  };
};

/**
 * 仅用于单元测试重置全局滚动锁状态
 */
export const resetScrollLockForTest = (): void => {
  lockCount = 0;
  savedPaddingRight = '';
  if (typeof document !== 'undefined') {
    document.body.classList.remove(LOCK_CLASS_NAME);
    document.body.style.paddingRight = '';
  }
};
