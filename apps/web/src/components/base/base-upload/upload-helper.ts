import type { UploadMediaType, UploadSingleValue } from '@/types';

const IMAGE_EXT_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(?:\?.*)?$/i;
const VIDEO_EXT_PATTERN = /\.(mp4|webm|mov|m4v|ogg|ogv)(?:\?.*)?$/i;

/**
 * 根据媒体预设或自定义 accept 生成 input accept 属性
 */
export const resolveUploadAccept = (mediaType: UploadMediaType, customAccept?: string): string => {
  if (customAccept !== undefined && customAccept.trim().length > 0) {
    return customAccept.trim();
  }

  if (mediaType === 'image') {
    return 'image/*';
  }
  if (mediaType === 'video') {
    return 'video/*';
  }
  if (mediaType === 'media') {
    return 'image/*,video/*';
  }
  return '';
};

/**
 * 识别文件或 Data URL / 路径的展示类别
 */
export const detectUploadKind = (source: UploadSingleValue, fallback: UploadMediaType): 'image' | 'video' | 'file' => {
  if (typeof source !== 'string') {
    if (source.type.startsWith('image/') || IMAGE_EXT_PATTERN.test(source.name)) {
      return 'image';
    }
    if (source.type.startsWith('video/') || VIDEO_EXT_PATTERN.test(source.name)) {
      return 'video';
    }
    return 'file';
  }

  if (source.startsWith('data:image/') || IMAGE_EXT_PATTERN.test(source)) {
    return 'image';
  }
  if (source.startsWith('data:video/') || VIDEO_EXT_PATTERN.test(source)) {
    return 'video';
  }
  if (fallback === 'image') {
    return 'image';
  }
  if (fallback === 'video') {
    return 'video';
  }
  return 'file';
};

/**
 * 校验文件是否满足 accept 限制（支持通配 MIME、精确 MIME、扩展名）
 */
export const matchesUploadAccept = (file: File, accept: string): boolean => {
  const normalized = accept.trim();
  if (!normalized || normalized === '*/*') {
    return true;
  }

  const rules = normalized
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (rules.length === 0) {
    return true;
  }

  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  return rules.some((rule) => {
    if (rule.startsWith('.')) {
      return fileName.endsWith(rule);
    }
    if (rule.endsWith('/*')) {
      const prefix = rule.slice(0, -1);
      return fileType.startsWith(prefix);
    }
    return fileType === rule;
  });
};

/**
 * 格式化文件体积
 */
export const formatFileSize = (bytes?: number): string => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes < 0) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * 将 File 对象读取为 Base64 Data URL
 */
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('文件读取失败'));
      }
    };
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    reader.readAsDataURL(file);
  });
};
