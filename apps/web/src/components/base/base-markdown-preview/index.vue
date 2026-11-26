<template>
  <div ref="containerRef" class="base-markdown-preview" @click="handleContainerClick">
    <div v-if="!renderedHtml" class="base-markdown-preview__empty">
      {{ props.emptyText }}
    </div>
    <!-- markdown-it-ts 已禁用原生 HTML（html: false）并转义代码块与文本，仅输出受控 Markdown 结构 -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-else class="base-markdown-preview__body" v-html="renderedHtml" />

    <base-image-preview
      v-if="props.previewImage"
      v-model="previewVisible"
      :images="previewImages"
      :initial-index="previewIndex"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 导入工具类
 */
import { renderMarkdown } from './render-markdown';

/**
 * 导入类型声明
 */
import type { ImagePreviewItem } from '@/types';

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * Markdown 原文
   */
  content: string;
  /**
   * 内容为空时的占位提示
   */
  emptyText?: string;
  /**
   * 点击文档内图片时是否自动拉起 BaseImagePreview 放大预览
   */
  previewImage?: boolean;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  emptyText: '暂无内容',
  previewImage: true,
});

/**
 * 定义 emits 的类型声明
 */
interface Emits {
  copy: [code: string];
  imageClick: [image: ImagePreviewItem, index: number];
}

/**
 * 定义 emits
 */
const emits = defineEmits<Emits>();

/**
 * 定义响应式数据
 */
const containerRef = useTemplateRef<HTMLDivElement>('containerRef');
const previewVisible = ref(false);
const previewImages = ref<ImagePreviewItem[]>([]);
const previewIndex = ref(0);
const resetTimers = new Set<ReturnType<typeof setTimeout>>();

/**
 * 计算属性
 * 作用：缓存 Markdown 渲染结果
 */
const renderedHtml = computed<string>(() => renderMarkdown(props.content));

/**
 * 复制代码块内容并临时切换按钮反馈文案
 */
const handleCodeCopy = async (button: HTMLButtonElement): Promise<void> => {
  const codeBlock = button.closest('.base-markdown-preview__code-block');
  const codeText = codeBlock?.querySelector('code')?.textContent ?? '';
  if (!codeText) {
    return;
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(codeText);
    }
    button.textContent = '已复制';
    button.dataset.copied = 'true';
    emits('copy', codeText);

    const timer = setTimeout(() => {
      button.textContent = '复制';
      delete button.dataset.copied;
      resetTimers.delete(timer);
    }, 1600);
    resetTimers.add(timer);
  } catch {
    button.textContent = '复制失败';
  }
};

/**
 * 委托处理代码块复制与文档图片放大预览
 */
const handleContainerClick = (event: MouseEvent): void => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const copyButton = target.closest<HTMLButtonElement>('[data-code-copy]');
  if (copyButton) {
    void handleCodeCopy(copyButton);
    return;
  }

  if (target instanceof HTMLImageElement && containerRef.value) {
    const imgElements = Array.from(containerRef.value.querySelectorAll<HTMLImageElement>('img'));
    const items: ImagePreviewItem[] = imgElements.map((img) => ({
      src: img.currentSrc || img.src,
      alt: img.alt || undefined,
    }));
    const clickedIndex = Math.max(0, imgElements.indexOf(target));
    const current = items[clickedIndex];
    if (!current) {
      return;
    }

    emits('imageClick', current, clickedIndex);
    if (props.previewImage) {
      previewImages.value = items;
      previewIndex.value = clickedIndex;
      previewVisible.value = true;
    }
  }
};

/**
 * 生命周期函数
 */
onBeforeUnmount(() => {
  resetTimers.forEach((timer) => clearTimeout(timer));
  resetTimers.clear();
});
</script>
