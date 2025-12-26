import { useRealtimeData } from './useRealtimeData';
import { surveillanceAPI } from '../services/api';

/**
 * Hook pour gérer le plan de surveillance avec synchronisation temps réel
 */
export const useSurveillancePlan = (options = {}) => {
  const fetchItems = async () => {
    const items = await surveillanceAPI.getItems();
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
    ...options
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
