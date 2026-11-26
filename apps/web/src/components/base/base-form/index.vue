<template>
  <form
    class="base-form"
    :class="[`base-form--label-${props.labelPosition}`, { 'base-form--inline': props.inline }]"
    novalidate
    @submit.prevent="emits('submit', $event)"
  >
    <slot />
  </form>
</template>

<script setup lang="ts">
/**
 * 导入工具类
 */
import { FORM_CONTEXT_KEY } from './form-context';

/**
 * 导入类型声明
 */
import type { FormInstance, FormItemContext, FormLabelPosition, FormRules } from '@/types';

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 表单数据对象
   */
  model?: object;
  /**
   * 表单校验规则
   */
  rules?: FormRules;
  /**
   * 标签排版方向
   */
  labelPosition?: FormLabelPosition;
  /**
   * 左侧/右侧排版时的标签宽度（如 88 或 '96px'）
   */
  labelWidth?: string | number;
  /**
   * 是否行内排版
   */
  inline?: boolean;
  /**
   * 是否禁用表单内全部输入控件
   */
  disabled?: boolean;
  /**
   * 是否展示校验失败提示文案
   */
  showMessage?: boolean;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  model: undefined,
  rules: undefined,
  labelPosition: 'top',
  labelWidth: '',
  inline: false,
  disabled: false,
  showMessage: true,
});

/**
 * 定义 emits 的类型声明
 */
interface Emits {
  submit: [event: SubmitEvent];
}

/**
 * 定义 emits
 */
const emits = defineEmits<Emits>();

/**
 * 维护当前挂载的表单项集合
 */
const fields: FormItemContext[] = [];

const addField = (field: FormItemContext): void => {
  if (!fields.includes(field)) {
    fields.push(field);
  }
};

const removeField = (field: FormItemContext): void => {
  const index = fields.indexOf(field);
  if (index !== -1) {
    fields.splice(index, 1);
  }
};

const filterTargetFields = (targetProps?: string | string[]): FormItemContext[] => {
  if (!targetProps) {
    return fields;
  }
  const propSet = new Set(Array.isArray(targetProps) ? targetProps : [targetProps]);
  return fields.filter((field) => field.prop && propSet.has(field.prop));
};

/**
 * 校验指定字段或全部字段
 */
const validateField = async (targetProps?: string | string[]): Promise<boolean> => {
  const targetFields = filterTargetFields(targetProps);
  if (targetFields.length === 0) {
    return true;
  }

  const results = await Promise.all(targetFields.map((field) => field.validate()));
  return results.every(Boolean);
};

/**
 * 校验整个表单
 */
const validate = (): Promise<boolean> => {
  return validateField();
};

/**
 * 清除指定字段或全部字段的校验提示
 */
const clearValidate = (targetProps?: string | string[]): void => {
  filterTargetFields(targetProps).forEach((field) => field.clearValidate());
};

/**
 * 重置全部字段到初始值并清除校验提示
 */
const resetFields = (): void => {
  fields.forEach((field) => field.resetField());
};

const normalizedLabelWidth = computed<string>(() => {
  if (props.labelWidth === '') {
    return '';
  }
  return typeof props.labelWidth === 'number' ? `${props.labelWidth}px` : props.labelWidth;
});

provide(FORM_CONTEXT_KEY, {
  model: computed(() => props.model as Record<string, unknown> | undefined),
  rules: computed(() => props.rules),
  labelPosition: computed(() => props.labelPosition),
  labelWidth: normalizedLabelWidth,
  disabled: computed(() => props.disabled),
  showMessage: computed(() => props.showMessage),
  addField,
  removeField,
});

/**
 * 导出方法
 */
defineExpose<FormInstance>({
  validate,
  validateField,
  clearValidate,
  resetFields,
});
</script>

<style lang="scss" scoped>
.base-form {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &--inline {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 12px 16px;
  }
}
</style>
