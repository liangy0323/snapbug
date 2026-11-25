import { getAppServiceWorkerRegistration, startAppVersionCheck } from '../../build/runtime/check';
import { isDev } from '@/env';

import type { AppVersionCheckResult } from '../../build/runtime/check';
import type { App, InjectionKey } from 'vue';

/**
 * 提供给设置页等调用方的手动版本检查入口。
 */
export const APP_VERSION_CHECK_KEY: InjectionKey<() => Promise<AppVersionCheckResult>> = Symbol('app-version-check');

const WORKER_ACTIVATION_TIMEOUT = 4000;

/**
 * 等待新 Worker 接管页面。等待超时后由调用方移除监听并正常刷新。
 */
const activateUpdatedWorker = async (signal: AbortSignal): Promise<void> => {
  const registration = await getAppServiceWorkerRegistration();
  if (!registration || signal.aborted) return;

  if (!registration.waiting && !registration.installing) await registration.update();
  const worker = registration.waiting ?? registration.installing;
  if (!worker || signal.aborted) return;

  await new Promise<void>((resolve) => {
    const finish = (): void => {
      worker.removeEventListener('statechange', onStateChange);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const onStateChange = (): void => {
      if (worker.state === 'installed') {
        worker.postMessage({ type: 'SKIP_WAITING' });
      }
      if (worker.state === 'activated' || worker.state === 'redundant') finish();
    };

    worker.addEventListener('statechange', onStateChange);
    signal.addEventListener('abort', finish, { once: true });
    onStateChange();
  });
};

/**
 * 用户确认更新后刷新应用。已有离线 Worker 时优先激活新版本，刷新保留站点存储。
 */
export const reloadAppForUpdate = async (): Promise<void> => {
  const controller = new AbortController();
  let timer: number | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = window.setTimeout(resolve, WORKER_ACTIVATION_TIMEOUT);
  });
  try {
    await Promise.race([activateUpdatedWorker(controller.signal), timeout]);
  } catch {
    // Worker 更新失败时，仍允许用户刷新页面。
  } finally {
    window.clearTimeout(timer);
    controller.abort();
    window.location.reload();
  }
};

/**
 * 注册版本检查与更新提示，应用卸载时停止监听。
 * @param app 用于提供主动检查入口和绑定清理逻辑的 Vue 应用
 */
export const setupAppUpdate = (app: App): void => {
  if (isDev()) return;

  let updating = false;
  const onUpdateReady = (event: WindowEventMap['app-update-ready']): void => {
    if (event.detail.source !== 'version' || updating) return;
    updating = true;
    if (window.confirm('发现新版本，是否立即刷新？')) {
      void reloadAppForUpdate().finally(() => {
        updating = false;
      });
    } else {
      updating = false;
    }
  };

  window.addEventListener('app-update-ready', onUpdateReady);
  const { checkNow, stop } = startAppVersionCheck();
  app.provide(APP_VERSION_CHECK_KEY, checkNow);
  app.onUnmount(() => {
    window.removeEventListener('app-update-ready', onUpdateReady);
    stop();
  });
};
