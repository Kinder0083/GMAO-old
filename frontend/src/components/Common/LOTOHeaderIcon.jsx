import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';
import api from '../../services/api';

const LOTOHeaderIcon = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ demande: 0, consigne: 0, intervention: 0, deconsigne: 0 });
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/loto/stats');
      setStats(res.data);
    } catch (e) { /* silently fail */ }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);

    // WebSocket temps reel pour LOTO
    let ws = null;
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
      const wsUrl = baseUrl.replace(/^http/, 'ws') + '/api/ws/loto?token=' + (token || '');
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'loto_update' || data.type === 'stats_update') {
            load();
          }
        } catch (e) { /* ignore parse errors */ }
      };
      ws.onerror = () => { /* fallback to polling */ };
      ws.onclose = () => { /* reconnect handled by interval */ };
    } catch (e) { /* WebSocket not available, fallback to polling */ }

    // Ecouter aussi le realtime_manager via le WS existant
    const handleRealtimeUpdate = (event) => {
      if (event.detail?.entity === 'loto') load();
    };
    window.addEventListener('realtime-update', handleRealtimeUpdate);

    return () => {
      clearInterval(interval);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      window.removeEventListener('realtime-update', handleRealtimeUpdate);
    };
  }, [load]);

  // Click outside to close
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (!e.target.closest('[data-loto-menu]')) setMenuOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  const activeCount = (stats.consigne || 0) + (stats.intervention || 0);

  return (
    <div className="relative" data-loto-menu data-testid="loto-header-icon">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors relative border border-red-300 bg-red-50"
            data-testid="loto-header-btn"
          >
            <Lock size={18} className="text-red-600" />

            {/* Badge ROUGE - Coin sup. droit - Consignations actives */}
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md" data-testid="loto-badge-red">
                {activeCount > 9 ? '9+' : activeCount}
              </span>
            )}

            {/* Badge JAUNE - Coin sup. gauche - Demandes en attente */}
            {(stats.demande || 0) > 0 && (
              <span className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md" data-testid="loto-badge-yellow">
                {stats.demande > 9 ? '9+' : stats.demande}
              </span>
            )}

            {/* Badge VERT - Coin inf. gauche - Deconsignations */}
            {(stats.deconsigne || 0) > 0 && (
              <span className="absolute -bottom-1 -left-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md" data-testid="loto-badge-green">
                {stats.deconsigne > 9 ? '9+' : stats.deconsigne}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg max-w-xs">
          <p className="font-semibold mb-2">Consignations LOTO</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block"></span> Consignes actives</span>
              <span className="font-bold text-red-400">{activeCount}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-yellow-500 rounded-full inline-block"></span> Demandes en attente</span>
              <span className="font-bold text-yellow-400">{stats.demande || 0}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block"></span> Deconsignees</span>
              <span className="font-bold text-green-400">{stats.deconsigne || 0}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">Cliquez pour acceder aux consignations</p>
        </TooltipContent>
      </Tooltip>
      </TooltipProvider>

      {/* Menu deroulant */}
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Consignations LOTO</h3>
            <p className="text-xs text-gray-500 mt-1">Acces rapide par statut</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => { navigate('/consignations-loto', { state: { filterStatus: 'ACTIVE' } }); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between group"
              data-testid="loto-menu-consigne"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700 group-hover:text-red-600 font-medium">Equipements consignes</span>
              </div>
              <span className="text-sm font-semibold text-red-500">{activeCount}</span>
            </button>
            <button
              onClick={() => { navigate('/consignations-loto', { state: { filterStatus: 'DEMANDE' } }); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between group"
              data-testid="loto-menu-demande"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700 group-hover:text-yellow-600 font-medium">Demandes en attente</span>
              </div>
              <span className="text-sm font-semibold text-yellow-500">{stats.demande || 0}</span>
            </button>
            <button
              onClick={() => { navigate('/consignations-loto', { state: { filterStatus: 'DECONSIGNE' } }); setMenuOpen(false); }}
              className="w-full px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between group"
              data-testid="loto-menu-deconsigne"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700 group-hover:text-green-600 font-medium">Deconsignes</span>
              </div>
              <span className="text-sm font-semibold text-green-500">{stats.deconsigne || 0}</span>
            </button>
          </div>
          <div className="p-2 border-t border-gray-100">
            <button
              onClick={() => { navigate('/consignations-loto'); setMenuOpen(false); }}
              className="w-full text-center text-xs text-blue-600 hover:text-blue-700 py-1 font-medium"
              data-testid="loto-menu-all"
            >
              Voir toutes les consignations
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LOTOHeaderIcon;
