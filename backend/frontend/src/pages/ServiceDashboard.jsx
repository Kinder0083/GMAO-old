import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import {
  Plus, Settings, RefreshCw, MoreVertical, Edit, Trash2, Share2,
  BarChart2, PieChart, TrendingUp, Gauge, Table2, Hash, Clock,
  AlertCircle, Loader2, Eye, EyeOff, LayoutTemplate, CheckCircle,
  Wrench, Package, Calendar, MessageSquare, ShoppingCart, Activity, Euro,
  Users
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Label } from '../components/ui/label';
import api from '../services/api';

// Composants de visualisation
import { 
  ResponsiveContainer, 
  LineChart, Line, 
  BarChart, Bar, 
  PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

// Couleurs pour les graphiques
const CHART_COLORS = {
  blue: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  green: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0'],
  red: ['#ef4444', '#f87171', '#fca5a5', '#fecaca'],
  purple: ['#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'],
  orange: ['#f97316', '#fb923c', '#fdba74', '#fed7aa'],
  cyan: ['#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc'],
  pink: ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8'],
  yellow: ['#eab308', '#facc15', '#fde047', '#fef08a'],
  indigo: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'],
  teal: ['#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'],
};

const ServiceDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Templates
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [availableSensors, setAvailableSensors] = useState([]);
  const [availableMeters, setAvailableMeters] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    loadWidgets();
    loadTemplates();
  }, []);

  // Charger les templates
  const loadTemplates = async () => {
    try {
      const response = await api.get('/custom-widgets/tpl/list');
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
    }
  };

  // Charger les capteurs et compteurs pour les templates qui en ont besoin
  const loadSensorsAndMeters = async () => {
    try {
      const [sensorsRes, metersRes] = await Promise.all([
        api.get('/custom-widgets/data-sources/sensors'),
        api.get('/custom-widgets/data-sources/meters')
      ]);
      setAvailableSensors(sensorsRes.data || []);
      setAvailableMeters(metersRes.data || []);
    } catch (error) {
      console.error('Erreur chargement sources:', error);
    }
  };

  // Ouvrir le modal template
  const openTemplateModal = async () => {
    await loadSensorsAndMeters();
    setSelectedTemplate(null);
    setSelectedSensorId('');
    setSelectedMeterId('');
    setShowTemplateModal(true);
  };

  // Créer un widget à partir d'un template
  const createFromTemplate = async () => {
    if (!selectedTemplate) return;
    
    // Vérifier si le template nécessite une sélection
    if (selectedTemplate.requires_selection === 'sensor' && !selectedSensorId) {
      toast({
        title: 'Sélection requise',
        description: 'Veuillez sélectionner un capteur',
        variant: 'destructive'
      });
      return;
    }
    if (selectedTemplate.requires_selection === 'meter' && !selectedMeterId) {
      toast({
        title: 'Sélection requise',
        description: 'Veuillez sélectionner un compteur',
        variant: 'destructive'
      });
      return;
    }

    setCreatingFromTemplate(true);
    try {
      const params = new URLSearchParams();
      if (selectedSensorId) params.append('sensor_id', selectedSensorId);
      if (selectedMeterId) params.append('meter_id', selectedMeterId);
      
      await api.post(`/custom-widgets/tpl/${selectedTemplate.id}/create?${params.toString()}`);
      
      toast({
        title: 'Widget créé',
        description: `Le widget "${selectedTemplate.name}" a été créé avec succès`
      });
      
      setShowTemplateModal(false);
      loadWidgets();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le widget',
        variant: 'destructive'
      });
    } finally {
      setCreatingFromTemplate(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadWidgets(true);
    }, 60000); // Refresh toutes les minutes
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadWidgets = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get('/custom-widgets');
      setWidgets(response.data);
    } catch (error) {
      if (!silent) {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les widgets',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshWidget = async (widgetId) => {
    try {
      setRefreshing(true);
      await api.post(`/custom-widgets/${widgetId}/refresh`);
      await loadWidgets(true);
      toast({ title: 'Widget rafraîchi' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de rafraîchir le widget',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const deleteWidget = async (widgetId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce widget ?')) return;
    
    try {
      await api.delete(`/custom-widgets/${widgetId}`);
      setWidgets(prev => prev.filter(w => w.id !== widgetId));
      toast({ title: 'Widget supprimé' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le widget',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Responsable de Service</h1>
          <p className="text-gray-500">
            {user?.service ? `Service: ${user.service}` : 'Votre tableau de bord personnalisé'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            onClick={() => loadWidgets()}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
          <Button variant="outline" onClick={() => navigate('/service-dashboard/team')} data-testid="view-team-button">
            <Users className="h-4 w-4 mr-2" />
            Mon équipe
          </Button>
          <Button variant="outline" onClick={openTemplateModal} data-testid="use-template-button">
            <LayoutTemplate className="h-4 w-4 mr-2" />
            Utiliser un template
          </Button>
          <Button onClick={() => navigate('/service-dashboard/widgets/new')} data-testid="create-widget-button">
            <Plus className="h-4 w-4 mr-2" />
            Créer un widget
          </Button>
        </div>
      </div>

      {/* Grille de widgets */}
      {widgets.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <BarChart2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Aucun widget</h2>
            <p className="text-gray-500 mb-6">
              Créez votre premier widget personnalisé pour afficher des KPIs,
              des graphiques ou des données de votre service.
            </p>
            <Button onClick={() => navigate('/service-dashboard/widgets/new')} data-testid="create-first-widget-button">
              <Plus className="h-4 w-4 mr-2" />
              Créer mon premier widget
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {widgets.map(widget => (
            <WidgetCard
              key={widget.id}
              widget={widget}
              onRefresh={() => refreshWidget(widget.id)}
              onEdit={() => navigate(`/service-dashboard/widgets/${widget.id}/edit`)}
              onDelete={() => deleteWidget(widget.id)}
              isOwner={widget.created_by === user?.id}
            />
          ))}
        </div>
      )}

      {/* Modal Templates */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5" />
              Créer un widget à partir d'un template
            </DialogTitle>
            <DialogDescription>
              Sélectionnez un template pour créer rapidement un widget prêt à l'emploi
            </DialogDescription>
          </DialogHeader>

          {/* Liste des templates par catégorie */}
          <div className="space-y-6 mt-4">
            {Object.entries(
              templates.reduce((acc, t) => {
                if (!acc[t.category]) acc[t.category] = [];
                acc[t.category].push(t);
                return acc;
              }, {})
            ).map(([category, categoryTemplates]) => (
              <div key={category}>
                <h3 className="font-semibold text-sm text-gray-500 mb-3">{category}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categoryTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-4 border rounded-lg text-left transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm">{template.name}</span>
                        <span className="text-lg font-bold text-blue-600">{template.preview_value}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
                      {template.requires_selection && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          Sélection requise
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sélection supplémentaire si nécessaire */}
          {selectedTemplate?.requires_selection === 'sensor' && (
            <div className="mt-6 p-4 border rounded-lg bg-cyan-50 border-cyan-200">
              <Label className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-cyan-600" />
                Sélectionner un capteur MQTT
              </Label>
              {availableSensors.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Aucun capteur disponible. Configurez d'abord vos capteurs MQTT.
                </p>
              ) : (
                <Select value={selectedSensorId} onValueChange={setSelectedSensorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un capteur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSensors.map(sensor => (
                      <SelectItem key={sensor.id} value={sensor.id}>
                        {sensor.name} ({sensor.type} - {sensor.location || 'Sans emplacement'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {selectedTemplate?.requires_selection === 'meter' && (
            <div className="mt-6 p-4 border rounded-lg bg-teal-50 border-teal-200">
              <Label className="flex items-center gap-2 mb-3">
                <Gauge className="h-4 w-4 text-teal-600" />
                Sélectionner un compteur
              </Label>
              {availableMeters.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Aucun compteur disponible. Configurez d'abord vos compteurs.
                </p>
              ) : (
                <Select value={selectedMeterId} onValueChange={setSelectedMeterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un compteur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMeters.map(meter => (
                      <SelectItem key={meter.id} value={meter.id}>
                        {meter.name} ({meter.type} - {meter.unit || 'Sans unité'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Bouton de création */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
              Annuler
            </Button>
            <Button 
              onClick={createFromTemplate} 
              disabled={!selectedTemplate || creatingFromTemplate}
            >
              {creatingFromTemplate ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Créer le widget
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Composant Widget Card
const WidgetCard = ({ widget, onRefresh, onEdit, onDelete, isOwner }) => {
  const visualization = widget.visualization || {};
  const colorScheme = visualization.color_scheme || 'blue';
  const colors = CHART_COLORS[colorScheme] || CHART_COLORS.blue;
  
  // Trouver la source principale
  const primarySource = widget.data_sources?.find(s => s.id === widget.primary_source_id);
  const value = primarySource?.cached_value;

  // Déterminer la taille de la carte
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-2 lg:col-span-3',
    full: 'col-span-1 md:col-span-2 lg:col-span-4',
  };

  const getWidgetIcon = () => {
    const icons = {
      value: Hash,
      gauge: Gauge,
      line_chart: TrendingUp,
      bar_chart: BarChart2,
      pie_chart: PieChart,
      donut: PieChart,
      table: Table2,
    };
    const Icon = icons[visualization.type] || Hash;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Card className={`${sizeClasses[visualization.size] || 'col-span-1'} relative group`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded bg-${colorScheme}-100`}>
              {getWidgetIcon()}
            </div>
            <CardTitle className="text-sm font-medium">
              {visualization.title || widget.name}
            </CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Rafraîchir
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {visualization.subtitle && (
          <p className="text-xs text-gray-500">{visualization.subtitle}</p>
        )}
      </CardHeader>
      <CardContent>
        <WidgetVisualization
          type={visualization.type}
          value={value}
          visualization={visualization}
          colors={colors}
          sources={widget.data_sources}
        />
        
        {/* Indicateurs de statut */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {widget.last_refresh ? (
              <span>Mis à jour {new Date(widget.last_refresh).toLocaleTimeString('fr-FR')}</span>
            ) : (
              <span>Non rafraîchi</span>
            )}
          </div>
          {widget.is_shared && (
            <Badge variant="secondary" className="text-xs">
              <Share2 className="h-3 w-3 mr-1" />
              Partagé
            </Badge>
          )}
        </div>
        
        {widget.refresh_error && (
          <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
            <AlertCircle className="h-3 w-3" />
            <span className="truncate">{widget.refresh_error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Composant de visualisation
const WidgetVisualization = ({ type, value, visualization, colors, sources }) => {
  const formatValue = (val) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') {
      const formatted = val.toFixed(visualization.decimal_places || 0);
      return `${visualization.prefix || ''}${formatted}${visualization.suffix || visualization.unit || ''}`;
    }
    return String(val);
  };

  switch (type) {
    case 'value':
      return (
        <div className="text-center py-4">
          <div className="text-4xl font-bold" style={{ color: colors[0] }}>
            {formatValue(value)}
          </div>
        </div>
      );

    case 'gauge':
      const percentage = typeof value === 'number' 
        ? Math.min(100, Math.max(0, ((value - (visualization.min_value || 0)) / ((visualization.max_value || 100) - (visualization.min_value || 0))) * 100))
        : 0;
      return (
        <div className="py-4">
          <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="absolute h-full rounded-full transition-all duration-500"
              style={{ width: `${percentage}%`, backgroundColor: colors[0] }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span>{visualization.min_value || 0}</span>
            <span className="font-bold" style={{ color: colors[0] }}>
              {formatValue(value)}
            </span>
            <span>{visualization.max_value || 100}</span>
          </div>
        </div>
      );

    case 'line_chart':
    case 'bar_chart':
      // Convertir les données pour le graphique
      let chartData = [];
      if (Array.isArray(value)) {
        chartData = value;
      } else if (typeof value === 'object' && value !== null) {
        chartData = Object.entries(value).map(([key, val]) => ({ name: key, value: val }));
      }
      
      return (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            {type === 'line_chart' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill={colors[0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      );

    case 'pie_chart':
    case 'donut':
      let pieData = [];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        pieData = Object.entries(value).map(([key, val], index) => ({
          name: key,
          value: val,
          fill: colors[index % colors.length]
        }));
      }
      
      return (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={type === 'donut' ? 40 : 0}
                outerRadius={70}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
      );

    case 'table':
      let tableData = [];
      if (Array.isArray(value)) {
        tableData = value.slice(0, 5);
      }
      
      if (tableData.length === 0) {
        return <div className="text-center text-gray-500 py-4">Aucune donnée</div>;
      }
      
      const columns = Object.keys(tableData[0] || {});
      
      return (
        <div className="overflow-auto max-h-48">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                {columns.map(col => (
                  <th key={col} className="text-left p-1 font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  {columns.map(col => (
                    <td key={col} className="p-1">{String(row[col] ?? '-')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return (
        <div className="text-center py-4 text-gray-500">
          {formatValue(value)}
        </div>
      );
  }
};

export default ServiceDashboard;
