import type { MaybeRefOrGetter } from 'vue';
import type { ClickOutsideTarget } from '@/types';

/**
 * 监听目标元素集合之外的点击事件
 *
 * 支持同时排除触发器与 Teleport 到 body 的浮层面板，卸载或作用域销毁时自动解绑监听。
 */
export const useClickOutside = (
  targets: MaybeRefOrGetter<ClickOutsideTarget[]>,
  active: MaybeRefOrGetter<boolean>,
  onOutside: (event: MouseEvent) => void,
) => {
  let bound = false;

  const handleDocumentMousedown = (event: MouseEvent): void => {
    const eventTarget = event.target;
    if (!(eventTarget instanceof Node)) {
      return;
    }

    const elements = toValue(targets);
    const isInside = elements.some((element) => Boolean(element && element.contains(eventTarget)));
    if (!isInside) {
      onOutside(event);
    }
  };

  const unbind = (): void => {
    if (!bound || typeof document === 'undefined') {
      return;
    }

    document.removeEventListener('mousedown', handleDocumentMousedown, true);
    bound = false;
  };

  const bind = (): void => {
    if (bound || typeof document === 'undefined') {
      return;
    }

    document.addEventListener('mousedown', handleDocumentMousedown, true);
    bound = true;
  };

  watch(
    () => toValue(active),
    (isActive) => {
      if (isActive) {
        bind();
      } else {
        unbind();
      }
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    unbind();
  });
};
