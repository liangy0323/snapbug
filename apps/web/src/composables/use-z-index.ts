const DEFAULT_INITIAL_Z_INDEX = 2000;

let currentZIndex = DEFAULT_INITIAL_Z_INDEX;

/**
 * 全局弹层层级管理器
 *
 * 借鉴 Element Plus useZIndex，为弹窗、抽屉、下拉面板、确认框和轻提示分配单调递增层级，
 * 避免多层覆盖层叠加时出现遮挡错位。
 */
export const useZIndex = () => {
  /**
   * 分配并返回下一个可用层级
   */
  const nextZIndex = (): number => {
    currentZIndex += 1;
    return currentZIndex;
  };

  /**
   * 读取当前最高层级
   */
  const getCurrentZIndex = (): number => currentZIndex;

  return {
    nextZIndex,
    getCurrentZIndex,
  };
};

/**
 * 仅用于单元测试重置全局层级基线
 */
export const resetZIndexForTest = (initialValue = DEFAULT_INITIAL_Z_INDEX): void => {
  currentZIndex = initialValue;
};
