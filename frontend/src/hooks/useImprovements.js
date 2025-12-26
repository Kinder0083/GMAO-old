import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { improvementsAPI } from '../services/api';

/**
 * Hook spécifique pour les améliorations avec synchronisation temps réel
 * 
 * @param {Object} options - Options de configuration
 * @returns {Object} - État et fonctions pour les améliorations
 */
export const useImprovements = (options = {}) => {
  /**
   * Fonction pour charger les améliorations depuis l'API
   */
  const fetchImprovements = useCallback(async () => {
    try {
      const response = await improvementsAPI.getAll();
      
      if (response && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('[useImprovements] Erreur chargement:', error);
      throw error;
    }
  }, []);

  /**
   * Utiliser le hook générique avec le comportement par défaut
   */
  const {
    data: improvements,
    loading,
    error,
    wsConnected,
    refresh,
    setData: setImprovements,
  } = useRealtimeData('improvements', fetchImprovements, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
  });

  return {
    improvements,
    loading,
    error,
    wsConnected,
    refresh,
    setImprovements,
  };
};

export default useImprovements;
