import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pour surveiller le statut en ligne/hors ligne de l'application.
 * Retourne { isOnline, lastOnlineAt, pendingSyncCount }
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnlineAt, setLastOnlineAt] = useState(
    navigator.onLine ? new Date().toISOString() : localStorage.getItem('gmao_last_online') || null
  );
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const updatePendingCount = useCallback(async () => {
    try {
      const { getOfflineDb } = await import('../services/offlineDb');
      const db = await getOfflineDb();
      const count = await db.count('syncQueue');
      setPendingSyncCount(count);
    } catch {
      setPendingSyncCount(0);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const now = new Date().toISOString();
      setLastOnlineAt(now);
      localStorage.setItem('gmao_last_online', now);
      updatePendingCount();
      // Dispatch custom event for sync service
      window.dispatchEvent(new Event('app-online'));
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Listen for sync queue updates
    const handleSyncUpdate = () => updatePendingCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-queue-updated', handleSyncUpdate);

    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-queue-updated', handleSyncUpdate);
    };
  }, [updatePendingCount]);

  return { isOnline, lastOnlineAt, pendingSyncCount };
};

export default useOnlineStatus;
