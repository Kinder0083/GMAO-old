/**
 * Hook pour le compteur d'ordres de travail assignés et ouverts
 */
import { useState, useEffect, useCallback } from 'react';
import { getBackendURL } from '../utils/config';

export const useWorkOrdersCount = (userId) => {
  const [workOrdersCount, setWorkOrdersCount] = useState(0);

  const load = useCallback(async () => {
    if (!userId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const backend_url = getBackendURL();
      const response = await fetch(`${backend_url}/api/work-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const assignedOrders = data.filter(order => {
          const isAssigned = order.assigne_a_id === userId ||
            (order.assigneA && order.assigneA.id === userId);
          const isOpen = order.statut === 'OUVERT';
          return isAssigned && isOpen;
        });
        setWorkOrdersCount(assignedOrders.length);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des ordres de travail:', error);
    }
  }, [userId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);

    const refresh = () => load();
    window.addEventListener('workOrderCreated', refresh);
    window.addEventListener('workOrderUpdated', refresh);
    window.addEventListener('workOrderDeleted', refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('workOrderCreated', refresh);
      window.removeEventListener('workOrderUpdated', refresh);
      window.removeEventListener('workOrderDeleted', refresh);
    };
  }, [load]);

  return { workOrdersCount };
};

export default useWorkOrdersCount;
