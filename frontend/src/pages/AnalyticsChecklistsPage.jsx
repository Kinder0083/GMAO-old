/**
 * Page Analytics Checklists
 * Dashboard d'analyse des résultats des contrôles préventifs
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  ClipboardList,
  AlertTriangle,
  Users,
  Wrench,
  RefreshCw,
  Loader2,
  Calendar,
  BarChart3,
  FileDown
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Composant carte statistique
const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
            {trend !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(trend)}% vs période préc.
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AnalyticsChecklistsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30'); // jours
  const [periodType, setPeriodType] = useState('weekly');
  
  // Données
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [nonConformities, setNonConformities] = useState({ total: 0, items: [] });
  const [equipmentStats, setEquipmentStats] = useState([]);
  const [technicianStats, setTechnicianStats] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString();
    
    try {
      // Fetch all data in parallel
      const [summaryRes, trendsRes, nonConfRes, equipRes, techRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/checklists/stats/summary?start_date=${startDate}&end_date=${endDate}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/analytics/checklists/stats/trends?period_type=${periodType}&periods_count=12`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/analytics/checklists/stats/non-conformities?start_date=${startDate}&end_date=${endDate}&limit=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/analytics/checklists/stats/by-equipment?start_date=${startDate}&end_date=${endDate}&limit=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/analytics/checklists/stats/by-technician?start_date=${startDate}&end_date=${endDate}&limit=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
      
      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setTrends(data);
      }
      
      if (nonConfRes.ok) {
        const data = await nonConfRes.json();
        setNonConformities({ total: data.total_non_conformities, items: data.items });
      }
      
      if (equipRes.ok) {
        const data = await equipRes.json();
        setEquipmentStats(data);
      }
      
      if (techRes.ok) {
        const data = await techRes.json();
        setTechnicianStats(data);
      }

    } catch (error) {
      console.error('Erreur chargement analytics:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données analytiques',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [period, periodType, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Couleurs pour les graphiques
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const getConformityColor = (rate) => {
    if (rate >= 90) return '#10b981';
    if (rate >= 75) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analytics-checklists-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7" />
            Analytics Checklists
          </h1>
          <p className="text-gray-500 mt-1">
            Analyse des résultats des contrôles préventifs
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]" data-testid="period-select">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
              <SelectItem value="365">12 derniers mois</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Par semaine</SelectItem>
              <SelectItem value="monthly">Par mois</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={fetchData} data-testid="refresh-btn">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Taux de conformité"
          value={`${summary?.conformity_rate || 0}%`}
          subtitle="Global sur la période"
          icon={CheckCircle}
          color={summary?.conformity_rate >= 90 ? 'green' : summary?.conformity_rate >= 75 ? 'amber' : 'red'}
        />
        <StatCard
          title="Exécutions"
          value={summary?.total_executions || 0}
          subtitle={`${summary?.total_items_checked || 0} items vérifiés`}
          icon={ClipboardList}
          color="blue"
        />
        <StatCard
          title="Non-conformités"
          value={summary?.non_conformity_count || 0}
          subtitle="Items à corriger"
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Temps moyen"
          value={`${summary?.average_execution_time_minutes || 0} min`}
          subtitle="Par checklist"
          icon={Clock}
          color="purple"
        />
      </div>

      {/* Graphiques ligne 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution du taux de conformité */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Évolution du taux de conformité
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Conformité']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="conformity_rate" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Non-conformités */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Top des non-conformités
              <Badge variant="outline" className="ml-auto">
                {nonConformities.total} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nonConformities.items.length > 0 ? (
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                {nonConformities.items.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.item_name}</p>
                      <p className="text-xs text-gray-500 truncate">{item.checklist_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-red-600">{item.occurrence_count}x</p>
                      <p className="text-xs text-gray-400">{item.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-gray-400">
                <CheckCircle className="w-12 h-12 text-green-400 mb-2" />
                <p>Aucune non-conformité</p>
                <p className="text-sm">Excellent travail !</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Graphiques ligne 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Par équipement */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-600" />
              Par équipement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {equipmentStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={equipmentStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="equipment_name" 
                    width={120}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'conformity_rate') return [`${value}%`, 'Conformité'];
                      return [value, name];
                    }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar 
                    dataKey="conformity_rate" 
                    radius={[0, 4, 4, 0]}
                  >
                    {equipmentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getConformityColor(entry.conformity_rate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Par technicien */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Par technicien
            </CardTitle>
          </CardHeader>
          <CardContent>
            {technicianStats.length > 0 ? (
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                {technicianStats.map((tech, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                          {tech.technician_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{tech.technician_name}</span>
                      </div>
                      <Badge variant="outline">{tech.total_executions} exéc.</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <CheckCircle className={`w-4 h-4 ${tech.conformity_rate >= 90 ? 'text-green-500' : tech.conformity_rate >= 75 ? 'text-amber-500' : 'text-red-500'}`} />
                        <span className="font-medium">{tech.conformity_rate}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{tech.average_time_minutes} min/moy.</span>
                      </div>
                    </div>
                    {/* Barre de progression */}
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${tech.conformity_rate}%`,
                          backgroundColor: getConformityColor(tech.conformity_rate)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsChecklistsPage;
