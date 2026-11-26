import { afterEach, describe, expect, it, rs } from '@rstest/core';

import { useSameTarget } from '@/composables/use-same-target';
import { resetZIndexForTest, useZIndex } from '@/composables/use-z-index';

describe('overlay composables', () => {
  afterEach(() => {
    resetZIndexForTest();
  });

  it('useZIndex 按调用顺序单调递增层级', () => {
    const { nextZIndex, getCurrentZIndex } = useZIndex();

    expect(getCurrentZIndex()).toBe(2000);
    expect(nextZIndex()).toBe(2001);
    expect(nextZIndex()).toBe(2002);
    expect(getCurrentZIndex()).toBe(2002);
  });

  it('useSameTarget 仅当 mousedown 与 mouseup 均命中同一目标时触发关闭', () => {
    const onClose = rs.fn();
    const handlers = useSameTarget(onClose);
    const overlay = {} as EventTarget;
    const innerInput = {} as EventTarget;

    // 场景 1：在内部输入框按下，拖到遮罩外松手 -> 不应误关闭
    handlers.onMousedown({ target: innerInput, currentTarget: overlay } as MouseEvent);
    handlers.onMouseup({ target: overlay, currentTarget: overlay } as MouseEvent);
    handlers.onClick({ target: overlay, currentTarget: overlay } as MouseEvent);
    expect(onClose).not.toHaveBeenCalled();

    // 场景 2：在遮罩按下并松手 -> 正常触发关闭
    handlers.onMousedown({ target: overlay, currentTarget: overlay } as MouseEvent);
    handlers.onMouseup({ target: overlay, currentTarget: overlay } as MouseEvent);
    handlers.onClick({ target: overlay, currentTarget: overlay } as MouseEvent);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
