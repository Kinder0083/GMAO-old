/**
 * Hook personnalisé pour gérer les éléments en retard (échéances dépassées)
 * Source unique de vérité pour le calcul des compteurs overdue du header
 */
import { useState, useEffect, useCallback } from 'react';
import { getBackendURL } from '../../utils/config';

export const useOverdueItems = () => {
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueDetails, setOverdueDetails] = useState({});
  const [overdueExecutionCount, setOverdueExecutionCount] = useState(0);
  const [overdueRequestsCount, setOverdueRequestsCount] = useState(0);
  const [overdueMaintenanceCount, setOverdueMaintenanceCount] = useState(0);

  const loadOverdueItems = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const backend_url = getBackendURL();
    const userInfo = localStorage.getItem('user');
    const permissions = userInfo ? JSON.parse(userInfo).permissions : {};

    const canViewModule = (module) => permissions[module]?.view === true;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let total = 0;
    let executionCount = 0;
    let requestsCount = 0;
    let maintenanceCount = 0;
    const details = {};

    try {
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
              if (!imp.dateLimite || imp.statut === 'TERMINE' || imp.statut === 'ANNULE' || imp.statut === 'REFUSE') return false;
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
              if (!ir.date_limite_desiree || ir.statut === 'TERMINE' || ir.statut === 'ANNULE' || ir.statut === 'REFUSE') return false;
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

      // 4. Demandes d'amélioration en retard (JAUNE) - Seules les VALIDEE comptent
      if (canViewModule('improvementRequests')) {
        try {
          const imprResponse = await fetch(`${backend_url}/api/improvement-requests`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (imprResponse.ok) {
            const improvementRequests = await imprResponse.json();
            const overdueIMPR = improvementRequests.filter(impr => {
              if (!impr.date_limite_desiree || impr.status !== 'VALIDEE') return false;
              const dueDate = new Date(impr.date_limite_desiree);
              return dueDate < today;
            });
            if (overdueIMPR.length > 0) {
              details.improvementRequests = {
                count: overdueIMPR.length,
                label: "Demandes d'amélioration",
                route: '/improvement-requests',
                category: 'requests'
              };
              requestsCount += overdueIMPR.length;
              total += overdueIMPR.length;
            }
          }
        } catch (err) {
          console.error('Erreur improvement requests:', err);
        }
      }

      // 5. Maintenances préventives (BLEU)
      if (canViewModule('preventiveMaintenance')) {
        try {
          const pmResponse = await fetch(`${backend_url}/api/preventive-maintenance`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (pmResponse.ok) {
            const pms = await pmResponse.json();
            const overduePM = pms.filter(pm => {
              if (!pm.prochaineMaintenance || pm.statut !== 'ACTIF') return false;
              const nextDate = new Date(pm.prochaineMaintenance);
              return nextDate < today;
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
      setOverdueExecutionCount(executionCount);
      setOverdueRequestsCount(requestsCount);
      setOverdueMaintenanceCount(maintenanceCount);
      setOverdueDetails(details);
    } catch (error) {
      console.error('Erreur chargement échéances:', error);
    }
  }, []);

  // Charger au montage, rafraîchir toutes les minutes, et écouter les événements
  useEffect(() => {
    loadOverdueItems();
    const interval = setInterval(loadOverdueItems, 60000);

    const refresh = () => loadOverdueItems();
    window.addEventListener('workOrderCreated', refresh);
    window.addEventListener('workOrderUpdated', refresh);
    window.addEventListener('workOrderDeleted', refresh);
    window.addEventListener('improvementCreated', refresh);
    window.addEventListener('improvementUpdated', refresh);
    window.addEventListener('improvementDeleted', refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('workOrderCreated', refresh);
      window.removeEventListener('workOrderUpdated', refresh);
      window.removeEventListener('workOrderDeleted', refresh);
      window.removeEventListener('improvementCreated', refresh);
      window.removeEventListener('improvementUpdated', refresh);
      window.removeEventListener('improvementDeleted', refresh);
    };
  }, [loadOverdueItems]);

  return {
    overdueCount,
    overdueDetails,
    overdueExecutionCount,
    overdueRequestsCount,
    overdueMaintenanceCount,
    refresh: loadOverdueItems
  };
};

export default useOverdueItems;
