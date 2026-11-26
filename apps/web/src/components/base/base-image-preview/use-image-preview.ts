import type { CSSProperties, MaybeRefOrGetter } from 'vue';
import type { ImagePreviewAction, ImagePreviewItem, ImagePreviewSource } from '@/types';

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.25;

/**
 * 归一化图片预览项列表
 */
const normalizeImages = (sources: ImagePreviewSource[]): ImagePreviewItem[] => {
  return sources.map((item) => (typeof item === 'string' ? { src: item } : item));
};

/**
 * 图片预览器交互状态机（借鉴 Element Plus ElImageViewer）
 *
 * 负责多图切换、滚轮/按钮缩放、90° 旋转、拖拽平移、键盘快捷键及卸载清理。
 */
export const useImagePreview = (options: {
  visible: MaybeRefOrGetter<boolean>;
  images: MaybeRefOrGetter<ImagePreviewSource[]>;
  initialIndex: MaybeRefOrGetter<number>;
  infinite: MaybeRefOrGetter<boolean>;
  onSwitch?: (index: number) => void;
}) => {
  const activeIndex = ref(0);
  const scale = ref(1);
  const rotateDeg = ref(0);
  const offsetX = ref(0);
  const offsetY = ref(0);
  const isDragging = ref(false);
  const isLoading = ref(false);
  const hasError = ref(false);
  const isOriginalSize = ref(false);

  let dragStartX = 0;
  let dragStartY = 0;
  let dragOriginX = 0;
  let dragOriginY = 0;

  const imageList = computed<ImagePreviewItem[]>(() => normalizeImages(toValue(options.images)));
  const totalCount = computed<number>(() => imageList.value.length);
  const isSingle = computed<boolean>(() => totalCount.value <= 1);
  const currentImage = computed<ImagePreviewItem | null>(() => imageList.value[activeIndex.value] ?? null);
  const zoomPercent = computed<number>(() => Math.round(scale.value * 100));

  const canPrev = computed<boolean>(() => !isSingle.value && (toValue(options.infinite) || activeIndex.value > 0));
  const canNext = computed<boolean>(
    () => !isSingle.value && (toValue(options.infinite) || activeIndex.value < totalCount.value - 1),
  );

  const imageStyle = computed<CSSProperties>(() => ({
    transform: `translate3d(${offsetX.value}px, ${offsetY.value}px, 0) scale(${scale.value}) rotate(${rotateDeg.value}deg)`,
    transition: isDragging.value ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
    maxWidth: isOriginalSize.value ? 'none' : '84vw',
    maxHeight: isOriginalSize.value ? 'none' : '78vh',
  }));

  /**
   * 重置当前图片变换状态
   */
  const resetTransform = (): void => {
    scale.value = 1;
    rotateDeg.value = 0;
    offsetX.value = 0;
    offsetY.value = 0;
    isOriginalSize.value = false;
  };

  /**
   * 执行缩放、旋转或重置操作
   */
  const handleAction = (action: ImagePreviewAction): void => {
    if (action === 'zoomIn') {
      scale.value = Math.min(MAX_SCALE, Number((scale.value + ZOOM_STEP).toFixed(2)));
      return;
    }
    if (action === 'zoomOut') {
      scale.value = Math.max(MIN_SCALE, Number((scale.value - ZOOM_STEP).toFixed(2)));
      return;
    }
    if (action === 'clockwise') {
      rotateDeg.value += 90;
      return;
    }
    if (action === 'anticlockwise') {
      rotateDeg.value -= 90;
      return;
    }
    resetTransform();
  };

  /**
   * 切换适应屏幕 / 原始比例显示
   */
  const toggleSizeMode = (): void => {
    isOriginalSize.value = !isOriginalSize.value;
    scale.value = 1;
    offsetX.value = 0;
    offsetY.value = 0;
  };

  /**
   * 切换到指定索引图片
   */
  const setActiveIndex = (nextIndex: number): void => {
    const len = totalCount.value;
    if (len === 0) {
      return;
    }

    const clamped = toValue(options.infinite)
      ? ((nextIndex % len) + len) % len
      : Math.max(0, Math.min(len - 1, nextIndex));
    if (clamped === activeIndex.value) {
      return;
    }

    activeIndex.value = clamped;
    resetTransform();
    isLoading.value = true;
    hasError.value = false;
    options.onSwitch?.(clamped);
  };

  const handlePrev = (): void => {
    if (canPrev.value) {
      setActiveIndex(activeIndex.value - 1);
    }
  };

  const handleNext = (): void => {
    if (canNext.value) {
      setActiveIndex(activeIndex.value + 1);
    }
  };

  const handleWheel = (event: WheelEvent): void => {
    if (event.deltaY < 0) {
      handleAction('zoomIn');
    } else if (event.deltaY > 0) {
      handleAction('zoomOut');
    }
  };

  const handleMouseMove = (event: MouseEvent): void => {
    if (!isDragging.value) {
      return;
    }
    offsetX.value = dragOriginX + (event.clientX - dragStartX);
    offsetY.value = dragOriginY + (event.clientY - dragStartY);
  };

  const stopDragging = (): void => {
    if (!isDragging.value) {
      return;
    }
    isDragging.value = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDragging);
    }
  };

  const handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || typeof window === 'undefined') {
      return;
    }
    event.preventDefault();
    isDragging.value = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = offsetX.value;
    dragOriginY = offsetY.value;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopDragging);
  };

  const handleImageLoad = (): void => {
    isLoading.value = false;
    hasError.value = false;
  };

  const handleImageError = (): void => {
    isLoading.value = false;
    hasError.value = true;
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (!toValue(options.visible)) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handlePrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleNext();
    } else if (event.key === 'ArrowUp' || event.key === '+' || event.key === '=') {
      event.preventDefault();
      handleAction('zoomIn');
    } else if (event.key === 'ArrowDown' || event.key === '-') {
      event.preventDefault();
      handleAction('zoomOut');
    } else if (event.key === '0') {
      event.preventDefault();
      resetTransform();
    }
  };

  watch(
    () => toValue(options.visible),
    (opened) => {
      if (typeof window === 'undefined') {
        return;
      }

      if (opened) {
        const len = totalCount.value;
        const init = toValue(options.initialIndex);
        activeIndex.value = len > 0 ? Math.max(0, Math.min(len - 1, init)) : 0;
        resetTransform();
        isLoading.value = true;
        hasError.value = false;
        window.addEventListener('keydown', handleKeydown);
      } else {
        stopDragging();
        window.removeEventListener('keydown', handleKeydown);
      }
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    stopDragging();
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeydown);
    }
  });

  return {
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
  };
};
