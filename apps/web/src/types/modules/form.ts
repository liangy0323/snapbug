import type { ComputedRef, Ref } from 'vue';

/**
 * 表单校验触发时机
 */
export type FormValidateTrigger = 'blur' | 'change';

/**
 * 表单项当前校验状态
 */
export type FormValidateState = '' | 'validating' | 'success' | 'error';

/**
 * 表单标签排版方向
 */
export type FormLabelPosition = 'top' | 'left' | 'right';

/**
 * 单条表单校验规则
 */
export interface FormRuleItem {
  /**
   * 是否必填
   */
  required?: boolean;
  /**
   * 最小长度（字符串/数组）或最小值（数字）
   */
  min?: number;
  /**
   * 最大长度（字符串/数组）或最大值（数字）
   */
  max?: number;
  /**
   * 正则表达式校验
   */
  pattern?: RegExp;
  /**
   * 校验失败提示文案
   */
  message?: string;
  /**
   * 触发时机；省略则 blur 与 change 均触发
   */
  trigger?: FormValidateTrigger | FormValidateTrigger[];
  /**
   * 自定义同步/异步校验函数：返回 string 表示错误提示，返回 false 使用规则 message，返回 true/void 表示通过
   */
  validator?: (
    value: unknown,
    model: Record<string, unknown>,
  ) => boolean | string | void | Promise<boolean | string | void>;
}

/**
 * 表单规则映射表（按字段 prop 组织，兼容任意 interface 模型）
 */
export type FormRules<TModel extends object = Record<string, unknown>> = Partial<
  Record<keyof TModel & string, FormRuleItem | FormRuleItem[]>
>;

/**
 * 单个表单项注册到 Form 容器的上下文协议
 */
export interface FormItemContext {
  /**
   * 绑定的 model 字段名
   */
  prop: string;
  /**
   * 当前校验状态
   */
  validateState: Ref<FormValidateState>;
  /**
   * 当前错误提示文案
   */
  validateMessage: Ref<string>;
  /**
   * 是否处于错误态
   */
  isError: ComputedRef<boolean>;
  /**
   * 触发指定时机的校验
   */
  validate: (trigger?: FormValidateTrigger) => Promise<boolean>;
  /**
   * 清除当前表单项校验结果
   */
  clearValidate: () => void;
  /**
   * 重置字段值至初始快照并清除校验结果
   */
  resetField: () => void;
}

/**
 * Form 容器提供给所有子 FormItem 的上下文协议
 */
export interface FormContext {
  /**
   * 表单数据对象
   */
  model: ComputedRef<Record<string, unknown> | undefined>;
  /**
   * 表单校验规则表
   */
  rules: ComputedRef<FormRules | undefined>;
  /**
   * 标签位置
   */
  labelPosition: ComputedRef<FormLabelPosition>;
  /**
   * 标签宽度
   */
  labelWidth: ComputedRef<string>;
  /**
   * 是否全局禁用
   */
  disabled: ComputedRef<boolean>;
  /**
   * 是否显示错误提示
   */
  showMessage: ComputedRef<boolean>;
  /**
   * 注册子表单项
   */
  addField: (field: FormItemContext) => void;
  /**
   * 注销子表单项
   */
  removeField: (field: FormItemContext) => void;
}

/**
 * BaseForm 通过 defineExpose 暴露的实例方法
 */
export interface FormInstance {
  /**
   * 校验整个表单
   */
  validate: () => Promise<boolean>;
  /**
   * 校验指定一个或多个字段
   */
  validateField: (props?: string | string[]) => Promise<boolean>;
  /**
   * 清除指定或全部字段的校验提示
   */
  clearValidate: (props?: string | string[]) => void;
  /**
   * 重置全部字段到初始值并清除校验提示
   */
  resetFields: () => void;
}
