import { useState, useEffect, useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { surveillanceAPI } from '../services/api';

/**
 * Hook pour gérer le rapport de surveillance avec synchronisation temps réel
 */
export const useSurveillanceRapport = (options = {}) => {
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = async () => {
    const data = await surveillanceAPI.getRapportStats();
    return data;
  };

  // Utiliser le hook temps réel pour détecter les changements
  const {
    data: realtimeData,
    loading: wsLoading,
    wsConnected,
    refresh: wsRefresh
  } = useRealtimeData('surveillance_reports', fetchStats, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 60000, // Rafraîchir les stats toutes les minutes
    ...options
  });

  // Charger les statistiques initiales et quand realtimeData change
  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const data = await surveillanceAPI.getRapportStats();
      setStats(data);
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Recharger les stats quand les données temps réel changent
  useEffect(() => {
    if (realtimeData) {
      loadStats();
    }
  }, [realtimeData, loadStats]);

  const refresh = useCallback(async () => {
    await loadStats();
    wsRefresh();
  }, [loadStats, wsRefresh]);

  return {
    stats,
    loading: loadingStats || wsLoading,
    wsConnected,
    refresh
  };
};

export default useSurveillanceRapport;
