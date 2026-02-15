/**
 * Hook pour le compteur de messages non lus du chat live
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getBackendURL } from '../utils/config';

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
      console.error('Erreur lors du chargement du nombre de messages non lus:', error);
    }
  }, [canViewChatLive, location.pathname]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  return { chatUnreadCount };
};

export default useChatUnreadCount;
