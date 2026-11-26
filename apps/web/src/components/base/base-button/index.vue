<template>
  <button
    :type="props.nativeType"
    class="base-button"
    :class="[
      `base-button--${props.variant}`,
      `base-button--${props.size}`,
      {
        'base-button--block': props.block,
        'base-button--loading': props.loading,
      },
    ]"
    :disabled="isDisabled"
    @click="handleClick"
  >
    <base-circle-loading v-if="props.loading" :size="iconDimension" color="currentColor" />
    <base-icon v-else-if="props.icon" :icon="props.icon" :size="iconDimension" />
    <span v-if="$slots.default" class="base-button__label">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
/**
 * 导入类型声明
 */
import type { BaseIconName, ButtonVariant, ControlSize } from '@/types';

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 按钮视觉变体
   */
  variant?: ButtonVariant;
  /**
   * 尺寸规格
   */
  size?: ControlSize;
  /**
   * 原生 button type 属性
   */
  nativeType?: 'button' | 'submit' | 'reset';
  /**
   * 可选前置基础图标名
   */
  icon?: BaseIconName;
  /**
   * 是否处于异步加载态（自动禁用点击）
   */
  loading?: boolean;
  /**
   * 是否禁用
   */
  disabled?: boolean;
  /**
   * 是否撑满父容器宽度
   */
  block?: boolean;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  nativeType: 'button',
  icon: undefined,
  loading: false,
  disabled: false,
  block: false,
});

/**
 * 定义 emits 的类型声明
 */
interface Emits {
  click: [event: MouseEvent];
}

/**
 * 定义 emits
 */
const emits = defineEmits<Emits>();

/**
 * 计算属性
 * 作用：综合禁用态（loading 时一并锁定）
 */
const isDisabled = computed<boolean>(() => props.disabled || props.loading);

/**
 * 计算属性
 * 作用：按尺寸匹配图标大小
 */
const iconDimension = computed<number>(() => {
  if (props.size === 'sm') {
    return 13;
  }
  if (props.size === 'lg') {
    return 16;
  }
  return 14;
});

/**
 * 转发有效点击事件
 */
const handleClick = (event: MouseEvent): void => {
  if (isDisabled.value) {
    return;
  }
  emits('click', event);
};
</script>

<style lang="scss" src="./index.scss" scoped></style>
