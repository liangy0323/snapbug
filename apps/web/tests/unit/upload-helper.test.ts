import { expect, test } from '@rstest/core';

import {
  detectUploadKind,
  formatFileSize,
  matchesUploadAccept,
  resolveUploadAccept,
} from '@/components/base/base-upload/upload-helper';

test('resolveUploadAccept 按媒体预设或自定义值生成 accept', () => {
  expect(resolveUploadAccept('image')).toBe('image/*');
  expect(resolveUploadAccept('video')).toBe('video/*');
  expect(resolveUploadAccept('media')).toBe('image/*,video/*');
  expect(resolveUploadAccept('file')).toBe('');
  expect(resolveUploadAccept('file', '.xlsx,.xls')).toBe('.xlsx,.xls');
});

test('detectUploadKind 与 matchesUploadAccept 正确识别图片、视频与普通文件', () => {
  const pngFile = new File(['demo'], 'bug.png', { type: 'image/png' });
  const mp4File = new File(['demo'], 'record.mp4', { type: 'video/mp4' });
  const xlsxFile = new File(['demo'], 'members.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  expect(detectUploadKind(pngFile, 'file')).toBe('image');
  expect(detectUploadKind(mp4File, 'file')).toBe('video');
  expect(detectUploadKind(xlsxFile, 'file')).toBe('file');
  expect(detectUploadKind('data:image/png;base64,abc', 'file')).toBe('image');
  expect(detectUploadKind('data:video/mp4;base64,abc', 'file')).toBe('video');

  expect(matchesUploadAccept(pngFile, 'image/*')).toBe(true);
  expect(matchesUploadAccept(mp4File, 'image/*')).toBe(false);
  expect(matchesUploadAccept(mp4File, 'image/*,video/*')).toBe(true);
  expect(matchesUploadAccept(xlsxFile, '.xlsx,.xls')).toBe(true);
  expect(matchesUploadAccept(pngFile, '.xlsx,.xls')).toBe(false);
});

test('formatFileSize 按字节梯次格式化体积', () => {
  expect(formatFileSize(512)).toBe('512 B');
  expect(formatFileSize(2048)).toBe('2.0 KB');
  expect(formatFileSize(2 * 1024 * 1024)).toBe('2.00 MB');
  expect(formatFileSize(undefined)).toBe('');
});
