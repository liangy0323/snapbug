/**
 * 轻提示语义类型
 */
export type MessageType = 'info' | 'success' | 'warning' | 'error';

/**
 * 轻提示配置项
 */
export interface MessageOptions {
  /**
   * 提示文案
   */
  message: string;
  /**
   * 语义类型
   */
  type?: MessageType;
  /**
   * 自动关闭时长（ms），设为 0 则需手动关闭
   */
  duration?: number;
  /**
   * 是否展示关闭按钮
   */
  showClose?: boolean;
  /**
   * 同文案同类型是否合并计数，避免连点刷屏
   */
  grouping?: boolean;
  /**
   * 关闭回调
   */
  onClose?: () => void;
}

/**
 * 轻提示控制句柄
 */
export interface MessageHandler {
  /**
   * 手动关闭当前轻提示
   */
  close: () => void;
}

/**
 * 轻提示入参（支持纯文本或完整配置）
 */
export type MessageParams = string | MessageOptions;

/**
 * 轻提示实例运行态
 */
export interface MessageState {
  id: string;
  message: string;
  type: MessageType;
  duration: number;
  showClose: boolean;
  offset: number;
  zIndex: number;
  repeatNum: number;
  onClose: () => void;
  onDestroy: () => void;
}

/**
 * 轻提示池记录项
 */
export interface MessageInstanceRecord {
  id: string;
  state: MessageState;
  getHeight: () => number;
  close: () => void;
}

/**
 * 全局轻提示命令式 API 契约
 */
export interface MessageApi {
  (params: MessageParams): MessageHandler;
  info: (params: MessageParams) => MessageHandler;
  success: (params: MessageParams) => MessageHandler;
  warning: (params: MessageParams) => MessageHandler;
  error: (params: MessageParams) => MessageHandler;
  closeAll: () => void;
}

/**
 * 确认弹框视觉语义类型
 */
export type ConfirmType = 'info' | 'warning' | 'danger';

/**
 * 确认弹框配置项
 */
export interface ConfirmOptions {
  /**
   * 弹框标题
   */
  title?: string;
  /**
   * 确认说明文案
   */
  content: string;
  /**
   * 视觉语义类型
   */
  type?: ConfirmType;
  /**
   * 确认按钮文案
   */
  confirmText?: string;
  /**
   * 取消按钮文案
   */
  cancelText?: string;
  /**
   * 是否允许点击遮罩取消
   */
  closeOnClickModal?: boolean;
  /**
   * 是否允许按 Esc 取消
   */
  closeOnPressEscape?: boolean;
  /**
   * 异步确认钩子，执行期间确认按钮进入 loading 态；返回 false 可阻止关闭
   */
  beforeConfirm?: () => boolean | void | Promise<boolean | void>;
}
