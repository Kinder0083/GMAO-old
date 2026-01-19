import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2, Clock, AlertTriangle, Wrench, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { notificationsAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';

const NotificationsDropdown = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [rpCount, setRpCount] = useState(0); // Compteur notifications RP (rouge)
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Charger le compteur de notifications non lues
  const loadUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getCount();
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Erreur chargement compteur notifications:', error);
    }
  };

  // Charger les notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsAPI.getAll(false, 20);
      const notifs = response.data || [];
      setNotifications(notifs);
      
      // Compter les notifications RP non lues
      const rpNotifs = notifs.filter(n => 
        !n.read && (n.type === 'rp_created' || n.metadata?.is_rp_notification)
      );
      setRpCount(rpNotifs.length);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    loadNotifications(); // Charger aussi les notifications pour le compteur RP
    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(() => {
      loadUnreadCount();
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notifId, e) => {
    e.stopPropagation();
    try {
      await notificationsAPI.markAsRead(notifId);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer la notification',
        variant: 'destructive'
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      await loadNotifications();
      await loadUnreadCount();
      toast({
        title: 'Succès',
        description: 'Toutes les notifications ont été marquées comme lues'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer les notifications',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (notifId, e) => {
    e.stopPropagation();
    try {
      await notificationsAPI.delete(notifId);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la notification',
        variant: 'destructive'
      });
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
    if (!notification.read) {
      handleMarkAsRead(notification.id, { stopPropagation: () => {} });
    }
  };

  const getNotificationIcon = (type, metadata) => {
    // Notification RP (Réparation à Planifier) - icône alerte rouge
    if (type === 'rp_created' || metadata?.is_rp_notification) {
      return <AlertTriangle className="text-red-500" size={18} />;
    }
    
    switch (type) {
      case 'pm_upcoming':
        return <Wrench className="text-blue-500" size={18} />;
      case 'pm_overdue':
        return <Wrench className="text-red-500" size={18} />;
      case 'wo_assigned':
      case 'wo_status':
        return <Wrench className="text-orange-500" size={18} />;
      case 'equipment_status':
        return <AlertTriangle className="text-yellow-500" size={18} />;
      default:
        return <Bell className="text-gray-500" size={18} />;
    }
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      medium: 'bg-blue-100 text-blue-700',
      low: 'bg-gray-100 text-gray-700'
    };
    const labels = {
      urgent: 'Urgent',
      high: 'Haute',
      medium: 'Moyenne',
      low: 'Basse'
    };
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded ${colors[priority] || colors.medium}`}>
        {labels[priority] || 'Moyenne'}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <TooltipProvider delayDuration={300}>
    <div className="relative" ref={dropdownRef}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setIsOpen(!isOpen)}
            data-testid="notifications-btn"
          >
            <Wrench size={20} />
            
            {/* Badge bleu pour les notifications PM (en haut à droite) */}
            {unreadCount > 0 && rpCount === 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            
            {/* Badge rouge pour les notifications RP (en bas à gauche) */}
            {rpCount > 0 && (
              <span className="absolute -bottom-1 -left-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
                {rpCount > 9 ? '9+' : rpCount}
              </span>
            )}
            
            {/* Badge bleu pour les notifications PM si il y a aussi des RP */}
            {unreadCount > rpCount && rpCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {(unreadCount - rpCount) > 9 ? '9+' : (unreadCount - rpCount)}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg max-w-xs">
          <p className="font-medium mb-2">Notifications maintenance</p>
          <p className="text-xs text-gray-300 mb-3">
            {unreadCount > 0 
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} en attente`
              : 'Aucune notification en attente'}
          </p>
          <div className="border-t border-gray-700 pt-2">
            <p className="text-xs text-gray-400 font-medium mb-1">Types de notifications</p>
            <div className="text-xs text-gray-400 ml-2 space-y-0.5">
              <p>🔧 Maintenances préventives à réaliser</p>
              <p>📅 Rappels d'échéances proches</p>
              <p>✅ Confirmations de réalisation</p>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-2 mt-2">
            <p className="text-xs text-gray-400 font-medium mb-1">Badges</p>
            <div className="text-xs text-gray-400 ml-2 space-y-0.5">
              <p>🔴 Rouge - Retards de planification</p>
              <p>🔵 Bleu - Autres notifications</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 max-h-[500px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-blue-600 hover:text-blue-700"
                  onClick={handleMarkAllAsRead}
                >
                  <CheckCheck size={14} className="mr-1" />
                  Tout marquer lu
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Wrench size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isRpNotification = notif.type === 'rp_created' || notif.metadata?.is_rp_notification;
                
                return (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notif.read 
                        ? isRpNotification 
                          ? 'bg-red-50 border-l-4 border-l-red-500' 
                          : 'bg-blue-50'
                        : ''
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notif.type, notif.metadata)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-sm font-medium truncate ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notif.title}
                          </p>
                          {getPriorityBadge(notif.priority)}
                          {isRpNotification && !notif.read && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-600 text-white font-medium">
                              RP
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {formatDate(notif.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1">
                        {!notif.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-green-600"
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            title="Marquer comme lu"
                          >
                            <Check size={14} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-600"
                          onClick={(e) => handleDelete(notif.id, e)}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                {unreadCount > 0 
                  ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
                  : 'Toutes les notifications sont lues'
                }
                {rpCount > 0 && (
                  <span className="text-red-600 font-medium ml-2">
                    ({rpCount} RP à traiter)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
};

export default NotificationsDropdown;
