/**
 * 根据当前主题与 CSS 主色动态生成颗粒渐变色板，支持未来主色换肤自动联动
 */

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string): [number, number, number] | null => {
  const clean = hex.trim().replace(/^#/, '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : clean.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return null;
  }
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
};

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0);
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }

  return [(h / 6) * 360, s, l];
};

const hslToHex = (h: number, s: number, l: number, alphaHex = ''): string => {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 1);
  const light = clamp(l, 0, 1);

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r: number;
  let g: number;
  let b: number;
  if (hue < 60) {
    [r, g, b] = [c, x, 0];
  } else if (hue < 120) {
    [r, g, b] = [x, c, 0];
  } else if (hue < 180) {
    [r, g, b] = [0, c, x];
  } else if (hue < 240) {
    [r, g, b] = [0, x, c];
  } else if (hue < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`;
};

export const readPrimaryColorHex = (fallback: string): string => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = window.getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
  return value.startsWith('#') ? value : fallback;
};

/**
 * 基于当前主色与明暗主题生成三段式颗粒渐变色板
 */
export const buildGrainPalette = (primaryHex: string, isDark: boolean): string[] => {
  const rgb = hexToRgb(primaryHex);
  if (!rgb) {
    return isDark ? ['#3b82f642', '#3b82f6', '#38bdf8'] : ['#38bdf848', '#1b74ff', '#2dd4bf'];
  }

  const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);

  if (isDark) {
    return [
      hslToHex(h + 14, clamp(s * 0.9, 0.45, 0.95), clamp(l * 0.85, 0.36, 0.58), '44'),
      hslToHex(h, clamp(s, 0.55, 0.95), clamp(l, 0.48, 0.62)),
      hslToHex(h - 24, clamp(s * 0.92, 0.5, 0.95), clamp(l + 0.08, 0.54, 0.72)),
    ];
  }

  return [
    hslToHex(h - 16, clamp(s * 0.88, 0.5, 0.95), clamp(l + 0.14, 0.6, 0.78), '48'),
    hslToHex(h, clamp(s, 0.6, 1), clamp(l, 0.48, 0.6)),
    hslToHex(h - 42, clamp(s * 0.82, 0.45, 0.88), clamp(l + 0.06, 0.5, 0.68)),
  ];
};
