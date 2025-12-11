import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import api from '../../services/api';

const AlertNotifications = () => {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadUnreadCount();
    
    // Auto-refresh du compteur toutes les 30 secondes
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen]);

  const loadUnreadCount = async () => {
    try {
      const response = await api.alerts.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Erreur chargement compteur alertes:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.alerts.getAll(false, 20);
      setAlerts(response.data);
    } catch (error) {
      console.error('Erreur chargement alertes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les alertes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (alertId) => {
    try {
      await api.alerts.markAsRead(alertId);
      await loadAlerts();
      await loadUnreadCount();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer l\'alerte',
        variant: 'destructive'
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.alerts.markAllAsRead();
      await loadAlerts();
      await loadUnreadCount();
      toast({
        title: 'Succès',
        description: 'Toutes les alertes ont été marquées comme lues'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de marquer les alertes',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      await api.alerts.delete(alertId);
      await loadAlerts();
      await loadUnreadCount();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'alerte',
        variant: 'destructive'
      });
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50';
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-50';
      case 'INFO':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return '🚨';
      case 'WARNING':
        return '⚠️';
      case 'INFO':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  return (
    <div className="relative">
      {/* Bouton notification */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown des alertes */}
      {isOpen && (
        <>
          {/* Overlay pour fermer */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel des alertes */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">Notifications</h3>
                <p className="text-sm text-gray-600">
                  {unreadCount} non {unreadCount > 1 ? 'lues' : 'lue'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Tout marquer comme lu"
                  >
                    <CheckCheck size={18} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Liste des alertes */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Chargement...</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={48} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-600">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !alert.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">
                          {getSeverityIcon(alert.severity)}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{alert.title}</h4>
                            {!alert.read && (
                              <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {alert.message}
                          </p>
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{alert.source_name}</span>
                            <span>•</span>
                            <span>{new Date(alert.created_at).toLocaleString()}</span>
                          </div>

                          {alert.actions_executed && alert.actions_executed.length > 0 && (
                            <div className="mt-2 flex gap-1 flex-wrap">
                              {alert.actions_executed.map((action, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded"
                                >
                                  {action === 'CREATE_WORKORDER' && '📋 OT créé'}
                                  {action === 'SEND_EMAIL' && '📧 Email envoyé'}
                                  {action === 'SEND_CHAT_MESSAGE' && '💬 Message envoyé'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          {!alert.read && (
                            <button
                              onClick={() => handleMarkAsRead(alert.id)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Marquer comme lu"
                            >
                              <CheckCheck size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AlertNotifications;
