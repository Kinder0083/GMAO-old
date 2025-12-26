import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { purchaseRequestsAPI } from '../services/api';

/**
 * Hook spécifique pour les demandes d'achat avec synchronisation temps réel
 * 
 * @param {Object} filters - Filtres à appliquer (status, etc.)
 * @returns {Object} - État et fonctions pour les demandes d'achat
 */
export const usePurchaseRequests = (filters = {}) => {
  /**
   * Fonction pour charger les demandes d'achat depuis l'API
   */
  const fetchPurchaseRequests = useCallback(async () => {
    try {
      const params = filters.status && filters.status !== 'all' ? { status: filters.status } : {};
      const response = await purchaseRequestsAPI.getAll(params);
      
      if (response && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('[usePurchaseRequests] Erreur chargement:', error);
      throw error;
    }
  }, [filters.status]);

  /**
   * Handlers personnalisés pour les événements
   */
  const handleCreated = useCallback((newRequest) => {
    console.log('[usePurchaseRequests] Nouvelle demande créée:', newRequest);
  }, []);

  const handleUpdated = useCallback((updatedRequest) => {
    console.log('[usePurchaseRequests] Demande mise à jour:', updatedRequest);
  }, []);

  const handleDeleted = useCallback((deletedId) => {
    console.log('[usePurchaseRequests] Demande supprimée:', deletedId);
  }, []);

  const handleStatusChanged = useCallback((statusData) => {
    console.log('[usePurchaseRequests] Statut changé:', statusData);
  }, []);

  /**
   * Utiliser le hook générique avec handlers personnalisés
   */
  const {
    data: purchaseRequests,
    loading,
    error,
    wsConnected,
    refresh,
    setData: setPurchaseRequests,
  } = useRealtimeData('purchase_requests', fetchPurchaseRequests, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 30000,
    onCreated: handleCreated,
    onUpdated: handleUpdated,
    onDeleted: handleDeleted,
    onStatusChanged: handleStatusChanged,
  });

  return {
    purchaseRequests,
    loading,
    error,
    wsConnected,
    refresh,
    setPurchaseRequests,
  };
};

export default usePurchaseRequests;
