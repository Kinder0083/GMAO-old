import { useCallback, useState, useEffect, useRef } from 'react';
import { workOrdersAPI, equipmentsAPI, reportsAPI } from '../services/api';

/**
 * Hook pour le tableau de bord avec synchronisation temps réel
 * Charge les données de plusieurs sources et les rafraîchit automatiquement
 */
export const useDashboard = (options = {}) => {
  const { canView = () => true } = options;
  
  const [workOrders, setWorkOrders] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const intervalRef = useRef(null);

  /**
   * Charger toutes les données du dashboard
   */
  const loadData = useCallback(async () => {
    try {
      // Ne montrer le loading que lors du premier chargement
      if (isFirstLoad.current) {
        setLoading(true);
      }

      const promises = [];

      // Work Orders
      if (canView('workOrders')) {
        promises.push(
          workOrdersAPI.getAll()
            .then(res => ({ type: 'workOrders', data: res?.data || [] }))
            .catch(err => {
              console.error('[useDashboard] Erreur work orders:', err);
              return { type: 'workOrders', data: [] };
            })
        );
      }

      // Equipments
      if (canView('assets')) {
        promises.push(
          equipmentsAPI.getAll()
            .then(res => ({ type: 'equipments', data: res?.data || [] }))
            .catch(err => {
              console.error('[useDashboard] Erreur equipments:', err);
              return { type: 'equipments', data: [] };
            })
        );
      }

      // Analytics
      if (canView('reports')) {
        promises.push(
          reportsAPI.getAnalytics()
            .then(res => ({ type: 'analytics', data: res?.data || null }))
            .catch(err => {
              console.error('[useDashboard] Erreur analytics:', err);
              return { type: 'analytics', data: null };
            })
        );
      }

      if (promises.length === 0) {
        setWorkOrders([]);
        setEquipments([]);
        setAnalytics(null);
        setLoading(false);
        isFirstLoad.current = false;
        return;
      }

      const results = await Promise.all(promises);

      // Mettre à jour les données
      results.forEach(result => {
        if (result.type === 'workOrders') {
          setWorkOrders(result.data);
        } else if (result.type === 'equipments') {
          setEquipments(result.data);
        } else if (result.type === 'analytics') {
          setAnalytics(result.data);
        }
      });

    } catch (error) {
      console.error('[useDashboard] Erreur générale:', error);
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, [canView]);

  // Chargement initial et polling automatique
  useEffect(() => {
    // Charger les données immédiatement
    loadData();

    // Rafraîchir toutes les 10 secondes
    intervalRef.current = setInterval(loadData, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadData]);

  // Fonction pour rafraîchir manuellement
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    workOrders,
    equipments,
    analytics,
    loading,
    wsConnected: false, // Pas de WebSocket pour le moment, juste polling
    refresh,
  };
};

export default useDashboard;
