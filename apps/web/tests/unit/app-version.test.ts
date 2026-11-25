import { afterEach, expect, rs, test } from '@rstest/core';
import { startAppVersionCheck } from '../../build/runtime/check';

afterEach(() => {
  rs.unstubAllGlobals();
});

test('同一版本自动通知一次，手动检查可再次通知，停止后不再请求', async () => {
  const browser = Object.assign(new EventTarget(), { setInterval, clearInterval });
  const page = Object.assign(new EventTarget(), {
    visibilityState: 'visible',
    querySelector: () => ({ content: 'current' }),
  });
  const fetchVersion = rs.fn(() => Promise.resolve(Response.json({ buildId: 'next' })));
  const onUpdate = rs.fn();
  rs.stubGlobal('window', browser);
  rs.stubGlobal('document', page);
  rs.stubGlobal('fetch', fetchVersion);
  browser.addEventListener('app-update-ready', onUpdate);

  const { checkNow, stop } = startAppVersionCheck();
  try {
    expect(await checkNow()).toBe('update-available');
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(await checkNow()).toBe('update-available');
    expect(onUpdate).toHaveBeenCalledTimes(2);

    stop();
    browser.dispatchEvent(new Event('online'));
    expect(await checkNow()).toBe('unavailable');
    expect(fetchVersion).toHaveBeenCalledTimes(2);
  } finally {
    stop();
  }
});
