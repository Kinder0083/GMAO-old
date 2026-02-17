import { useRealtimeData } from './useRealtimeData';
import { surveillanceAPI } from '../services/api';

/**
 * Hook pour gérer le plan de surveillance avec synchronisation temps réel
 * @param {Object} options - Options du hook
 * @param {number} options.annee - Année pour filtrer les contrôles
 */
export const useSurveillancePlan = (options = {}) => {
  const { annee, ...restOptions } = options;

  const fetchItems = async () => {
    const params = {};
    if (annee) params.annee = annee;
    const items = await surveillanceAPI.getItems(params);
    return items;
  };

  const {
    data: items,
    loading,
    wsConnected,
    refresh,
    error
  } = useRealtimeData('surveillance_plans', fetchItems, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
    ...restOptions
  });

  return {
    items,
    loading,
    wsConnected,
    refresh,
    error
  };
};

export default useSurveillancePlan;
