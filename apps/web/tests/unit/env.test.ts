import { expect, test } from '@rstest/core';
import { getAppEnv, isDev, isOfflineCacheEnabled } from '@/env';

test('读取独立的测试环境配置', () => {
  expect(getAppEnv()).toBe('test');
  expect(isOfflineCacheEnabled()).toBe(false);
  expect(isDev()).toBe(false);
});
