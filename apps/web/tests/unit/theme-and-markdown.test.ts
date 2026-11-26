import { afterEach, expect, rs, test } from '@rstest/core';

import { renderMarkdown } from '@/components/base/base-markdown-preview/render-markdown';
import { resetThemeForTest, useTheme } from '@/composables/use-theme';

afterEach(() => {
  resetThemeForTest('light');
  rs.unstubAllGlobals();
});

test('useTheme 在亮色与暗黑模式间切换并同步 DOM data-theme 与持久化', () => {
  const dataset: Record<string, string> = { theme: 'light' };
  const storage = new Map<string, string>();
  rs.stubGlobal('document', { documentElement: { dataset } });
  rs.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });

  const { theme, isDark, setTheme, toggleTheme } = useTheme();

  expect(theme.value).toBe('light');
  expect(isDark.value).toBe(false);

  toggleTheme();
  expect(theme.value).toBe('dark');
  expect(isDark.value).toBe(true);
  expect(dataset.theme).toBe('dark');
  expect(storage.get('SNAPBUG_THEME')).toBe('dark');

  setTheme('light');
  expect(theme.value).toBe('light');
  expect(dataset.theme).toBe('light');
  expect(storage.get('SNAPBUG_THEME')).toBe('light');
});

test('renderMarkdown 禁用原生 HTML 注入并正确渲染语法高亮代码块与外链属性', () => {
  const md = [
    '# 标题',
    '',
    '<script>alert(1)</script>',
    '',
    '[文档](https://example.com)',
    '',
    '```ts',
    'const count: number = 1;',
    '```',
  ].join('\n');

  const html = renderMarkdown(md);
  expect(html).toContain('<h1>标题</h1>');
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain('data-code-copy');
  expect(html).toContain('hljs-keyword');
});
