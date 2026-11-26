import type { NetworkStatus } from '@/types';

let stopWatching: (() => void) | undefined;

/**
 * 监听浏览器断网与恢复，由调用方决定如何呈现消息。
 * 同一时间只注册一组全局监听，卸载后可以重新初始化。
 * @param notify 接收提示文案和网络状态的回调
 * @returns 移除本次监听的函数，可重复调用
 */
export const initNetworkNotifier = (notify: (message: string, status: NetworkStatus) => void): (() => void) => {
  if (typeof window === 'undefined') return () => undefined;
  if (stopWatching) return stopWatching;

  const onOffline = (): void => notify('网络已断开，请检查网络连接', 'offline');
  const onOnline = (): void => notify('网络已恢复', 'online');
  const stop = (): void => {
    if (stopWatching !== stop) return;
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('online', onOnline);
    stopWatching = undefined;
  };

  window.addEventListener('offline', onOffline);
  window.addEventListener('online', onOnline);
  stopWatching = stop;
  return stop;
};
