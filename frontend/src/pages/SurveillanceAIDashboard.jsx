import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2, XCircle, 
  Wrench, FileText, Activity, ShieldAlert, Download, Loader2
} from 'lucide-react';
import { surveillanceAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

function SurveillanceAIDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [analyticsData, alertsData] = await Promise.all([
        surveillanceAPI.getAIAnalytics(),
        surveillanceAPI.getAIAlerts()
      ]);
      setAnalytics(analyticsData);
      setAlerts(alertsData.alerts || []);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger les données', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px] text-gray-500">Chargement du tableau de bord...</div>;
  }

  if (!analytics || analytics.kpis.total_analyses === 0) {
    return (
      <div className="p-6" data-testid="ai-dashboard-page">
        <h1 className="text-2xl font-bold mb-6">Tableau de bord IA - Tendances</h1>
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Aucune donnée disponible</p>
            <p className="text-sm text-gray-400 mt-1">Le tableau de bord se remplira après vos premières analyses IA</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { kpis, evolution_mensuelle, par_organisme, par_categorie, par_resultat, tendances_degradation } = analytics;

  // Formater mois pour affichage
  const monthLabels = { '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aoû', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc' };
  const formattedEvolution = evolution_mensuelle.map(e => ({
    ...e,
    label: monthLabels[e.mois?.split('-')[1]] || e.mois
  }));

  const getSeverityColor = (severity) => {
    if (severity === 'HAUTE') return 'bg-red-100 text-red-700 border-red-200';
    if (severity === 'MOYENNE') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'HAUTE') return <XCircle className="h-4 w-4 text-red-500" />;
    if (severity === 'MOYENNE') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <Activity className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="p-6 space-y-6" data-testid="ai-dashboard-page">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tableau de bord IA - Tendances</h1>
      </div>

      {/* Phase 4: Alertes intelligentes */}
      {alerts.length > 0 && (
        <div className="space-y-2" data-testid="smart-alerts">
          {alerts.slice(0, 5).map((alert, i) => (
            <Alert key={i} className={`border ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-start gap-2">
                {getSeverityIcon(alert.severity)}
                <AlertDescription className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{alert.title}</span>
                    <Badge variant="outline" className="text-xs">{alert.severity}</Badge>
                  </div>
                  <p className="text-xs mt-0.5 opacity-80">{alert.details}</p>
                </AlertDescription>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="kpis">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 mx-auto text-blue-500 mb-1" />
            <div className="text-2xl font-bold">{kpis.total_analyses}</div>
            <div className="text-xs text-gray-500">Analyses IA</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto text-indigo-500 mb-1" />
            <div className="text-2xl font-bold">{kpis.total_controles}</div>
            <div className="text-xs text-gray-500">Contrôles créés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto text-emerald-500 mb-1" />
            <div className="text-2xl font-bold text-emerald-600">{kpis.taux_conformite}%</div>
            <div className="text-xs text-gray-500">Taux conformité</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ShieldAlert className="h-6 w-6 mx-auto text-red-500 mb-1" />
            <div className="text-2xl font-bold text-red-600">{kpis.total_non_conformites}</div>
            <div className="text-xs text-gray-500">Non-conformités</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wrench className="h-6 w-6 mx-auto text-amber-500 mb-1" />
            <div className="text-2xl font-bold">{kpis.total_work_orders}</div>
            <div className="text-xs text-gray-500">BT curatifs</div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution mensuelle conformité */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Évolution mensuelle de la conformité</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={formattedEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value, name) => {
                    const labels = { conformes: 'Conformes', non_conformes: 'Non conformes', controles: 'Total contrôles' };
                    return [value, labels[name] || name];
                  }}
                />
                <Area type="monotone" dataKey="conformes" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="conformes" />
                <Area type="monotone" dataKey="non_conformes" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="non_conformes" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par résultat */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Répartition des résultats</CardTitle>
          </CardHeader>
          <CardContent>
            {par_resultat.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={par_resultat}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="label"
                    label={({ label, value }) => `${label}: ${value}`}
                  >
                    {par_resultat.map((entry, i) => (
                      <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">Pas de données</div>
            )}
          </CardContent>
        </Card>

        {/* Par organisme */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Analyses par organisme</CardTitle>
          </CardHeader>
          <CardContent>
            {par_organisme.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={par_organisme} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="organisme" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="controles" fill="#3b82f6" name="Contrôles" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="non_conformites" fill="#ef4444" name="Non-conformités" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">Pas de données</div>
            )}
          </CardContent>
        </Card>

        {/* Par catégorie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conformité par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            {par_categorie.length > 0 ? (
              <div className="space-y-3">
                {par_categorie.map((cat, i) => {
                  const total = cat.conformes + cat.non_conformes + cat.avec_reserves;
                  const tauxConf = total > 0 ? Math.round(cat.conformes / total * 100) : 0;
                  return (
                    <div key={cat.categorie} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{cat.categorie}</span>
                        <span className={tauxConf >= 80 ? 'text-emerald-600' : tauxConf >= 50 ? 'text-amber-600' : 'text-red-600'}>
                          {tauxConf}% conforme
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${tauxConf >= 80 ? 'bg-emerald-500' : tauxConf >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${tauxConf}%` }}
                        />
                      </div>
                      <div className="flex gap-2 text-xs text-gray-500">
                        <span>{cat.conformes} C</span>
                        <span>{cat.non_conformes} NC</span>
                        <span>{cat.avec_reserves} AR</span>
                        <span className="ml-auto">{cat.analyses} analyse(s)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">Pas de données</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tendances de dégradation (Phase 4) */}
      {tendances_degradation?.length > 0 && (
        <Card className="border-red-200" data-testid="degradation-trends">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" /> Tendances de dégradation détectées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tendances_degradation.map((t, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${getSeverityColor(t.severity)}`}>
                  {getSeverityIcon(t.severity)}
                  <div className="flex-1">
                    <span className="font-medium text-sm">{t.message}</span>
                    <p className="text-xs mt-0.5 opacity-80">{t.details}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{t.severity}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SurveillanceAIDashboard;
