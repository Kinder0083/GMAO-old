import { useCallback, useState, useEffect } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { workOrdersAPI, equipmentsAPI, reportsAPI } from '../services/api';
import { usePermissions } from './usePermissions';

/**
 * Hook spécifique pour le tableau de bord avec synchronisation temps réel
 * Agrège les données de plusieurs sources avec WebSocket
 * 
 * @param {Object} options - Options de configuration
 * @returns {Object} - État et fonctions pour le tableau de bord
 */
export const useDashboard = (options = {}) => {
  const { canView } = usePermissions();
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  /**
   * Fonction pour charger les ordres de travail
   */
  const fetchWorkOrders = useCallback(async () => {
    try {
      if (!canView('workOrders')) return [];
      const response = await workOrdersAPI.getAll();
      return response?.data || [];
    } catch (error) {
      console.error('[useDashboard] Erreur chargement work orders:', error);
      return [];
    }
  }, [canView]);

  /**
   * Fonction pour charger les équipements
   */
  const fetchEquipments = useCallback(async () => {
    try {
      if (!canView('assets')) return [];
      const response = await equipmentsAPI.getAll();
      return response?.data || [];
    } catch (error) {
      console.error('[useDashboard] Erreur chargement equipments:', error);
      return [];
    }
  }, [canView]);

  /**
   * Hook temps réel pour les ordres de travail
   */
  const {
    data: workOrders,
    loading: workOrdersLoading,
    wsConnected: wsWorkOrdersConnected,
    refresh: refreshWorkOrders,
  } = useRealtimeData('work_orders', fetchWorkOrders, {
    enableWebSocket: canView('workOrders'),
    fallbackPolling: true,
    pollingInterval: 30000,
  });

  /**
   * Hook temps réel pour les équipements
   */
  const {
    data: equipments,
    loading: equipmentsLoading,
    wsConnected: wsEquipmentsConnected,
    refresh: refreshEquipments,
  } = useRealtimeData('equipments', fetchEquipments, {
    enableWebSocket: canView('assets'),
    fallbackPolling: true,
    pollingInterval: 30000,
  });

  /**
   * Charger les analytics (pas de WebSocket, juste une fois)
   */
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!canView('reports')) {
        setAnalyticsLoading(false);
        return;
      }
      
      try {
        const response = await reportsAPI.getAnalytics();
        setAnalytics(response?.data || null);
      } catch (error) {
        console.error('[useDashboard] Erreur chargement analytics:', error);
        setAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    loadAnalytics();
  }, [canView]);

  /**
   * Rafraîchir toutes les données
   */
  const refreshAll = useCallback(() => {
    refreshWorkOrders();
    refreshEquipments();
  }, [refreshWorkOrders, refreshEquipments]);

  const loading = workOrdersLoading || equipmentsLoading || analyticsLoading;
  const wsConnected = wsWorkOrdersConnected || wsEquipmentsConnected;

  return {
    workOrders,
    equipments,
    analytics,
    loading,
    wsConnected,
    refreshAll,
    refreshWorkOrders,
    refreshEquipments,
  };
};

export default useDashboard;
