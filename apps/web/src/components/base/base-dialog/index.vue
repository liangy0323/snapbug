<template>
  <teleport to="body">
    <transition
      name="base-dialog-fade"
      @after-enter="handleAfterEnter"
      @before-leave="handleBeforeLeave"
      @after-leave="handleAfterLeave"
    >
      <div
        v-if="visible"
        class="base-dialog__overlay"
        :class="{ 'base-dialog__overlay--center': props.alignCenter }"
        :style="{ zIndex: overlayZIndex }"
        @click="sameTargetEvents.onClick"
        @mousedown="sameTargetEvents.onMousedown"
        @mouseup="sameTargetEvents.onMouseup"
      >
        <div
          class="base-dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :style="dialogStyle"
          @click.stop
        >
          <header v-if="hasHeader" class="base-dialog__header">
            <slot name="header" :title-id="titleId" :close="requestClose">
              <h3 :id="titleId" class="base-dialog__title">{{ props.title }}</h3>
            </slot>
            <button
              v-if="props.showClose"
              type="button"
              class="base-dialog__close"
              aria-label="关闭弹窗"
              @click="requestClose"
            >
              <base-icon icon="X" :size="16" />
            </button>
          </header>

          <div v-if="rendered" class="base-dialog__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="base-dialog__footer">
            <slot name="footer" :close="requestClose" />
          </footer>
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

/**
 * 导入类型声明
 */
import type { CSSProperties } from 'vue';

/**
 * 定义 v-model
 */
const visible = defineModel<boolean>({ default: false });

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 弹窗标题
   */
  title?: string;
  /**
   * 弹窗宽度（支持 px 或百分比）
   */
  width?: string | number;
  /**
   * 是否居中对齐
   */
  alignCenter?: boolean;
  /**
   * 是否展示右上角关闭按钮
   */
  showClose?: boolean;
  /**
   * 是否允许点击遮罩关闭
   */
  closeOnClickModal?: boolean;
  /**
   * 是否允许按 Esc 关闭
   */
  closeOnPressEscape?: boolean;
  /**
   * 关闭动画结束后是否销毁弹窗内容
   */
  destroyOnClose?: boolean;
  /**
   * 打开时是否锁定页面滚动
   */
  lockScroll?: boolean;
  /**
   * 关闭前拦截钩子，调用 done() 放行关闭
   */
  beforeClose?: (done: (cancel?: boolean) => void) => void;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: 560,
  alignCenter: true,
  showClose: true,
  closeOnClickModal: true,
  closeOnPressEscape: true,
  destroyOnClose: false,
  lockScroll: true,
  beforeClose: undefined,
});

/**
 * 定义 emits 的类型声明
 */
interface Emits {
  open: [];
  opened: [];
  close: [];
  closed: [];
}

/**
 * 定义 emits
 */
const emits = defineEmits<Emits>();

/**
 * 引入 composables
 */
const slots = useSlots();
const { nextZIndex } = useZIndex();

/**
 * 定义响应式数据
 */
const titleId = `base-dialog-title-${useId()}`;
const overlayZIndex = ref(2000);
const rendered = ref(false);

/**
 * 计算属性
 * 作用：是否渲染头部区域
 */
const hasHeader = computed<boolean>(() => Boolean(props.title || slots.header || props.showClose));

/**
 * 计算属性
 * 作用：弹窗容器宽度样式
 */
const dialogStyle = computed<CSSProperties>(() => {
  const width = typeof props.width === 'number' ? `${props.width}px` : props.width;
  return { width };
});

/**
 * 真正执行关闭动作
 */
const doClose = (shouldCancel?: boolean): void => {
  if (shouldCancel) {
    return;
  }

  visible.value = false;
};

/**
 * 统一关闭入口，支持 beforeClose 拦截
 */
const requestClose = (): void => {
  if (props.beforeClose) {
    props.beforeClose(doClose);
    return;
  }

  doClose();
};

/**
 * 遮罩同目标点击事件（避免拖选文字误关闭）
 */
const sameTargetEvents = useSameTarget(() => {
  if (props.closeOnClickModal) {
    requestClose();
  }
});

/**
 * 过渡钩子
 */
const handleAfterEnter = (): void => {
  emits('opened');
};

const handleBeforeLeave = (): void => {
  emits('close');
};

const handleAfterLeave = (): void => {
  if (props.destroyOnClose) {
    rendered.value = false;
  }
  emits('closed');
};

/**
 * 监听事件
 */
watch(
  visible,
  (isVisible) => {
    if (isVisible) {
      rendered.value = true;
      overlayZIndex.value = nextZIndex();
      emits('open');
    }
  },
  { immediate: true },
);

useScrollLock(() => visible.value && props.lockScroll);
useEscapeStack(() => visible.value && props.closeOnPressEscape, requestClose);

/**
 * 导出方法
 */
defineExpose({
  close: requestClose,
});
</script>

<style lang="scss" src="./index.scss" scoped></style>
