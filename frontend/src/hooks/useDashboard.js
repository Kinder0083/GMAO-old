import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { workOrdersAPI, equipmentsAPI } from '../services/api';

/**
 * Hook pour le tableau de bord avec synchronisation temps réel via WebSocket
 * Utilise useRealtimeData pour work_orders et equipments
 */
export const useDashboard = () => {
  /**
   * Fonction pour charger les ordres de travail
   */
  const fetchWorkOrders = useCallback(async () => {
    try {
      const response = await workOrdersAPI.getAll();
      return response?.data || [];
    } catch (error) {
      console.error('[useDashboard] Erreur chargement work orders:', error);
      return [];
    }
  }, []);

  /**
   * Fonction pour charger les équipements
   */
  const fetchEquipments = useCallback(async () => {
    try {
      const response = await equipmentsAPI.getAll();
      return response?.data || [];
    } catch (error) {
      console.error('[useDashboard] Erreur chargement equipments:', error);
      return [];
    }
  }, []);

  // Hook temps réel pour les ordres de travail
  const {
    data: workOrders,
    loading: loadingWorkOrders,
    wsConnected: wsWorkOrdersConnected,
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
    wsConnected: wsEquipmentsConnected,
    refresh: refreshEquipments,
  } = useRealtimeData('equipments', fetchEquipments, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
  });

  // Fonction pour tout rafraîchir
  const refresh = useCallback(() => {
    refreshWorkOrders();
    refreshEquipments();
  }, [refreshWorkOrders, refreshEquipments]);

  // État global de chargement et connexion
  const loading = loadingWorkOrders || loadingEquipments;
  const wsConnected = wsWorkOrdersConnected || wsEquipmentsConnected;

  return {
    workOrders,
    equipments,
    loading,
    wsConnected,
    refresh,
  };
};

export default useDashboard;
