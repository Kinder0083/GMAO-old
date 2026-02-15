/**
 * Hook WebSocket centralisé pour les badges du header
 * Une seule connexion WS sur la room "header_badges"
 * Dispatche des window events pour déclencher le refresh des hooks individuels
 */
import { useEffect, useRef, useCallback } from 'react';

const EVENT_MAP = {
  work_orders: ['workOrderCreated', 'workOrderUpdated', 'workOrderDeleted'],
  improvements: ['improvementCreated', 'improvementUpdated', 'improvementDeleted'],
  intervention_requests: ['interventionRequestChanged'],
  improvement_requests: ['improvementRequestChanged'],
  preventive_maintenance: ['preventiveMaintenanceChanged'],
  inventory: ['inventoryItemCreated', 'inventoryItemUpdated', 'inventoryItemDeleted'],
  surveillance_plans: ['surveillanceItemCreated', 'surveillanceItemUpdated', 'surveillanceItemDeleted'],
  notification: ['notificationCreated'],
  chat: ['chatMessageReceived'],
};

export const useHeaderWebSocket = () => {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isMounted = useRef(true);
  const userIdRef = useRef(null);

  const dispatchEvents = useCallback((source) => {
    const events = EVENT_MAP[source];
    if (events) {
      events.forEach(evt => window.dispatchEvent(new Event(evt)));
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      userIdRef.current = user?.id;
    } catch {
      userIdRef.current = null;
    }

    const connect = () => {
      if (!userIdRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsHost;

      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        wsHost = 'localhost:8001';
      } else {
        try {
          const url = new URL(process.env.REACT_APP_BACKEND_URL || '');
          wsHost = url.host;
        } catch {
          wsHost = window.location.host;
        }
      }

      const wsUrl = `${wsProtocol}//${wsHost}/api/ws/realtime/header_badges?user_id=${userIdRef.current}`;

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[HeaderWS] Connecté');
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'header_refresh' && msg.source) {
              dispatchEvents(msg.source);
            }
          } catch { /* ignore parse errors */ }
        };

        ws.onerror = () => {};

        ws.onclose = () => {
          console.log('[HeaderWS] Déconnecté, reconnexion dans 10s...');
          if (isMounted.current) {
            reconnectTimeoutRef.current = setTimeout(connect, 10000);
          }
        };

        wsRef.current = ws;
      } catch (err) {
        console.error('[HeaderWS] Erreur:', err);
      }
    };

    // Ping pour garder la connexion
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    const wsTimeout = setTimeout(connect, 1000);

    return () => {
      isMounted.current = false;
      clearTimeout(wsTimeout);
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [dispatchEvents]);
};

export default useHeaderWebSocket;
