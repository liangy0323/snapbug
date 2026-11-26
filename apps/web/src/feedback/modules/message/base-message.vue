<template>
  <transition name="base-message-fade" @before-leave="handleBeforeLeave" @after-leave="handleAfterLeave">
    <div
      v-show="visible"
      ref="messageRef"
      class="base-message"
      :class="`base-message--${props.type}`"
      role="status"
      :style="customStyle"
      @mouseenter="clearTimer"
      @mouseleave="startTimer"
    >
      <base-icon :icon="iconName" :size="16" class="base-message__icon" />
      <span class="base-message__content">{{ props.message }}</span>
      <span v-if="props.repeatNum > 1" class="base-message__badge">{{ props.repeatNum }}</span>
      <button v-if="props.showClose" type="button" class="base-message__close" aria-label="关闭提示" @click="close">
        <base-icon icon="X" :size="14" />
      </button>
    </div>
  </transition>
</template>

<script setup lang="ts">
/**
 * 导入组件
 */
import BaseIcon from '@/components/base/base-icon/index.vue';

/**
 * 导入类型声明
 */
import type { CSSProperties } from 'vue';
import type { BaseIconName, MessageType } from '@/types';

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 唯一实例 ID
   */
  id: string;
  /**
   * 提示文案
   */
  message: string;
  /**
   * 语义类型
   */
  type?: MessageType;
  /**
   * 自动关闭时长（ms），0 表示不自动关闭
   */
  duration?: number;
  /**
   * 是否展示关闭按钮
   */
  showClose?: boolean;
  /**
   * 垂直偏移量（px）
   */
  offset?: number;
  /**
   * 弹层层级
   */
  zIndex?: number;
  /**
   * 分组重复次数
   */
  repeatNum?: number;
  /**
   * 离场开始前通知管理器重排剩余实例
   */
  onClose?: () => void;
  /**
   * 离场动画结束后通知管理器卸载 DOM
   */
  onDestroy?: () => void;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 2800,
  showClose: false,
  offset: 20,
  zIndex: 3000,
  repeatNum: 1,
  onClose: undefined,
  onDestroy: undefined,
});

/**
 * 定义响应式数据
 */
const messageRef = useTemplateRef<HTMLDivElement>('messageRef');
const visible = ref(false);
const height = ref(0);
let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * 计算属性
 * 作用：根据消息类型映射图标名称
 */
const iconName = computed<BaseIconName>(() => {
  const iconMap: Record<MessageType, BaseIconName> = {
    info: 'Info',
    success: 'CircleCheck',
    warning: 'TriangleAlert',
    error: 'CircleX',
  };
  return iconMap[props.type];
});

/**
 * 计算属性
 * 作用：垂直偏移与层级样式
 */
const customStyle = computed<CSSProperties>(() => ({
  top: `${props.offset}px`,
  zIndex: props.zIndex,
}));

/**
 * 清除自动关闭定时器
 */
const clearTimer = (): void => {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
};

/**
 * 启动自动关闭定时器
 */
const startTimer = (): void => {
  clearTimer();
  if (props.duration <= 0) {
    return;
  }

  timer = setTimeout(() => {
    close();
  }, props.duration);
};

/**
 * 关闭当前提示
 */
const close = (): void => {
  clearTimer();
  visible.value = false;
};

/**
 * 过渡回调
 */
const handleBeforeLeave = (): void => {
  props.onClose?.();
};

const handleAfterLeave = (): void => {
  props.onDestroy?.();
};

/**
 * 读取当前元素实时高度用于堆叠偏移计算
 */
const getHeight = (): number => {
  return messageRef.value?.getBoundingClientRect().height || height.value || 42;
};

/**
 * 监听事件
 */
watch(
  () => props.repeatNum,
  () => {
    startTimer();
  },
);

/**
 * 生命周期函数
 */
onMounted(() => {
  visible.value = true;
  void nextTick(() => {
    height.value = messageRef.value?.getBoundingClientRect().height || 42;
  });
  startTimer();
});

onBeforeUnmount(() => {
  clearTimer();
});

/**
 * 导出方法
 */
defineExpose({
  visible,
  close,
  getHeight,
});
</script>

<style lang="scss" src="./base-message.scss" scoped></style>
