export const registerBackgroundTask = async (tag: string) => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const swRegistration = await navigator.serviceWorker.ready;
      // @ts-ignore - SyncManager is not in all TS lib definitions
      await swRegistration.sync.register(tag);
      console.log(`Background task '${tag}' registered.`);
      return true;
    } catch (error) {
      console.error('Background task registration failed:', error);
      return false;
    }
  }
  return false;
};

export const notifyTaskCompletion = (title: string, options?: NotificationOptions) => {
  if ('serviceWorker' in navigator && Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        icon: '/icon-192.png',
        ...options
      });
    });
  }
};

export const updateProgressNotification = (id: string, title: string, progress: number, body?: string) => {
  if ('serviceWorker' in navigator && Notification.permission === 'granted') {
    navigator.serviceWorker.controller?.postMessage({
      type: 'UPDATE_PROGRESS',
      payload: { id, title, progress, body }
    });
  }
};

export const clearProgressNotification = (id: string) => {
  if ('serviceWorker' in navigator && Notification.permission === 'granted') {
    navigator.serviceWorker.controller?.postMessage({
      type: 'CLEAR_PROGRESS',
      payload: { id }
    });
  }
};
