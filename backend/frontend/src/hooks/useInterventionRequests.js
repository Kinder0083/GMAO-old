import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { interventionRequestsAPI } from '../services/api';

/**
 * Hook spécifique pour les demandes d'intervention avec synchronisation temps réel
 * 
 * @param {Object} options - Options de configuration
 * @returns {Object} - État et fonctions pour les demandes d'intervention
 */
export const useInterventionRequests = (options = {}) => {
  /**
   * Fonction pour charger les demandes d'intervention depuis l'API
   */
  const fetchInterventionRequests = useCallback(async () => {
    try {
      const response = await interventionRequestsAPI.getAll();
      
      if (response && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('[useInterventionRequests] Erreur chargement:', error);
      throw error;
    }
  }, []);

  /**
   * Utiliser le hook générique avec le comportement par défaut
   * (pas de handlers personnalisés pour laisser useRealtimeData gérer les mises à jour)
   */
  const {
    data: interventionRequests,
    loading,
    error,
    wsConnected,
    refresh,
    setData: setInterventionRequests,
  } = useRealtimeData('intervention_requests', fetchInterventionRequests, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
  });

  return {
    interventionRequests,
    loading,
    error,
    wsConnected,
    refresh,
    setInterventionRequests,
  };
};

export default useInterventionRequests;
