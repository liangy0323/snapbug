import type { baseIcons } from '@/components/base/base-icon/icons';

/**
 * 应用主题模式
 */
export type ThemeMode = 'light' | 'dark';

/**
 * 按钮视觉变体
 */
export type ButtonVariant = 'default' | 'primary' | 'soft' | 'danger' | 'ghost';

/**
 * 按钮与输入控件尺寸规格
 */
export type ControlSize = 'sm' | 'md' | 'lg';

/**
 * 输入框类型
 */
export type InputType = 'text' | 'password' | 'textarea' | 'search' | 'email' | 'number';

/**
 * 分页页码渲染项（数字页码或省略号占位）
 */
export type PaginationItem = number | 'ellipsis-left' | 'ellipsis-right';

/**
 * 上传组件支持的媒体分类预设
 */
export type UploadMediaType = 'image' | 'video' | 'media' | 'file';

/**
 * 上传组件 v-model 输出值格式（原始 File 对象或 Base64 Data URL）
 */
export type UploadValueType = 'file' | 'base64';

/**
 * 单个上传值（File 对象或 Base64 / URL 字符串）
 */
export type UploadSingleValue = File | string;

/**
 * 上传组件 v-model 联合类型（多选数组或单选值）
 */
export type UploadModelValue = UploadSingleValue | UploadSingleValue[] | null;

/**
 * 上传文件内部预览记录
 */
export interface UploadPreviewRecord {
  /**
   * 唯一渲染 key
   */
  uid: string;
  /**
   * 对外暴露给 v-model 的实际值（File 或 Base64 字符串）
   */
  value: UploadSingleValue;
  /**
   * 用于图片/视频预览的地址（objectURL 或 Base64）
   */
  previewUrl: string;
  /**
   * 是否为组件自行创建的 Object URL（卸载或删除时需 revoke 释放内存）
   */
  isObjectUrl: boolean;
  /**
   * 文件展示类别
   */
  kind: 'image' | 'video' | 'file';
  /**
   * 文件名称
   */
  name: string;
  /**
   * 文件字节数（外部纯字符串初始化时可选）
   */
  size?: number;
}

/**
 * 下拉选项值类型
 */
export type SelectValue = string | number | null;

/**
 * 下拉触发器语义色调（配合 pill 变体用于彩色状态选择器）
 */
export type SelectTone = 'default' | 'primary' | 'danger' | 'warning' | 'success' | 'muted';

/**
 * 下拉选项数据结构
 */
export interface SelectOption<TValue extends string | number = string | number> {
  /**
   * 展示文案
   */
  label: string;
  /**
   * 选项值
   */
  value: TValue;
  /**
   * 可选辅助副文案
   */
  description?: string;
  /**
   * 选项语义色调（用于状态点或胶囊触发器）
   */
  tone?: SelectTone;
  /**
   * 是否禁用
   */
  disabled?: boolean;
}

/**
 * 图片预览项数据结构（支持纯 URL 字符串或带标题说明对象）
 */
export interface ImagePreviewItem {
  /**
   * 图片地址
   */
  src: string;
  /**
   * 可选图片说明或文件名
   */
  alt?: string;
}

/**
 * 图片预览入参项（支持字符串或对象）
 */
export type ImagePreviewSource = string | ImagePreviewItem;

/**
 * 图片预览变换操作类型
 */
export type ImagePreviewAction = 'zoomIn' | 'zoomOut' | 'clockwise' | 'anticlockwise' | 'reset';

/**
 * 已登记的基础图标名称联合类型
 */
export type BaseIconName = keyof typeof baseIcons;

/**
 * 外部点击监听的可选目标元素类型
 */
export type ClickOutsideTarget = HTMLElement | null | undefined;

/**
 * 全局 Escape 关闭栈记录项
 */
export interface EscapeStackEntry {
  /**
   * 唯一栈项标识
   */
  id: symbol;
  /**
   * 按下 Esc 时触发的关闭回调
   */
  handler: () => void;
}

/**
 * 颗粒渐变 WebGL 渲染配置项
 */
export interface GrainGradientOptions {
  /**
   * 渐变色板（Hex 字符串数组，支持 6 位或 8 位含透明度，最多 7 色）
   */
  colors: string[];
  /**
   * 动画速度倍率
   */
  speed?: number;
  /**
   * 缩放比例
   */
  scale?: number;
  /**
   * 垂直偏移
   */
  offsetY?: number;
  /**
   * 过渡柔和度
   */
  softness?: number;
  /**
   * 扭曲强度
   */
  intensity?: number;
  /**
   * 颗粒噪点强度
   */
  noise?: number;
}

/**
 * 颗粒渐变 WebGL 实例控制句柄
 */
export interface GrainGradientController {
  /**
   * 动态更新着色器颜色数组并立即重绘一帧
   */
  updateColors: (colors: string[]) => void;
  /**
   * 停止动画并释放全部 WebGL 与事件监听资源
   */
  dispose: () => void;
}
