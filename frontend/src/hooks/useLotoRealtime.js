import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Hook pour charger les consignations LOTO liées et les maintenir à jour en temps réel.
 * Utilise WebSocket + événements realtime_manager + polling fallback.
 */
export function useLotoByLinked(deps = []) {
  const [lotoByLinked, setLotoByLinked] = useState({});

  const loadLoto = useCallback(() => {
    api.get('/loto/by-linked').then(res => setLotoByLinked(res.data || {})).catch(() => {});
  }, []);

  useEffect(() => {
    loadLoto();

    // Polling fallback (toutes les 60s)
    const interval = setInterval(loadLoto, 60000);

    // WebSocket LOTO direct
    let ws = null;
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
      const wsUrl = baseUrl.replace(/^http/, 'ws') + '/api/ws/loto?token=' + (token || '');
      ws = new WebSocket(wsUrl);
      ws.onmessage = () => loadLoto();
      ws.onerror = () => {};
      ws.onclose = () => {};
    } catch (e) { /* fallback to polling */ }

    // Écouter le realtime_manager
    const handleRealtimeUpdate = (event) => {
      if (event.detail?.entity === 'loto') loadLoto();
    };
    window.addEventListener('realtime-update', handleRealtimeUpdate);

    return () => {
      clearInterval(interval);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      window.removeEventListener('realtime-update', handleRealtimeUpdate);
    };
  }, deps);

  return lotoByLinked;
}
