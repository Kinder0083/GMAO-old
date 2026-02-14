import { useCallback, useEffect, useRef, useState } from 'react';
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

  const [planningEntries, setPlanningEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isMounted = useRef(true);

  // Fonction pour charger les entrées de planning
  const fetchPlanningEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (dateDebut) params.date_debut = dateDebut;
      if (dateFin) params.date_fin = dateFin;
      
      const entries = await demandesArretAPI.getPlanningEquipements(params);
      if (isMounted.current) {
        setPlanningEntries(entries || []);
        setError(null);
      }
      return entries || [];
    } catch (err) {
      console.error('[useDemandesArret] Erreur chargement planning:', err);
      if (isMounted.current) {
        setError(err.message);
      }
      return [];
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [dateDebut, dateFin]);

  // Fonction de rafraîchissement exposée
  const refresh = useCallback(() => {
    console.log('[useDemandesArret] Rafraîchissement manuel...');
    return fetchPlanningEntries();
  }, [fetchPlanningEntries]);

  // Gérer les messages WebSocket
  const handleWebSocketMessage = useCallback((event) => {
    if (!isMounted.current) return;
    
    try {
      const message = JSON.parse(event.data);
      console.log('[useDemandesArret] Message WebSocket reçu:', message.type, message.data);

      switch (message.type) {
        case 'connected':
          console.log('[useDemandesArret] WebSocket connecté ✅');
          setWsConnected(true);
          break;

        case 'created':
          console.log('[useDemandesArret] Nouvelle demande créée, rafraîchissement...');
          if (onDemandeCreated) onDemandeCreated(message.data);
          // Toujours rafraîchir pour avoir les dernières données
          fetchPlanningEntries();
          break;

        case 'updated':
        case 'status_changed':
          console.log('[useDemandesArret] Demande mise à jour, rafraîchissement...');
          if (onDemandeUpdated) onDemandeUpdated(message.data);
          fetchPlanningEntries();
          break;

        case 'report_accepted':
          console.log('[useDemandesArret] Report accepté, rafraîchissement...');
          if (onReportAccepted) onReportAccepted(message.data);
          fetchPlanningEntries();
          break;

        case 'deleted':
          console.log('[useDemandesArret] Demande supprimée, rafraîchissement...');
          fetchPlanningEntries();
          break;

        case 'pong':
        case 'user_joined':
          // Messages silencieux
          break;

        default:
          // Pour tout autre type de message, rafraîchir par sécurité
          if (message.entity_type === 'demandes_arret') {
            console.log('[useDemandesArret] Événement inconnu, rafraîchissement...', message.type);
            fetchPlanningEntries();
          }
          break;
      }
    } catch (err) {
      console.error('[useDemandesArret] Erreur parsing message WebSocket:', err);
    }
  }, [fetchPlanningEntries, onDemandeCreated, onDemandeUpdated, onReportAccepted]);

  // Connexion WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Construire l'URL WebSocket comme useRealtimeData
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      let wsHost = 'localhost:8001';
      let wsProtocol = 'ws:';
      
      if (backendUrl) {
        try {
          const url = new URL(backendUrl);
          wsHost = url.host;
          // Utiliser le même protocole que le backend
          wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        } catch (e) {
          wsHost = window.location.host;
          wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        }
      } else {
        wsHost = window.location.host;
        wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      }
      
      // Utiliser un user_id générique pour le planning
      const userId = 'planning-viewer-' + Date.now();
      const wsUrl = `${wsProtocol}//${wsHost}/api/ws/realtime/demandes_arret?user_id=${userId}`;
      
      console.log('[useDemandesArret] Connexion WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('[useDemandesArret] WebSocket ouvert');
        if (isMounted.current) {
          setWsConnected(true);
        }
      };
      
      ws.onmessage = handleWebSocketMessage;
      
      ws.onerror = (error) => {
        console.error('[useDemandesArret] Erreur WebSocket:', error);
      };
      
      ws.onclose = (event) => {
        console.log('[useDemandesArret] WebSocket fermé:', event.code, event.reason);
        if (isMounted.current) {
          setWsConnected(false);
          // Reconnecter après 5 secondes
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted.current) {
              connectWebSocket();
            }
          }, 5000);
        }
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('[useDemandesArret] Erreur création WebSocket:', err);
    }
  }, [handleWebSocketMessage]);

  // Charger les données initiales et connecter WebSocket
  useEffect(() => {
    isMounted.current = true;
    
    // Charger les données initiales
    fetchPlanningEntries();
    
    // Connecter WebSocket
    connectWebSocket();
    
    return () => {
      isMounted.current = false;
      
      // Fermer WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Annuler timeout de reconnexion
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchPlanningEntries, connectWebSocket]);

  // Recharger quand les dates changent
  useEffect(() => {
    fetchPlanningEntries();
  }, [dateDebut, dateFin]);

  return {
    planningEntries,
    loading,
    error,
    wsConnected,
    refresh
  };
};

export default useDemandesArret;
