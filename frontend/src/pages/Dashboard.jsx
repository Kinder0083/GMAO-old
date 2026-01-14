import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  ClipboardList,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Bell,
  CalendarClock,
  Calendar,
  History,
  AlertTriangle,
  Pencil
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { usePermissions } from '../hooks/usePermissions';
import { usePreferences } from '../contexts/PreferencesContext';
import { demandesArretAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import DashboardEditToolbar from '../components/Dashboard/DashboardEditToolbar';
import DashboardTitleElement from '../components/Dashboard/DashboardTitleElement';
import DashboardSeparator from '../components/Dashboard/DashboardSeparator';
import DashboardWidgetWrapper from '../components/Dashboard/DashboardWidgetWrapper';

const Dashboard = () => {
  const { canView } = usePermissions();
  const { preferences, updatePreferences } = usePreferences();
  const { toast } = useToast();
  
  // Mode édition
  const [isEditMode, setIsEditMode] = useState(false);
  const [layoutItems, setLayoutItems] = useState([]);
  const [originalLayout, setOriginalLayout] = useState([]);
  const [widgetSizes, setWidgetSizes] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // États pour les données des demandes d'arrêt et reports
  const [demandesStats, setDemandesStats] = useState({ pending: 0, total: 0 });
  const [reportsStats, setReportsStats] = useState({ pending: 0, total: 0, avgDays: 0 });

  // Utiliser le hook temps réel WebSocket pour le dashboard
  const { 
    workOrders, 
    equipments, 
    loading,
  } = useDashboard();

  // Charger les données des demandes d'arrêt et reports
  useEffect(() => {
    const loadDemandesData = async () => {
      try {
        // Charger les demandes d'arrêt
        const demandes = await demandesArretAPI.getAll();
        const pendingDemandes = demandes.filter(d => d.statut === 'EN_ATTENTE').length;
        const pendingReports = demandes.filter(d => d.statut === 'EN_ATTENTE_REPORT').length;
        setDemandesStats({ pending: pendingDemandes, total: demandes.length });
        
        // Charger l'historique des reports
        const reportsData = await demandesArretAPI.getReportsHistory();
        setReportsStats({
          pending: reportsData.statistiques?.reports_en_attente || 0,
          total: reportsData.statistiques?.total_reports || 0,
          avgDays: reportsData.statistiques?.duree_moyenne_report_jours || 0
        });
      } catch (error) {
        console.error('Erreur chargement données demandes:', error);
      }
    };
    
    loadDemandesData();
  }, []);

  // Charger le layout sauvegardé
  useEffect(() => {
    if (preferences?.dashboard_layout) {
      const layout = preferences.dashboard_layout;
      if (layout.items && Array.isArray(layout.items)) {
        setLayoutItems(layout.items);
        setOriginalLayout(layout.items);
      }
      if (layout.widgetSizes) {
        setWidgetSizes(layout.widgetSizes);
      }
    }
  }, [preferences]);

  // Déterminer quels widgets afficher - mémorisé pour éviter les re-renders
  // IMPORTANT: Si dashboard_widgets est défini (même vide), respecter le choix de l'utilisateur
  const enabledWidgets = useMemo(() => {
    // Si les préférences ont été chargées et dashboard_widgets existe, l'utiliser tel quel
    if (preferences && preferences.dashboard_widgets !== undefined && preferences.dashboard_widgets !== null) {
      return preferences.dashboard_widgets;
    }
    // Sinon (préférences non chargées ou widget non défini), utiliser la liste par défaut
    return [
      'work_orders_active',
      'equipment_maintenance',
      'overdue_tasks',
      'maintenance_stats',
      'demandes_arret_pending',
      'equipment_status_overview',
      'global_summary'
    ];
  }, [preferences]);

  // Fonctions de gestion du mode édition
  const enterEditMode = () => {
    setOriginalLayout([...layoutItems]);
    setIsEditMode(true);
    setHasChanges(false);
  };

  const exitEditMode = () => {
    setLayoutItems([...originalLayout]);
    setIsEditMode(false);
    setHasChanges(false);
  };

  const handleAddTitle = (titleElement) => {
    setLayoutItems(prev => [...prev, titleElement]);
    setHasChanges(true);
  };

  const handleAddSeparator = (separatorElement) => {
    setLayoutItems(prev => [...prev, separatorElement]);
    setHasChanges(true);
  };

  const handleUpdateElement = (elementId, updates) => {
    setLayoutItems(prev => prev.map(item => 
      item.id === elementId ? { ...item, ...updates } : item
    ));
    setHasChanges(true);
  };

  const handleDeleteElement = (elementId) => {
    setLayoutItems(prev => prev.filter(item => item.id !== elementId));
    setHasChanges(true);
  };

  const handleWidgetResize = (widgetId, newSize) => {
    setWidgetSizes(prev => ({ ...prev, [widgetId]: newSize }));
    setHasChanges(true);
  };

  const handleWidgetRemove = async (widgetId) => {
    // Retirer le widget de la liste des widgets activés
    const newWidgets = enabledWidgets.filter(w => w !== widgetId);
    try {
      await updatePreferences({ dashboard_widgets: newWidgets });
      toast({ title: 'Widget masqué', description: 'Vous pouvez le réactiver dans Personnalisations.' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de masquer le widget', variant: 'destructive' });
    }
  };

  const handleSaveLayout = async () => {
    try {
      await updatePreferences({
        dashboard_layout: {
          items: layoutItems,
          widgetSizes: widgetSizes
        }
      });
      setOriginalLayout([...layoutItems]);
      setIsEditMode(false);
      setHasChanges(false);
      toast({ title: 'Succès', description: 'Disposition du dashboard sauvegardée' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder la disposition', variant: 'destructive' });
    }
  };

  const handleResetLayout = async () => {
    setLayoutItems([]);
    setWidgetSizes({});
    setHasChanges(true);
  };

  // Drag and drop - déplacer un élément
  const moveItem = useCallback((dragIndex, hoverIndex) => {
    setLayoutItems(prev => {
      const items = [...prev];
      const [draggedItem] = items.splice(dragIndex, 1);
      items.splice(hoverIndex, 0, draggedItem);
      return items;
    });
    setHasChanges(true);
  }, []);

  // Calculer les stats dynamiquement selon les widgets activés
  const stats = useMemo(() => {
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
    
    // Demandes d'arrêt en attente
    if (enabledWidgets.includes('demandes_arret_pending')) {
      allStats.push({
        title: 'Demandes en attente',
        value: demandesStats.pending,
        icon: Bell,
        color: 'yellow',
        trend: `${demandesStats.total} demande(s) au total`
      });
    }
    
    // Reports en attente
    if (enabledWidgets.includes('reports_pending')) {
      allStats.push({
        title: 'Reports en attente',
        value: reportsStats.pending,
        icon: CalendarClock,
        color: 'purple',
        trend: reportsStats.avgDays > 0 ? `Moy. ${reportsStats.avgDays} jours` : 'Aucun report'
      });
    }
    
    // Alertes équipements (sous-équipement hors service)
    if (enabledWidgets.includes('equipment_alerts') && canView('assets')) {
      const alertEquipments = safeEquipments.filter(eq => eq.statut === 'ALERTE_S_EQUIP');
      allStats.push({
        title: 'Alertes équipements',
        value: alertEquipments.length,
        icon: AlertTriangle,
        color: 'red',
        trend: alertEquipments.length > 0 ? 'Sous-équipement(s) HS' : 'Aucune alerte'
      });
    }
    
    // Équipements dégradés
    if (enabledWidgets.includes('equipment_status_overview') && canView('assets')) {
      const degradedEquipments = safeEquipments.filter(eq => eq.statut === 'DEGRADE');
      allStats.push({
        title: 'Équipements dégradés',
        value: degradedEquipments.length,
        icon: Wrench,
        color: 'blue',
        trend: `${safeEquipments.filter(eq => eq.statut === 'HORS_SERVICE').length} hors service`
      });
    }
    
    return allStats;
  }, [workOrders, equipments, canView, enabledWidgets, demandesStats, reportsStats]);

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
      {stats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-2">Aucun widget activé sur le tableau de bord.</p>
            <p className="text-sm text-gray-400">
              Allez dans Personnalisations → Dashboard Personnalisé pour activer des widgets.
            </p>
          </CardContent>
        </Card>
      ) : (
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
      )}

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
