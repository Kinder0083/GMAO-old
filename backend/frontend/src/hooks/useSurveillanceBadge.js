/**
 * Hook pour les statistiques du badge surveillance
 * Refresh déclenché par WebSocket via useHeaderWebSocket
 * Polling 5min en fallback
 */
import { useState, useEffect, useCallback } from 'react';
import { getBackendURL } from '../utils/config';

const FALLBACK_INTERVAL = 300000; // 5 min

export const useSurveillanceBadge = () => {
  const [surveillanceBadge, setSurveillanceBadge] = useState({ echeances_proches: 0, pourcentage_realisation: 0 });

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const backend_url = getBackendURL();
      const response = await fetch(`${backend_url}/api/surveillance/badge-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSurveillanceBadge(data);
      }
    } catch (error) {
      console.error('Erreur stats surveillance:', error);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, FALLBACK_INTERVAL);

    const refresh = () => load();
    const events = ['surveillanceItemCreated', 'surveillanceItemUpdated', 'surveillanceItemDeleted'];
    events.forEach(evt => window.addEventListener(evt, refresh));

    return () => {
      clearInterval(interval);
      events.forEach(evt => window.removeEventListener(evt, refresh));
    };
  }, [load]);

  return { surveillanceBadge };
};

export default useSurveillanceBadge;
