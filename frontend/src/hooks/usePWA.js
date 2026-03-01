import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const subscribedRef = useRef(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      return registration;
    } catch (e) {
      console.error('[PWA] SW registration failed:', e);
      return null;
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (subscribedRef.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Get VAPID key
      const keyResp = await fetch(`${API_URL}/api/web-push/vapid-key`);
      const { publicKey } = await keyResp.json();
      if (!publicKey) return;

      const registration = await registerServiceWorker();
      if (!registration) return;

      // Wait for SW to be ready
      await navigator.serviceWorker.ready;

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      }

      // Send to backend
      const browser = navigator.userAgent.includes('Firefox') ? 'firefox' :
                      navigator.userAgent.includes('Edg') ? 'edge' :
                      navigator.userAgent.includes('Chrome') ? 'chrome' : 'other';

      await fetch(`${API_URL}/api/web-push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          browser
        })
      });

      subscribedRef.current = true;
      setIsSubscribed(true);
    } catch (e) {
      console.error('[PWA] Push subscription failed:', e);
    }
  }, [registerServiceWorker]);

  const unsubscribe = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await fetch(`${API_URL}/api/web-push/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
      }
      subscribedRef.current = false;
      setIsSubscribed(false);
    } catch (e) {
      console.error('[PWA] Unsubscribe failed:', e);
    }
  }, []);

  const testNotification = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const resp = await fetch(`${API_URL}/api/web-push/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await resp.json();
    } catch (e) {
      console.error('[PWA] Test notification failed:', e);
      return { error: e.message };
    }
  }, []);

  return { permission, isSubscribed, isSupported, subscribe, unsubscribe, testNotification };
}

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    setInstallPrompt(null);
    return result.outcome === 'accepted';
  }, [installPrompt]);

  return { canInstall: !!installPrompt && !isInstalled, isInstalled, install };
}
