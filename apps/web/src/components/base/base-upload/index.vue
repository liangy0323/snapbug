<template>
  <div
    class="base-upload"
    :class="{
      'base-upload--disabled': isDisabled,
      'base-upload--error': isError,
    }"
    @paste="handlePaste"
  >
    <input
      ref="inputRef"
      type="file"
      class="base-upload__native"
      :accept="acceptAttr"
      :multiple="props.multiple"
      :disabled="isDisabled"
      @change="handleInputChange"
    />

    <!-- 拖拽/点击/粘贴上传区 -->
    <div
      v-if="showDropzone"
      class="base-upload__dropzone"
      :class="{ 'base-upload__dropzone--dragover': isDragOver }"
      role="button"
      tabindex="0"
      :aria-disabled="isDisabled"
      @click="handleTriggerPick"
      @keydown.enter.prevent="handleTriggerPick"
      @keydown.space.prevent="handleTriggerPick"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="handleDrop"
    >
      <base-circle-loading v-if="isReading" :size="20" />
      <base-icon v-else icon="Upload" :size="20" class="base-upload__drop-icon" />

      <div class="base-upload__drop-main">
        <span class="base-upload__drop-title">{{ resolvedTitle }}</span>
        <span class="base-upload__drop-hint">{{ resolvedHint }}</span>
      </div>
    </div>

    <!-- 已选媒体缩略图网格 -->
    <div v-if="mediaRecords.length > 0" class="base-upload__media-grid">
      <div v-for="record in mediaRecords" :key="record.uid" class="base-upload__media-card">
        <button
          type="button"
          class="base-upload__media-trigger"
          :aria-label="record.kind === 'video' ? `播放 ${record.name}` : `预览 ${record.name}`"
          @click="openPreview(record)"
        >
          <img
            v-if="record.kind === 'image'"
            :src="record.previewUrl"
            :alt="record.name"
            class="base-upload__media-thumb"
          />
          <template v-else>
            <video :src="record.previewUrl" class="base-upload__media-thumb" muted preload="metadata" />
            <span class="base-upload__video-play">
              <base-icon icon="Play" :size="16" />
            </span>
          </template>
        </button>

        <div class="base-upload__media-meta">
          <span class="base-upload__media-name" :title="record.name">{{ record.name }}</span>
          <span v-if="record.size !== undefined" class="base-upload__media-size">
            {{ formatFileSize(record.size) }}
          </span>
        </div>

        <button
          v-if="!isDisabled"
          type="button"
          class="base-upload__remove"
          aria-label="移除文件"
          @click.stop="removeRecord(record.uid)"
        >
          <base-icon icon="X" :size="13" />
        </button>
      </div>
    </div>

    <!-- 普通文件列表 -->
    <div v-if="fileRecords.length > 0" class="base-upload__file-list">
      <div v-for="record in fileRecords" :key="record.uid" class="base-upload__file-item">
        <base-icon icon="File" :size="16" class="base-upload__file-icon" />
        <span class="base-upload__file-name" :title="record.name">{{ record.name }}</span>
        <span v-if="record.size !== undefined" class="base-upload__file-size">
          {{ formatFileSize(record.size) }}
        </span>
        <button
          v-if="!isDisabled"
          type="button"
          class="base-upload__file-remove"
          aria-label="移除文件"
          @click="removeRecord(record.uid)"
        >
          <base-icon icon="Trash2" :size="14" />
        </button>
      </div>
    </div>

    <!-- 图片灯箱预览 -->
    <base-image-preview v-model="imagePreviewVisible" :images="imagePreviewList" :initial-index="imagePreviewIndex" />

    <!-- 视频播放弹窗 -->
    <base-dialog v-model="videoDialogVisible" :title="activeVideo?.name || '视频预览'" :width="720" destroy-on-close>
      <video v-if="activeVideo" :src="activeVideo.previewUrl" class="base-upload__video-player" controls autoplay />
    </base-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 导入工具类
 */
import { FORM_CONTEXT_KEY, FORM_ITEM_CONTEXT_KEY } from '@/components/base/base-form/form-context';

import { formatFileSize } from './upload-helper';
import { useUpload } from './use-upload';

/**
 * 导入类型声明
 */
import type { UploadMediaType, UploadModelValue, UploadValueType } from '@/types';

/**
 * 定义 v-model
 */
const modelValue = defineModel<UploadModelValue>({ default: () => [] });

/**
 * 定义 props 的类型声明
 */
interface Props {
  /**
   * 媒体预设类型（image / video / media / file）
   */
  mediaType?: UploadMediaType;
  /**
   * 控制 v-model 输出值为原始 File 还是 Base64 Data URL
   */
  valueType?: UploadValueType;
  /**
   * 自定义原生 accept（传值后覆盖 mediaType 默认值）
   */
  accept?: string;
  /**
   * 是否支持多选（false 时 v-model 为单值或 null，true 时为数组）
   */
  multiple?: boolean;
  /**
   * 多选模式下最多允许上传数量
   */
  maxCount?: number;
  /**
   * 单文件最大体积（MB）
   */
  maxSizeMB?: number;
  /**
   * 是否支持聚焦后 Ctrl+V 粘贴剪贴板图片/视频
   */
  pasteable?: boolean;
  /**
   * 上传区主文案
   */
  title?: string;
  /**
   * 上传区提示副文案
   */
  hint?: string;
  /**
   * 是否禁用
   */
  disabled?: boolean;
}

/**
 * 定义 props
 */
const props = withDefaults(defineProps<Props>(), {
  mediaType: 'media',
  valueType: 'file',
  accept: undefined,
  multiple: true,
  maxCount: 6,
  maxSizeMB: 20,
  pasteable: true,
  title: '',
  hint: '',
  disabled: false,
});

/**
 * 定义 emits 的类型声明
 */
interface Emits {
  change: [value: UploadModelValue];
  reject: [reason: string, file?: File];
}

/**
 * 定义 emits
 */
const emits = defineEmits<Emits>();

/**
 * 注入父级表单上下文
 */
const formContext = inject(FORM_CONTEXT_KEY, null);
const formItemContext = inject(FORM_ITEM_CONTEXT_KEY, null);

/**
 * 定义响应式数据
 */
const inputRef = useTemplateRef<HTMLInputElement>('inputRef');

const isDisabled = computed<boolean>(() => props.disabled || Boolean(formContext?.disabled.value));
const isError = computed<boolean>(() => Boolean(formItemContext?.isError.value));

/**
 * 引入组件内部上传状态机
 */
const {
  records,
  acceptAttr,
  isDragOver,
  isReading,
  isMaxReached,
  imagePreviewList,
  imagePreviewVisible,
  imagePreviewIndex,
  activeVideo,
  videoDialogVisible,
  addFiles,
  removeRecord,
  openPreview,
} = useUpload({
  modelValue,
  mediaType: () => props.mediaType,
  valueType: () => props.valueType,
  accept: () => props.accept,
  multiple: () => props.multiple,
  maxCount: () => props.maxCount,
  maxSizeMB: () => props.maxSizeMB,
  disabled: () => isDisabled.value,
  onChange: (value) => {
    emits('change', value);
    void formItemContext?.validate('change');
  },
  onReject: (reason, file) => {
    emits('reject', reason, file);
  },
});

const mediaRecords = computed(() => records.value.filter((item) => item.kind === 'image' || item.kind === 'video'));
const fileRecords = computed(() => records.value.filter((item) => item.kind === 'file'));
const showDropzone = computed<boolean>(() => !isMaxReached.value || !props.multiple);

const resolvedTitle = computed<string>(() => {
  if (props.title) {
    return props.title;
  }
  const typeLabelMap: Record<UploadMediaType, string> = {
    image: '点击或拖拽图片到此处',
    video: '点击或拖拽视频到此处',
    media: '点击、拖拽图片/视频到此处',
    file: '点击或拖拽文件到此处',
  };
  return typeLabelMap[props.mediaType];
});

const resolvedHint = computed<string>(() => {
  if (props.hint) {
    return props.hint;
  }
  const parts = [`单文件 ≤ ${props.maxSizeMB}MB`];
  if (props.multiple) {
    parts.push(`最多 ${props.maxCount} 个`);
  }
  if (props.pasteable && props.mediaType !== 'file') {
    parts.push('支持 Ctrl+V 粘贴截图');
  }
  return parts.join(' · ');
});

const handleTriggerPick = (): void => {
  if (isDisabled.value) {
    return;
  }
  inputRef.value?.click();
};

const handleInputChange = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  input.value = '';
  void addFiles(files);
};

const handleDragOver = (): void => {
  if (!isDisabled.value) {
    isDragOver.value = true;
  }
};

const handleDrop = (event: DragEvent): void => {
  isDragOver.value = false;
  if (isDisabled.value) {
    return;
  }
  const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
  void addFiles(files);
};

const handlePaste = (event: ClipboardEvent): void => {
  if (!props.pasteable || isDisabled.value) {
    return;
  }
  const items = event.clipboardData?.items ? Array.from(event.clipboardData.items) : [];
  const files = items
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  if (files.length > 0) {
    event.preventDefault();
    void addFiles(files);
  }
};
</script>

<style lang="scss" src="./index.scss" scoped></style>
