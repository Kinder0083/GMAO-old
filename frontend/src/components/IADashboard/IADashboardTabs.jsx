import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Wrench, ClipboardList, Activity, ShieldCheck, Bot, Loader2,
  Trash2, ToggleLeft, ToggleRight, Clock, User, Zap
} from 'lucide-react';
import api, { workOrdersAPI, automationsAPI, sensorsAPI, surveillanceAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

// ==================== OT Tab ====================
function OTTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await workOrdersAPI.getAll();
        const wos = res.data || res || [];
        const total = wos.length;
        const termines = wos.filter(w => ['TERMINE', 'termine', 'Termine', 'Cloture', 'cloture'].includes(w.statut)).length;
        const enCours = wos.filter(w => ['en_cours', 'En cours', 'EN_COURS'].includes(w.statut)).length;
        const enAttente = wos.filter(w => ['en_attente', 'En attente', 'Ouvert'].includes(w.statut)).length;
        const urgents = wos.filter(w => ['haute', 'urgente', 'Haute', 'Urgente', 'critical'].includes(w.priorite)).length;
        const tempsTotal = wos.reduce((acc, w) => acc + (w.tempsReel || 0), 0);
        const tempsMoyen = total > 0 ? (tempsTotal / total).toFixed(1) : 0;

        // Par catégorie
        const catMap = {};
        wos.forEach(w => {
          const cat = w.categorie || 'Non defini';
          catMap[cat] = (catMap[cat] || 0) + 1;
        });
        const parCategorie = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        // Par priorité
        const prioMap = {};
        wos.forEach(w => {
          const p = w.priorite || 'Non definie';
          prioMap[p] = (prioMap[p] || 0) + 1;
        });
        const parPriorite = Object.entries(prioMap).map(([name, value]) => ({ name, value }));

        // Top équipements
        const eqMap = {};
        wos.forEach(w => {
          const eq = w.equipement?.nom || w.equipement_nom || 'Non assigne';
          if (eq !== 'Non assigne') eqMap[eq] = (eqMap[eq] || 0) + 1;
        });
        const topEquipements = Object.entries(eqMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);

        setData({ total, termines, enCours, enAttente, urgents, tempsTotal, tempsMoyen, parCategorie, parPriorite, topEquipements, tauxResolution: total > 0 ? Math.round(termines / total * 100) : 0 });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12 text-gray-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement...</div>;
  if (!data) return <div className="py-8 text-center text-gray-400">Aucune donnee</div>;

  return (
    <div className="space-y-6" data-testid="ot-tab">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total OT', value: data.total, color: 'text-blue-600' },
          { label: 'Termines', value: data.termines, color: 'text-green-600' },
          { label: 'En cours', value: data.enCours, color: 'text-amber-600' },
          { label: 'Urgents', value: data.urgents, color: 'text-red-600' },
          { label: 'Taux resolution', value: `${data.tauxResolution}%`, color: data.tauxResolution >= 70 ? 'text-green-600' : 'text-red-600' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Par catégorie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Repartition par categorie</CardTitle></CardHeader>
          <CardContent>
            {data.parCategorie.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={data.parCategorie} cx="50%" cy="50%" innerRadius={45} outerRadius={85} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                    {data.parCategorie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">Pas de donnees</div>}
          </CardContent>
        </Card>

        {/* Top équipements */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Equipements les plus sollicites</CardTitle></CardHeader>
          <CardContent>
            {data.topEquipements.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.topEquipements} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" name="OT" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">Aucun equipement associe</div>}
          </CardContent>
        </Card>
      </div>

      {/* Temps */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-indigo-600">{data.tempsTotal.toFixed(1)}h</div>
            <div className="text-xs text-gray-500">Temps total maintenance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-bold text-indigo-600">{data.tempsMoyen}h</div>
            <div className="text-xs text-gray-500">Temps moyen par OT</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== Capteurs Tab ====================
function CapteursTab() {
  const [loading, setLoading] = useState(true);
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [sRes, aRes] = await Promise.all([
          sensorsAPI.getAll().catch(() => ({ data: [] })),
          api.get('/alerts').catch(() => ({ data: { alerts: [] } }))
        ]);
        setSensors(sRes.data || []);
        setAlerts((aRes.data?.alerts || aRes.data || []).slice(0, 20));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-12 text-gray-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement...</div>;

  const sensorsByStatus = { normal: 0, warning: 0, alert: 0, critical: 0, offline: 0 };
  sensors.forEach(s => { sensorsByStatus[s.status || 'normal']++; });

  return (
    <div className="space-y-6" data-testid="capteurs-tab">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total capteurs', value: sensors.length, color: 'text-blue-600' },
          { label: 'Normal', value: sensorsByStatus.normal, color: 'text-green-600' },
          { label: 'Alerte', value: sensorsByStatus.alert + sensorsByStatus.warning, color: 'text-amber-600' },
          { label: 'Critique', value: sensorsByStatus.critical, color: 'text-red-600' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sensors.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-gray-400">Aucun capteur configure. Ajoutez des capteurs IoT depuis le dashboard IoT.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sensors.map(s => (
            <Card key={s.id} className={`border-l-4 ${s.status === 'critical' ? 'border-l-red-500' : s.status === 'alert' || s.status === 'warning' ? 'border-l-amber-500' : 'border-l-green-500'}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.type} | {s.location || 'Emplacement non defini'}</p>
                  </div>
                  <Badge variant={s.status === 'normal' ? 'default' : 'destructive'} className="text-xs">{s.status}</Badge>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-xl font-bold">{s.last_value ?? '-'}</span>
                  <span className="text-xs text-gray-500">{s.unit}</span>
                </div>
                {s.min_threshold != null && <p className="text-xs text-gray-400 mt-1">Seuils: [{s.min_threshold}, {s.max_threshold}]</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Dernieres alertes capteurs</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 10).map((a, i) => (
                <div key={i} className="flex items-center gap-3 text-xs p-2 bg-gray-50 rounded">
                  <Badge variant={a.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">{a.severity || 'info'}</Badge>
                  <span className="flex-1">{a.title || a.message}</span>
                  <span className="text-gray-400">{a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : ''}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== Surveillance Tab ====================
function SurveillanceTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    (async () => {
      try {
        const items = await surveillanceAPI.getItems({ annee: currentYear });
        const total = items.length;
        const realise = items.filter(i => i.status === 'REALISE').length;
        const planifie = items.filter(i => i.status === 'PLANIFIE').length;
        const aPlanifier = items.filter(i => !i.status || i.status === 'PLANIFIER' || i.status === 'A_PLANIFIER').length;

        // Par catégorie
        const catMap = {};
        items.forEach(i => {
          const cat = i.categorie || 'Autre';
          if (!catMap[cat]) catMap[cat] = { total: 0, realise: 0 };
          catMap[cat].total++;
          if (i.status === 'REALISE') catMap[cat].realise++;
        });
        const parCategorie = Object.entries(catMap).map(([name, v]) => ({
          name, total: v.total, realise: v.realise, taux: v.total > 0 ? Math.round(v.realise / v.total * 100) : 0
        }));

        setData({ total, realise, planifie, aPlanifier, taux: total > 0 ? Math.round(realise / total * 100) : 0, parCategorie });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [currentYear]);

  if (loading) return <div className="flex items-center justify-center py-12 text-gray-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement...</div>;
  if (!data) return <div className="py-8 text-center text-gray-400">Aucune donnee</div>;

  return (
    <div className="space-y-6" data-testid="surveillance-tab">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: `Total controles ${currentYear}`, value: data.total, color: 'text-blue-600' },
          { label: 'Realises', value: data.realise, color: 'text-green-600' },
          { label: 'Planifies', value: data.planifie, color: 'text-indigo-600' },
          { label: 'A planifier', value: data.aPlanifier, color: 'text-amber-600' },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Taux global */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Taux de conformite global {currentYear}</span>
            <span className={`text-lg font-bold ${data.taux >= 80 ? 'text-green-600' : data.taux >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{data.taux}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${data.taux >= 80 ? 'bg-green-500' : data.taux >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${data.taux}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Par catégorie */}
      {data.parCategorie.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Conformite par categorie</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.parCategorie.map((cat, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{cat.name}</span>
                    <span className={cat.taux >= 80 ? 'text-green-600' : cat.taux >= 50 ? 'text-amber-600' : 'text-red-600'}>{cat.taux}% ({cat.realise}/{cat.total})</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${cat.taux >= 80 ? 'bg-green-500' : cat.taux >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${cat.taux}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== Automatisations Tab ====================
function AutomationsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [automations, setAutomations] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await automationsAPI.list();
      setAutomations(res.automations || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id) => {
    try {
      const res = await automationsAPI.toggle(id);
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: res.enabled } : a));
      toast({ title: res.enabled ? 'Automatisation activee' : 'Automatisation desactivee' });
    } catch (e) { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  const handleDelete = async (id) => {
    try {
      await automationsAPI.remove(id);
      setAutomations(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Automatisation supprimee' });
    } catch (e) { toast({ title: 'Erreur', variant: 'destructive' }); }
  };

  if (loading) return <div className="flex items-center justify-center py-12 text-gray-500"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement...</div>;

  const typeLabels = {
    sensor_alert: 'Alerte capteur',
    maintenance_reminder: 'Rappel maintenance',
    escalation_rule: 'Escalade',
    inventory_threshold: 'Seuil inventaire'
  };
  const typeColors = {
    sensor_alert: 'bg-blue-100 text-blue-700',
    maintenance_reminder: 'bg-green-100 text-green-700',
    escalation_rule: 'bg-amber-100 text-amber-700',
    inventory_threshold: 'bg-violet-100 text-violet-700'
  };

  return (
    <div className="space-y-4" data-testid="automations-tab">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{automations.length} automatisation(s) configuree(s)</p>
      </div>

      {automations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune automatisation configuree.</p>
            <p className="text-xs mt-1">Demandez a Adria : "Mets une alerte sur le capteur temperature a 32.5 degres"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map(a => (
            <Card key={a.id} className={`${a.enabled ? '' : 'opacity-60'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className={`h-4 w-4 ${a.enabled ? 'text-amber-500' : 'text-gray-400'}`} />
                      <span className="font-medium text-sm truncate">{a.name}</span>
                      <Badge className={`text-[10px] ${typeColors[a.type] || 'bg-gray-100 text-gray-700'}`}>{typeLabels[a.type] || a.type}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{a.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : '-'}</span>
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {a.created_by_name || 'Systeme'}</span>
                      {a.trigger_count > 0 && <span>{a.trigger_count} declenchement(s)</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(a.id)} title={a.enabled ? 'Desactiver' : 'Activer'}>
                      {a.enabled ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} title="Supprimer" className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export { OTTab, CapteursTab, SurveillanceTab, AutomationsTab };
