import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Activity, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Shield, ShieldOff, Clock, HardDrive, Database, Cpu, Zap,
  ChevronDown, ChevronUp, RotateCcw
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';

const LEVEL_CONFIG = {
  1: { name: 'SOFT', label: 'Restart services', color: '#22c55e', bg: '#f0fdf4' },
  2: { name: 'ROLLBACK', label: 'Retour version', color: '#f59e0b', bg: '#fffbeb' },
  3: { name: 'MEDIUM', label: 'Reinstall deps', color: '#f97316', bg: '#fff7ed' },
  4: { name: 'HARD', label: 'Reset complet', color: '#ef4444', bg: '#fef2f2' },
};

function StatusDot({ status }) {
  const colors = {
    ok: 'bg-green-500',
    warning: 'bg-amber-500 animate-pulse',
    error: 'bg-red-500 animate-pulse',
    unknown: 'bg-gray-400',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status] || colors.unknown}`} />;
}

function HealthCard({ icon: Icon, label, status, message, iconColor }) {
  return (
    <Card className="overflow-hidden" data-testid={`health-card-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ backgroundColor: status === 'ok' ? '#f0fdf4' : status === 'warning' ? '#fffbeb' : status === 'error' ? '#fef2f2' : '#f8fafc' }}>
          <Icon size={20} style={{ color: iconColor || (status === 'ok' ? '#22c55e' : status === 'warning' ? '#f59e0b' : status === 'error' ? '#ef4444' : '#94a3b8') }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <StatusDot status={status} />
          </div>
          <p className="text-xs text-gray-500 truncate">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TimeAgo({ dateStr }) {
  if (!dateStr) return <span className="text-gray-400">jamais</span>;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return <span className="text-green-600">a l'instant</span>;
    if (mins < 60) return <span>il y a {mins} min</span>;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return <span>il y a {hours}h</span>;
    const days = Math.floor(hours / 24);
    return <span>il y a {days}j</span>;
  } catch {
    return <span className="text-gray-400">{dateStr}</span>;
  }
}

export default function SystemHealth() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [maintenanceToggling, setMaintenanceToggling] = useState(false);
  const [data, setData] = useState(null);
  const [healthChecks, setHealthChecks] = useState(null);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/maintenance/status');
      setData(res.data);
    } catch (e) {
      console.error('Erreur fetch status:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const res = await api.post('/health/force-check', {});
      setHealthChecks(res.data);
      toast({ title: 'Health check terminé', description: `Statut global: ${res.data.overall === 'ok' ? 'Sain' : res.data.overall}` });
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible de lancer le health check', variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const toggleMaintenance = async (activate) => {
    if (!window.confirm(activate ? 'Activer la page de maintenance ?' : 'Désactiver la page de maintenance ?')) return;
    setMaintenanceToggling(true);
    try {
      await api.post(activate ? '/maintenance/activate' : '/maintenance/deactivate', {});
      toast({ title: activate ? 'Maintenance activée' : 'Maintenance désactivée' });
      fetchStatus();
    } catch (e) {
      toast({ title: 'Erreur', description: e.response?.data?.detail || 'Opération échouée', variant: 'destructive' });
    } finally {
      setMaintenanceToggling(false);
    }
  };

  const resetFailures = async () => {
    try {
      await api.post('/health/reset-failures', {});
      toast({ title: 'Compteur remis à zéro' });
      fetchStatus();
    } catch (e) {
      toast({ title: 'Erreur', description: 'Impossible de reset le compteur', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchStatus();
    runHealthCheck();
  }, [fetchStatus]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { fetchStatus(); }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStatus]);

  const hs = data?.health_state;
  const history = data?.recovery_history || [];
  const sortedHistory = [...history].reverse();
  const maintenanceActive = data?.maintenance_active || false;
  const failures = hs?.consecutive_failures || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="system-health-loading">
        <RefreshCw className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" data-testid="system-health-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Activity className="text-blue-600" size={24} />
            Santé du Système
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Surveillance, maintenance et récupération automatique
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => { fetchStatus(); runHealthCheck(); }}
            disabled={checking}
            data-testid="health-refresh-btn"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            {checking ? 'Vérification...' : 'Actualiser'}
          </Button>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox" checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto 30s
          </label>
        </div>
      </div>

      {/* Maintenance Alert */}
      {maintenanceActive && (
        <Alert variant="destructive" data-testid="maintenance-active-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span><strong>Page de maintenance active</strong> — Les utilisateurs voient la page de maintenance</span>
            <Button size="sm" variant="outline" onClick={() => toggleMaintenance(false)} disabled={maintenanceToggling}>
              Désactiver
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Failures Alert */}
      {failures > 0 && (
        <Alert className="border-amber-200 bg-amber-50" data-testid="failures-alert">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-800">
              <strong>{failures} échec(s) consécutif(s)</strong> — Dernier niveau de récupération : {LEVEL_CONFIG[hs?.last_recovery_level]?.name || 'N/A'}
            </span>
            <Button size="sm" variant="outline" onClick={resetFailures} data-testid="reset-failures-btn">
              <RotateCcw size={12} className="mr-1" /> Reset
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Health Check Cards */}
      {healthChecks && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="health-checks-grid">
          <HealthCard icon={Zap} label="Backend API" status={healthChecks.checks?.backend?.status} message={healthChecks.checks?.backend?.message} />
          <HealthCard icon={Database} label="MongoDB" status={healthChecks.checks?.mongodb?.status} message={healthChecks.checks?.mongodb?.message} />
          <HealthCard icon={HardDrive} label="Disque" status={healthChecks.checks?.disk?.status} message={healthChecks.checks?.disk?.message} />
          <HealthCard icon={Cpu} label="Mémoire" status={healthChecks.checks?.memory?.status} message={healthChecks.checks?.memory?.message} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Status + Actions */}
        <div className="space-y-4">
          {/* Health State */}
          <Card data-testid="health-state-card">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity size={16} className="text-blue-600" />
                État du Health Check
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {hs ? (
                <>
                  <InfoRow label="Dernière vérification" value={<TimeAgo dateStr={hs.last_check} />} />
                  <InfoRow label="Dernier succès" value={<TimeAgo dateStr={hs.last_success} />} />
                  <InfoRow label="Dernier échec" value={<TimeAgo dateStr={hs.last_failure} />} />
                  <InfoRow label="Échecs consécutifs" value={
                    <span className={failures > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                      {failures}
                    </span>
                  } />
                  <InfoRow label="Total récupérations" value={hs.total_recoveries || 0} />
                  <InfoRow label="Dernier niveau" value={
                    hs.last_recovery_level > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: LEVEL_CONFIG[hs.last_recovery_level]?.bg,
                              color: LEVEL_CONFIG[hs.last_recovery_level]?.color
                            }}>
                        {LEVEL_CONFIG[hs.last_recovery_level]?.name}
                      </span>
                    ) : <span className="text-gray-400">Aucun</span>
                  } />
                </>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">
                  Health check non configuré.<br />
                  Lancez <code className="bg-gray-100 px-1 rounded">setup_health_check.sh</code> sur le serveur.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card data-testid="health-actions-card">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield size={16} className="text-violet-600" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Button
                className="w-full justify-start gap-2" variant="outline" size="sm"
                onClick={runHealthCheck} disabled={checking}
                data-testid="force-health-check-btn"
              >
                <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
                Forcer un health check
              </Button>
              {!maintenanceActive ? (
                <Button
                  className="w-full justify-start gap-2" variant="outline" size="sm"
                  onClick={() => toggleMaintenance(true)} disabled={maintenanceToggling}
                  data-testid="activate-maintenance-btn"
                >
                  <ShieldOff size={14} />
                  Activer la maintenance
                </Button>
              ) : (
                <Button
                  className="w-full justify-start gap-2 text-green-700 border-green-200 hover:bg-green-50"
                  variant="outline" size="sm"
                  onClick={() => toggleMaintenance(false)} disabled={maintenanceToggling}
                  data-testid="deactivate-maintenance-btn"
                >
                  <Shield size={14} />
                  Désactiver la maintenance
                </Button>
              )}
              {failures > 0 && (
                <Button
                  className="w-full justify-start gap-2" variant="outline" size="sm"
                  onClick={resetFailures}
                  data-testid="reset-failures-action-btn"
                >
                  <RotateCcw size={14} />
                  Reset compteur d'échecs
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Recovery Levels Guide */}
          <Card data-testid="recovery-levels-card">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                Niveaux de récupération
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {[1, 2, 3, 4].map(lvl => {
                const cfg = LEVEL_CONFIG[lvl];
                return (
                  <div key={lvl} className="flex items-center gap-3 py-1.5">
                    <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ backgroundColor: cfg.color }}>
                      {lvl}
                    </span>
                    <div>
                      <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right: Recovery History */}
        <div className="lg:col-span-2">
          <Card data-testid="recovery-history-card">
            <CardHeader className="py-3 px-4 border-b cursor-pointer select-none" onClick={() => setHistoryExpanded(e => !e)}>
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  Historique des récupérations
                  <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{history.length}</span>
                </span>
                {historyExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </CardTitle>
            </CardHeader>
            {historyExpanded && (
              <CardContent className="p-0">
                {sortedHistory.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle2 className="mx-auto text-green-400 mb-2" size={32} />
                    <p className="text-sm text-gray-500">Aucune récupération enregistrée</p>
                    <p className="text-xs text-gray-400 mt-1">Le système n'a jamais eu besoin de s'auto-réparer</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {sortedHistory.map((event, idx) => {
                      const cfg = LEVEL_CONFIG[event.level] || LEVEL_CONFIG[1];
                      return (
                        <div key={idx} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                             data-testid={`recovery-event-${idx}`}>
                          <div className="flex-shrink-0">
                            {event.success ? (
                              <CheckCircle2 size={18} className="text-green-500" />
                            ) : (
                              <XCircle size={18} className="text-red-500" />
                            )}
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                                style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                            {cfg.name}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 truncate">{event.details}</p>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                            {formatDate(event.timestamp)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
           d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch { return isoStr; }
}
