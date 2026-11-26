<template>
  <div
    ref="triggerWrapRef"
    class="base-select"
    :class="[
      `base-select--${props.size}`,
      `base-select--${props.variant}`,
      `base-select--tone-${activeTone}`,
      {
        'base-select--open': isOpen,
        'base-select--disabled': isDisabled,
        'base-select--error': isError,
      },
    ]"
  >
    <button
      ref="triggerButtonRef"
      type="button"
      class="base-select__trigger"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      :aria-disabled="isDisabled"
      :aria-invalid="isError || undefined"
      :disabled="isDisabled"
      @click="handleToggle"
      @keydown="handleTriggerKeydown"
    >
      <span class="base-select__value" :class="{ 'base-select__value--placeholder': !selectedOption }">
        <slot v-if="selectedOption" name="selected" :option="selectedOption">
          {{ selectedOption.label }}
        </slot>
        <template v-else>{{ props.placeholder }}</template>
      </span>

      <span class="base-select__suffix">
        <span
          v-if="showClearButton"
          class="base-select__clear"
          role="button"
          aria-label="清空已选项"
          @click.stop="handleClear"
        >
          <base-icon icon="X" :size="13" />
        </span>
        <base-icon
          v-else
          icon="ChevronDown"
          :size="14"
          class="base-select__arrow"
          :class="{ 'base-select__arrow--open': isOpen }"
        />
      </span>
    </button>

    <teleport to="body">
      <transition name="base-select-fade">
        <div
          v-if="isOpen"
          :id="listboxId"
          ref="dropdownRef"
          class="base-select-dropdown"
          role="listbox"
          :style="dropdownStyle"
        >
          <div v-if="props.filterable" class="base-select-dropdown__search">
            <base-icon icon="Search" :size="13" class="base-select-dropdown__search-icon" />
            <input
              ref="searchInputRef"
              v-model="keyword"
              type="text"
              class="base-select-dropdown__search-input"
              :placeholder="props.filterPlaceholder"
              @keydown="handleTriggerKeydown"
            />
          </div>

          <div class="base-select-dropdown__list" :style="{ maxHeight: `${props.maxHeight}px` }">
            <template v-if="filteredOptions.length > 0">
              <button
                v-for="(option, index) in filteredOptions"
                :key="String(option.value)"
                type="button"
                role="option"
                class="base-select-dropdown__option"
                :aria-selected="isSelected(option)"
                :disabled="option.disabled"
                :class="{
                  'base-select-dropdown__option--selected': isSelected(option),
                  'base-select-dropdown__option--hovered': index === activeIndex,
                  'base-select-dropdown__option--disabled': option.disabled,
                }"
                @mouseenter="activeIndex = index"
                @click="handleSelect(option)"
              >
                <span class="base-select-dropdown__option-main">
                  <slot name="option" :option="option" :selected="isSelected(option)">
                    <span class="base-select-dropdown__option-label">{{ option.label }}</span>
                    <span v-if="option.description" class="base-select-dropdown__option-desc">
                      {{ option.description }}
                    </span>
                  </slot>
                </span>
                <base-icon v-if="isSelected(option)" icon="Check" :size="14" class="base-select-dropdown__check" />
              </button>
            </template>
            <div v-else class="base-select-dropdown__empty">{{ props.emptyText }}</div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup lang="ts">
/**
 * 导入 composables
 */
import { useClickOutside } from '@/composables/use-click-outside';
import { useEscapeStack } from '@/composables/use-escape-stack';
import { useZIndex } from '@/composables/use-z-index';

/**
 * 导入工具类
 */
import { FORM_CONTEXT_KEY, FORM_ITEM_CONTEXT_KEY } from '@/components/base/base-form/form-context';

/**
 * 导入类型声明
 */
import type { CSSProperties } from 'vue';
import type { SelectOption, SelectTone, SelectValue } from '@/types';

/**
 * 定义 v-model
 */
const modelValue = defineModel<SelectValue>({ default: null });

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 可选项列表
   */
  options: SelectOption[];
  /**
   * 占位提示文本
   */
  placeholder?: string;
  /**
   * 尺寸规格
   */
  size?: 'sm' | 'md';
  /**
   * 外观变体：default 为常规表单下拉，pill 为紧凑彩色状态下拉
   */
  variant?: 'default' | 'pill';
  /**
   * 覆盖触发器色调；未传时自动采用当前选中项的 tone
   */
  tone?: SelectTone;
  /**
   * 是否禁用
   */
  disabled?: boolean;
  /**
   * 是否支持清空
   */
  clearable?: boolean;
  /**
   * 是否启用搜索过滤
   */
  filterable?: boolean;
  /**
   * 搜索框占位文案
   */
  filterPlaceholder?: string;
  /**
   * 无匹配项提示
   */
  emptyText?: string;
  /**
   * 下拉列表最大高度（px）
   */
  maxHeight?: number;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择',
  size: 'md',
  variant: 'default',
  tone: undefined,
  disabled: false,
  clearable: false,
  filterable: false,
  filterPlaceholder: '搜索选项...',
  emptyText: '暂无匹配项',
  maxHeight: 240,
});

/**
 * 定义 emits 的类型声明
 */
interface Emits {
  change: [value: SelectValue, option: SelectOption | null];
  clear: [];
  visibleChange: [visible: boolean];
}

/**
 * 定义 emits
 */
const emits = defineEmits<Emits>();

/**
 * 引入 composables
 */
const { nextZIndex } = useZIndex();
const formContext = inject(FORM_CONTEXT_KEY, null);
const formItemContext = inject(FORM_ITEM_CONTEXT_KEY, null);

/**
 * 定义响应式数据
 */
const listboxId = `base-select-listbox-${useId()}`;
const triggerWrapRef = useTemplateRef<HTMLDivElement>('triggerWrapRef');
const triggerButtonRef = useTemplateRef<HTMLButtonElement>('triggerButtonRef');
const dropdownRef = useTemplateRef<HTMLDivElement>('dropdownRef');
const searchInputRef = useTemplateRef<HTMLInputElement>('searchInputRef');
const isOpen = ref(false);
const keyword = ref('');
const activeIndex = ref(-1);
const dropdownZIndex = ref(2000);
const dropdownStyle = ref<CSSProperties>({});

/**
 * 计算属性
 * 作用：当前已选中的选项对象
 */
const selectedOption = computed<SelectOption | null>(() => {
  return props.options.find((option) => option.value === modelValue.value) ?? null;
});

/**
 * 计算属性
 * 作用：过滤后的选项列表
 */
const filteredOptions = computed<SelectOption[]>(() => {
  const query = keyword.value.trim().toLowerCase();
  if (!props.filterable || !query) {
    return props.options;
  }

  return props.options.filter(
    (option) =>
      option.label.toLowerCase().includes(query) ||
      (option.description ? option.description.toLowerCase().includes(query) : false),
  );
});

/**
 * 计算属性
 * 作用：触发器当前生效色调
 */
const activeTone = computed<SelectTone>(() => {
  return props.tone ?? selectedOption.value?.tone ?? 'default';
});

const isDisabled = computed<boolean>(() => props.disabled || Boolean(formContext?.disabled.value));
const isError = computed<boolean>(() => Boolean(formItemContext?.isError.value));

/**
 * 计算属性
 * 作用：是否展示清空按钮
 */
const showClearButton = computed<boolean>(() => {
  return Boolean(props.clearable && !isDisabled.value && selectedOption.value);
});

/**
 * 判断选项是否为当前选中项
 */
const isSelected = (option: SelectOption): boolean => {
  return option.value === modelValue.value;
};

/**
 * 计算并更新 Teleport 下拉浮层的位置，视口底部空间不足时自动向上翻转
 */
const updateDropdownPosition = (): void => {
  const triggerEl = triggerWrapRef.value;
  if (!triggerEl) {
    return;
  }

  const rect = triggerEl.getBoundingClientRect();
  const estimatedHeight = Math.min(props.maxHeight + (props.filterable ? 44 : 12), 300);
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUpward = spaceBelow < estimatedHeight && rect.top > spaceBelow;
  const minWidth = Math.max(rect.width, props.variant === 'pill' ? 124 : rect.width);
  const clampedLeft = Math.min(rect.left, Math.max(8, window.innerWidth - minWidth - 8));

  dropdownStyle.value = {
    position: 'fixed',
    left: `${clampedLeft}px`,
    minWidth: `${minWidth}px`,
    zIndex: dropdownZIndex.value,
    ...(openUpward ? { bottom: `${window.innerHeight - rect.top + 6}px` } : { top: `${rect.bottom + 6}px` }),
  };
};

/**
 * 关闭下拉面板并重置搜索词
 */
const closeDropdown = (): void => {
  if (!isOpen.value) {
    return;
  }

  isOpen.value = false;
  keyword.value = '';
  activeIndex.value = -1;
  emits('visibleChange', false);
};

/**
 * 打开下拉面板并初始化焦点和定位
 */
const openDropdown = (): void => {
  if (isDisabled.value || isOpen.value) {
    return;
  }

  dropdownZIndex.value = nextZIndex();
  isOpen.value = true;
  activeIndex.value = filteredOptions.value.findIndex((item) => isSelected(item) && !item.disabled);
  updateDropdownPosition();
  emits('visibleChange', true);

  if (props.filterable) {
    void nextTick(() => {
      searchInputRef.value?.focus();
    });
  }
};

/**
 * 处理触发器点击切换
 */
const handleToggle = (): void => {
  if (isOpen.value) {
    closeDropdown();
  } else {
    openDropdown();
  }
};

/**
 * 处理选中选项
 */
const handleSelect = (option: SelectOption): void => {
  if (option.disabled) {
    return;
  }

  const changed = option.value !== modelValue.value;
  modelValue.value = option.value;
  if (changed) {
    emits('change', option.value, option);
  }
  void formItemContext?.validate('change');
  closeDropdown();
  triggerButtonRef.value?.focus();
};

/**
 * 处理清空已选项
 */
const handleClear = (): void => {
  if (isDisabled.value) {
    return;
  }

  modelValue.value = null;
  emits('change', null, null);
  emits('clear');
  void formItemContext?.validate('change');
  closeDropdown();
};

/**
 * 查找下一个可用选项索引
 */
const moveActiveIndex = (step: 1 | -1): void => {
  const list = filteredOptions.value;
  if (list.length === 0) {
    activeIndex.value = -1;
    return;
  }

  let cursor = activeIndex.value;
  for (let i = 0; i < list.length; i += 1) {
    cursor = (cursor + step + list.length) % list.length;
    if (!list[cursor]?.disabled) {
      activeIndex.value = cursor;
      return;
    }
  }
};

/**
 * 处理键盘导航（上下选择、回车确认）
 */
const handleTriggerKeydown = (event: KeyboardEvent): void => {
  if (isDisabled.value) {
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (!isOpen.value) {
      openDropdown();
      return;
    }
    moveActiveIndex(1);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (!isOpen.value) {
      openDropdown();
      return;
    }
    moveActiveIndex(-1);
    return;
  }

  if (event.key === 'Enter' && isOpen.value) {
    const targetOption = filteredOptions.value[activeIndex.value];
    if (targetOption && !targetOption.disabled) {
      event.preventDefault();
      handleSelect(targetOption);
    }
  }
};

/**
 * 监听事件
 */
useEscapeStack(isOpen, closeDropdown);
useClickOutside(() => [triggerWrapRef.value, dropdownRef.value], isOpen, closeDropdown);

const handleViewportChange = (): void => {
  if (isOpen.value) {
    updateDropdownPosition();
  }
};

watch(isOpen, (opened) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (opened) {
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
  } else {
    window.removeEventListener('resize', handleViewportChange);
    window.removeEventListener('scroll', handleViewportChange, true);
  }
});

/**
 * 生命周期函数
 */
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleViewportChange);
    window.removeEventListener('scroll', handleViewportChange, true);
  }
});
</script>

<style lang="scss" src="./index.scss" scoped></style>
