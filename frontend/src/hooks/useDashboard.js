import { useCallback, useState, useEffect, useRef } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { workOrdersAPI, equipmentsAPI, reportsAPI } from '../services/api';

/**
 * Hook pour le tableau de bord avec synchronisation temps réel
 * Agrège les données de plusieurs sources (work_orders, equipments)
 */
export const useDashboard = (options = {}) => {
  const { canView = () => true } = options;
  
  const [analytics, setAnalytics] = useState(null);
  const analyticsLoadedRef = useRef(false);

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

  // Hook temps réel pour les ordres de travail
  const {
    data: workOrders,
    loading: loadingWorkOrders,
    wsConnected: wsWorkOrders,
    refresh: refreshWorkOrders,
  } = useRealtimeData('work_orders', fetchWorkOrders, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
  });

  // Hook temps réel pour les équipements
  const {
    data: equipments,
    loading: loadingEquipments,
    wsConnected: wsEquipments,
    refresh: refreshEquipments,
  } = useRealtimeData('equipments', fetchEquipments, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
  });

  // Charger les analytics une seule fois au montage
  useEffect(() => {
    const loadAnalytics = async () => {
      if (analyticsLoadedRef.current) return;
      if (!canView('reports')) {
        setAnalytics(null);
        return;
      }
      
      try {
        const response = await reportsAPI.getAnalytics();
        setAnalytics(response?.data || null);
        analyticsLoadedRef.current = true;
      } catch (error) {
        console.error('[useDashboard] Erreur chargement analytics:', error);
        setAnalytics(null);
      }
    };
    
    loadAnalytics();
  }, [canView]);

  // Fonction pour tout rafraîchir
  const refresh = useCallback(() => {
    refreshWorkOrders();
    refreshEquipments();
    // Recharger aussi analytics
    analyticsLoadedRef.current = false;
  }, [refreshWorkOrders, refreshEquipments]);

  const loading = loadingWorkOrders || loadingEquipments;
  const wsConnected = wsWorkOrders || wsEquipments;

  return {
    workOrders,
    equipments,
    analytics,
    loading,
    wsConnected,
    refresh,
  };
};

export default useDashboard;
