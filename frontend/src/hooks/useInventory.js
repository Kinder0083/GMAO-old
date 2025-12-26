import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { inventoryAPI } from '../services/api';

/**
 * Hook spécifique pour l'inventaire avec synchronisation temps réel
 * 
 * @param {Object} options - Options de configuration
 * @returns {Object} - État et fonctions pour l'inventaire
 */
export const useInventory = (options = {}) => {
  /**
   * Fonction pour charger l'inventaire depuis l'API
   */
  const fetchInventory = useCallback(async () => {
    try {
      const response = await inventoryAPI.getAll();
      
      if (response && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('[useInventory] Erreur chargement:', error);
      throw error;
    }
  }, []);

  /**
   * Utiliser le hook générique avec le comportement par défaut
   */
  const {
    data: inventory,
    loading,
    error,
    wsConnected,
    refresh,
    setData: setInventory,
  } = useRealtimeData('inventory', fetchInventory, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
  });

  return {
    inventory,
    loading,
    error,
    wsConnected,
    refresh,
    setInventory,
  };
};

export default useInventory;
