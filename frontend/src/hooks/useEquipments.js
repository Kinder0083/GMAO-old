import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { equipmentsAPI } from '../services/api';

/**
 * Hook spécifique pour les équipements avec synchronisation temps réel
 * 
 * @param {Object} options - Options de configuration
 * @returns {Object} - État et fonctions pour les équipements
 */
export const useEquipments = (options = {}) => {
  /**
   * Fonction pour charger les équipements depuis l'API
   */
  const fetchEquipments = useCallback(async () => {
    try {
      const response = await equipmentsAPI.getAll();
      
      if (response && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('[useEquipments] Erreur chargement:', error);
      throw error;
    }
  }, []);

  /**
   * Utiliser le hook générique avec le comportement par défaut
   */
  const {
    data: equipments,
    loading,
    error,
    wsConnected,
    refresh,
    setData: setEquipments,
  } = useRealtimeData('equipments', fetchEquipments, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
  });

  return {
    equipments,
    loading,
    error,
    wsConnected,
    refresh,
    setEquipments,
  };
};

export default useEquipments;
