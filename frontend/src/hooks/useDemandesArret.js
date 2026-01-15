import { useCallback } from 'react';
import { useRealtimeData } from './useRealtimeData';
import { demandesArretAPI } from '../services/api';

/**
 * Hook pour les demandes d'arrêt avec synchronisation temps réel via WebSocket
 * Utilisé par la page Planning M.Prev pour recevoir les mises à jour en temps réel
 */
export const useDemandesArret = (options = {}) => {
  const {
    dateDebut = null,
    dateFin = null,
    onDemandeCreated = null,
    onDemandeUpdated = null,
    onReportAccepted = null,
  } = options;

  // Fonction pour charger les entrées de planning
  const fetchPlanningEntries = useCallback(async () => {
    try {
      const params = {};
      if (dateDebut) params.date_debut = dateDebut;
      if (dateFin) params.date_fin = dateFin;
      
      const entries = await demandesArretAPI.getPlanningEquipements(params);
      return entries || [];
    } catch (error) {
      console.error('[useDemandesArret] Erreur chargement planning:', error);
      return [];
    }
  }, [dateDebut, dateFin]);

  // Utiliser useRealtimeData pour la synchronisation WebSocket
  const {
    data: planningEntries,
    loading,
    error,
    wsConnected,
    refresh
  } = useRealtimeData('demandes_arret', fetchPlanningEntries, {
    enableWebSocket: true,
    fallbackPolling: true,
    pollingInterval: 60000, // Fallback polling toutes les 60s
    onCreated: onDemandeCreated,
    onUpdated: onDemandeUpdated,
    onStatusChanged: (data) => {
      // Rafraîchir automatiquement quand un statut change
      console.log('[useDemandesArret] Status changed, refreshing...', data);
      refresh();
    },
  });

  // Handler personnalisé pour les événements de report
  // (Le composant parent peut passer onReportAccepted pour être notifié)

  return {
    planningEntries,
    loading,
    error,
    wsConnected,
    refresh
  };
};

export default useDemandesArret;
