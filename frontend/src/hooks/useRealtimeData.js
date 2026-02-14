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
    pollingInterval = 60000, // 60s fallback (augmenté pour éviter rate limiting)
    onCreated = null,
    onUpdated = null,
    onDeleted = null,
    onStatusChanged = null,
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState(null);

  // Refs pour éviter les re-renders et boucles
  const wsRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const hasInitialized = useRef(false);
  const isMounted = useRef(true);

  // Refs stables pour les fonctions
  const fetchDataFnRef = useRef(fetchDataFn);
  const onCreatedRef = useRef(onCreated);
  const onUpdatedRef = useRef(onUpdated);
  const onDeletedRef = useRef(onDeleted);
  const onStatusChangedRef = useRef(onStatusChanged);

  // Mettre à jour les refs quand les props changent
  useEffect(() => {
    fetchDataFnRef.current = fetchDataFn;
    onCreatedRef.current = onCreated;
    onUpdatedRef.current = onUpdated;
    onDeletedRef.current = onDeleted;
    onStatusChangedRef.current = onStatusChanged;
  });

  // Obtenir l'utilisateur et le backend URL (stable)
  const userIdRef = useRef(null);
  const backendUrlRef = useRef(process.env.REACT_APP_BACKEND_URL || '');
  
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      userIdRef.current = user?.id;
    } catch (e) {
      userIdRef.current = null;
    }
  }, []);

  /**
   * Charger les données depuis l'API (stable)
   */
  const loadData = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      const result = await fetchDataFnRef.current();
      if (isMounted.current) {
        setData(result);
        setError(null);
        setLoading(false);
      }
    } catch (err) {
      console.error(`[Realtime ${entityType}] Erreur chargement:`, err);
      if (isMounted.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [entityType]);

  /**
   * Gérer les messages WebSocket
   */
  const handleMessage = useCallback((event) => {
    if (!isMounted.current) return;
    
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'connected':
          console.log(`[Realtime ${entityType}] Connecté ✅`);
          setWsConnected(true);
          break;

        case 'created':
          if (onCreatedRef.current) {
            onCreatedRef.current(message.data);
          } else {
            setData(prevData => [message.data, ...prevData]);
          }
          break;

        case 'updated':
          if (onUpdatedRef.current) {
            onUpdatedRef.current(message.data);
          } else {
            setData(prevData =>
              prevData.map(item =>
                item.id === message.data.id ? message.data : item
              )
            );
          }
          break;

        case 'deleted':
          if (onDeletedRef.current) {
            onDeletedRef.current(message.data.id);
          } else {
            setData(prevData =>
              prevData.filter(item => item.id !== message.data.id)
            );
          }
          break;

        case 'status_changed':
          if (onStatusChangedRef.current) {
            onStatusChangedRef.current(message.data);
          } else {
            loadData();
          }
          break;

        case 'pong':
        case 'user_joined':
          // Messages silencieux
          break;

        default:
          break;
      }
    } catch (err) {
      console.error(`[Realtime ${entityType}] Erreur message:`, err);
    }
  }, [entityType, loadData]);

  /**
   * Initialisation unique
   */
  useEffect(() => {
    isMounted.current = true;
    
    // Charger les données initiales une seule fois
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadData();
    }

    // Fonction pour connecter WebSocket
    const connectWs = () => {
      if (!enableWebSocket || !userIdRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsHost;

      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        wsHost = 'localhost:8001';
      } else if (backendUrlRef.current) {
        try {
          const url = new URL(backendUrlRef.current);
          wsHost = url.host;
        } catch (e) {
          wsHost = window.location.host;
        }
      } else {
        wsHost = window.location.host;
      }

      const wsUrl = `${wsProtocol}//${wsHost}/api/ws/realtime/${entityType}?user_id=${userIdRef.current}`;
      console.log(`[Realtime ${entityType}] Connexion WebSocket...`);

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log(`[Realtime ${entityType}] WebSocket ouvert`);
          if (isMounted.current) setWsConnected(true);
          
          // Arrêter le polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        };

        ws.onmessage = handleMessage;

        ws.onerror = () => {
          if (isMounted.current) setWsConnected(false);
        };

        ws.onclose = () => {
          console.log(`[Realtime ${entityType}] WebSocket fermé`);
          if (isMounted.current) setWsConnected(false);
          
          // Reconnexion après 10 secondes
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(connectWs, 10000);
          
          // Polling de secours
          if (fallbackPolling && !pollingIntervalRef.current && isMounted.current) {
            pollingIntervalRef.current = setInterval(loadData, pollingInterval);
          }
        };

        wsRef.current = ws;
      } catch (err) {
        console.error(`[Realtime ${entityType}] Erreur création WebSocket:`, err);
      }
    };

    // Connexion WebSocket après délai
    const wsTimeout = setTimeout(connectWs, 1500);

    // Cleanup
    return () => {
      isMounted.current = false;
      clearTimeout(wsTimeout);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (wsRef.current) {
        wsRef.current.onclose = null; // Empêcher reconnexion auto
        wsRef.current.close();
        wsRef.current = null;
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [entityType, enableWebSocket, fallbackPolling, pollingInterval, loadData, handleMessage]);

  /**
   * Ping pour garder la connexion active
   */
  useEffect(() => {
    if (!wsConnected) return;

    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [wsConnected]);

  /**
   * Fonction pour rafraîchir manuellement
   */
  const refresh = useCallback(() => {
    return loadData(); // Retourner la Promise pour permettre l'await
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
