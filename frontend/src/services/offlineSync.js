import { getPendingSyncItems, removeSyncItem, incrementRetry } from './offlineDb';
import api from './api';

let isSyncing = false;

/**
 * Synchronise les mutations en attente avec le serveur.
 * Appelé quand l'application repasse en ligne.
 */
export const syncPendingMutations = async () => {
  if (isSyncing || !navigator.onLine) return { synced: 0, failed: 0 };
  isSyncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const items = await getPendingSyncItems();
    if (items.length === 0) {
      isSyncing = false;
      return { synced: 0, failed: 0 };
    }

    console.log(`[Sync] ${items.length} mutation(s) en attente`);

    for (const item of items) {
      try {
        const config = {
          method: item.method,
          url: item.url,
          headers: { ...item.headers, 'X-Offline-Sync': 'true' }
        };
        if (item.data) config.data = item.data;

        await api(config);
        await removeSyncItem(item.id);
        synced++;
        console.log(`[Sync] OK: ${item.method} ${item.url}`);
      } catch (err) {
        console.warn(`[Sync] Echec: ${item.method} ${item.url}`, err?.response?.status);
        await incrementRetry(item.id);
        failed++;
      }
    }

    // Notifier les composants
    window.dispatchEvent(new CustomEvent('sync-complete', { detail: { synced, failed } }));
  } catch (e) {
    console.error('[Sync] Erreur globale:', e);
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
};

/**
 * Initialise le service de synchronisation : écoute l'événement 'app-online'.
 */
export const initOfflineSync = () => {
  const handleOnline = async () => {
    // Attendre un court délai pour que la connexion se stabilise
    await new Promise(r => setTimeout(r, 2000));
    if (navigator.onLine) {
      const result = await syncPendingMutations();
      if (result.synced > 0) {
        console.log(`[Sync] ${result.synced} mutation(s) synchronisee(s)`);
      }
    }
  };

  window.addEventListener('app-online', handleOnline);

  // Retourner cleanup
  return () => window.removeEventListener('app-online', handleOnline);
};
