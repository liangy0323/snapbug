import { createVNode, reactive, render } from 'vue';

import { useZIndex } from '@/composables/use-z-index';

import BaseMessage from './base-message.vue';

import type {
  MessageApi,
  MessageHandler,
  MessageInstanceRecord,
  MessageOptions,
  MessageParams,
  MessageState,
  MessageType,
} from '@/types';

const INITIAL_OFFSET = 20;
const VERTICAL_GAP = 12;

let seed = 1;
const instances: MessageInstanceRecord[] = [];
const { nextZIndex } = useZIndex();

/**
 * 重新计算全部在场提示的垂直偏移，确保上方关闭后下方平滑上移
 */
const reflowOffsets = (): void => {
  let top = INITIAL_OFFSET;
  instances.forEach((record) => {
    record.state.offset = top;
    top += record.getHeight() + VERTICAL_GAP;
  });
};

const normalizeParams = (
  params: MessageParams,
  presetType?: MessageType,
): Required<Omit<MessageOptions, 'onClose'>> & {
  onClose?: () => void;
} => {
  const raw: MessageOptions = typeof params === 'string' ? { message: params } : params;
  return {
    message: raw.message,
    type: presetType ?? raw.type ?? 'info',
    duration: raw.duration ?? 2800,
    showClose: raw.showClose ?? false,
    grouping: raw.grouping ?? false,
    onClose: raw.onClose,
  };
};

const showMessage = (params: MessageParams, presetType?: MessageType): MessageHandler => {
  if (typeof document === 'undefined') {
    return { close: () => undefined };
  }

  const options = normalizeParams(params, presetType);

  if (options.grouping) {
    const existing = instances.find(
      (item) => item.state.message === options.message && item.state.type === options.type,
    );
    if (existing) {
      existing.state.repeatNum += 1;
      return { close: existing.close };
    }
  }

  const id = `snapbug_message_${seed++}`;
  const container = document.createElement('div');
  const initialOffset = instances.reduce((acc, item) => acc + item.getHeight() + VERTICAL_GAP, INITIAL_OFFSET);

  const removeFromPool = (): void => {
    const index = instances.findIndex((item) => item.id === id);
    if (index !== -1) {
      instances.splice(index, 1);
      reflowOffsets();
    }
  };

  const state = reactive<MessageState>({
    id,
    message: options.message,
    type: options.type,
    duration: options.duration,
    showClose: options.showClose,
    offset: initialOffset,
    zIndex: nextZIndex(),
    repeatNum: 1,
    onClose: () => {
      options.onClose?.();
      removeFromPool();
    },
    onDestroy: () => {
      render(null, container);
      container.remove();
    },
  });

  const vnode = createVNode(BaseMessage, state);
  render(vnode, container);
  if (container.firstElementChild) {
    document.body.appendChild(container);
  }

  const exposed = vnode.component?.exposed as { close?: () => void; getHeight?: () => number } | undefined;

  const record: MessageInstanceRecord = {
    id,
    state,
    getHeight: () => exposed?.getHeight?.() ?? 42,
    close: () => exposed?.close?.(),
  };

  instances.push(record);

  return {
    close: record.close,
  };
};

/**
 * 关闭当前所有轻提示
 */
const closeAll = (): void => {
  [...instances].forEach((record) => record.close());
};

/**
 * 全局轻提示命令式 API（复刻 Element Plus Message 生命周期与堆叠重排机制）
 */
export const message: MessageApi = Object.assign((params: MessageParams) => showMessage(params), {
  info: (params: MessageParams) => showMessage(params, 'info'),
  success: (params: MessageParams) => showMessage(params, 'success'),
  warning: (params: MessageParams) => showMessage(params, 'warning'),
  error: (params: MessageParams) => showMessage(params, 'error'),
  closeAll,
});
