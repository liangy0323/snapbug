import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import MarkdownIt from 'markdown-it-ts';

/**
 * 按需注册研发常用语法高亮语言，避免全量引入 190+ 语言导致前端产物体积膨胀
 */
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('css', css);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('vue', xml);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('go', go);
hljs.registerLanguage('java', java);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);

const escapeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * 构造全局共享的 markdown-it-ts 解析实例
 *
 * 关闭原生 HTML 直通（html: false），避免用户输入或笔记中的原始脚本标签造成 XSS。
 */
const createMarkdownRenderer = () => {
  const md = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
    typographer: false,
  });

  const defaultLinkOpen =
    md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const href = token?.attrGet('href') ?? '';
    if (/^https?:\/\//i.test(href)) {
      token?.attrSet('target', '_blank');
      token?.attrSet('rel', 'noopener noreferrer');
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const rawCode = token?.content ?? '';
    const langRaw = (token?.info ?? '').trim().split(/\s+/)[0] ?? '';
    const langLower = langRaw.toLowerCase();
    const displayLang = langLower || 'text';

    let highlighted: string;
    if (langLower && hljs.getLanguage(langLower)) {
      try {
        highlighted = hljs.highlight(rawCode, { language: langLower, ignoreIllegals: true }).value;
      } catch {
        highlighted = escapeHtml(rawCode);
      }
    } else {
      highlighted = escapeHtml(rawCode);
    }

    const safeLangClass = escapeHtml(displayLang);
    return [
      '<div class="base-markdown-preview__code-block">',
      '  <div class="base-markdown-preview__code-head">',
      `    <span class="base-markdown-preview__code-lang">${safeLangClass}</span>`,
      '    <button type="button" class="base-markdown-preview__code-copy" data-code-copy>复制</button>',
      '  </div>',
      `  <pre class="base-markdown-preview__pre"><code class="hljs language-${safeLangClass}">${highlighted}</code></pre>`,
      '</div>',
    ].join('\n');
  };

  return md;
};

const markdownRenderer = createMarkdownRenderer();

/**
 * 将 Markdown 文本渲染为安全的 HTML 字符串
 */
export const renderMarkdown = (source: string): string => {
  if (!source.trim()) {
    return '';
  }

  return markdownRenderer.render(source);
};
