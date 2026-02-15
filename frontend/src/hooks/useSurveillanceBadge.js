/**
 * Hook pour les statistiques du badge surveillance
 */
import { useState, useEffect, useCallback } from 'react';
import { getBackendURL } from '../utils/config';

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
      console.error('Erreur lors du chargement des stats de surveillance:', error);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);

    const refresh = () => load();
    window.addEventListener('surveillanceItemCreated', refresh);
    window.addEventListener('surveillanceItemUpdated', refresh);
    window.addEventListener('surveillanceItemDeleted', refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('surveillanceItemCreated', refresh);
      window.removeEventListener('surveillanceItemUpdated', refresh);
      window.removeEventListener('surveillanceItemDeleted', refresh);
    };
  }, [load]);

  return { surveillanceBadge };
};

export default useSurveillanceBadge;
