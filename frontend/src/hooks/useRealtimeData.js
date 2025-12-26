import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook React réutilisable pour la synchronisation temps réel via WebSocket
 * Version stable sans boucles de re-render
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

  // Refs pour éviter les dépendances dans useEffect
  const wsRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const fetchDataFnRef = useRef(fetchDataFn);
  const mountedRef = useRef(true);
  
  // Mettre à jour la ref quand fetchDataFn change
  fetchDataFnRef.current = fetchDataFn;

  // Obtenir l'utilisateur (une seule fois)
  const userRef = useRef(JSON.parse(localStorage.getItem('user') || '{}'));
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

  /**
   * Charger les données depuis l'API
   */
  const loadData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      const result = await fetchDataFnRef.current();
      if (mountedRef.current) {
        setData(result);
        setError(null);
        setLoading(false);
      }
    } catch (err) {
      console.error(`[Realtime ${entityType}] Erreur chargement:`, err);
      if (mountedRef.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [entityType]);

  /**
   * Initialisation - S'exécute une seule fois au montage
   */
  useEffect(() => {
    mountedRef.current = true;
    const user = userRef.current;

    // Fonction pour gérer les messages WebSocket
    const handleMessage = (event) => {
      if (!mountedRef.current) return;
      
      try {
        const message = JSON.parse(event.data);
        console.log(`[Realtime ${entityType}] Message reçu:`, message.type);

        switch (message.type) {
          case 'connected':
            console.log(`[Realtime ${entityType}] Connecté ✅`);
            setWsConnected(true);
            break;

          case 'created':
            setData(prevData => [message.data, ...prevData]);
            console.log(`[Realtime ${entityType}] Item créé:`, message.data?.id);
            break;

          case 'updated':
            setData(prevData =>
              prevData.map(item =>
                item.id === message.data.id ? message.data : item
              )
            );
            console.log(`[Realtime ${entityType}] Item mis à jour:`, message.data?.id);
            break;

          case 'deleted':
            const deletedId = message.data?.id || message.data;
            setData(prevData =>
              prevData.filter(item => item.id !== deletedId)
            );
            console.log(`[Realtime ${entityType}] Item supprimé:`, deletedId);
            break;

          case 'status_changed':
            setData(prevData =>
              prevData.map(item =>
                item.id === message.data.id ? message.data : item
              )
            );
            console.log(`[Realtime ${entityType}] Statut changé:`, message.data?.id);
            break;

          case 'pong':
          case 'user_joined':
            // Ignorer
            break;

          default:
            console.log(`[Realtime ${entityType}] Message ignoré:`, message.type);
        }
      } catch (err) {
        console.error(`[Realtime ${entityType}] Erreur traitement message:`, err);
      }
    };

    // Fonction pour connecter au WebSocket
    const connect = () => {
      if (!enableWebSocket || !user?.id || !mountedRef.current) return;
      
      // Fermer la connexion existante si elle existe
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

      const wsUrl = `${wsProtocol}//${wsHost}/ws/realtime/${entityType}?user_id=${user.id}`;
      console.log(`[Realtime ${entityType}] Connexion à:`, wsUrl);

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!mountedRef.current) return;
          console.log(`[Realtime ${entityType}] WebSocket ouvert`);
          setWsConnected(true);
          
          // Arrêter le polling si actif
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        };

        ws.onmessage = handleMessage;

        ws.onerror = (error) => {
          console.error(`[Realtime ${entityType}] Erreur WebSocket:`, error);
          if (mountedRef.current) {
            setWsConnected(false);
          }
        };

        ws.onclose = () => {
          if (!mountedRef.current) return;
          console.log(`[Realtime ${entityType}] WebSocket fermé`);
          setWsConnected(false);
          wsRef.current = null;
          
          // Réessayer après 5 secondes
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, 5000);
          
          // Activer le polling de secours seulement si pas déjà actif
          if (fallbackPolling && !pollingIntervalRef.current && mountedRef.current) {
            console.log(`[Realtime ${entityType}] Activation polling de secours`);
            pollingIntervalRef.current = setInterval(() => {
              if (mountedRef.current) {
                fetchDataFnRef.current().then(result => {
                  if (mountedRef.current) {
                    setData(result);
                  }
                }).catch(console.error);
              }
            }, pollingInterval);
          }
        };

        wsRef.current = ws;
      } catch (err) {
        console.error(`[Realtime ${entityType}] Erreur création WebSocket:`, err);
      }
    };

    // Charger les données initiales
    loadData();

    // Connecter au WebSocket après un court délai
    const initTimeout = setTimeout(connect, 500);

    // Ping pour garder la connexion active
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Cleanup
    return () => {
      mountedRef.current = false;
      
      clearTimeout(initTimeout);
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
  }, [entityType, enableWebSocket, fallbackPolling, pollingInterval, BACKEND_URL, loadData]);

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
