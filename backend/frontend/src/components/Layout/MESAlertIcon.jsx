import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/config';
import { Activity, AlertTriangle, Check, CheckCheck, Trash2 } from 'lucide-react';

const API = BACKEND_URL;
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const MESAlertIcon = () => {
  const [count, setCount] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const loadCount = async () => {
    try {
      const { data } = await axios.get(`${API}/api/mes/alerts/count`, { headers: getHeaders() });
      setCount(data.count || 0);
    } catch {}
  };

  useEffect(() => {
    loadCount();
    const i = setInterval(loadCount, 15000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (open) {
      axios.get(`${API}/api/mes/alerts?unread_only=false&limit=20`, { headers: getHeaders() })
        .then(r => setAlerts(r.data))
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    await axios.put(`${API}/api/mes/alerts/${id}/read`, {}, { headers: getHeaders() });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    setCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await axios.put(`${API}/api/mes/alerts/read-all`, {}, { headers: getHeaders() });
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    setCount(0);
  };

  const deleteAllAlerts = async () => {
    if (!window.confirm('Supprimer toutes les alertes M.E.S. ?')) return;
    try {
      await axios.delete(`${API}/api/mes/alerts/all`, { headers: getHeaders() });
      setAlerts([]);
      setCount(0);
    } catch {}
  };

  const typeIcons = {
    STOPPED: '🔴', UNDER_CADENCE: '⬇️', OVER_CADENCE: '⬆️',
    TARGET_REACHED: '🎯', NO_SIGNAL: '📡',
  };

  return (
    <div className="relative" ref={ref} data-testid="mes-alert-icon">
      <button onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        title="Alertes M.E.S">
        <Activity className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center
            bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Alertes M.E.S</span>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                  title="Marquer tout comme lu">
                  <CheckCheck className="h-3 w-3" /> Tout lire
                </button>
              )}
              {alerts.length > 0 && (
                <button onClick={deleteAllAlerts} className="text-xs text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                  title="Supprimer toutes les alertes" data-testid="mes-delete-all-alerts">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {alerts.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">Aucune alerte</div>
          ) : (
            alerts.map(a => (
              <div key={a.id} className={`px-4 py-3 border-b last:border-0 flex items-start gap-3 ${a.read ? 'opacity-60' : ''}`}>
                <span className="text-lg">{typeIcons[a.type] || '⚠️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800">{a.equipment_name}</p>
                  <p className="text-xs text-gray-500">{a.message}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(a.created_at).toLocaleString('fr-FR')}</p>
                </div>
                {!a.read && (
                  <button onClick={() => markRead(a.id)} className="p-1 text-gray-300 hover:text-green-500" title="Marquer comme lu">
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MESAlertIcon;
