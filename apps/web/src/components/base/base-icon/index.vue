<template>
  <component
    :is="iconComponent"
    v-if="iconComponent"
    v-bind="$attrs"
    class="base-icon"
    :class="props.customClass"
    :size="props.size"
    :color="props.color"
    :stroke-width="props.strokeWidth"
    @click="emits('click', $event)"
  />
</template>

<script setup lang="ts">
import { baseIcons, isBaseIconName } from './icons';

import type { Component } from 'vue';

/**
 * 显式转发属性，未匹配图标时安全地不渲染，也不产生属性透传警告。
 */
defineOptions({ inheritAttrs: false });

interface Props {
  /**
   * 已登记的 PascalCase 图标名，或由调用方按需导入的图标组件。
   */
  icon: string | Component;
  /**
   * 图标宽高，数字按像素处理，也支持 1em 等 SVG 尺寸。
   */
  size?: number | string;
  /**
   * 默认继承文字颜色，选中态可由父级样式控制。
   */
  color?: string;
  /**
   * 描边宽度，默认保留 Lucide 的 2；按具体设计调整。
   */
  strokeWidth?: number | string;
  /**
   * 额外样式类，普通 class 属性同样会透传到 SVG。
   */
  customClass?: string;
}

interface Emits {
  click: [event: MouseEvent];
}

const props = withDefaults(defineProps<Props>(), {
  size: 18,
  color: 'currentColor',
  strokeWidth: 2,
  customClass: '',
});
const emits = defineEmits<Emits>();

/**
 * 同时支持静态组件和受控名称；禁止把对象原型属性当成有效图标。
 */
const iconComponent = computed<Component | undefined>(() => {
  if (typeof props.icon !== 'string') return props.icon;
  return isBaseIconName(props.icon) ? baseIcons[props.icon] : undefined;
});
</script>

<style lang="scss" scoped>
.base-icon {
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
