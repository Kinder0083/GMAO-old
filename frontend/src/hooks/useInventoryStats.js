/**
 * Hook pour les statistiques d'inventaire (rupture, niveau bas)
 */
import { useState, useEffect, useCallback } from 'react';
import { getBackendURL } from '../utils/config';

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
      console.error('Erreur lors du chargement des stats inventaire:', error);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);

    const refresh = () => load();
    window.addEventListener('inventoryItemCreated', refresh);
    window.addEventListener('inventoryItemUpdated', refresh);
    window.addEventListener('inventoryItemDeleted', refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('inventoryItemCreated', refresh);
      window.removeEventListener('inventoryItemUpdated', refresh);
      window.removeEventListener('inventoryItemDeleted', refresh);
    };
  }, [load]);

  return { inventoryStats };
};

export default useInventoryStats;
