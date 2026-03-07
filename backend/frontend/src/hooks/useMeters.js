import { useRealtimeData } from './useRealtimeData';
import { metersAPI } from '../services/api';

/**
 * Hook pour gérer les compteurs (meters) avec synchronisation temps réel
 */
export const useMeters = (options = {}) => {
  const fetchMeters = async () => {
    const response = await metersAPI.getAll();
    return response.data;
  };

  const {
    data: meters,
    loading,
    wsConnected,
    refresh,
    error
  } = useRealtimeData('counters', fetchMeters, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
    ...options
  });

  return {
    meters,
    loading,
    wsConnected,
    refresh,
    error
  };
};

export default useMeters;
