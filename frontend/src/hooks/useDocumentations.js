import { useRealtimeData } from './useRealtimeData';
import { documentationsAPI } from '../services/api';

/**
 * Hook pour gérer les pôles de service (documentations) avec synchronisation temps réel
 */
export const useDocumentations = (options = {}) => {
  const fetchPoles = async () => {
    const response = await documentationsAPI.getPoles();
    // L'API retourne directement un tableau, pas un objet avec .data
    return Array.isArray(response) ? response : response.data || [];
  };

  const {
    data: poles,
    loading,
    wsConnected,
    refresh,
    error,
    setData: setPoles
  } = useRealtimeData('documentations', fetchPoles, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
    ...options
  });

  return {
    poles,
    loading,
    wsConnected,
    refresh,
    error,
    setPoles
  };
};

export default useDocumentations;
