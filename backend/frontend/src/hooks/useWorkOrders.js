import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { workOrdersAPI } from '../services/api';

/**
 * Hook spécifique pour les ordres de travail avec synchronisation temps réel
 * 
 * @param {Object} filters - Filtres à appliquer (status, date_debut, date_fin, date_type, etc.)
 * @returns {Object} - État et fonctions pour les ordres de travail
 */
export const useWorkOrders = (filters = {}) => {
  /**
   * Fonction pour charger les ordres de travail depuis l'API
   */
  const fetchWorkOrders = useCallback(async () => {
    try {
      // Construire les paramètres d'API avec les filtres de date
      const params = {};
      
      if (filters.date_debut) {
        params.date_debut = filters.date_debut;
      }
      if (filters.date_fin) {
        params.date_fin = filters.date_fin;
      }
      if (filters.date_type) {
        params.date_type = filters.date_type;
      }
      
      const response = await workOrdersAPI.getAll(params);
      
      if (response && response.data) {
        let workOrders = response.data;
        
        // Appliquer les filtres de statut côté client
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
  }, [filters.status, filters.date_debut, filters.date_fin, filters.date_type]);

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
