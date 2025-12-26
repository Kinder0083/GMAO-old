import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  ClipboardList,
  Wrench,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Activity,
  Package,
  Calendar,
  BarChart3,
  Users,
  Zap
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { usePreferences } from '../contexts/PreferencesContext';
import { useDashboard } from '../hooks/useDashboard';

const Dashboard = () => {
  const { canView } = usePermissions();
  const { preferences } = usePreferences();

  // Utiliser le hook temps réel pour le dashboard
  const { 
    workOrders, 
    equipments, 
    analytics, 
    loading 
  } = useDashboard();

  // Déterminer quels widgets afficher
  const enabledWidgets = preferences?.dashboard_widgets || [
    'work_orders_active',
    'equipment_maintenance',
    'overdue_tasks',
    'low_stock',
    'recent_incidents',
    'maintenance_stats',
    'upcoming_maintenance',
    'quick_actions'
  ];

  // Fonction helper pour vérifier si un widget est activé
  const isWidgetEnabled = (widgetId) => enabledWidgets.includes(widgetId);

  // Calculer les stats dynamiquement selon les widgets activés
  const stats = React.useMemo(() => {
    const allStats = [];
    
    // Widget: Ordres de travail actifs
    if (isWidgetEnabled('work_orders_active') && workOrders) {
      allStats.push({
        id: 'work_orders_active',
        title: 'Ordres de travail actifs',
        value: workOrders.filter(wo => wo.statut !== 'TERMINE').length,
        icon: ClipboardList,
        color: 'bg-blue-500',
        change: '+12%'
      });
    }
    
    // Widget: Équipements en maintenance
    if (isWidgetEnabled('equipment_maintenance') && equipments) {
      allStats.push({
        id: 'equipment_maintenance',
        title: 'Équipements en maintenance',
        value: equipments.filter(e => e.statut === 'EN_MAINTENANCE').length,
        icon: Wrench,
        color: 'bg-orange-500',
        change: '+5%'
      });
    }
    
    // Widget: Tâches en retard
    if (isWidgetEnabled('overdue_tasks') && workOrders) {
      const overdueTasks = workOrders.filter(wo => {
        if (!wo.dateEcheance || wo.statut === 'TERMINE') return false;
        const echeance = new Date(wo.dateEcheance);
        return echeance < new Date();
      }).length;
      
      allStats.push({
        id: 'overdue_tasks',
        title: 'Tâches en retard',
        value: overdueTasks,
        icon: Clock,
        color: 'bg-red-500',
        change: overdueTasks > 0 ? '+3%' : '0%'
      });
    }
    
    // Widget: Stock bas (simulé pour l'instant)
    if (isWidgetEnabled('low_stock')) {
      allStats.push({
        id: 'low_stock',
        title: 'Articles en rupture',
        value: 2, // Valeur simulée - pourrait être récupérée via API
        icon: Package,
        color: 'bg-orange-600',
        change: '-1 article'
      });
    }
    
    // Widget: Incidents récents (simulé)
    if (isWidgetEnabled('recent_incidents')) {
      allStats.push({
        id: 'recent_incidents',
        title: 'Incidents récents',
        value: 3, // Valeur simulée
        icon: AlertCircle,
        color: 'bg-yellow-500',
        change: '+2 cette semaine'
      });
    }
    
    // Widget: Statistiques de maintenance
    if (isWidgetEnabled('maintenance_stats') && analytics) {
      allStats.push({
        id: 'maintenance_stats',
        title: 'Taux de réalisation',
        value: `${analytics.tauxRealisation}%`,
        icon: BarChart3,
        color: 'bg-green-500',
        change: '+8%'
      });
    }
    
    // Widget: Maintenances à venir (simulé)
    if (isWidgetEnabled('upcoming_maintenance')) {
      allStats.push({
        id: 'upcoming_maintenance',
        title: 'Maintenances à venir',
        value: 5, // Valeur simulée
        icon: Calendar,
        color: 'bg-purple-500',
        change: '7 jours'
      });
    }
    
    // Widget: Métriques de performance
    if (isWidgetEnabled('performance_metrics') && analytics) {
      allStats.push({
        id: 'performance_metrics',
        title: 'Temps de réponse moyen',
        value: `${analytics.tempsReponse?.moyen || 0}h`,
        icon: TrendingUp,
        color: 'bg-indigo-500',
        change: '-15%'
      });
    }
    
    // Widget: Activité d'équipe (simulé)
    if (isWidgetEnabled('team_activity')) {
      allStats.push({
        id: 'team_activity',
        title: 'Techniciens actifs',
        value: 8, // Valeur simulée
        icon: Users,
        color: 'bg-cyan-500',
        change: '12 tâches'
      });
    }
    
    return allStats;
  }, [analytics, workOrders, equipments, enabledWidgets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  const recentWorkOrders = workOrders.slice(0, 5);

  const getStatusBadge = (statut) => {
    const badges = {
      'OUVERT': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Ouvert' },
      'EN_COURS': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En cours' },
      'EN_ATTENTE': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En attente' },
      'TERMINE': { bg: 'bg-green-100', text: 'text-green-700', label: 'Terminé' }
    };
    const badge = badges[statut] || badges['OUVERT'];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priorite) => {
    const badges = {
      'HAUTE': { bg: 'bg-red-100', text: 'text-red-700', label: 'Haute' },
      'MOYENNE': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Moyenne' },
      'BASSE': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Basse' },
      'AUCUNE': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Normale' }
    };
    const badge = badges[priorite] || badges['AUCUNE'];
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble de votre système de maintenance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    <p className="text-xs text-green-600 mt-2 font-medium">{stat.change} ce mois</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-xl`}>
                    <Icon size={24} className="text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row - Only show if analytics available */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Work Orders by Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="text-blue-600" size={20} />
                Ordres de travail par statut
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics.workOrdersParStatut).map(([statut, count]) => {
                const total = Object.values(analytics.workOrdersParStatut).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
                const labels = {
                  'OUVERT': 'Ouvert',
                  'EN_COURS': 'En cours',
                  'EN_ATTENTE': 'En attente',
                  'TERMINE': 'Terminé'
                };
                const colors = {
                  'OUVERT': 'bg-gray-500',
                  'EN_COURS': 'bg-blue-500',
                  'EN_ATTENTE': 'bg-yellow-500',
                  'TERMINE': 'bg-green-500'
                };
                return (
                  <div key={statut}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{labels[statut]}</span>
                      <span className="text-gray-600">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`${colors[statut]} h-2.5 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Equipment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="text-orange-600" size={20} />
              État des équipements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="text-green-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Opérationnel</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.equipementsParStatut.OPERATIONNEL || 0}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="text-orange-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">En maintenance</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.equipementsParStatut.EN_MAINTENANCE || 0}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="text-red-600" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Hors service</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.equipementsParStatut.HORS_SERVICE || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Recent Work Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Ordres de travail récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Titre</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Statut</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Priorité</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Assigné à</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Emplacement</th>
                </tr>
              </thead>
              <tbody>
                {recentWorkOrders.map((wo) => (
                  <tr key={wo.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-900 font-medium">#{wo.numero}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{wo.titre}</td>
                    <td className="py-3 px-4">{getStatusBadge(wo.statut)}</td>
                    <td className="py-3 px-4">{getPriorityBadge(wo.priorite)}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {wo.assigneA ? `${wo.assigneA.prenom} ${wo.assigneA.nom}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {wo.emplacement ? wo.emplacement.nom : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;