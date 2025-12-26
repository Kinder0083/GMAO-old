import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { documentationsAPI } from '../services/api';

/**
 * Hook pour gérer les pôles de service (documentations) avec synchronisation temps réel
 * Pattern identique à useWorkOrders.js
 */
export const useDocumentations = (options = {}) => {
  /**
   * Fonction pour charger les pôles depuis l'API
   */
  const fetchPoles = useCallback(async () => {
    try {
      // documentationsAPI.getPoles() retourne directement les données (pas .data)
      const poles = await documentationsAPI.getPoles();
      return Array.isArray(poles) ? poles : [];
    } catch (error) {
      console.error('[useDocumentations] Erreur chargement:', error);
      throw error;
    }
  }, []);

  /**
   * Utiliser le hook générique avec le comportement par défaut
   */
  const {
    data: poles,
    loading,
    error,
    wsConnected,
    refresh,
    setData: setPoles,
  } = useRealtimeData('documentations', fetchPoles, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
    ...options
  });

  return {
    poles,
    loading,
    error,
    wsConnected,
    refresh,
    setPoles,
  };
};

export default useDocumentations;
