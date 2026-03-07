/**
 * Hook pour le compteur d'ordres de travail assignés et ouverts
 * Refresh déclenché par WebSocket via useHeaderWebSocket
 * Polling 5min en fallback
 */
import { useState, useEffect, useCallback } from 'react';
import { getBackendURL } from '../utils/config';

const FALLBACK_INTERVAL = 300000; // 5 min

export const useWorkOrdersCount = (userId) => {
  const [workOrdersCount, setWorkOrdersCount] = useState(0);

  const load = useCallback(async () => {
    if (!userId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const backend_url = getBackendURL();
      const response = await fetch(`${backend_url}/api/work-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const count = data.filter(order => {
          const isAssigned = order.assigne_a_id === userId ||
            (order.assigneA && order.assigneA.id === userId);
          return isAssigned && order.statut === 'OUVERT';
        }).length;
        setWorkOrdersCount(count);
      }
    } catch (error) {
      console.error('Erreur chargement OT:', error);
    }
  }, [userId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, FALLBACK_INTERVAL);

    const refresh = () => load();
    const events = ['workOrderCreated', 'workOrderUpdated', 'workOrderDeleted'];
    events.forEach(evt => window.addEventListener(evt, refresh));

    return () => {
      clearInterval(interval);
      events.forEach(evt => window.removeEventListener(evt, refresh));
    };
  }, [load]);

  return { workOrdersCount };
};

export default useWorkOrdersCount;
