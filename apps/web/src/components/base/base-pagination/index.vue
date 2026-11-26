<template>
  <nav v-if="totalPages > 0" class="base-pagination" aria-label="分页导航">
    <span v-if="props.showTotal" class="base-pagination__total">共 {{ props.total }} 条</span>

    <div class="base-pagination__controls">
      <button
        type="button"
        class="base-pagination__btn"
        aria-label="上一页"
        :disabled="props.disabled || currentPage <= 1"
        @click="goToPage(currentPage - 1)"
      >
        <base-icon icon="ChevronLeft" :size="15" />
      </button>

      <template v-for="item in pageItems" :key="String(item)">
        <span v-if="typeof item !== 'number'" class="base-pagination__ellipsis" aria-hidden="true">···</span>
        <button
          v-else
          type="button"
          class="base-pagination__btn"
          :class="{ 'base-pagination__btn--active': item === currentPage }"
          :aria-current="item === currentPage ? 'page' : undefined"
          :disabled="props.disabled"
          @click="goToPage(item)"
        >
          {{ item }}
        </button>
      </template>

      <button
        type="button"
        class="base-pagination__btn"
        aria-label="下一页"
        :disabled="props.disabled || currentPage >= totalPages"
        @click="goToPage(currentPage + 1)"
      >
        <base-icon icon="ChevronRight" :size="15" />
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
/**
 * 导入类型声明
 */
import type { PaginationItem } from '@/types';

/**
 * 定义 v-model
 */
const currentPage = defineModel<number>({ default: 1 });

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 数据总条数
   */
  total: number;
  /**
   * 每页条数
   */
  pageSize?: number;
  /**
   * 是否展示总条数文案
   */
  showTotal?: boolean;
  /**
   * 是否禁用
   */
  disabled?: boolean;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  pageSize: 20,
  showTotal: true,
  disabled: false,
});

/**
 * 定义 emits 的类型声明
 */
interface Emits {
  change: [page: number];
}

/**
 * 定义 emits
 */
const emits = defineEmits<Emits>();

/**
 * 计算属性
 * 作用：总页数
 */
const totalPages = computed<number>(() => {
  if (props.total <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(props.total / Math.max(1, props.pageSize)));
});

/**
 * 计算属性
 * 作用：生成带智能省略号的页码序列（总页数 <= 7 全展开，否则首尾 + 当前页邻域）
 */
const pageItems = computed<PaginationItem[]>(() => {
  const total = totalPages.value;
  if (total <= 7) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }

  const current = Math.min(Math.max(1, currentPage.value), total);
  const items: PaginationItem[] = [1];

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) {
    items.push('ellipsis-left');
  }
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < total - 1) {
    items.push('ellipsis-right');
  }

  items.push(total);
  return items;
});

/**
 * 切换至指定页码
 */
const goToPage = (page: number): void => {
  if (props.disabled) {
    return;
  }

  const clamped = Math.min(Math.max(1, page), totalPages.value);
  if (clamped === currentPage.value) {
    return;
  }

  currentPage.value = clamped;
  emits('change', clamped);
};
</script>

<style lang="scss" src="./index.scss" scoped></style>
