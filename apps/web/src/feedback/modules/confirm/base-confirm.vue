<template>
  <transition name="base-confirm-fade" @after-leave="handleAfterLeave">
    <div
      v-if="visible"
      class="base-confirm__overlay"
      :style="{ zIndex: overlayZIndex }"
      @click="sameTargetEvents.onClick"
      @mousedown="sameTargetEvents.onMousedown"
      @mouseup="sameTargetEvents.onMouseup"
    >
      <div class="base-confirm" role="alertdialog" aria-modal="true" :aria-labelledby="titleId" @click.stop>
        <div class="base-confirm__body">
          <div class="base-confirm__icon-wrap" :class="`base-confirm__icon-wrap--${props.type}`">
            <base-icon :icon="iconName" :size="20" />
          </div>
          <div class="base-confirm__main">
            <h3 :id="titleId" class="base-confirm__title">{{ props.title }}</h3>
            <p class="base-confirm__content">{{ props.content }}</p>
          </div>
          <button
            type="button"
            class="base-confirm__close"
            aria-label="关闭确认框"
            :disabled="confirmLoading"
            @click="handleCancel"
          >
            <base-icon icon="X" :size="15" />
          </button>
        </div>

        <div class="base-confirm__footer">
          <button
            type="button"
            class="base-confirm__btn base-confirm__btn--cancel"
            :disabled="confirmLoading"
            @click="handleCancel"
          >
            {{ props.cancelText }}
          </button>
          <button
            type="button"
            class="base-confirm__btn"
            :class="`base-confirm__btn--${props.type === 'danger' ? 'danger' : 'primary'}`"
            :disabled="confirmLoading"
            @click="handleConfirm"
          >
            <base-circle-loading v-if="confirmLoading" :size="14" color="currentColor" />
            <span>{{ props.confirmText }}</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
/**
 * 导入组件
 */
import BaseCircleLoading from '@/components/base/base-circle-loading/index.vue';
import BaseIcon from '@/components/base/base-icon/index.vue';

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
import type { BaseIconName, ConfirmType } from '@/types';

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 标题
   */
  title?: string;
  /**
   * 确认内容说明
   */
  content: string;
  /**
   * 视觉语义类型
   */
  type?: ConfirmType;
  /**
   * 确认按钮文案
   */
  confirmText?: string;
  /**
   * 取消按钮文案
   */
  cancelText?: string;
  /**
   * 是否允许点击遮罩取消
   */
  closeOnClickModal?: boolean;
  /**
   * 是否允许按 Esc 取消
   */
  closeOnPressEscape?: boolean;
  /**
   * 异步确认拦截，执行期间自动进入 loading 状态；返回 false 可阻止关闭
   */
  beforeConfirm?: () => boolean | void | Promise<boolean | void>;
  /**
   * 动作结果回调
   */
  onResolve?: (confirmed: boolean) => void;
  /**
   * 离场动画完成后销毁宿主
   */
  onVanish?: () => void;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  title: '操作确认',
  type: 'warning',
  confirmText: '确认',
  cancelText: '取消',
  closeOnClickModal: true,
  closeOnPressEscape: true,
  beforeConfirm: undefined,
  onResolve: undefined,
  onVanish: undefined,
});

/**
 * 引入 composables
 */
const { nextZIndex } = useZIndex();

/**
 * 定义响应式数据
 */
const titleId = `base-confirm-title-${useId()}`;
const visible = ref(false);
const confirmLoading = ref(false);
const overlayZIndex = ref(nextZIndex());
let settled = false;

/**
 * 计算属性
 * 作用：按确认框语义匹配图标
 */
const iconName = computed<BaseIconName>(() => {
  const map: Record<ConfirmType, BaseIconName> = {
    info: 'Info',
    warning: 'TriangleAlert',
    danger: 'CircleAlert',
  };
  return map[props.type];
});

/**
 * 统一完成 Promise 并关闭弹框
 */
const finish = (confirmed: boolean): void => {
  if (settled) {
    return;
  }

  settled = true;
  visible.value = false;
  props.onResolve?.(confirmed);
};

/**
 * 处理取消关闭
 */
const handleCancel = (): void => {
  if (confirmLoading.value) {
    return;
  }

  finish(false);
};

/**
 * 处理确认（支持异步 beforeConfirm 防连点）
 */
const handleConfirm = async (): Promise<void> => {
  if (confirmLoading.value) {
    return;
  }

  if (!props.beforeConfirm) {
    finish(true);
    return;
  }

  confirmLoading.value = true;
  try {
    const result = await props.beforeConfirm();
    if (result === false) {
      return;
    }
    finish(true);
  } finally {
    confirmLoading.value = false;
  }
};

/**
 * 遮罩同目标点击取消
 */
const sameTargetEvents = useSameTarget(() => {
  if (props.closeOnClickModal && !confirmLoading.value) {
    handleCancel();
  }
});

/**
 * 离场动画完成后销毁 DOM
 */
const handleAfterLeave = (): void => {
  props.onVanish?.();
};

/**
 * 监听事件
 */
useScrollLock(visible);
useEscapeStack(() => visible.value && props.closeOnPressEscape && !confirmLoading.value, handleCancel);

/**
 * 生命周期函数
 */
onMounted(() => {
  visible.value = true;
});
</script>

<style lang="scss" src="./base-confirm.scss" scoped></style>
