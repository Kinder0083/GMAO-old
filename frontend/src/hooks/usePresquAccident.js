import { useRealtimeData } from './useRealtimeData';
import { presquAccidentAPI } from '../services/api';

/**
 * Hook pour gérer les presqu'accidents avec synchronisation temps réel
 */
export const usePresquAccident = (options = {}) => {
  const fetchItems = async () => {
    const data = await presquAccidentAPI.getItems();
    return data;
  };

  const {
    data: items,
    loading,
    wsConnected,
    refresh,
    error
  } = useRealtimeData('near_miss', fetchItems, {
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

export default usePresquAccident;
