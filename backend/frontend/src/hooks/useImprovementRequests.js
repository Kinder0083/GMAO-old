import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { improvementRequestsAPI } from '../services/api';

/**
 * Hook spécifique pour les demandes d'amélioration avec synchronisation temps réel
 * 
 * @param {Object} options - Options de configuration
 * @returns {Object} - État et fonctions pour les demandes d'amélioration
 */
export const useImprovementRequests = (options = {}) => {
  /**
   * Fonction pour charger les demandes d'amélioration depuis l'API
   */
  const fetchImprovementRequests = useCallback(async () => {
    try {
      const response = await improvementRequestsAPI.getAll();
      
      if (response && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('[useImprovementRequests] Erreur chargement:', error);
      throw error;
    }
  }, []);

  /**
   * Utiliser le hook générique avec le comportement par défaut
   * (pas de handlers personnalisés pour laisser useRealtimeData gérer les mises à jour)
   */
  const {
    data: improvementRequests,
    loading,
    error,
    wsConnected,
    refresh,
    setData: setImprovementRequests,
  } = useRealtimeData('improvement_requests', fetchImprovementRequests, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
  });

  return {
    improvementRequests,
    loading,
    error,
    wsConnected,
    refresh,
    setImprovementRequests,
  };
};

export default useImprovementRequests;
