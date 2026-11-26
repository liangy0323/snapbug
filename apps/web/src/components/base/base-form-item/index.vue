<template>
  <div
    class="base-form-item"
    :class="[
      `base-form-item--label-${resolvedLabelPosition}`,
      {
        'base-form-item--required': isRequired,
        'base-form-item--error': isError,
      },
    ]"
  >
    <label v-if="props.label || $slots.label" class="base-form-item__label" :style="labelStyle">
      <slot name="label">
        <span v-if="isRequired" class="base-form-item__asterisk" aria-hidden="true">*</span>
        <span>{{ props.label }}</span>
      </slot>
    </label>

    <div class="base-form-item__content">
      <slot />
      <transition name="base-form-item-error">
        <p v-if="shouldShowError" class="base-form-item__error" role="alert">
          {{ validateMessage }}
        </p>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 导入工具类
 */
import { cloneDeep } from '@repo/shared/utils';

import {
  ensureRuleList,
  FORM_CONTEXT_KEY,
  FORM_ITEM_CONTEXT_KEY,
  matchesTrigger,
  validateFieldRules,
} from '@/components/base/base-form/form-context';

/**
 * 导入类型声明
 */
import type { CSSProperties } from 'vue';
import type { FormItemContext, FormLabelPosition, FormRuleItem, FormValidateState, FormValidateTrigger } from '@/types';

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 表单项标题
   */
  label?: string;
  /**
   * 对应 BaseForm model 中的字段名
   */
  prop?: string;
  /**
   * 单字段覆盖规则（会与 BaseForm.rules 合并）
   */
  rules?: FormRuleItem | FormRuleItem[];
  /**
   * 显式控制必填星号与必填校验
   */
  required?: boolean;
  /**
   * 单项覆盖标签排版方向
   */
  labelPosition?: FormLabelPosition;
  /**
   * 单项覆盖标签宽度
   */
  labelWidth?: string | number;
  /**
   * 是否展示错误提示文案
   */
  showMessage?: boolean;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  label: '',
  prop: '',
  rules: undefined,
  required: undefined,
  labelPosition: undefined,
  labelWidth: undefined,
  showMessage: undefined,
});

/**
 * 注入父级表单上下文
 */
const formContext = inject(FORM_CONTEXT_KEY, null);

/**
 * 定义响应式数据
 */
const validateState = ref<FormValidateState>('');
const validateMessage = ref('');
let initialValue: unknown = undefined;
let hasCapturedInitial = false;

/**
 * 计算属性
 * 作用：合并表单级规则与表单项规则
 */
const mergedRules = computed<FormRuleItem[]>(() => {
  const formRules = props.prop ? ensureRuleList(formContext?.rules.value?.[props.prop]) : [];
  const selfRules = ensureRuleList(props.rules);
  const rules = [...formRules, ...selfRules];

  if (props.required && !rules.some((rule) => rule.required)) {
    rules.unshift({ required: true });
  }
  return rules;
});

/**
 * 计算属性
 * 作用：是否展示必填星号
 */
const isRequired = computed<boolean>(() => {
  if (props.required !== undefined) {
    return props.required;
  }
  return mergedRules.value.some((rule) => rule.required);
});

const isError = computed<boolean>(() => validateState.value === 'error');

const shouldShowError = computed<boolean>(() => {
  const allowShow = props.showMessage ?? formContext?.showMessage.value ?? true;
  return Boolean(allowShow && isError.value && validateMessage.value);
});

const resolvedLabelPosition = computed<FormLabelPosition>(() => {
  return props.labelPosition ?? formContext?.labelPosition.value ?? 'top';
});

const labelStyle = computed<CSSProperties>(() => {
  if (resolvedLabelPosition.value === 'top') {
    return {};
  }
  const rawWidth = props.labelWidth ?? formContext?.labelWidth.value;
  if (!rawWidth) {
    return {};
  }
  const width = typeof rawWidth === 'number' ? `${rawWidth}px` : rawWidth;
  return { width };
});

/**
 * 读取当前字段值
 */
const getFieldValue = (): unknown => {
  const model = formContext?.model.value;
  if (!model || !props.prop) {
    return undefined;
  }
  return model[props.prop];
};

/**
 * 清除校验错误状态
 */
const clearValidate = (): void => {
  validateState.value = '';
  validateMessage.value = '';
};

/**
 * 执行字段校验
 */
const validate = async (trigger?: FormValidateTrigger): Promise<boolean> => {
  const targetRules = mergedRules.value.filter((rule) => matchesTrigger(rule, trigger));
  if (targetRules.length === 0) {
    return true;
  }

  validateState.value = 'validating';
  const model = formContext?.model.value ?? {};
  const errorMessage = await validateFieldRules(getFieldValue(), targetRules, model, props.label);

  if (errorMessage) {
    validateState.value = 'error';
    validateMessage.value = errorMessage;
    return false;
  }

  validateState.value = 'success';
  validateMessage.value = '';
  return true;
};

/**
 * 重置当前字段为初始快照并清除错误提示
 */
const resetField = (): void => {
  const model = formContext?.model.value;
  if (model && props.prop && hasCapturedInitial) {
    model[props.prop] = cloneDeep(initialValue);
  }
  clearValidate();
};

const fieldContext: FormItemContext = {
  get prop() {
    return props.prop;
  },
  validateState,
  validateMessage,
  isError,
  validate,
  clearValidate,
  resetField,
};

provide(FORM_ITEM_CONTEXT_KEY, fieldContext);

/**
 * 生命周期函数
 */
onMounted(() => {
  if (props.prop) {
    initialValue = cloneDeep(getFieldValue());
    hasCapturedInitial = true;
    formContext?.addField(fieldContext);
  }
});

onBeforeUnmount(() => {
  formContext?.removeField(fieldContext);
});
</script>

<style lang="scss" src="./index.scss" scoped></style>
