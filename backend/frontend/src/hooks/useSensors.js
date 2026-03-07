import { useRealtimeData } from './useRealtimeData';
import api from '../services/api';

/**
 * Hook pour gérer les capteurs MQTT avec synchronisation temps réel
 * Polling rapide pour avoir les valeurs quasi-instantanément
 */
export const useSensors = (options = {}) => {
  const fetchSensors = async () => {
    const response = await api.sensors.getAll();
    return response.data;
  };

  const {
    data: sensors,
    loading,
    wsConnected,
    refresh,
    error
  } = useRealtimeData('sensors', fetchSensors, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 2000, // Polling rapide toutes les 2 secondes pour les valeurs temps réel
    ...options
  });

  return {
    sensors,
    loading,
    wsConnected,
    refresh,
    error
  };
};

export default useSensors;
