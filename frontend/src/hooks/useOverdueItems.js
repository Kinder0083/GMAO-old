/**
 * Hook personnalisé pour gérer les éléments en retard (échéances dépassées)
 * Extrait de MainLayout.jsx pour une meilleure modularité
 */
import { useState, useEffect, useCallback } from 'react';
import { getBackendURL } from '../../utils/config';

export const useOverdueItems = (canViewModule) => {
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueDetails, setOverdueDetails] = useState({});
  const [overdueExecutionCount, setOverdueExecutionCount] = useState(0);
  const [overdueRequestsCount, setOverdueRequestsCount] = useState(0);
  const [overdueMaintenanceCount, setOverdueMaintenanceCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadOverdueItems = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    const backend_url = getBackendURL();
    
    setLoading(true);
    
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      let total = 0;
      let executionCount = 0;
      let requestsCount = 0;
      let maintenanceCount = 0;
      const details = {};
      
      // 1. Ordres de travail en retard (ORANGE)
      if (canViewModule('workOrders')) {
        try {
          const woResponse = await fetch(`${backend_url}/api/work-orders`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (woResponse.ok) {
            const workOrders = await woResponse.json();
            const overdueWO = workOrders.filter(wo => {
              if (!wo.dateLimite || wo.statut === 'TERMINE' || wo.statut === 'ANNULE') return false;
              const dueDate = new Date(wo.dateLimite);
              return dueDate < today;
            });
            if (overdueWO.length > 0) {
              details.workOrders = {
                count: overdueWO.length,
                label: 'Ordres de travail',
                route: '/work-orders',
                category: 'execution'
              };
              executionCount += overdueWO.length;
              total += overdueWO.length;
            }
          }
        } catch (err) {
          console.error('Erreur work orders:', err);
        }
      }
      
      // 2. Améliorations en retard (ORANGE)
      if (canViewModule('improvements')) {
        try {
          const impResponse = await fetch(`${backend_url}/api/improvements`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (impResponse.ok) {
            const improvements = await impResponse.json();
            const overdueImp = improvements.filter(imp => {
              if (!imp.dateLimite || imp.statut === 'TERMINE' || imp.statut === 'ANNULE') return false;
              const dueDate = new Date(imp.dateLimite);
              return dueDate < today;
            });
            if (overdueImp.length > 0) {
              details.improvements = {
                count: overdueImp.length,
                label: 'Améliorations',
                route: '/improvements',
                category: 'execution'
              };
              executionCount += overdueImp.length;
              total += overdueImp.length;
            }
          }
        } catch (err) {
          console.error('Erreur improvements:', err);
        }
      }
      
      // 3. Demandes d'intervention en retard (JAUNE)
      if (canViewModule('interventionRequests')) {
        try {
          const irResponse = await fetch(`${backend_url}/api/intervention-requests`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (irResponse.ok) {
            const interventionRequests = await irResponse.json();
            const overdueIR = interventionRequests.filter(ir => {
              if (!ir.date_limite_desiree || ir.statut === 'TERMINE' || ir.statut === 'ANNULE') return false;
              const dueDate = new Date(ir.date_limite_desiree);
              return dueDate < today;
            });
            if (overdueIR.length > 0) {
              details.interventionRequests = {
                count: overdueIR.length,
                label: "Demandes d'intervention",
                route: '/intervention-requests',
                category: 'requests'
              };
              requestsCount += overdueIR.length;
              total += overdueIR.length;
            }
          }
        } catch (err) {
          console.error('Erreur intervention requests:', err);
        }
      }
      
      // 4. Demandes d'amélioration en retard (JAUNE)
      if (canViewModule('improvementRequests')) {
        try {
          const imprResponse = await fetch(`${backend_url}/api/improvement-requests`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (imprResponse.ok) {
            const improvementRequests = await imprResponse.json();
            const overdueImpr = improvementRequests.filter(impr => {
              if (!impr.date_limite_desiree || impr.status !== 'VALIDEE') return false;
              const dueDate = new Date(impr.date_limite_desiree);
              return dueDate < today;
            });
            if (overdueImpr.length > 0) {
              details.improvementRequests = {
                count: overdueImpr.length,
                label: "Demandes d'amélioration",
                route: '/improvement-requests',
                category: 'requests'
              };
              requestsCount += overdueImpr.length;
              total += overdueImpr.length;
            }
          }
        } catch (err) {
          console.error('Erreur improvement requests:', err);
        }
      }
      
      // 5. Maintenances préventives en retard (BLEU)
      if (canViewModule('preventiveMaintenance')) {
        try {
          const pmResponse = await fetch(`${backend_url}/api/preventive-maintenance`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (pmResponse.ok) {
            const preventiveMaintenances = await pmResponse.json();
            const overduePM = preventiveMaintenances.filter(pm => {
              if (!pm.next_date || pm.statut === 'TERMINE' || pm.actif === false) return false;
              const dueDate = new Date(pm.next_date);
              return dueDate < today;
            });
            if (overduePM.length > 0) {
              details.preventiveMaintenance = {
                count: overduePM.length,
                label: 'Maintenances préventives',
                route: '/preventive-maintenance',
                category: 'maintenance'
              };
              maintenanceCount += overduePM.length;
              total += overduePM.length;
            }
          }
        } catch (err) {
          console.error('Erreur preventive maintenance:', err);
        }
      }
      
      setOverdueCount(total);
      setOverdueDetails(details);
      setOverdueExecutionCount(executionCount);
      setOverdueRequestsCount(requestsCount);
      setOverdueMaintenanceCount(maintenanceCount);
      
    } catch (error) {
      console.error('Erreur chargement échéances:', error);
    } finally {
      setLoading(false);
    }
  }, [canViewModule]);

  // Charger au montage et rafraîchir périodiquement
  useEffect(() => {
    loadOverdueItems();
    const interval = setInterval(loadOverdueItems, 60000); // Toutes les minutes
    return () => clearInterval(interval);
  }, [loadOverdueItems]);

  return {
    overdueCount,
    overdueDetails,
    overdueExecutionCount,
    overdueRequestsCount,
    overdueMaintenanceCount,
    loading,
    refresh: loadOverdueItems
  };
};

export default useOverdueItems;
