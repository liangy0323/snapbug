declare const __APP_VERSION_URL__: string;
declare const __APP_VERSION_SW_SCOPE__: string;

const CHECK_INTERVAL = 5 * 60 * 1000;
const versionUrl = typeof __APP_VERSION_URL__ === 'string' ? __APP_VERSION_URL__ : './version.json';
const serviceWorkerScope = typeof __APP_VERSION_SW_SCOPE__ === 'string' ? __APP_VERSION_SW_SCOPE__ : './';

/**
 * 主动检查的结果，可供设置页区分最新版本、可更新及暂不可用。
 */
export type AppVersionCheckResult = 'up-to-date' | 'update-available' | 'unavailable';

/**
 * 查找当前应用的离线 Worker 注册，避免影响同源其他应用。
 * @returns 作用域和脚本地址匹配时返回注册信息
 */
export const getAppServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | undefined> => {
  if (!('serviceWorker' in navigator)) return;
  const scope = new URL(serviceWorkerScope, window.location.href);
  const registration = await navigator.serviceWorker.getRegistration(scope.href);
  if (registration?.scope !== scope.href) return;

  const scriptUrl = new URL('sw.js', scope).href;
  const workers = [registration.active, registration.waiting, registration.installing];
  return workers.some((worker) => worker?.scriptURL === scriptUrl) ? registration : undefined;
};

/**
 * 读取当前页面的构建号并启动版本检查。
 * 自动检查对同一构建只通知一次。主动检查允许再次提示，例如用户取消后从设置页重试。
 * @returns 主动检查和停止监听的函数
 */
export const startAppVersionCheck = (): {
  checkNow: () => Promise<AppVersionCheckResult>;
  stop: () => void;
} => {
  const currentBuildId = document.querySelector<HTMLMetaElement>('meta[name="build-id"]')?.content.trim();
  const controller = new AbortController();
  let notifiedBuildId: string | undefined;
  let pending: Promise<AppVersionCheckResult> | undefined;

  const fetchLatest = async (manual: boolean): Promise<AppVersionCheckResult> => {
    try {
      const response = await fetch(versionUrl, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) return 'unavailable';

      const latest = (await response.json()) as AppVersionManifest | null;
      if (controller.signal.aborted || typeof latest?.buildId !== 'string' || !latest.buildId) return 'unavailable';
      if (latest.buildId === currentBuildId) return 'up-to-date';

      if (manual || notifiedBuildId !== latest.buildId) {
        notifiedBuildId = latest.buildId;
        // 即使用户暂缓刷新，已有的离线 Worker 也可以检查是否收到停用脚本。
        void getAppServiceWorkerRegistration()
          .then((registration) => registration?.update())
          .catch(() => undefined);
        window.dispatchEvent(
          new CustomEvent('app-update-ready', {
            detail: { source: 'version', currentBuildId, latestBuildId: latest.buildId, latest },
          }),
        );
      }
      return 'update-available';
    } catch {
      return 'unavailable';
    }
  };

  const check = (manual = false): Promise<AppVersionCheckResult> => {
    if (!currentBuildId || controller.signal.aborted || (!manual && document.visibilityState === 'hidden')) {
      return Promise.resolve('unavailable');
    }
    pending ??= fetchLatest(manual).finally(() => {
      pending = undefined;
    });
    return pending;
  };

  const checkAutomatically = (): void => {
    void check();
  };
  const onWorkerReady = (event: WindowEventMap['app-update-ready']): void => {
    if (event.detail.source === 'service-worker') checkAutomatically();
  };
  const options = { signal: controller.signal };
  let timer: number | undefined;

  if (currentBuildId) {
    window.addEventListener('online', checkAutomatically, options);
    window.addEventListener('focus', checkAutomatically, options);
    window.addEventListener('app-update-ready', onWorkerReady, options);
    document.addEventListener('visibilitychange', checkAutomatically, options);
    timer = window.setInterval(checkAutomatically, CHECK_INTERVAL);
    checkAutomatically();
  }

  return {
    checkNow: () => check(true),
    stop: () => {
      controller.abort();
      window.clearInterval(timer);
    },
  };
};
