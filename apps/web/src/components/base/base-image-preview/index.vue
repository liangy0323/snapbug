<template>
  <teleport to="body">
    <transition name="base-image-preview-fade">
      <div
        v-if="visible && currentImage"
        class="base-image-preview"
        role="dialog"
        aria-modal="true"
        aria-label="图片预览"
        :style="{ zIndex: overlayZIndex }"
        @click="sameTargetEvents.onClick"
        @mousedown="sameTargetEvents.onMousedown"
        @mouseup="sameTargetEvents.onMouseup"
        @wheel.prevent="handleWheel"
      >
        <!-- 顶部信息与关闭栏 -->
        <header class="base-image-preview__topbar" @click.stop>
          <span class="base-image-preview__caption">{{ currentImage.alt || '图片预览' }}</span>
          <span v-if="props.showProgress && totalCount > 1" class="base-image-preview__progress">
            {{ activeIndex + 1 }} / {{ totalCount }}
          </span>
          <button type="button" class="base-image-preview__close" aria-label="关闭图片预览" @click="close">
            <base-icon icon="X" :size="18" />
          </button>
        </header>

        <!-- 左右切换按钮 -->
        <template v-if="!isSingle">
          <button
            type="button"
            class="base-image-preview__nav base-image-preview__nav--prev"
            aria-label="上一张"
            :disabled="!canPrev"
            @click.stop="handlePrev"
          >
            <base-icon icon="ChevronLeft" :size="22" />
          </button>
          <button
            type="button"
            class="base-image-preview__nav base-image-preview__nav--next"
            aria-label="下一张"
            :disabled="!canNext"
            @click.stop="handleNext"
          >
            <base-icon icon="ChevronRight" :size="22" />
          </button>
        </template>

        <!-- 图片画布 -->
        <div class="base-image-preview__canvas">
          <div v-if="isLoading && !hasError" class="base-image-preview__status">
            <base-circle-loading :size="28" color="#ffffff" />
          </div>

          <div v-if="hasError" class="base-image-preview__error" @click.stop>
            <base-icon icon="Image" :size="28" />
            <span>图片加载失败</span>
          </div>

          <img
            v-else
            :key="currentImage.src"
            :src="currentImage.src"
            :alt="currentImage.alt || '预览图片'"
            class="base-image-preview__img"
            :class="{ 'base-image-preview__img--dragging': isDragging }"
            :style="imageStyle"
            draggable="false"
            @click.stop
            @mousedown="handleMouseDown"
            @load="handleImageLoad"
            @error="handleImageError"
          />
        </div>

        <!-- 底部悬浮工具条 -->
        <div class="base-image-preview__toolbar" @click.stop>
          <button
            type="button"
            class="base-image-preview__tool"
            aria-label="缩小"
            title="缩小 (-)"
            @click="handleAction('zoomOut')"
          >
            <base-icon icon="ZoomOut" :size="17" />
          </button>
          <span class="base-image-preview__zoom-text">{{ zoomPercent }}%</span>
          <button
            type="button"
            class="base-image-preview__tool"
            aria-label="放大"
            title="放大 (+)"
            @click="handleAction('zoomIn')"
          >
            <base-icon icon="ZoomIn" :size="17" />
          </button>
          <span class="base-image-preview__divider" />
          <button
            type="button"
            class="base-image-preview__tool"
            :aria-label="isOriginalSize ? '适应窗口' : '原始尺寸'"
            :title="isOriginalSize ? '适应窗口 (0)' : '原始尺寸'"
            @click="toggleSizeMode"
          >
            <base-icon :icon="isOriginalSize ? 'Minimize2' : 'Maximize2'" :size="16" />
          </button>
          <span class="base-image-preview__divider" />
          <button
            type="button"
            class="base-image-preview__tool"
            aria-label="逆时针旋转"
            title="逆时针旋转 90°"
            @click="handleAction('anticlockwise')"
          >
            <base-icon icon="RotateCcw" :size="16" />
          </button>
          <button
            type="button"
            class="base-image-preview__tool"
            aria-label="顺时针旋转"
            title="顺时针旋转 90°"
            @click="handleAction('clockwise')"
          >
            <base-icon icon="RotateCw" :size="16" />
          </button>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
/**
 * 导入 composables
 */
import { useEscapeStack } from '@/composables/use-escape-stack';
import { useSameTarget } from '@/composables/use-same-target';
import { useScrollLock } from '@/composables/use-scroll-lock';
import { useZIndex } from '@/composables/use-z-index';

import { useImagePreview } from './use-image-preview';

/**
 * 导入类型声明
 */
import type { ImagePreviewSource } from '@/types';

/**
 * 定义 v-model
 */
const visible = defineModel<boolean>({ default: false });

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 预览图片列表（支持 URL 字符串或带 alt 说明对象）
   */
  images: ImagePreviewSource[];
  /**
   * 打开时默认定位的图片索引
   */
  initialIndex?: number;
  /**
   * 多图切换是否支持循环
   */
  infinite?: boolean;
  /**
   * 是否允许点击遮罩关闭
   */
  closeOnClickModal?: boolean;
  /**
   * 是否允许按 Esc 关闭
   */
  closeOnPressEscape?: boolean;
  /**
   * 是否展示顶部进度计数
   */
  showProgress?: boolean;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  initialIndex: 0,
  infinite: true,
  closeOnClickModal: true,
  closeOnPressEscape: true,
  showProgress: true,
});

/**
 * 定义 emits 的类型声明
 */
interface Emits {
  switch: [index: number];
  close: [];
}

/**
 * 定义 emits
 */
const emits = defineEmits<Emits>();

/**
 * 引入 composables
 */
const { nextZIndex } = useZIndex();
const {
  activeIndex,
  totalCount,
  isSingle,
  currentImage,
  zoomPercent,
  canPrev,
  canNext,
  isDragging,
  isLoading,
  hasError,
  isOriginalSize,
  imageStyle,
  handleAction,
  toggleSizeMode,
  handlePrev,
  handleNext,
  handleWheel,
  handleMouseDown,
  handleImageLoad,
  handleImageError,
} = useImagePreview({
  visible,
  images: () => props.images,
  initialIndex: () => props.initialIndex,
  infinite: () => props.infinite,
  onSwitch: (index) => emits('switch', index),
});

/**
 * 定义响应式数据
 */
const overlayZIndex = ref(2000);

/**
 * 关闭预览器
 */
const close = (): void => {
  if (!visible.value) {
    return;
  }
  visible.value = false;
  emits('close');
};

/**
 * 遮罩同目标点击关闭
 */
const sameTargetEvents = useSameTarget(() => {
  if (props.closeOnClickModal) {
    close();
  }
});

/**
 * 监听事件
 */
watch(
  visible,
  (opened) => {
    if (opened) {
      overlayZIndex.value = nextZIndex();
    }
  },
  { immediate: true },
);

useScrollLock(visible);
useEscapeStack(() => visible.value && props.closeOnPressEscape, close);
</script>

<style lang="scss" src="./index.scss" scoped></style>
