import type { InjectionKey } from 'vue';
import type { FormContext, FormItemContext, FormRuleItem, FormValidateTrigger } from '@/types';

/**
 * BaseForm 提供给子组件的注入键
 */
export const FORM_CONTEXT_KEY: InjectionKey<FormContext> = Symbol('snapbug-form-context');

/**
 * BaseFormItem 提供给内部输入控件（BaseInput / BaseSelect）的注入键
 */
export const FORM_ITEM_CONTEXT_KEY: InjectionKey<FormItemContext> = Symbol('snapbug-form-item-context');

/**
 * 归一化规则配置为数组
 */
export const ensureRuleList = (rules?: FormRuleItem | FormRuleItem[]): FormRuleItem[] => {
  if (!rules) {
    return [];
  }
  return Array.isArray(rules) ? rules : [rules];
};

/**
 * 判断规则是否匹配指定触发时机
 */
export const matchesTrigger = (rule: FormRuleItem, trigger?: FormValidateTrigger): boolean => {
  if (!trigger || !rule.trigger) {
    return true;
  }
  return Array.isArray(rule.trigger) ? rule.trigger.includes(trigger) : rule.trigger === trigger;
};

/**
 * 判断字段值是否为空
 */
const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
};

/**
 * 按顺序执行单字段校验规则，返回首个错误文案；全部通过返回空字符串
 */
export const validateFieldRules = async (
  value: unknown,
  rules: FormRuleItem[],
  model: Record<string, unknown>,
  label?: string,
): Promise<string> => {
  const fieldName = label || '该项';

  for (const rule of rules) {
    if (rule.required && isEmptyValue(value)) {
      return rule.message || `请输入${fieldName}`;
    }

    if (!isEmptyValue(value)) {
      if (typeof rule.min === 'number') {
        if (typeof value === 'string' && value.trim().length < rule.min) {
          return rule.message || `${fieldName}不能少于 ${rule.min} 个字符`;
        }
        if (Array.isArray(value) && value.length < rule.min) {
          return rule.message || `${fieldName}至少选择 ${rule.min} 项`;
        }
        if (typeof value === 'number' && value < rule.min) {
          return rule.message || `${fieldName}不能小于 ${rule.min}`;
        }
      }

      if (typeof rule.max === 'number') {
        if (typeof value === 'string' && value.trim().length > rule.max) {
          return rule.message || `${fieldName}不能超过 ${rule.max} 个字符`;
        }
        if (Array.isArray(value) && value.length > rule.max) {
          return rule.message || `${fieldName}最多选择 ${rule.max} 项`;
        }
        if (typeof value === 'number' && value > rule.max) {
          return rule.message || `${fieldName}不能大于 ${rule.max}`;
        }
      }

      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        return rule.message || `${fieldName}格式不正确`;
      }
    }

    if (rule.validator) {
      const result = await rule.validator(value, model);
      if (typeof result === 'string' && result.length > 0) {
        return result;
      }
      if (result === false) {
        return rule.message || `${fieldName}校验未通过`;
      }
    }
  }

  return '';
};
