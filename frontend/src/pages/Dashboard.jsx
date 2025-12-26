import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  ClipboardList,
  Wrench,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { usePreferences } from '../contexts/PreferencesContext';

const Dashboard = () => {
  const { preferences } = usePreferences();

  // Utiliser le hook temps réel pour le dashboard
  const { 
    workOrders, 
    equipments, 
    loading,
    canView
  } = useDashboard();

  // Déterminer quels widgets afficher - mémorisé pour éviter les re-renders
  const enabledWidgets = useMemo(() => preferences?.dashboard_widgets || [
    'work_orders_active',
    'equipment_maintenance',
    'overdue_tasks',
    'low_stock',
    'recent_incidents',
    'maintenance_stats',
    'upcoming_maintenance',
    'quick_actions'
  ], [preferences?.dashboard_widgets]);

  // Calculer les stats dynamiquement selon les widgets activés
  const stats = useMemo(() => {
    // Initialiser workOrders et equipments avec des tableaux vides si undefined
    const safeWorkOrders = workOrders || [];
    const safeEquipments = equipments || [];
    
    const allStats = [];
    
    // Ordres de travail actifs
    if (enabledWidgets.includes('work_orders_active') && canView('workOrders')) {
      const activeOrders = safeWorkOrders.filter(wo => wo.statut !== 'TERMINE' && wo.statut !== 'ANNULE');
      allStats.push({
        title: 'Ordres Actifs',
        value: activeOrders.length,
        icon: ClipboardList,
        color: 'blue',
        trend: `${safeWorkOrders.filter(wo => wo.statut === 'EN_COURS').length} en cours`
      });
    }
    
    // Équipements en maintenance
    if (enabledWidgets.includes('equipment_maintenance') && canView('assets')) {
      const inMaintenance = safeEquipments.filter(eq => eq.statut === 'EN_PANNE' || eq.statut === 'EN_MAINTENANCE');
      allStats.push({
        title: 'Équipements en maintenance',
        value: inMaintenance.length,
        icon: Wrench,
        color: 'orange',
        trend: `${safeEquipments.filter(eq => eq.statut === 'OPERATIONNEL').length} opérationnels`
      });
    }
    
    // Tâches en retard
    if (enabledWidgets.includes('overdue_tasks') && canView('workOrders')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdue = safeWorkOrders.filter(wo => {
        if (wo.statut === 'TERMINE' || wo.statut === 'ANNULE') return false;
        if (!wo.dateLimite) return false;
        const dueDate = new Date(wo.dateLimite);
        return dueDate < today;
      });
      allStats.push({
        title: 'En retard',
        value: overdue.length,
        icon: AlertCircle,
        color: 'red',
        trend: overdue.length > 0 ? 'À traiter en priorité' : 'Tout est à jour'
      });
    }
    
    // Terminés ce mois
    if (enabledWidgets.includes('maintenance_stats') && canView('workOrders')) {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const completedThisMonth = safeWorkOrders.filter(wo => {
        if (wo.statut !== 'TERMINE') return false;
        const completedDate = new Date(wo.dateModification || wo.dateCreation);
        return completedDate >= thisMonth;
      });
      allStats.push({
        title: 'Terminés ce mois',
        value: completedThisMonth.length,
        icon: CheckCircle2,
        color: 'green',
        trend: 'Ce mois-ci'
      });
    }
    
    return allStats;
  }, [workOrders, equipments, canView, enabledWidgets]);

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600 mt-1">Vue d&apos;ensemble de vos opérations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.trend}</p>
                </div>
                <div className={`p-3 rounded-full ${colorClasses[stat.color]}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ordres de travail récents */}
      {canView('workOrders') && enabledWidgets.includes('work_orders_active') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Ordres de travail récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!workOrders || workOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun ordre de travail</p>
            ) : (
              <div className="space-y-3">
                {workOrders.slice(0, 5).map((wo) => (
                  <div key={wo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{wo.titre}</p>
                      <p className="text-sm text-gray-500">#{wo.numero}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      wo.statut === 'TERMINE' ? 'bg-green-100 text-green-800' :
                      wo.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-800' :
                      wo.statut === 'EN_ATTENTE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {wo.statut?.replace('_', ' ') || 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* État des équipements */}
      {canView('assets') && enabledWidgets.includes('equipment_maintenance') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              État des équipements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!equipments || equipments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun équipement</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {equipments.filter(eq => eq.statut === 'OPERATIONNEL').length}
                  </p>
                  <p className="text-sm text-gray-600">Opérationnels</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    {equipments.filter(eq => eq.statut === 'EN_MAINTENANCE').length}
                  </p>
                  <p className="text-sm text-gray-600">En maintenance</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {equipments.filter(eq => eq.statut === 'EN_PANNE').length}
                  </p>
                  <p className="text-sm text-gray-600">En panne</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">
                    {equipments.filter(eq => eq.statut === 'HORS_SERVICE').length}
                  </p>
                  <p className="text-sm text-gray-600">Hors service</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
