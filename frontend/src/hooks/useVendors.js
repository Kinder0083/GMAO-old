import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { vendorsAPI } from '../services/api';

/**
 * Hook spécifique pour les fournisseurs avec synchronisation temps réel
 * 
 * @param {Object} options - Options de configuration
 * @returns {Object} - État et fonctions pour les fournisseurs
 */
export const useVendors = (options = {}) => {
  /**
   * Fonction pour charger les fournisseurs depuis l'API
   */
  const fetchVendors = useCallback(async () => {
    try {
      const response = await vendorsAPI.getAll();
      
      if (response && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('[useVendors] Erreur chargement:', error);
      throw error;
    }
  }, []);

  /**
   * Handlers personnalisés pour les événements
   */
  const handleCreated = useCallback((newVendor) => {
    console.log('[useVendors] Nouveau fournisseur créé:', newVendor);
  }, []);

  const handleUpdated = useCallback((updatedVendor) => {
    console.log('[useVendors] Fournisseur mis à jour:', updatedVendor);
  }, []);

  const handleDeleted = useCallback((deletedId) => {
    console.log('[useVendors] Fournisseur supprimé:', deletedId);
  }, []);

  /**
   * Utiliser le hook générique avec handlers personnalisés
   */
  const {
    data: vendors,
    loading,
    error,
    wsConnected,
    refresh,
    setData: setVendors,
  } = useRealtimeData('suppliers', fetchVendors, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
    onCreated: handleCreated,
    onUpdated: handleUpdated,
    onDeleted: handleDeleted,
  });

  return {
    vendors,
    loading,
    error,
    wsConnected,
    refresh,
    setVendors,
  };
};

export default useVendors;
