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
   * Handlers personnalisés pour les événements
   */
  const handleCreated = useCallback((newRequest) => {
    console.log('[useInterventionRequests] Nouvelle demande créée:', newRequest);
  }, []);

  const handleUpdated = useCallback((updatedRequest) => {
    console.log('[useInterventionRequests] Demande mise à jour:', updatedRequest);
  }, []);

  const handleDeleted = useCallback((deletedId) => {
    console.log('[useInterventionRequests] Demande supprimée:', deletedId);
  }, []);

  /**
   * Utiliser le hook générique avec handlers personnalisés
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
    onCreated: handleCreated,
    onUpdated: handleUpdated,
    onDeleted: handleDeleted,
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
