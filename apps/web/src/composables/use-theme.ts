import type { ThemeMode } from '@/types';

const THEME_STORAGE_KEY = 'SNAPBUG_THEME';

/**
 * 解析首屏主题：优先读取本地持久化偏好，未设置时跟随系统配色
 */
const resolveInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // 隐私模式或禁用存储时回退至系统偏好
  }

  const domTheme = document.documentElement.dataset.theme;
  if (domTheme === 'dark' || domTheme === 'light') {
    return domTheme;
  }

  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
};

const currentTheme = ref<ThemeMode>(resolveInitialTheme());

/**
 * 将主题写入根节点 data-theme（不触发大面积 class 修改）
 */
const applyThemeToDom = (mode: ThemeMode): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = mode;
  }
};

applyThemeToDom(currentTheme.value);

/**
 * 全局亮/暗主题状态管理
 *
 * 首次访问自动跟随系统配色，手动切换后持久化至 localStorage。
 */
export const useTheme = () => {
  const isDark = computed<boolean>(() => currentTheme.value === 'dark');

  /**
   * 显式切换至指定主题并持久化
   */
  const setTheme = (mode: ThemeMode): void => {
    currentTheme.value = mode;
    applyThemeToDom(mode);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch {
        // 忽略存储写入异常
      }
    }
  };

  /**
   * 一键在亮色与暗色之间切换
   */
  const toggleTheme = (): void => {
    setTheme(currentTheme.value === 'dark' ? 'light' : 'dark');
  };

  return {
    theme: readonly(currentTheme),
    isDark,
    setTheme,
    toggleTheme,
  };
};

/**
 * 仅用于单元测试重置主题状态
 */
export const resetThemeForTest = (mode: ThemeMode = 'light'): void => {
  currentTheme.value = mode;
  applyThemeToDom(mode);
};
