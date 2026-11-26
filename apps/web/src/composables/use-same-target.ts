/**
 * 遮罩同目标点击判定
 *
 * 1:1 复刻 Element Plus useSameTarget：只有 mousedown 与 mouseup 均发生在遮罩元素自身时，
 * 才在 click 时触发关闭，彻底避免用户在弹窗输入框内拖选文字并松手到遮罩上导致误关闭。
 */
export const useSameTarget = (handleClick?: (event: MouseEvent) => void) => {
  if (!handleClick) {
    return {
      onClick: (): void => undefined,
      onMousedown: (): void => undefined,
      onMouseup: (): void => undefined,
    };
  }

  let mousedownTarget = false;
  let mouseupTarget = false;

  const onClick = (event: MouseEvent): void => {
    if (mousedownTarget && mouseupTarget) {
      handleClick(event);
    }
    mousedownTarget = false;
    mouseupTarget = false;
  };

  const onMousedown = (event: MouseEvent): void => {
    mousedownTarget = event.target === event.currentTarget;
  };

  const onMouseup = (event: MouseEvent): void => {
    mouseupTarget = event.target === event.currentTarget;
  };

  return {
    onClick,
    onMousedown,
    onMouseup,
  };
};
