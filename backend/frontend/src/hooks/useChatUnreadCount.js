/**
 * Hook pour le compteur de messages non lus du chat live
 * Refresh déclenché par WebSocket via useHeaderWebSocket
 * Polling 30s en fallback (chat a besoin de refresh plus fréquent)
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getBackendURL } from '../utils/config';

const FALLBACK_INTERVAL = 30000; // 30s fallback pour le chat

export const useChatUnreadCount = (canViewChatLive) => {
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const location = useLocation();

  const load = useCallback(async () => {
    if (!canViewChatLive) return;

    if (location.pathname === '/chat-live') {
      setChatUnreadCount(0);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const backend_url = getBackendURL();
      const response = await fetch(`${backend_url}/api/chat/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setChatUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Erreur messages non lus:', error);
    }
  }, [canViewChatLive, location.pathname]);

  useEffect(() => {
    load();
    const interval = setInterval(load, FALLBACK_INTERVAL);

    const refresh = () => load();
    window.addEventListener('chatMessageReceived', refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('chatMessageReceived', refresh);
    };
  }, [load]);

  return { chatUnreadCount };
};

export default useChatUnreadCount;
