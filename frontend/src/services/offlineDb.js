import { openDB } from 'idb';

const DB_NAME = 'gmao-iris-offline';
const DB_VERSION = 1;

/**
 * Ouvre la base IndexedDB pour le mode hors-ligne.
 * Stores :
 *  - apiCache : cache des réponses API (clé = url)
 *  - syncQueue : file d'attente des mutations à synchroniser
 */
export const getOfflineDb = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Cache des réponses API
      if (!db.objectStoreNames.contains('apiCache')) {
        const cache = db.createObjectStore('apiCache', { keyPath: 'url' });
        cache.createIndex('timestamp', 'timestamp');
      }
      // File d'attente de synchronisation
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queue = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        queue.createIndex('timestamp', 'timestamp');
        queue.createIndex('status', 'status');
      }
    }
  });
};

/**
 * Met en cache une réponse API.
 */
export const cacheApiResponse = async (url, data) => {
  try {
    const db = await getOfflineDb();
    await db.put('apiCache', {
      url,
      data,
      timestamp: Date.now()
    });
  } catch (e) {
    console.warn('[Offline] Erreur cache:', e);
  }
};

/**
 * Récupère une réponse depuis le cache.
 */
export const getCachedResponse = async (url) => {
  try {
    const db = await getOfflineDb();
    const entry = await db.get('apiCache', url);
    return entry ? entry.data : null;
  } catch {
    return null;
  }
};

/**
 * Ajoute une mutation à la file d'attente de synchronisation.
 */
export const addToSyncQueue = async (method, url, data, headers = {}) => {
  try {
    const db = await getOfflineDb();
    await db.add('syncQueue', {
      method,
      url,
      data,
      headers,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0
    });
    // Notifier les composants
    window.dispatchEvent(new Event('sync-queue-updated'));
  } catch (e) {
    console.warn('[Offline] Erreur ajout sync queue:', e);
  }
};

/**
 * Récupère toutes les mutations en attente.
 */
export const getPendingSyncItems = async () => {
  try {
    const db = await getOfflineDb();
    return await db.getAllFromIndex('syncQueue', 'status', 'pending');
  } catch {
    return [];
  }
};

/**
 * Marque une mutation comme synchronisée (et la supprime).
 */
export const removeSyncItem = async (id) => {
  try {
    const db = await getOfflineDb();
    await db.delete('syncQueue', id);
    window.dispatchEvent(new Event('sync-queue-updated'));
  } catch (e) {
    console.warn('[Offline] Erreur suppression sync item:', e);
  }
};

/**
 * Incrémente le compteur de retries d'un item.
 */
export const incrementRetry = async (id) => {
  try {
    const db = await getOfflineDb();
    const item = await db.get('syncQueue', id);
    if (item) {
      item.retries = (item.retries || 0) + 1;
      if (item.retries >= 5) {
        item.status = 'failed';
      }
      await db.put('syncQueue', item);
      window.dispatchEvent(new Event('sync-queue-updated'));
    }
  } catch (e) {
    console.warn('[Offline] Erreur increment retry:', e);
  }
};

/**
 * Nettoie le cache API ancien (> 24h).
 */
export const cleanOldCache = async () => {
  try {
    const db = await getOfflineDb();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const tx = db.transaction('apiCache', 'readwrite');
    const store = tx.objectStore('apiCache');
    const index = store.index('timestamp');
    let cursor = await index.openCursor();
    while (cursor) {
      if (cursor.value.timestamp < cutoff) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }
  } catch (e) {
    console.warn('[Offline] Erreur nettoyage cache:', e);
  }
};
