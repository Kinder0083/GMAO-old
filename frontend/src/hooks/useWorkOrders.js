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
        
        return workOrders;
      }
      
      return [];
    } catch (error) {
      console.error('[useWorkOrders] Erreur chargement:', error);
      throw error;
    }
  }, [filters.status]);

  /**
   * Utiliser le hook générique avec le comportement par défaut
   * (pas de handlers personnalisés pour laisser useRealtimeData gérer les mises à jour)
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
    pollingInterval: 30000,
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
