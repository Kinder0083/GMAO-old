import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook React réutilisable pour la synchronisation temps réel via WebSocket
 * 
 * @param {string} entityType - Type d'entité (work_orders, equipments, etc.)
 * @param {Function} fetchDataFn - Fonction pour charger les données initiales
 * @param {Object} options - Options de configuration
 * @returns {Object} - État et fonctions
 */
export const useRealtimeData = (entityType, fetchDataFn, options = {}) => {
  const {
    enableWebSocket = true,
    fallbackPolling = true,
    pollingInterval = 30000, // 30s fallback si WebSocket échoue
    onCreated = null,
    onUpdated = null,
    onDeleted = null,
    onStatusChanged = null,
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const isInitialMount = useRef(true);
  const isConnectingRef = useRef(false); // Éviter les connexions multiples

  // Obtenir l'utilisateur et le backend URL
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
  
  // Stocker les options dans une ref pour éviter les recréations infinies
  const optionsRef = useRef({ onCreated, onUpdated, onDeleted, onStatusChanged });
  optionsRef.current = { onCreated, onUpdated, onDeleted, onStatusChanged };

  /**
   * Charger les données depuis l'API
   */
  const loadData = useCallback(async () => {
    try {
      const result = await fetchDataFnRef.current();
      setData(result);
      setError(null);
      
      if (isInitialMount.current) {
        setLoading(false);
        isInitialMount.current = false;
      }
    } catch (err) {
      console.error(`[Realtime ${entityType}] Erreur chargement:`, err);
      setError(err.message);
      setLoading(false);
    }
  }, [entityType]);

  /**
   * Gérer les messages WebSocket
   */
  const handleWebSocketMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`[Realtime ${entityType}] Message reçu:`, message.type);

      const { onCreated, onUpdated, onDeleted, onStatusChanged } = optionsRef.current;

      switch (message.type) {
        case 'connected':
          console.log(`[Realtime ${entityType}] Connecté ✅`);
          setWsConnected(true);
          break;

        case 'created':
          if (onCreated) {
            onCreated(message.data);
          } else {
            // Comportement par défaut: ajouter au début de la liste
            setData(prevData => [message.data, ...prevData]);
          }
          console.log(`[Realtime ${entityType}] Item créé:`, message.data.id);
          break;

        case 'updated':
          if (onUpdated) {
            onUpdated(message.data);
          } else {
            // Comportement par défaut: mettre à jour dans la liste
            setData(prevData =>
              prevData.map(item =>
                item.id === message.data.id ? message.data : item
              )
            );
          }
          console.log(`[Realtime ${entityType}] Item mis à jour:`, message.data.id);
          break;

        case 'deleted':
          if (onDeleted) {
            onDeleted(message.data.id);
          } else {
            // Comportement par défaut: retirer de la liste
            setData(prevData =>
              prevData.filter(item => item.id !== message.data.id)
            );
          }
          console.log(`[Realtime ${entityType}] Item supprimé:`, message.data.id);
          break;

        case 'status_changed':
          if (onStatusChanged) {
            onStatusChanged(message.data);
          }
          console.log(`[Realtime ${entityType}] Statut changé:`, message.data);
          break;

        case 'user_joined':
          console.log(`[Realtime ${entityType}] Utilisateur connecté:`, message.user_id);
          break;

        case 'pong':
          // Réponse au ping
          break;

        default:
          console.log(`[Realtime ${entityType}] Type de message inconnu:`, message.type);
      }
    } catch (err) {
      console.error(`[Realtime ${entityType}] Erreur traitement message:`, err);
    }
  }, [entityType]);

  /**
   * Connecter au WebSocket
   */
  const connectWebSocket = useCallback(() => {
    // Éviter les connexions multiples
    if (!enableWebSocket || !user?.id || isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    isConnectingRef.current = true;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsHost;

    // En local, utiliser localhost:8001
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      wsHost = 'localhost:8001';
    } else if (BACKEND_URL) {
      // En production, extraire le host de BACKEND_URL
      try {
        const url = new URL(BACKEND_URL);
        wsHost = url.host;
      } catch (e) {
        wsHost = window.location.host;
      }
    } else {
      wsHost = window.location.host;
    }

    const wsUrl = `${wsProtocol}//${wsHost}/ws/realtime/${entityType}?user_id=${user.id}`;
    console.log(`[Realtime ${entityType}] Connexion à:`, wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`[Realtime ${entityType}] WebSocket ouvert`);
        isConnectingRef.current = false;
        setWsConnected(true);
        
        // Arrêter le polling si WebSocket connecté
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };

      ws.onmessage = handleWebSocketMessage;

      ws.onerror = (error) => {
        console.error(`[Realtime ${entityType}] Erreur WebSocket:`, error);
        isConnectingRef.current = false;
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log(`[Realtime ${entityType}] WebSocket fermé`);
        isConnectingRef.current = false;
        setWsConnected(false);
        wsRef.current = null;
        
        // Réessayer après 3 secondes
        setTimeout(() => {
          if (enableWebSocket && user?.id) {
            connectWebSocket();
          }
        }, 3000);
        
        // Activer le polling de secours
        if (fallbackPolling && !pollingIntervalRef.current) {
          console.log(`[Realtime ${entityType}] Activation polling de secours`);
          pollingIntervalRef.current = setInterval(() => {
            fetchDataFnRef.current().then(result => setData(result)).catch(console.error);
          }, pollingInterval);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error(`[Realtime ${entityType}] Erreur création WebSocket:`, err);
      isConnectingRef.current = false;
      setWsConnected(false);
    }
  }, [entityType, user?.id, enableWebSocket, BACKEND_URL, handleWebSocketMessage, fallbackPolling, pollingInterval]);

  // Stocker fetchDataFn dans une ref pour l'utiliser dans les callbacks sans dépendances
  const fetchDataFnRef = useRef(fetchDataFn);
  fetchDataFnRef.current = fetchDataFn;

  /**
   * Initialisation - S'exécute une seule fois au montage
   */
  useEffect(() => {
    // Charger les données initiales
    fetchDataFnRef.current().then(result => {
      setData(result);
      setLoading(false);
      isInitialMount.current = false;
    }).catch(err => {
      console.error(`[Realtime ${entityType}] Erreur chargement initial:`, err);
      setError(err.message);
      setLoading(false);
    });

    // Connecter au WebSocket après un court délai
    const wsTimeout = setTimeout(() => {
      connectWebSocket();
    }, 500);

    // Cleanup
    return () => {
      clearTimeout(wsTimeout);
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      isConnectingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  /**
   * Envoyer un ping pour garder la connexion active
   */
  useEffect(() => {
    if (!wsConnected) return;

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping toutes les 30 secondes

    return () => clearInterval(pingInterval);
  }, [wsConnected]);

  /**
   * Fonction pour rafraîchir manuellement
   */
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    wsConnected,
    refresh,
    setData, // Permettre la mise à jour manuelle si nécessaire
  };
};

export default useRealtimeData;
