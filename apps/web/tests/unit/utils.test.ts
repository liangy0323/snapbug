import { afterEach, expect, rs, test } from '@rstest/core';
import {
  cloneDeep,
  getLocalStorage,
  getUrlQueryValue,
  initNetworkNotifier,
  isJSONString,
  removeLocalStorage,
  setLocalStorage,
  trimString,
} from '@/utils';

afterEach(() => {
  rs.unstubAllGlobals();
});

test('解析 JSON 和显式查询参数时可在 Node 中使用', () => {
  expect(isJSONString('{"enabled":true}')).toBe(true);
  expect(isJSONString('{')).toBe(false);
  expect(trimString('  demo\n')).toBe('demo');
  expect(getUrlQueryValue('q', '?q=Vue+3')).toBe('Vue 3');
  expect(getUrlQueryValue('q')).toBe('');
});

test('克隆循环引用、集合与稀疏数组', () => {
  const source = new Map<string, unknown>();
  const list = new Array(3);
  list[2] = source;
  source.set('list', list);
  source.set('set', new Set([source]));

  const copy = cloneDeep(source);
  const copiedList = copy.get('list') as unknown[];
  expect(copy).not.toBe(source);
  expect(copiedList).toHaveLength(3);
  expect(0 in copiedList).toBe(false);
  expect(copiedList[2]).toBe(copy);
  expect(copy.get('set')).toEqual(new Set([copy]));
});

test('克隆 JSON 自有属性时保留对象原型', () => {
  const input = JSON.parse('{"__proto__":{"name":"example"}}') as Record<string, unknown>;
  const output = cloneDeep(input);
  expect(Object.hasOwn(output, '__proto__')).toBe(true);
  expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
  expect(Object.getOwnPropertyDescriptor(output, '__proto__')?.value).toEqual({ name: 'example' });
});

test('读写和移除指定的存储键，损坏值按缺失处理', () => {
  const items = new Map([
    ['other', '1'],
    ['invalid', '{'],
  ]);
  rs.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
      removeItem: (key: string) => items.delete(key),
    },
  });

  setLocalStorage('example', { enabled: true });
  expect(getLocalStorage('example')).toEqual({ enabled: true });
  expect(getLocalStorage('invalid')).toBeNull();
  removeLocalStorage('example');
  expect(getLocalStorage('example')).toBeNull();
  expect(getLocalStorage('other')).toBe(1);
});

test('网络提示只注册一组监听，卸载后停止回调', () => {
  const browser = new EventTarget();
  const notify = rs.fn();
  rs.stubGlobal('window', browser);
  const stop = initNetworkNotifier(notify);

  try {
    expect(initNetworkNotifier(notify)).toBe(stop);
    browser.dispatchEvent(new Event('offline'));
    browser.dispatchEvent(new Event('online'));
    stop();
    browser.dispatchEvent(new Event('offline'));
    expect(notify.mock.calls.map(([, status]) => status)).toEqual(['offline', 'online']);
  } finally {
    stop();
  }
});
