import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  FileSignature, Euro, Building2, AlertTriangle, Calendar,
  TrendingUp, ArrowLeft, Loader2, Clock, ChevronRight, Bell
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { contractsAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

const TYPE_LABELS = { maintenance: 'Maintenance', service: 'Service', location: 'Location', prestation: 'Prestation', autre: 'Autre' };
const STATUT_LABELS = { actif: 'Actif', expire: 'Expiré', resilie: 'Résilié', en_renouvellement: 'Renouvellement' };

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#6b7280'];
const STATUT_COLORS_CHART = { actif: '#22c55e', expire: '#ef4444', resilie: '#6b7280', en_renouvellement: '#f59e0b' };
const SEVERITY_STYLES = {
  critical: 'border-l-4 border-l-red-500 bg-red-50',
  warning: 'border-l-4 border-l-amber-500 bg-amber-50',
  info: 'border-l-4 border-l-blue-500 bg-blue-50'
};

const formatCurrency = (val) => {
  if (!val && val !== 0) return '-';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try { return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr)); }
  catch { return dateStr; }
};

const CustomTooltipBar = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  );
};

const CustomTooltipLine = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-blue-600">{formatCurrency(payload[0]?.value)}</p>
    </div>
  );
};

export default function ContractsDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const dashboard = await contractsAPI.getDashboard();
        setData(dashboard);
      } catch (e) {
        toast({ title: 'Erreur', description: 'Impossible de charger le tableau de bord', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  const { kpi, repartition_type, repartition_statut, cout_par_vendor, evolution_budget, calendar_events } = data;

  // Group calendar events by month for the calendar view
  const eventsByMonth = {};
  calendar_events.forEach(ev => {
    const d = ev.date_fin?.substring(0, 7);
    if (d) {
      if (!eventsByMonth[d]) eventsByMonth[d] = [];
      eventsByMonth[d].push(ev);
    }
  });

  const pieTypeData = repartition_type.map((r, i) => ({
    name: TYPE_LABELS[r.type] || r.type,
    value: r.count,
    color: PIE_COLORS[i % PIE_COLORS.length]
  }));

  const pieStatutData = repartition_statut.filter(r => r.count > 0).map(r => ({
    name: STATUT_LABELS[r.statut] || r.statut,
    value: r.count,
    color: STATUT_COLORS_CHART[r.statut] || '#6b7280'
  }));

  return (
    <div className="p-6 space-y-6" data-testid="contracts-dashboard">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            Tableau de bord Contrats
          </h1>
          <p className="text-gray-500 mt-1">Vue synthétique de vos engagements contractuels</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/contrats')} data-testid="back-to-contracts">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux contrats
        </Button>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Contrats actifs</p>
                <p className="text-3xl font-bold text-blue-600">{kpi.actifs}</p>
              </div>
              <FileSignature className="w-10 h-10 text-blue-200" />
            </div>
            <p className="text-xs text-gray-400 mt-1">{kpi.total} au total</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Budget mensuel</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(kpi.budget_mensuel)}</p>
              </div>
              <Euro className="w-10 h-10 text-green-200" />
            </div>
            <p className="text-xs text-gray-400 mt-1">{formatCurrency(kpi.budget_annuel)} / an</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">A renouveler</p>
                <p className="text-3xl font-bold text-amber-600">{kpi.a_renouveler_trimestre}</p>
              </div>
              <Clock className="w-10 h-10 text-amber-200" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Ce trimestre</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expirés</p>
                <p className="text-3xl font-bold text-red-600">{kpi.expires}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-200" />
            </div>
            <p className="text-xs text-gray-400 mt-1">{kpi.resilies} résilié(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution budget - Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Évolution du budget mensuel (12 mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution_budget}>
                  <defs>
                    <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltipLine />} />
                  <Area type="monotone" dataKey="cout" stroke="#3b82f6" strokeWidth={2} fill="url(#budgetGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Répartition par type - Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition par type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieTypeData} cx="50%" cy="50%" outerRadius={75} innerRadius={40} dataKey="value" paddingAngle={3}>
                    {pieTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} contrat(s)`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {pieTypeData.map((d, i) => (
                <div key={i} className="flex items-center gap-1 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Bar chart + Statut pie + Top vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coût par fournisseur - Bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              Coût par fournisseur
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cout_par_vendor.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cout_par_vendor} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="fournisseur" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltipBar />} />
                    <Legend />
                    <Bar dataKey="cout_mensuel" name="Mensuel" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="cout_annuel" name="Annuel" fill="#c4b5fd" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">Aucun fournisseur avec des coûts définis</p>
            )}
          </CardContent>
        </Card>

        {/* Répartition par statut + Top vendors */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Répartition par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieStatutData} cx="50%" cy="50%" outerRadius={45} innerRadius={25} dataKey="value" paddingAngle={3}>
                      {pieStatutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-1">
                {pieStatutData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Euro className="w-4 h-4" /> Top fournisseurs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {kpi.top_vendors.length > 0 ? kpi.top_vendors.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="truncate max-w-[140px]">{v.nom}</span>
                  </div>
                  <span className="font-semibold text-purple-700">{formatCurrency(v.cout_mensuel)}/m</span>
                </div>
              )) : (
                <p className="text-sm text-gray-400 text-center">Aucun fournisseur</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Timeline des échéances */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Calendrier des échéances
            {calendar_events.length > 0 && (
              <Badge className="bg-blue-100 text-blue-700 ml-2">{calendar_events.length} événement(s)</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {calendar_events.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucune échéance dans les 12 prochains mois</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {/* Group by month */}
              {Object.entries(eventsByMonth).map(([monthKey, events]) => {
                const monthDate = new Date(monthKey + '-01');
                const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(monthDate);
                return (
                  <div key={monthKey}>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {monthLabel}
                    </h4>
                    <div className="space-y-2 ml-5">
                      {events.map(ev => (
                        <div key={ev.id} className={`p-3 rounded-lg ${SEVERITY_STYLES[ev.severity]} cursor-pointer hover:shadow-sm transition-shadow`}
                          onClick={() => navigate('/contrats')} data-testid={`event-${ev.id}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{ev.titre}</p>
                              <p className="text-xs text-gray-500">{ev.fournisseur} - {ev.numero}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={
                                ev.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                ev.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                              }>
                                {ev.type === 'echeance' ? 'Échéance' : 'Résiliation'}
                              </Badge>
                              <p className="text-xs mt-1 font-medium">
                                {ev.jours_restants <= 0
                                  ? <span className="text-red-600">Expiré ({Math.abs(ev.jours_restants)}j)</span>
                                  : <span>{formatDate(ev.date_fin)} ({ev.jours_restants}j)</span>
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
