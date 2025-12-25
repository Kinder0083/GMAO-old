import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { workOrdersAPI } from '../services/api';

/**
 * Hook spécifique pour les ordres de travail avec synchronisation temps réel
 * 
 * @param {Object} filters - Filtres à appliquer (status, date, etc.)
 * @returns {Object} - État et fonctions pour les ordres de travail
 */
export const useWorkOrders = (filters = {}) => {
  /**
   * Fonction pour charger les ordres de travail depuis l'API
   */
  const fetchWorkOrders = useCallback(async () => {
    try {
      const response = await workOrdersAPI.getAll();
      
      if (response && response.data) {
        let workOrders = response.data;
        
        // Appliquer les filtres côté client
        if (filters.status && filters.status !== 'ALL') {
          workOrders = workOrders.filter(wo => wo.statut === filters.status);
        }
        
        if (filters.dateFilter && filters.dateType) {
          // Logique de filtrage par date si nécessaire
          // (peut être géré côté API pour optimisation)
        }
        
        return workOrders;
      }
      
      return [];
    } catch (error) {
      console.error('[useWorkOrders] Erreur chargement:', error);
      throw error;
    }
  }, [filters]);

  /**
   * Handlers personnalisés pour les événements
   */
  const handleCreated = useCallback((newWorkOrder) => {
    console.log('[useWorkOrders] Nouvel ordre créé:', newWorkOrder);
    // Le hook useRealtimeData ajoutera automatiquement à la liste
  }, []);

  const handleUpdated = useCallback((updatedWorkOrder) => {
    console.log('[useWorkOrders] Ordre mis à jour:', updatedWorkOrder);
    // Le hook useRealtimeData mettra automatiquement à jour dans la liste
  }, []);

  const handleDeleted = useCallback((deletedId) => {
    console.log('[useWorkOrders] Ordre supprimé:', deletedId);
    // Le hook useRealtimeData retirera automatiquement de la liste
  }, []);

  const handleStatusChanged = useCallback((statusData) => {
    console.log('[useWorkOrders] Statut changé:', statusData);
    // Recharger pour avoir les dernières données
  }, []);

  /**
   * Utiliser le hook générique avec handlers personnalisés
   */
  const {
    data: workOrders,
    loading,
    error,
    wsConnected,
    refresh,
    setData: setWorkOrders,
  } = useRealtimeData('work_orders', fetchWorkOrders, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000, // 30 secondes de secours
    onCreated: handleCreated,
    onUpdated: handleUpdated,
    onDeleted: handleDeleted,
    onStatusChanged: handleStatusChanged,
  });

  return {
    workOrders,
    loading,
    error,
    wsConnected,
    refresh,
    setWorkOrders,
  };
};

export default useWorkOrders;
