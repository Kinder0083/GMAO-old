import { useRealtimeData } from './useRealtimeData';
import { locationsAPI } from '../services/api';

/**
 * Hook pour gérer les zones (locations) avec synchronisation temps réel
 */
export const useLocations = (options = {}) => {
  const fetchLocations = async () => {
    const response = await locationsAPI.getAll();
    return response.data;
  };

  const {
    data: locations,
    loading,
    wsConnected,
    refresh,
    error
  } = useRealtimeData('zones', fetchLocations, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
    ...options
  });

  return {
    locations,
    loading,
    wsConnected,
    refresh,
    error
  };
};

export default useLocations;
