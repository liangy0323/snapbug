<template>
  <div
    class="base-input"
    :class="[
      `base-input--${props.size}`,
      {
        'base-input--textarea': isTextarea,
        'base-input--disabled': isDisabled,
        'base-input--error': isError,
        'base-input--focused': isFocused,
      },
    ]"
  >
    <template v-if="isTextarea">
      <textarea
        ref="textareaRef"
        v-model="modelValue"
        class="base-input__textarea"
        :rows="props.rows"
        :placeholder="props.placeholder"
        :disabled="isDisabled"
        :readonly="props.readonly"
        :maxlength="props.maxlength"
        :aria-invalid="isError || undefined"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
      />
      <span v-if="showLimit" class="base-input__count base-input__count--textarea">
        {{ currentLength }} / {{ props.maxlength }}
      </span>
    </template>

    <template v-else>
      <base-icon v-if="props.prefixIcon" :icon="props.prefixIcon" :size="15" class="base-input__prefix" />

      <input
        ref="inputRef"
        v-model="modelValue"
        class="base-input__inner"
        :type="resolvedNativeType"
        :placeholder="props.placeholder"
        :disabled="isDisabled"
        :readonly="props.readonly"
        :maxlength="props.maxlength"
        :autocomplete="props.autocomplete"
        :aria-invalid="isError || undefined"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
        @keydown.enter="emits('enter', $event)"
      />

      <span v-if="hasSuffix" class="base-input__suffix">
        <button
          v-if="showClear"
          type="button"
          class="base-input__action"
          aria-label="清空输入"
          @mousedown.prevent
          @click="handleClear"
        >
          <base-icon icon="X" :size="13" />
        </button>

        <button
          v-if="props.showPassword && props.type === 'password'"
          type="button"
          class="base-input__action"
          :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
          @mousedown.prevent
          @click="passwordVisible = !passwordVisible"
        >
          <base-icon :icon="passwordVisible ? 'EyeOff' : 'Eye'" :size="15" />
        </button>

        <span v-if="showLimit" class="base-input__count">{{ currentLength }}/{{ props.maxlength }}</span>
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 导入工具类
 */
import { FORM_CONTEXT_KEY, FORM_ITEM_CONTEXT_KEY } from '@/components/base/base-form/form-context';

/**
 * 导入类型声明
 */
import type { BaseIconName, ControlSize, InputType } from '@/types';

/**
 * 定义 v-model
 */
const modelValue = defineModel<string>({ default: '' });

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 输入框类型
   */
  type?: InputType;
  /**
   * 尺寸规格
   */
  size?: ControlSize;
  /**
   * 占位提示文本
   */
  placeholder?: string;
  /**
   * 前置图标名称（仅单行模式有效）
   */
  prefixIcon?: BaseIconName;
  /**
   * 是否允许一键清空
   */
  clearable?: boolean;
  /**
   * 密码框是否支持明文切换
   */
  showPassword?: boolean;
  /**
   * 最大字符数
   */
  maxlength?: number;
  /**
   * 是否显示字数统计（需同时配置 maxlength）
   */
  showWordLimit?: boolean;
  /**
   * 多行文本默认行数
   */
  rows?: number;
  /**
   * 是否禁用
   */
  disabled?: boolean;
  /**
   * 是否只读
   */
  readonly?: boolean;
  /**
   * 原生 autocomplete 属性
   */
  autocomplete?: string;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  placeholder: '',
  prefixIcon: undefined,
  clearable: false,
  showPassword: false,
  maxlength: undefined,
  showWordLimit: false,
  rows: 4,
  disabled: false,
  readonly: false,
  autocomplete: 'off',
});

/**
 * 定义 emits 的类型声明
 */
interface Emits {
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
  clear: [];
  enter: [event: KeyboardEvent];
}

/**
 * 定义 emits
 */
const emits = defineEmits<Emits>();

/**
 * 注入父级表单上下文
 */
const formContext = inject(FORM_CONTEXT_KEY, null);
const formItemContext = inject(FORM_ITEM_CONTEXT_KEY, null);

/**
 * 定义响应式数据
 */
const inputRef = useTemplateRef<HTMLInputElement>('inputRef');
const textareaRef = useTemplateRef<HTMLTextAreaElement>('textareaRef');
const isFocused = ref(false);
const passwordVisible = ref(false);

const isTextarea = computed<boolean>(() => props.type === 'textarea');
const isDisabled = computed<boolean>(() => props.disabled || Boolean(formContext?.disabled.value));
const isError = computed<boolean>(() => Boolean(formItemContext?.isError.value));
const currentLength = computed<number>(() => modelValue.value.length);
const showClear = computed<boolean>(() =>
  Boolean(props.clearable && !isDisabled.value && !props.readonly && modelValue.value.length > 0),
);
const showLimit = computed<boolean>(() => Boolean(props.showWordLimit && typeof props.maxlength === 'number'));
const hasSuffix = computed<boolean>(() =>
  Boolean(showClear.value || (props.showPassword && props.type === 'password') || showLimit.value),
);

const resolvedNativeType = computed<string>(() => {
  if (props.type === 'password' && props.showPassword && passwordVisible.value) {
    return 'text';
  }
  return props.type;
});

const handleFocus = (event: FocusEvent): void => {
  isFocused.value = true;
  emits('focus', event);
};

const handleBlur = (event: FocusEvent): void => {
  isFocused.value = false;
  emits('blur', event);
  void formItemContext?.validate('blur');
};

const handleInput = (): void => {
  void formItemContext?.validate('change');
};

const handleClear = (): void => {
  modelValue.value = '';
  emits('clear');
  void formItemContext?.validate('change');
  inputRef.value?.focus();
};

/**
 * 导出聚焦方法
 */
defineExpose({
  focus: (): void => {
    if (isTextarea.value) {
      textareaRef.value?.focus();
    } else {
      inputRef.value?.focus();
    }
  },
});
</script>

<style lang="scss" src="./index.scss" scoped></style>
