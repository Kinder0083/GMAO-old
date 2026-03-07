/**
 * Hook pour les statistiques d'inventaire (rupture, niveau bas)
 * Refresh déclenché par WebSocket via useHeaderWebSocket
 * Polling 5min en fallback
 */
import { useState, useEffect, useCallback } from 'react';
import { getBackendURL } from '../utils/config';

const FALLBACK_INTERVAL = 300000; // 5 min

export const useInventoryStats = () => {
  const [inventoryStats, setInventoryStats] = useState({ rupture: 0, niveau_bas: 0 });

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const backend_url = getBackendURL();
      const response = await fetch(`${backend_url}/api/inventory/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setInventoryStats(data);
      }
    } catch (error) {
      console.error('Erreur stats inventaire:', error);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, FALLBACK_INTERVAL);

    const refresh = () => load();
    const events = ['inventoryItemCreated', 'inventoryItemUpdated', 'inventoryItemDeleted'];
    events.forEach(evt => window.addEventListener(evt, refresh));

    return () => {
      clearInterval(interval);
      events.forEach(evt => window.removeEventListener(evt, refresh));
    };
  }, [load]);

  return { inventoryStats };
};

export default useInventoryStats;
