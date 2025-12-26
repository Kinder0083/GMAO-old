import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { preventiveMaintenanceAPI } from '../services/api';

/**
 * Hook spécifique pour la maintenance préventive avec synchronisation temps réel
 * 
 * @param {Object} options - Options de configuration
 * @returns {Object} - État et fonctions pour la maintenance préventive
 */
export const usePreventiveMaintenance = (options = {}) => {
  /**
   * Fonction pour charger les maintenances préventives depuis l'API
   */
  const fetchPreventiveMaintenance = useCallback(async () => {
    try {
      const response = await preventiveMaintenanceAPI.getAll();
      
      if (response && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('[usePreventiveMaintenance] Erreur chargement:', error);
      throw error;
    }
  }, []);

  /**
   * Utiliser le hook générique avec le comportement par défaut
   */
  const {
    data: maintenance,
    loading,
    error,
    wsConnected,
    refresh,
    setData: setMaintenance,
  } = useRealtimeData('preventive_maintenance', fetchPreventiveMaintenance, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
  });

  return {
    maintenance,
    loading,
    error,
    wsConnected,
    refresh,
    setMaintenance,
  };
};

export default usePreventiveMaintenance;
