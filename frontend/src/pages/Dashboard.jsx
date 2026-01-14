import React, { useMemo, useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  ClipboardList,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Bell,
  CalendarClock,
  AlertTriangle,
  Pencil,
  GripVertical,
  Trash2
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { usePermissions } from '../hooks/usePermissions';
import { usePreferences } from '../contexts/PreferencesContext';
import { demandesArretAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import DashboardEditToolbar from '../components/Dashboard/DashboardEditToolbar';

const Dashboard = () => {
  const { canView } = usePermissions();
  const { preferences, updatePreferences } = usePreferences();
  const { toast } = useToast();
  
  // Mode édition
  const [isEditMode, setIsEditMode] = useState(false);
  const [layoutItems, setLayoutItems] = useState([]);
  const [originalLayout, setOriginalLayout] = useState([]);
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
        const demandes = await demandesArretAPI.getAll();
        const pendingDemandes = demandes.filter(d => d.statut === 'EN_ATTENTE').length;
        setDemandesStats({ pending: pendingDemandes, total: demandes.length });
        
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

  // Déterminer quels widgets afficher
  const enabledWidgets = useMemo(() => {
    if (preferences && preferences.dashboard_widgets !== undefined && preferences.dashboard_widgets !== null) {
      return preferences.dashboard_widgets;
    }
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

  // Initialiser le layout avec les éléments par défaut (widgets + éléments personnalisés)
  useEffect(() => {
    if (preferences?.dashboard_layout?.items) {
      setLayoutItems(preferences.dashboard_layout.items);
      setOriginalLayout(preferences.dashboard_layout.items);
    } else {
      // Layout par défaut : tous les widgets activés
      const defaultLayout = enabledWidgets.map((widgetId, index) => ({
        id: `widget-${widgetId}`,
        type: 'widget',
        widgetId: widgetId,
        order: index
      }));
      setLayoutItems(defaultLayout);
      setOriginalLayout(defaultLayout);
    }
  }, [preferences, enabledWidgets]);

  // Fonctions de gestion du mode édition
  const enterEditMode = () => {
    console.log('Entering edit mode');
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
    const newItem = {
      ...titleElement,
      order: layoutItems.length
    };
    setLayoutItems(prev => [...prev, newItem]);
    setHasChanges(true);
  };

  const handleAddSeparator = (separatorElement) => {
    const newItem = {
      ...separatorElement,
      order: layoutItems.length
    };
    setLayoutItems(prev => [...prev, newItem]);
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

  const handleSaveLayout = async () => {
    try {
      await updatePreferences({
        dashboard_layout: {
          items: layoutItems
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

  const handleResetLayout = () => {
    // Réinitialiser avec le layout par défaut
    const defaultLayout = enabledWidgets.map((widgetId, index) => ({
      id: `widget-${widgetId}`,
      type: 'widget',
      widgetId: widgetId,
      order: index
    }));
    setLayoutItems(defaultLayout);
    setHasChanges(true);
  };

  // Gestion du drag and drop
  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(layoutItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Mettre à jour l'ordre
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));
    
    setLayoutItems(updatedItems);
    setHasChanges(true);
  };

  // Calculer les stats dynamiquement selon les widgets activés
  const getStatConfig = (widgetId) => {
    const safeWorkOrders = workOrders || [];
    const safeEquipments = equipments || [];

    const configs = {
      'work_orders_active': () => {
        if (!canView('workOrders')) return null;
        const activeOrders = safeWorkOrders.filter(wo => wo.statut !== 'TERMINE' && wo.statut !== 'ANNULE');
        return {
          title: 'Ordres Actifs',
          value: activeOrders.length,
          icon: ClipboardList,
          color: 'blue',
          trend: `${safeWorkOrders.filter(wo => wo.statut === 'EN_COURS').length} en cours`
        };
      },
      'equipment_maintenance': () => {
        if (!canView('assets')) return null;
        const inMaintenance = safeEquipments.filter(eq => eq.statut === 'EN_PANNE' || eq.statut === 'EN_MAINTENANCE');
        return {
          title: 'Équipements en maintenance',
          value: inMaintenance.length,
          icon: Wrench,
          color: 'orange',
          trend: `${safeEquipments.filter(eq => eq.statut === 'OPERATIONNEL').length} opérationnels`
        };
      },
      'overdue_tasks': () => {
        if (!canView('workOrders')) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdue = safeWorkOrders.filter(wo => {
          if (wo.statut === 'TERMINE' || wo.statut === 'ANNULE') return false;
          if (!wo.dateLimite) return false;
          const dueDate = new Date(wo.dateLimite);
          return dueDate < today;
        });
        return {
          title: 'En retard',
          value: overdue.length,
          icon: AlertCircle,
          color: 'red',
          trend: overdue.length > 0 ? 'À traiter en priorité' : 'Tout est à jour'
        };
      },
      'maintenance_stats': () => {
        if (!canView('workOrders')) return null;
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const completedThisMonth = safeWorkOrders.filter(wo => {
          if (wo.statut !== 'TERMINE') return false;
          const completedDate = new Date(wo.dateModification || wo.dateCreation);
          return completedDate >= thisMonth;
        });
        return {
          title: 'Terminés ce mois',
          value: completedThisMonth.length,
          icon: CheckCircle2,
          color: 'green',
          trend: 'Ce mois-ci'
        };
      },
      'demandes_arret_pending': () => ({
        title: 'Demandes en attente',
        value: demandesStats.pending,
        icon: Bell,
        color: 'yellow',
        trend: `${demandesStats.total} demande(s) au total`
      }),
      'reports_pending': () => ({
        title: 'Reports en attente',
        value: reportsStats.pending,
        icon: CalendarClock,
        color: 'purple',
        trend: reportsStats.avgDays > 0 ? `Moy. ${reportsStats.avgDays} jours` : 'Aucun report'
      }),
      'equipment_alerts': () => {
        if (!canView('assets')) return null;
        const alertEquipments = safeEquipments.filter(eq => eq.statut === 'ALERTE_S_EQUIP');
        return {
          title: 'Alertes équipements',
          value: alertEquipments.length,
          icon: AlertTriangle,
          color: 'red',
          trend: alertEquipments.length > 0 ? 'Sous-équipement(s) HS' : 'Aucune alerte'
        };
      },
      'equipment_status_overview': () => {
        if (!canView('assets')) return null;
        const degradedEquipments = safeEquipments.filter(eq => eq.statut === 'DEGRADE');
        return {
          title: 'Équipements dégradés',
          value: degradedEquipments.length,
          icon: Wrench,
          color: 'blue',
          trend: `${safeEquipments.filter(eq => eq.statut === 'HORS_SERVICE').length} hors service`
        };
      }
    };

    return configs[widgetId] ? configs[widgetId]() : null;
  };

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  };

  // Rendu d'un élément du layout
  const renderLayoutItem = (item, provided, snapshot) => {
    const isDragging = snapshot?.isDragging;
    
    if (item.type === 'widget') {
      const stat = getStatConfig(item.widgetId);
      if (!stat) return null;
      
      return (
        <div
          ref={provided?.innerRef}
          {...provided?.draggableProps}
          className={`${isDragging ? 'opacity-75 shadow-lg' : ''}`}
        >
          <Card className={`relative group ${isEditMode ? 'border-2 border-dashed border-gray-300 hover:border-blue-400' : ''}`}>
            {isEditMode && (
              <>
                <div
                  {...provided?.dragHandleProps}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <div className="bg-white rounded shadow-md p-1.5 border">
                    <GripVertical className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute -top-2 -right-2 h-7 w-7 bg-white shadow-sm text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={() => handleDeleteElement(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
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
        </div>
      );
    }
    
    if (item.type === 'title') {
      const getAlignmentClass = () => {
        switch (item.alignment) {
          case 'center': return 'text-center';
          case 'right': return 'text-right';
          default: return 'text-left';
        }
      };
      
      return (
        <div
          ref={provided?.innerRef}
          {...provided?.draggableProps}
          className={`col-span-full relative group ${isEditMode ? 'border-2 border-dashed border-gray-300 rounded-lg p-2 hover:border-blue-400' : ''} ${isDragging ? 'opacity-75 shadow-lg' : ''}`}
        >
          {isEditMode && (
            <>
              <div
                {...provided?.dragHandleProps}
                className="absolute -left-3 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <div className="bg-white rounded shadow-md p-1.5 border">
                  <GripVertical className="h-4 w-4 text-gray-500" />
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="absolute -top-2 -right-2 h-7 w-7 bg-white shadow-sm text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={() => handleDeleteElement(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
          <h2 
            className={`${item.fontSize || 'text-xl'} font-semibold ${getAlignmentClass()} py-2`}
            style={{ color: item.color || '#1f2937' }}
          >
            {item.text}
          </h2>
        </div>
      );
    }
    
    if (item.type === 'separator') {
      return (
        <div
          ref={provided?.innerRef}
          {...provided?.draggableProps}
          className={`col-span-full relative group ${isEditMode ? 'py-4' : 'py-2'} ${isDragging ? 'opacity-75' : ''}`}
        >
          {isEditMode && (
            <>
              <div
                {...provided?.dragHandleProps}
                className="absolute -left-3 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <div className="bg-white rounded shadow-md p-1.5 border">
                  <GripVertical className="h-4 w-4 text-gray-500" />
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="absolute -top-2 -right-2 h-7 w-7 bg-white shadow-sm text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={() => handleDeleteElement(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
          <hr className={`border-gray-300 ${isEditMode ? 'border-dashed hover:border-blue-400 transition-colors' : ''}`} />
        </div>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filtrer les items pour ne garder que les widgets activés et les éléments personnalisés
  const visibleItems = layoutItems.filter(item => {
    if (item.type === 'widget') {
      return enabledWidgets.includes(item.widgetId);
    }
    return true; // Titres et séparateurs sont toujours visibles
  });

  // Si aucun widget actif
  const hasActiveWidgets = visibleItems.some(item => item.type === 'widget');

  return (
    <div className={`space-y-6 ${isEditMode ? 'pb-24' : ''}`}>
      {/* Header avec bouton édition */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-600 mt-1">Vue d&apos;ensemble de vos opérations</p>
        </div>
        {!isEditMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={enterEditMode}
            className="flex items-center gap-2"
            data-testid="edit-dashboard-btn"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        )}
      </div>

      {/* Message si aucun widget */}
      {!hasActiveWidgets && !isEditMode && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-2">Aucun widget activé sur le tableau de bord.</p>
            <p className="text-sm text-gray-400">
              Allez dans Personnalisations → Dashboard Personnalisé pour activer des widgets.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Zone de drag-and-drop */}
      {(hasActiveWidgets || isEditMode) && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="dashboard-items" direction="vertical">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {visibleItems.map((item, index) => (
                  <Draggable
                    key={item.id}
                    draggableId={item.id}
                    index={index}
                    isDragDisabled={!isEditMode}
                  >
                    {(provided, snapshot) => renderLayoutItem(item, provided, snapshot)}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Section Ordres de travail récents */}
      {canView('workOrders') && enabledWidgets.includes('work_orders_active') && (
        <Card className={isEditMode ? 'border-2 border-dashed border-gray-200' : ''}>
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

      {/* Section État des équipements */}
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

      {/* Barre d'outils d'édition */}
      {isEditMode && (
        <DashboardEditToolbar
          onAddTitle={handleAddTitle}
          onAddSeparator={handleAddSeparator}
          onSave={handleSaveLayout}
          onCancel={exitEditMode}
          onReset={handleResetLayout}
          hasChanges={hasChanges}
        />
      )}
    </div>
  );
};

export default Dashboard;
