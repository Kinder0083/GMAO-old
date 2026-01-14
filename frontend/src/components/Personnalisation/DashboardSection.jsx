import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/use-toast';
import {
  ClipboardList,
  Wrench,
  Clock,
  Package,
  AlertTriangle,
  BarChart3,
  Calendar,
  TrendingUp,
  Users,
  Zap,
  CalendarClock,
  FileText,
  History,
  Bell,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const AVAILABLE_WIDGETS = [
  // Widgets principaux du dashboard
  { id: 'work_orders_active', name: 'Ordres de travail actifs', icon: ClipboardList, description: 'Nombre d\'ordres en cours', enabled: true, category: 'principal' },
  { id: 'equipment_maintenance', name: 'Équipements en maintenance', icon: Wrench, description: 'Équipements actuellement en maintenance', enabled: true, category: 'principal' },
  { id: 'overdue_tasks', name: 'Tâches en retard', icon: Clock, description: 'Tâches dépassant l\'échéance', enabled: true, category: 'principal' },
  { id: 'low_stock', name: 'Stock bas', icon: Package, description: 'Articles d\'inventaire en rupture', enabled: true, category: 'principal' },
  { id: 'recent_incidents', name: 'Incidents récents', icon: AlertTriangle, description: 'Incidents signalés récemment', enabled: true, category: 'principal' },
  { id: 'maintenance_stats', name: 'Statistiques de maintenance', icon: BarChart3, description: 'Graphiques et métriques', enabled: true, category: 'principal' },
  { id: 'upcoming_maintenance', name: 'Maintenances à venir', icon: Calendar, description: 'Planifications préventives', enabled: true, category: 'principal' },
  { id: 'performance_metrics', name: 'Métriques de performance', icon: TrendingUp, description: 'KPIs et indicateurs', enabled: false, category: 'principal' },
  { id: 'team_activity', name: 'Activité d\'équipe', icon: Users, description: 'Tâches par technicien', enabled: false, category: 'principal' },
  { id: 'quick_actions', name: 'Actions rapides', icon: Zap, description: 'Raccourcis vers actions courantes', enabled: true, category: 'principal' },
  
  // Nouveaux widgets - Demandes d'arrêt et Reports
  { id: 'demandes_arret_pending', name: 'Demandes d\'arrêt en attente', icon: Bell, description: 'Nombre de demandes en attente de validation', enabled: true, category: 'demandes' },
  { id: 'demandes_arret_stats', name: 'Statistiques des demandes', icon: FileText, description: 'Vue d\'ensemble des demandes d\'arrêt', enabled: true, category: 'demandes' },
  { id: 'reports_pending', name: 'Reports en attente', icon: CalendarClock, description: 'Demandes de report en attente', enabled: true, category: 'demandes' },
  { id: 'reports_stats', name: 'Statistiques des reports', icon: History, description: 'Métriques sur les reports de maintenance', enabled: false, category: 'demandes' },
  
  // Nouveaux widgets - Planning et Équipements
  { id: 'planning_mprev_summary', name: 'Résumé Planning M.Prev', icon: Calendar, description: 'Vue résumée du planning de maintenance préventive', enabled: true, category: 'planning' },
  { id: 'equipment_status_overview', name: 'Vue d\'ensemble statuts équipements', icon: Wrench, description: 'Répartition des statuts des équipements', enabled: true, category: 'planning' },
  { id: 'equipment_alerts', name: 'Alertes équipements', icon: AlertCircle, description: 'Équipements en alerte (sous-équipement hors service)', enabled: true, category: 'planning' },
  { id: 'recent_status_changes', name: 'Changements de statut récents', icon: History, description: 'Historique des derniers changements de statut', enabled: false, category: 'planning' },
  
  // Widget résumé global
  { id: 'global_summary', name: 'Résumé global', icon: CheckCircle2, description: 'Vue d\'ensemble de l\'état du système', enabled: true, category: 'global' }
];

const DashboardSection = () => {
  const { preferences, updatePreferences } = usePreferences();
  const { toast } = useToast();
  const [widgets, setWidgets] = useState(preferences?.dashboard_widgets || []);

  useEffect(() => {
    if (preferences?.dashboard_widgets) {
      setWidgets(preferences.dashboard_widgets);
    } else {
      // Widgets activés par défaut
      const defaultWidgets = AVAILABLE_WIDGETS.filter(w => w.enabled).map(w => w.id);
      setWidgets(defaultWidgets);
    }
  }, [preferences]);

  const isWidgetEnabled = (widgetId) => {
    return widgets.includes(widgetId);
  };

  const toggleWidget = async (widgetId) => {
    let updatedWidgets;
    if (isWidgetEnabled(widgetId)) {
      updatedWidgets = widgets.filter(id => id !== widgetId);
    } else {
      updatedWidgets = [...widgets, widgetId];
    }
    
    setWidgets(updatedWidgets);

    try {
      await updatePreferences({ dashboard_widgets: updatedWidgets });
      toast({ title: 'Succès', description: 'Widgets du dashboard mis à jour' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de mise à jour', variant: 'destructive' });
    }
  };

  const enableAll = async () => {
    const allWidgets = AVAILABLE_WIDGETS.map(w => w.id);
    setWidgets(allWidgets);
    try {
      await updatePreferences({ dashboard_widgets: allWidgets });
      toast({ title: 'Succès', description: 'Tous les widgets activés' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de mise à jour', variant: 'destructive' });
    }
  };

  const disableAll = async () => {
    setWidgets([]);
    try {
      await updatePreferences({ dashboard_widgets: [] });
      toast({ title: 'Succès', description: 'Tous les widgets désactivés' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de mise à jour', variant: 'destructive' });
    }
  };

  const resetToDefault = async () => {
    const defaultWidgets = AVAILABLE_WIDGETS.filter(w => w.enabled).map(w => w.id);
    setWidgets(defaultWidgets);
    try {
      await updatePreferences({ dashboard_widgets: defaultWidgets });
      toast({ title: 'Succès', description: 'Widgets par défaut restaurés' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de réinitialisation', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <Label className="text-base font-semibold">Widgets du tableau de bord</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={enableAll}>
                Tout activer
              </Button>
              <Button variant="outline" size="sm" onClick={disableAll}>
                Tout désactiver
              </Button>
              <Button variant="outline" size="sm" onClick={resetToDefault}>
                Par défaut
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Sélectionnez les widgets à afficher sur votre tableau de bord
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_WIDGETS.map((widget) => {
              const Icon = widget.icon;
              return (
                <div
                  key={widget.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                    isWidgetEnabled(widget.id)
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    isWidgetEnabled(widget.id) ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Icon size={24} className={isWidgetEnabled(widget.id) ? 'text-blue-600' : 'text-gray-600'} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{widget.name}</h4>
                    <p className="text-xs text-gray-500">{widget.description}</p>
                  </div>
                  <Switch
                    checked={isWidgetEnabled(widget.id)}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Astuce :</strong> Les widgets activés apparaîtront sur votre tableau de bord.
              L'ordre d'affichage et la disposition seront personnalisables prochainement.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardSection;