import { createVNode, render } from 'vue';

import BaseConfirm from './base-confirm.vue';

import type { ConfirmOptions } from '@/types';

/**
 * 命令式确认弹框（复刻 Element Plus MessageBox 挂载销毁机制，返回 Promise<boolean>）
 */
export const confirm = (options: string | ConfirmOptions): Promise<boolean> => {
  if (typeof document === 'undefined') {
    return Promise.resolve(false);
  }

  const normalized: ConfirmOptions = typeof options === 'string' ? { content: options } : options;

  return new Promise<boolean>((resolve) => {
    const container = document.createElement('div');

    const vnode = createVNode(BaseConfirm, {
      ...normalized,
      onResolve: (confirmed: boolean) => {
        resolve(confirmed);
      },
      onVanish: () => {
        render(null, container);
        container.remove();
      },
    });

    render(vnode, container);
    document.body.appendChild(container);
  });
};
