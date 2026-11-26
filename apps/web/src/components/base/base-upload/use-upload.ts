import { detectUploadKind, matchesUploadAccept, readFileAsBase64, resolveUploadAccept } from './upload-helper';

import type { MaybeRefOrGetter } from 'vue';
import type {
  ImagePreviewItem,
  UploadMediaType,
  UploadModelValue,
  UploadPreviewRecord,
  UploadSingleValue,
  UploadValueType,
} from '@/types';

let uidSeed = 1;

/**
 * 将外部 v-model 归一化为数组便于内部统一同步
 */
const toValueArray = (value: UploadModelValue): UploadSingleValue[] => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

/**
 * 从纯字符串（URL 或 Base64）提取可读展示名
 */
const resolveStringName = (value: string, kind: 'image' | 'video' | 'file', index: number): string => {
  if (value.startsWith('data:')) {
    const ext = value.match(/^data:[^/]+\/([^;+]+)/)?.[1] ?? 'bin';
    const label = kind === 'image' ? '图片' : kind === 'video' ? '视频' : '文件';
    return `${label}-${index + 1}.${ext}`;
  }
  const segment = value.split('/').pop()?.split('?')[0];
  return segment || `附件-${index + 1}`;
};

/**
 * 上传组件状态机
 *
 * 管理 File / Base64 双模式转换、预览记录同步、Object URL 内存回收、拖拽与粘贴交互。
 */
export const useUpload = (options: {
  modelValue: Ref<UploadModelValue>;
  mediaType: MaybeRefOrGetter<UploadMediaType>;
  valueType: MaybeRefOrGetter<UploadValueType>;
  accept: MaybeRefOrGetter<string | undefined>;
  multiple: MaybeRefOrGetter<boolean>;
  maxCount: MaybeRefOrGetter<number>;
  maxSizeMB: MaybeRefOrGetter<number>;
  disabled: MaybeRefOrGetter<boolean>;
  onChange: (value: UploadModelValue) => void;
  onReject: (reason: string, file?: File) => void;
}) => {
  const records = ref<UploadPreviewRecord[]>([]);
  const isDragOver = ref(false);
  const isReading = ref(false);
  const imagePreviewVisible = ref(false);
  const imagePreviewIndex = ref(0);
  const activeVideo = ref<UploadPreviewRecord | null>(null);

  const acceptAttr = computed<string>(() => resolveUploadAccept(toValue(options.mediaType), toValue(options.accept)));

  const isMaxReached = computed<boolean>(() => {
    if (!toValue(options.multiple)) {
      return records.value.length >= 1;
    }
    return records.value.length >= toValue(options.maxCount);
  });

  const imagePreviewList = computed<ImagePreviewItem[]>(() => {
    return records.value
      .filter((item) => item.kind === 'image' && Boolean(item.previewUrl))
      .map((item) => ({ src: item.previewUrl, alt: item.name }));
  });

  const videoDialogVisible = computed<boolean>({
    get: () => activeVideo.value !== null,
    set: (val) => {
      if (!val) {
        activeVideo.value = null;
      }
    },
  });

  /**
   * 回收不再使用的 Object URL，避免多次选图/卸载造成内存泄漏
   */
  const revokeObjectUrl = (record: UploadPreviewRecord): void => {
    if (record.isObjectUrl && record.previewUrl && typeof URL !== 'undefined') {
      URL.revokeObjectURL(record.previewUrl);
    }
  };

  /**
   * 当外部 v-model 变化（包括表单 resetFields 或回显初始值）时同步内部预览列表
   */
  const syncRecordsFromModel = (model: UploadModelValue): void => {
    const incoming = toValueArray(model);
    const existingByValue = new Map<UploadSingleValue, UploadPreviewRecord>();
    records.value.forEach((record) => {
      existingByValue.set(record.value, record);
    });

    const reusedSet = new Set<UploadPreviewRecord>();
    const nextRecords: UploadPreviewRecord[] = incoming.map((val, idx) => {
      const matched = existingByValue.get(val);
      if (matched) {
        reusedSet.add(matched);
        return matched;
      }

      const kind = detectUploadKind(val, toValue(options.mediaType));
      if (typeof val === 'string') {
        return {
          uid: `upload_${uidSeed++}`,
          value: val,
          previewUrl: kind === 'image' || kind === 'video' ? val : '',
          isObjectUrl: false,
          kind,
          name: resolveStringName(val, kind, idx),
        };
      }

      const canPreview = kind === 'image' || kind === 'video';
      const previewUrl = canPreview && typeof URL !== 'undefined' ? URL.createObjectURL(val) : '';
      return {
        uid: `upload_${uidSeed++}`,
        value: val,
        previewUrl,
        isObjectUrl: Boolean(previewUrl),
        kind,
        name: val.name,
        size: val.size,
      };
    });

    records.value.forEach((oldRecord) => {
      if (!reusedSet.has(oldRecord)) {
        revokeObjectUrl(oldRecord);
      }
    });

    records.value = nextRecords;
  };

  /**
   * 将当前 records 写回外部 v-model 并通知变更
   */
  const commitRecords = (nextRecords: UploadPreviewRecord[]): void => {
    records.value = nextRecords;
    const nextModel: UploadModelValue = toValue(options.multiple)
      ? nextRecords.map((item) => item.value)
      : (nextRecords[0]?.value ?? null);
    options.modelValue.value = nextModel;
    options.onChange(nextModel);
  };

  /**
   * 校验并接收新选择/拖拽/粘贴的文件列表
   */
  const addFiles = async (rawFiles: File[]): Promise<void> => {
    if (toValue(options.disabled) || rawFiles.length === 0) {
      return;
    }

    const accept = acceptAttr.value;
    const maxSizeBytes = toValue(options.maxSizeMB) * 1024 * 1024;
    const multiple = toValue(options.multiple);
    const maxCount = multiple ? toValue(options.maxCount) : 1;
    const remainingSlots = multiple ? Math.max(0, maxCount - records.value.length) : 1;

    if (multiple && remainingSlots <= 0) {
      options.onReject(`最多只能上传 ${maxCount} 个文件`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of rawFiles) {
      if (!matchesUploadAccept(file, accept)) {
        options.onReject(`不支持的文件格式：${file.name}`, file);
        continue;
      }
      if (file.size > maxSizeBytes) {
        options.onReject(`文件 ${file.name} 超过 ${toValue(options.maxSizeMB)} MB 限制`, file);
        continue;
      }
      if (validFiles.length >= remainingSlots) {
        options.onReject(`最多只能上传 ${maxCount} 个文件，超出部分已忽略`, file);
        break;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    isReading.value = true;
    try {
      const valueType = toValue(options.valueType);
      const fallbackType = toValue(options.mediaType);
      const created: UploadPreviewRecord[] = [];

      for (const file of validFiles) {
        const kind = detectUploadKind(file, fallbackType);
        if (valueType === 'base64') {
          const base64 = await readFileAsBase64(file);
          created.push({
            uid: `upload_${uidSeed++}`,
            value: base64,
            previewUrl: kind === 'image' || kind === 'video' ? base64 : '',
            isObjectUrl: false,
            kind,
            name: file.name,
            size: file.size,
          });
        } else {
          const canPreview = kind === 'image' || kind === 'video';
          const previewUrl = canPreview && typeof URL !== 'undefined' ? URL.createObjectURL(file) : '';
          created.push({
            uid: `upload_${uidSeed++}`,
            value: file,
            previewUrl,
            isObjectUrl: Boolean(previewUrl),
            kind,
            name: file.name,
            size: file.size,
          });
        }
      }

      if (!multiple) {
        records.value.forEach(revokeObjectUrl);
        commitRecords(created.slice(0, 1));
      } else {
        commitRecords([...records.value, ...created]);
      }
    } catch {
      options.onReject('文件读取失败，请重试');
    } finally {
      isReading.value = false;
    }
  };

  /**
   * 删除指定索引的文件
   */
  const removeRecord = (uid: string): void => {
    if (toValue(options.disabled)) {
      return;
    }
    const index = records.value.findIndex((item) => item.uid === uid);
    if (index === -1) {
      return;
    }

    const removed = records.value[index];
    if (removed) {
      revokeObjectUrl(removed);
      if (activeVideo.value?.uid === removed.uid) {
        activeVideo.value = null;
      }
    }

    const next = records.value.filter((item) => item.uid !== uid);
    commitRecords(next);
  };

  /**
   * 打开图片灯箱或视频播放弹窗
   */
  const openPreview = (record: UploadPreviewRecord): void => {
    if (record.kind === 'image' && record.previewUrl) {
      const idx = imagePreviewList.value.findIndex((item) => item.src === record.previewUrl);
      imagePreviewIndex.value = Math.max(0, idx);
      imagePreviewVisible.value = true;
      return;
    }
    if (record.kind === 'video' && record.previewUrl) {
      activeVideo.value = record;
    }
  };

  watch(
    () => options.modelValue.value,
    (val) => {
      syncRecordsFromModel(val);
    },
    { immediate: true, deep: false },
  );

  onScopeDispose(() => {
    records.value.forEach(revokeObjectUrl);
    records.value = [];
  });

  return {
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
  };
};
