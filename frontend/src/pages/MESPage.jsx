import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../utils/config';
import { useToast } from '../hooks/use-toast';
import {
  Activity, Plus, Settings, Trash2, Play, Square, Clock, Target, Gauge,
  AlertTriangle, Wifi, WifiOff, Loader2, RefreshCw, Zap, Bell,
  BarChart3, TrendingUp, Timer, Package, ArrowLeft, CheckCircle2, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

const API = BACKEND_URL;
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// Static color map for Tailwind (avoids dynamic class purging)
const COLORS = {
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', icon: 'text-indigo-500', value: 'text-indigo-700' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',   icon: 'text-blue-500',   value: 'text-blue-700' },
  emerald:{ bg: 'bg-emerald-50',border: 'border-emerald-100',icon: 'text-emerald-500',value: 'text-emerald-700' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-100',   icon: 'text-teal-500',   value: 'text-teal-700' },
  red:    { bg: 'bg-red-50',    border: 'border-red-100',    icon: 'text-red-500',    value: 'text-red-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'text-orange-500', value: 'text-orange-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'text-purple-500', value: 'text-purple-700' },
  gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',   icon: 'text-gray-500',   value: 'text-gray-700' },
};

const MetricCard = ({ icon: Icon, label, value, color }) => {
  const c = COLORS[color] || COLORS.gray;
  return (
    <div className={`p-3 rounded-xl ${c.bg} border ${c.border}`} data-testid={`mes-metric-${color}`}>
      <div className="flex items-center gap-1 mb-1">
        <Icon className={`h-3.5 w-3.5 ${c.icon}`} />
        <span className="text-[10px] text-gray-500 truncate">{label}</span>
      </div>
      <div className={`text-lg font-bold ${c.value} truncate`}>{value}</div>
    </div>
  );
};

// ==================== MACHINE LIST ====================
const MachineList = ({ machines, onSelect, onCreate, onDelete, loading }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2" data-testid="mes-title">
          <Activity className="h-7 w-7 text-indigo-600" />
          M.E.S - Suivi de Production
        </h1>
        <p className="text-sm text-gray-500 mt-1">Manufacturing Execution System</p>
      </div>
      <button data-testid="mes-add-machine" onClick={onCreate}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
        <Plus className="h-4 w-4" /> Ajouter une machine
      </button>
    </div>

    {loading ? (
      <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
    ) : machines.length === 0 ? (
      <div className="text-center py-20 text-gray-400">
        <Activity className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg">Aucune machine configuree</p>
        <p className="text-sm">Ajoutez une machine pour commencer le suivi de production</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {machines.map(m => <MachineCard key={m.id} machine={m} onSelect={onSelect} onDelete={onDelete} />)}
      </div>
    )}
  </div>
);

// ==================== MACHINE CARD ====================
const MachineCard = ({ machine, onSelect, onDelete }) => {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${API}/api/mes/machines/${machine.id}/metrics`, { headers: getHeaders() });
        setMetrics(data);
      } catch {}
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [machine.id]);

  return (
    <Card className="group relative cursor-pointer hover:shadow-lg transition-shadow border-l-4"
      style={{ borderLeftColor: metrics?.is_running ? '#10b981' : '#ef4444' }}
      data-testid={`mes-machine-card-${machine.id}`}
      onClick={() => onSelect(machine.id)}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{machine.equipment_name}</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{machine.mqtt_topic}</p>
          </div>
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            metrics?.is_running ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {metrics?.is_running ? <Play className="h-3 w-3" /> : <Square className="h-3 w-3" />}
            {metrics?.is_running ? 'En marche' : 'Arret'}
          </div>
        </div>
        {metrics && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="text-center p-2 bg-indigo-50 rounded">
              <div className="text-lg font-bold text-indigo-600">{metrics.cadence_per_min}</div>
              <div className="text-[10px] text-gray-500">cp/min</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-lg font-bold text-blue-600">{metrics.cadence_per_hour}</div>
              <div className="text-[10px] text-gray-500">cp/h</div>
            </div>
            <div className="text-center p-2 bg-emerald-50 rounded">
              <div className="text-lg font-bold text-emerald-600">{metrics.production_today}</div>
              <div className="text-[10px] text-gray-500">Prod. jour</div>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded">
              <div className="text-lg font-bold text-amber-600">{metrics.trs}%</div>
              <div className="text-[10px] text-gray-500">TRS</div>
            </div>
          </div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDelete(machine.id); }}
          data-testid={`mes-delete-machine-${machine.id}`}
          className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
          <Trash2 className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
};

// ==================== MACHINE DASHBOARD ====================
const MachineDashboard = ({ machineId, onBack }) => {
  const [machine, setMachine] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [period, setPeriod] = useState('6h');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [editing, setEditing] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [timezoneOffset, setTimezoneOffset] = useState(1); // Default GMT+1 (France)
  const { toast } = useToast();

  // Load configured timezone offset from Special Settings
  useEffect(() => {
    const loadTimezone = async () => {
      try {
        const { data } = await axios.get(`${API}/api/timezone/offset`, { headers: getHeaders() });
        if (data && typeof data.timezone_offset === 'number') {
          setTimezoneOffset(data.timezone_offset);
        }
      } catch (err) {
        console.warn('Erreur chargement timezone, utilisation defaut GMT+1:', err);
      }
    };
    loadTimezone();
  }, []);

  const loadMachine = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/mes/machines/${machineId}`, { headers: getHeaders() });
      setMachine(data);
    } catch {}
  }, [machineId]);

  const loadMetrics = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/mes/machines/${machineId}/metrics`, { headers: getHeaders() });
      setMetrics(data);
    } catch {}
  }, [machineId]);

  const loadHistory = useCallback(async () => {
    try {
      let url = `${API}/api/mes/machines/${machineId}/history?period=${period}`;
      if (period === 'custom' && customFrom && customTo) {
        url += `&date_from=${customFrom}&date_to=${customTo}`;
      }
      const { data } = await axios.get(url, { headers: getHeaders() });
      setHistory(data);
    } catch {}
  }, [machineId, period, customFrom, customTo]);

  const loadAlerts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/mes/alerts?limit=20`, { headers: getHeaders() });
      setAlerts(data);
    } catch {}
  }, []);

  useEffect(() => { loadMachine(); loadAlerts(); }, [loadMachine, loadAlerts]);
  useEffect(() => { loadMetrics(); const i = setInterval(loadMetrics, 5000); return () => clearInterval(i); }, [loadMetrics]);
  useEffect(() => { loadHistory(); const i = setInterval(loadHistory, 60000); return () => clearInterval(i); }, [loadHistory]);

  const simulatePulse = async () => {
    try {
      await axios.post(`${API}/api/mes/machines/${machineId}/simulate-pulse`, {}, { headers: getHeaders() });
      loadMetrics();
      toast({ title: 'Impulsion simulee' });
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const pingAction = async () => {
    setPinging(true);
    try {
      const { data } = await axios.post(`${API}/api/mes/machines/${machineId}/ping`, {}, { headers: getHeaders() });
      toast({ title: data.success ? 'Capteur joignable' : 'Capteur injoignable', description: data.message,
        variant: data.success ? 'default' : 'destructive' });
    } catch { toast({ title: 'Erreur ping', variant: 'destructive' }); }
    setPinging(false);
  };

  const markAlertRead = async (alertId) => {
    try {
      await axios.put(`${API}/api/mes/alerts/${alertId}/read`, {}, { headers: getHeaders() });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
    } catch {}
  };

  const markAllAlertsRead = async () => {
    try {
      await axios.put(`${API}/api/mes/alerts/read-all`, {}, { headers: getHeaders() });
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      toast({ title: 'Toutes les alertes marquees comme lues' });
    } catch {}
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Apply timezone offset to UTC timestamps for display
  const applyTzOffset = (isoTimestamp) => {
    const utcDate = new Date(isoTimestamp);
    return new Date(utcDate.getTime() + (timezoneOffset * 60 * 60 * 1000));
  };

  const chartData = history.map(h => ({
    time: applyTzOffset(h.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
    cadence: h.cadence,
    theoretical: h.theoretical,
  }));

  const unreadAlerts = alerts.filter(a => !a.read);

  const getAlertIcon = (type) => {
    const map = {
      STOPPED: <Square className="h-4 w-4 text-red-500" />,
      UNDER_CADENCE: <TrendingUp className="h-4 w-4 text-orange-500 rotate-180" />,
      OVER_CADENCE: <TrendingUp className="h-4 w-4 text-yellow-500" />,
      NO_SIGNAL: <WifiOff className="h-4 w-4 text-gray-500" />,
      TARGET_REACHED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    };
    return map[type] || <AlertTriangle className="h-4 w-4 text-orange-500" />;
  };

  const getAlertColor = (type) => {
    const map = {
      STOPPED: 'border-l-red-500 bg-red-50',
      UNDER_CADENCE: 'border-l-orange-500 bg-orange-50',
      OVER_CADENCE: 'border-l-yellow-500 bg-yellow-50',
      NO_SIGNAL: 'border-l-gray-500 bg-gray-100',
      TARGET_REACHED: 'border-l-green-500 bg-green-50',
    };
    return map[type] || 'border-l-orange-500 bg-orange-50';
  };

  if (!machine) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg" data-testid="mes-back-btn">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900" data-testid="mes-machine-name">{machine.equipment_name}</h1>
            <p className="text-xs text-gray-400 font-mono">{machine.mqtt_topic} {machine.sensor_ip && `| IP: ${machine.sensor_ip}`}</p>
          </div>
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            metrics?.is_running ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
            data-testid="mes-machine-status">
            {metrics?.is_running ? <><Wifi className="h-3 w-3" /> En marche</> : <><WifiOff className="h-3 w-3" /> Arret</>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAlerts(!showAlerts)}
            className="relative px-3 py-1.5 text-xs bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100"
            data-testid="mes-alerts-btn">
            <Bell className="h-3 w-3 inline mr-1" />Alertes
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {unreadAlerts.length}
              </span>
            )}
          </button>
          <button onClick={simulatePulse} className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
            data-testid="mes-simulate-btn"><Zap className="h-3 w-3 inline mr-1" />Simuler</button>
          {machine.sensor_ip && (
            <button onClick={pingAction} disabled={pinging} data-testid="mes-ping-btn"
              className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50">
              {pinging ? <Loader2 className="h-3 w-3 inline mr-1 animate-spin" /> : <Wifi className="h-3 w-3 inline mr-1" />}Ping
            </button>
          )}
          <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
            data-testid="mes-settings-btn"><Settings className="h-3 w-3 inline mr-1" />Parametres</button>
        </div>
      </div>

      {/* Alerts Panel */}
      {showAlerts && (
        <Card data-testid="mes-alerts-panel">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" /> Alertes recentes
              </CardTitle>
              <div className="flex items-center gap-2">
                {unreadAlerts.length > 0 && (
                  <button onClick={markAllAlertsRead}
                    className="text-xs text-indigo-600 hover:underline" data-testid="mes-mark-all-read">
                    Tout marquer comme lu
                  </button>
                )}
                <button onClick={() => setShowAlerts(false)} className="p-1 hover:bg-gray-100 rounded">
                  <XCircle className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucune alerte</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {alerts.map(alert => (
                  <div key={alert.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border-l-4 ${getAlertColor(alert.type)} ${alert.read ? 'opacity-50' : ''}`}
                    data-testid={`mes-alert-${alert.id}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {getAlertIcon(alert.type)}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{alert.message}</p>
                        <p className="text-[10px] text-gray-500">
                          {alert.equipment_name} - {applyTzOffset(alert.created_at).toLocaleString('fr-FR', { timeZone: 'UTC' })}
                        </p>
                      </div>
                    </div>
                    {!alert.read && (
                      <button onClick={() => markAlertRead(alert.id)}
                        className="p-1 text-gray-400 hover:text-green-500 shrink-0 ml-2" title="Marquer comme lu">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3" data-testid="mes-metrics-grid">
        <MetricCard icon={Gauge} label="cp/min" value={metrics?.cadence_per_min ?? '-'} color="indigo" />
        <MetricCard icon={BarChart3} label="cp/h" value={metrics?.cadence_per_hour ?? '-'} color="blue" />
        <MetricCard icon={Package} label="Prod. jour" value={metrics?.production_today ?? '-'} color="emerald" />
        <MetricCard icon={Package} label="Prod. 24h" value={metrics?.production_24h ?? '-'} color="teal" />
        <MetricCard icon={Timer} label="Arret actuel" value={formatTime(metrics?.downtime_current_seconds)} color="red" />
        <MetricCard icon={Clock} label="Arret jour" value={formatTime(metrics?.downtime_today_seconds)} color="orange" />
        <MetricCard icon={TrendingUp} label="TRS" value={`${metrics?.trs ?? 0}%`} color="purple" />
        <MetricCard icon={Target} label="Cadence theo." value={`${metrics?.theoretical_cadence ?? 0}`} color="gray" />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Historique de cadence</CardTitle>
            <div className="flex items-center gap-1">
              {['6h', '12h', '24h', '7d'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${period === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  data-testid={`mes-period-${p}`}>{p}</button>
              ))}
              <button onClick={() => setPeriod('custom')}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${period === 'custom' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                data-testid="mes-period-custom">
                Perso.
              </button>
            </div>
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2 mt-2">
              <input type="datetime-local" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="text-xs border rounded px-2 py-1" data-testid="mes-custom-from" />
              <span className="text-xs text-gray-400">-</span>
              <input type="datetime-local" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="text-xs border rounded px-2 py-1" data-testid="mes-custom-to" />
              <button onClick={loadHistory} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                data-testid="mes-custom-apply">
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-12 text-gray-400" data-testid="mes-chart-empty">Pas de donnees pour cette periode</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} />
                <ReferenceLine y={machine.theoretical_cadence} stroke="#a78bfa" strokeDasharray="5 5" label="Theorique" />
                <Line type="monotone" dataKey="cadence" stroke="#6366f1" strokeWidth={2} dot={false} name="Cadence reelle" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Settings Modal */}
      {editing && <MachineSettingsModal machine={machine} onClose={() => { setEditing(false); loadMachine(); }} />}
    </div>
  );
};

// ==================== SETTINGS MODAL ====================
const MachineSettingsModal = ({ machine, onClose }) => {
  const [form, setForm] = useState({
    theoretical_cadence: machine.theoretical_cadence || 6,
    downtime_margin_pct: machine.downtime_margin_pct || 30,
    sensor_ip: machine.sensor_ip || '',
    mqtt_topic: machine.mqtt_topic || '',
    alert_stopped_minutes: machine.alerts?.stopped_minutes || 5,
    alert_under_cadence: machine.alerts?.under_cadence || 0,
    alert_over_cadence: machine.alerts?.over_cadence || 0,
    alert_daily_target: machine.alerts?.daily_target || 0,
    alert_no_signal_minutes: machine.alerts?.no_signal_minutes || 10,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/mes/machines/${machine.id}`, form, { headers: getHeaders() });
      toast({ title: 'Parametres sauvegardes' });
      onClose();
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
    setSaving(false);
  };

  const Field = ({ label, field, type = 'number', unit = '' }) => (
    <div>
      <label className="text-xs font-medium text-gray-600">{label} {unit && <span className="text-gray-400">({unit})</span>}</label>
      <input type={type} value={form[field]}
        onChange={e => setForm({ ...form, [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
        className="w-full mt-1 px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        data-testid={`mes-setting-${field}`} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="mes-settings-modal">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Parametres machine</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Production</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cadence theorique" field="theoretical_cadence" unit="cp/min" />
              <Field label="Marge arret" field="downtime_margin_pct" unit="%" />
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Capteur</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Topic MQTT" field="mqtt_topic" type="text" />
              <Field label="Adresse IP capteur" field="sensor_ip" type="text" />
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Alertes</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Arret machine" field="alert_stopped_minutes" unit="min" />
              <Field label="Perte signal" field="alert_no_signal_minutes" unit="min" />
              <Field label="Sous-cadence" field="alert_under_cadence" unit="cp/min" />
              <Field label="Sur-cadence" field="alert_over_cadence" unit="cp/min" />
              <Field label="Objectif journalier" field="alert_daily_target" unit="coups" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Annuler</button>
          <button onClick={save} disabled={saving} data-testid="mes-save-settings"
            className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== CREATE MODAL ====================
const CreateMachineModal = ({ onClose, onCreated }) => {
  const [equipments, setEquipments] = useState([]);
  const [form, setForm] = useState({
    equipment_id: '', mqtt_topic: '', sensor_ip: '', theoretical_cadence: 6,
    downtime_margin_pct: 30, alert_stopped_minutes: 5, alert_no_signal_minutes: 10,
    alert_under_cadence: 0, alert_over_cadence: 0, alert_daily_target: 0,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    axios.get(`${API}/api/equipments`, { headers: getHeaders() })
      .then(r => setEquipments(Array.isArray(r.data) ? r.data : r.data.data || []))
      .catch(() => {});
  }, []);

  const save = async () => {
    if (!form.equipment_id || !form.mqtt_topic) {
      toast({ title: 'Veuillez remplir les champs obligatoires', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/api/mes/machines`, form, { headers: getHeaders() });
      toast({ title: 'Machine ajoutee' });
      onCreated();
    } catch (e) { toast({ title: 'Erreur', description: e.response?.data?.detail, variant: 'destructive' }); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="mes-create-modal">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Ajouter une machine M.E.S</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Equipement *</label>
            <select value={form.equipment_id} onChange={e => setForm({ ...form, equipment_id: e.target.value })}
              className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500" data-testid="mes-select-equipment">
              <option value="">Selectionner un equipement</option>
              {equipments.map(eq => <option key={eq.id} value={eq.id}>{eq.nom}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Topic MQTT *</label>
              <input type="text" value={form.mqtt_topic} placeholder="factory/machine1/pulse"
                onChange={e => setForm({ ...form, mqtt_topic: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500"
                data-testid="mes-input-mqtt-topic" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">IP capteur</label>
              <input type="text" value={form.sensor_ip} placeholder="192.168.1.100"
                onChange={e => setForm({ ...form, sensor_ip: e.target.value })}
                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg"
                data-testid="mes-input-sensor-ip" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Cadence theorique (cp/min)</label>
              <input type="number" value={form.theoretical_cadence}
                onChange={e => setForm({ ...form, theoretical_cadence: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg"
                data-testid="mes-input-theoretical" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Marge arret (%)</label>
              <input type="number" value={form.downtime_margin_pct}
                onChange={e => setForm({ ...form, downtime_margin_pct: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 px-3 py-2 text-sm border rounded-lg"
                data-testid="mes-input-margin" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Annuler</button>
          <button onClick={save} disabled={saving} data-testid="mes-create-submit"
            className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Creer
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN PAGE ====================
const MESPage = () => {
  const [machines, setMachines] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadMachines = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/mes/machines`, { headers: getHeaders() });
      setMachines(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadMachines(); }, [loadMachines]);

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette machine et toutes ses donnees ?')) return;
    try {
      await axios.delete(`${API}/api/mes/machines/${id}`, { headers: getHeaders() });
      toast({ title: 'Machine supprimee' });
      loadMachines();
      if (selectedId === id) setSelectedId(null);
    } catch { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  if (selectedId) {
    return <MachineDashboard machineId={selectedId} onBack={() => { setSelectedId(null); loadMachines(); }} />;
  }

  return (
    <>
      <MachineList machines={machines} onSelect={setSelectedId} onCreate={() => setShowCreate(true)}
        onDelete={handleDelete} loading={loading} />
      {showCreate && <CreateMachineModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadMachines(); }} />}
    </>
  );
};

export default MESPage;
