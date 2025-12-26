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
    pollingInterval = 30000,
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Refs pour éviter les dépendances instables
  const wsRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const fetchDataFnRef = useRef(fetchDataFn);
  const entityTypeRef = useRef(entityType);

  // Mettre à jour les refs quand les valeurs changent
  useEffect(() => {
    fetchDataFnRef.current = fetchDataFn;
  }, [fetchDataFn]);

  useEffect(() => {
    entityTypeRef.current = entityType;
  }, [entityType]);

  // Obtenir l'utilisateur (stable)
  const userRef = useRef(JSON.parse(localStorage.getItem('user') || '{}'));
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

  /**
   * Charger les données depuis l'API (stable)
   */
  const loadData = useCallback(async () => {
    try {
      const result = await fetchDataFnRef.current();
      setData(result);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error(`[Realtime ${entityTypeRef.current}] Erreur chargement:`, err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  /**
   * Gérer les messages WebSocket (stable)
   */
  const handleWebSocketMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`[Realtime ${entityTypeRef.current}] Message reçu:`, message.type);

      switch (message.type) {
        case 'connected':
          console.log(`[Realtime ${entityTypeRef.current}] Connecté ✅`);
          setWsConnected(true);
          break;

        case 'created':
          setData(prevData => [message.data, ...prevData]);
          console.log(`[Realtime ${entityTypeRef.current}] Item créé:`, message.data?.id);
          break;

        case 'updated':
        case 'status_changed':
          setData(prevData =>
            prevData.map(item =>
              item.id === message.data.id ? message.data : item
            )
          );
          console.log(`[Realtime ${entityTypeRef.current}] Item mis à jour:`, message.data?.id);
          break;

        case 'deleted':
          const deletedId = message.data?.id || message.data;
          setData(prevData =>
            prevData.filter(item => item.id !== deletedId)
          );
          console.log(`[Realtime ${entityTypeRef.current}] Item supprimé:`, deletedId);
          break;

        case 'user_joined':
        case 'pong':
          break;

        default:
          console.log(`[Realtime ${entityTypeRef.current}] Message ignoré:`, message.type);
      }
    } catch (err) {
      console.error(`[Realtime ${entityTypeRef.current}] Erreur traitement message:`, err);
    }
  }, []);

  /**
   * Connecter au WebSocket (stable)
   */
  const connectWebSocket = useCallback(() => {
    const user = userRef.current;
    if (!enableWebSocket || !user?.id) return;

    // Nettoyer la connexion existante
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsHost;

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      wsHost = 'localhost:8001';
    } else if (BACKEND_URL) {
      try {
        const url = new URL(BACKEND_URL);
        wsHost = url.host;
      } catch (e) {
        wsHost = window.location.host;
      }
    } else {
      wsHost = window.location.host;
    }

    const wsUrl = `${wsProtocol}//${wsHost}/ws/realtime/${entityTypeRef.current}?user_id=${user.id}`;
    console.log(`[Realtime ${entityTypeRef.current}] Connexion à:`, wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`[Realtime ${entityTypeRef.current}] WebSocket ouvert`);
        setWsConnected(true);
        
        // Arrêter le polling si actif
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };

      ws.onmessage = handleWebSocketMessage;

      ws.onerror = (error) => {
        console.error(`[Realtime ${entityTypeRef.current}] Erreur WebSocket:`, error);
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log(`[Realtime ${entityTypeRef.current}] WebSocket fermé`);
        setWsConnected(false);
        wsRef.current = null;
        
        // Nettoyer le timeout précédent
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Réessayer après 5 secondes
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
        
        // Activer le polling de secours
        if (fallbackPolling && !pollingIntervalRef.current) {
          console.log(`[Realtime ${entityTypeRef.current}] Activation polling de secours`);
          pollingIntervalRef.current = setInterval(async () => {
            try {
              const result = await fetchDataFnRef.current();
              setData(result);
            } catch (err) {
              console.error(`[Realtime ${entityTypeRef.current}] Erreur polling:`, err);
            }
          }, pollingInterval);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error(`[Realtime ${entityTypeRef.current}] Erreur création WebSocket:`, err);
    }
  }, [enableWebSocket, BACKEND_URL, handleWebSocketMessage, fallbackPolling, pollingInterval]);

  /**
   * Initialisation - une seule fois au montage
   */
  useEffect(() => {
    // Charger les données initiales
    loadData();

    // Connecter au WebSocket après un court délai
    const wsTimeout = setTimeout(connectWebSocket, 500);

    // Ping pour garder la connexion active
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Cleanup
    return () => {
      clearTimeout(wsTimeout);
      clearInterval(pingInterval);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [loadData, connectWebSocket]);

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
    setData,
  };
};

export default useRealtimeData;
