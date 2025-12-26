import { useCallback, useState, useEffect, useRef } from 'react';
import { workOrdersAPI, equipmentsAPI, reportsAPI } from '../services/api';
import { usePermissions } from './usePermissions';

/**
 * Hook pour le tableau de bord avec synchronisation temps réel
 * Charge les données de plusieurs sources et les rafraîchit automatiquement
 */
export const useDashboard = () => {
  const { canView, userRole } = usePermissions();
  
  const [workOrders, setWorkOrders] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const intervalRef = useRef(null);
  
  // Vérifier si les permissions sont prêtes
  const permissionsReady = userRole !== null;

  /**
   * Charger toutes les données du dashboard
   */
  const loadData = useCallback(async () => {
    // Ne pas charger si les permissions ne sont pas prêtes
    if (!permissionsReady) return;
    
    try {
      // Ne montrer le loading que lors du premier chargement
      if (isFirstLoad.current) {
        setLoading(true);
      }

      const promises = [];

      // Work Orders - toujours charger, les permissions seront vérifiées côté affichage
      promises.push(
        workOrdersAPI.getAll()
          .then(res => ({ type: 'workOrders', data: res?.data || [] }))
          .catch(err => {
            console.error('[useDashboard] Erreur work orders:', err);
            return { type: 'workOrders', data: [] };
          })
      );

      // Equipments
      promises.push(
        equipmentsAPI.getAll()
          .then(res => ({ type: 'equipments', data: res?.data || [] }))
          .catch(err => {
            console.error('[useDashboard] Erreur equipments:', err);
            return { type: 'equipments', data: [] };
          })
      );

      // Analytics
      promises.push(
        reportsAPI.getAnalytics()
          .then(res => ({ type: 'analytics', data: res?.data || null }))
          .catch(err => {
            console.error('[useDashboard] Erreur analytics:', err);
            return { type: 'analytics', data: null };
          })
      );

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
  }, [permissionsReady]);

  // Chargement initial et polling automatique
  useEffect(() => {
    if (!permissionsReady) return;
    
    // Charger les données immédiatement
    loadData();

    // Rafraîchir toutes les 10 secondes
    intervalRef.current = setInterval(loadData, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadData, permissionsReady]);

  // Fonction pour rafraîchir manuellement
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    workOrders,
    equipments,
    analytics,
    loading: loading || !permissionsReady,
    canView, // Exporter canView pour que le composant puisse l'utiliser
    refresh,
  };
};

export default useDashboard;
