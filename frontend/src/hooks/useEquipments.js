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
   * Handlers personnalisés pour les événements
   */
  const handleCreated = useCallback((newEquipment) => {
    console.log('[useEquipments] Nouvel équipement créé:', newEquipment);
  }, []);

  const handleUpdated = useCallback((updatedEquipment) => {
    console.log('[useEquipments] Équipement mis à jour:', updatedEquipment);
  }, []);

  const handleDeleted = useCallback((deletedId) => {
    console.log('[useEquipments] Équipement supprimé:', deletedId);
  }, []);

  const handleStatusChanged = useCallback((statusData) => {
    console.log('[useEquipments] Statut changé:', statusData);
  }, []);

  /**
   * Utiliser le hook générique avec handlers personnalisés
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
    onCreated: handleCreated,
    onUpdated: handleUpdated,
    onDeleted: handleDeleted,
    onStatusChanged: handleStatusChanged,
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
