/**
 * Composant d'icône et dropdown pour les alertes caméras
 * Affiché dans le header de l'application
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import {
  Camera,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Bell,
  BellOff
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const CameraAlertIcon = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/cameras/alerts/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Erreur chargement alertes caméras:', error);
    }
  }, []);

  // Charger les alertes au montage et périodiquement
  useEffect(() => {
    fetchAlerts();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Rafraîchir quand le dropdown s'ouvre
  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen, fetchAlerts]);

  const resolveAlert = async (alertId, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
      }
    } catch (error) {
      console.error('Erreur résolution alerte:', error);
    }
  };

  const alertCount = alerts.length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              data-testid="camera-alerts-btn"
            >
              <Camera className={`w-5 h-5 ${alertCount > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md animate-pulse">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg">
          <p className="font-medium">Alertes Caméras</p>
          <p className="text-xs text-gray-300 mt-1">
            {alertCount > 0 
              ? `${alertCount} alerte${alertCount > 1 ? 's' : ''} active${alertCount > 1 ? 's' : ''}`
              : 'Aucune alerte active'}
          </p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Alertes Caméras
            </h4>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.preventDefault();
                fetchAlerts();
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p className="text-sm font-medium">Tout est normal</p>
            <p className="text-xs mt-1">Aucune caméra hors ligne</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="px-3 py-3 hover:bg-gray-50 border-b last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{alert.camera_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {alert.email_sent_to && (
                        <Badge variant="outline" className="text-xs py-0 px-1.5">
                          Email envoyé
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={(e) => resolveAlert(alert.id, e)}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Résolu
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="cursor-pointer"
          onClick={() => navigate('/cameras')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Voir toutes les caméras
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CameraAlertIcon;
