import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Plus,
  Search,
  Filter,
  Thermometer,
  Droplet,
  Gauge,
  Wind,
  Sun,
  Zap,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  FileJson,
  FileText
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';
import SensorFormDialog from '../components/Sensors/SensorFormDialog';

const Sensors = () => {
  const [sensors, setSensors] = useState([]);
  const [filteredSensors, setFilteredSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState(null);
  const [showImportExport, setShowImportExport] = useState(false);
  
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  
  // Récupérer l'utilisateur depuis localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    loadSensors();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSensors, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterSensors();
  }, [sensors, searchTerm, typeFilter]);

  const loadSensors = async (showSuccessToast = false) => {
    try {
      setLoading(true);
      const response = await api.sensors.getAll();
      setSensors(response.data);
      
      if (showSuccessToast) {
        toast({
          title: 'Succès',
          description: `${response.data.length} capteur(s) actualisé(s)`
        });
      }
    } catch (error) {
      console.error('Erreur chargement capteurs:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les capteurs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterSensors = () => {
    let filtered = sensors;

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(s => s.type === typeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.emplacement?.nom || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSensors(filtered);
  };

  const handleDelete = async (sensor) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le capteur "${sensor.nom}" ?`)) {
      return;
    }

    try {
      await api.sensors.delete(sensor.id);
      toast({
        title: 'Succès',
        description: 'Capteur supprimé'
      });
      await loadSensors();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le capteur',
        variant: 'destructive'
      });
    }
  };

  const handleExportJson = async () => {
    try {
      const response = await api.sensors.exportJson();
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sensors_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Succès',
        description: 'Export JSON téléchargé'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'export',
        variant: 'destructive'
      });
    }
  };

  const handleExportCsv = async () => {
    try {
      const response = await api.sensors.exportCsv();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sensors_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Succès',
        description: 'Export CSV téléchargé'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'export',
        variant: 'destructive'
      });
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const response = await api.sensors.importJson(file);
      
      toast({
        title: 'Import terminé',
        description: `${response.data.imported} capteur(s) importé(s), ${response.data.skipped} ignoré(s)`
      });
      
      if (response.data.errors.length > 0) {
        console.warn('Erreurs d\'import:', response.data.errors);
      }
      
      await loadSensors();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Erreur lors de l\'import',
        variant: 'destructive'
      });
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSensorIcon = (type) => {
    const icons = {
      TEMPERATURE: Thermometer,
      HUMIDITY: Droplet,
      PRESSURE: Gauge,
      AIR_QUALITY: Wind,
      LIGHT: Sun,
      POWER: Zap,
      ENERGY: Zap,
      VOLTAGE: Zap,
      CURRENT: Zap
    };
    const Icon = icons[type] || Activity;
    return <Icon size={20} />;
  };

  const getSensorColor = (type) => {
    const colors = {
      TEMPERATURE: 'bg-red-100 text-red-600',
      HUMIDITY: 'bg-blue-100 text-blue-600',
      PRESSURE: 'bg-purple-100 text-purple-600',
      AIR_QUALITY: 'bg-green-100 text-green-600',
      LIGHT: 'bg-yellow-100 text-yellow-600',
      POWER: 'bg-orange-100 text-orange-600',
      ENERGY: 'bg-orange-100 text-orange-600'
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  const getTypeLabel = (type) => {
    const labels = {
      TEMPERATURE: 'Température',
      HUMIDITY: 'Humidité',
      PRESSURE: 'Pression',
      AIR_QUALITY: 'Qualité air',
      LIGHT: 'Luminosité',
      MOTION: 'Mouvement',
      DOOR: 'Ouverture',
      WATER_LEVEL: 'Niveau eau',
      VOLTAGE: 'Tension',
      CURRENT: 'Courant',
      POWER: 'Puissance',
      ENERGY: 'Énergie',
      FLOW: 'Débit',
      VIBRATION: 'Vibration',
      NOISE: 'Bruit',
      CO2: 'CO2',
      OTHER: 'Autre'
    };
    return labels[type] || type;
  };

  const sensorTypes = [
    { value: 'ALL', label: 'Tous les types' },
    { value: 'TEMPERATURE', label: 'Température' },
    { value: 'HUMIDITY', label: 'Humidité' },
    { value: 'PRESSURE', label: 'Pression' },
    { value: 'AIR_QUALITY', label: 'Qualité air' },
    { value: 'POWER', label: 'Puissance' },
    { value: 'ENERGY', label: 'Énergie' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="text-purple-600" size={32} />
            Capteurs IoT
          </h1>
          <p className="text-gray-600 mt-1">
            Surveillance en temps réel de vos capteurs connectés
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadSensors(true)}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Actualiser les capteurs"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
          </button>
          
          {isAdmin && (
            <>
              {/* Menu Import/Export */}
              <div className="relative">
                <button
                  onClick={() => setShowImportExport(!showImportExport)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  title="Import/Export"
                >
                  <Download size={18} />
                </button>
                
                {showImportExport && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowImportExport(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                      <button
                        onClick={() => {
                          handleExportJson();
                          setShowImportExport(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FileJson size={16} />
                        <span>Exporter JSON</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          handleExportCsv();
                          setShowImportExport(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        <FileText size={16} />
                        <span>Exporter CSV</span>
                      </button>
                      
                      <div className="border-t border-gray-200 my-2" />
                      
                      <button
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowImportExport(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                      >
                        <Upload size={16} />
                        <span>Importer JSON</span>
                      </button>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                      />
                    </div>
                  </>
                )}
              </div>
              
              <Button
                id="btn-nouveau-capteur"
                data-action="creer-capteur"
                onClick={() => {
                  setEditingSensor(null);
                  setIsFormOpen(true);
                }}
              >
                <Plus className="mr-2" size={18} />
                Nouveau capteur
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Rechercher un capteur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            >
              {sensorTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Sensors Grid */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des capteurs...</p>
        </div>
      ) : filteredSensors.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">
            {searchTerm || typeFilter !== 'ALL' 
              ? 'Aucun capteur ne correspond aux critères'
              : 'Aucun capteur créé'}
          </p>
          {isAdmin && !searchTerm && typeFilter === 'ALL' && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2" size={18} />
              Créer le premier capteur
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSensors.map((sensor) => (
            <Card 
              key={sensor.id} 
              className="p-6 hover:shadow-lg transition-shadow"
              data-ai-type="SENSOR"
              data-ai-id={sensor.id}
              data-ai-name={sensor.nom}
              data-ai-status={sensor.alert_enabled ? 'active' : 'inactive'}
              data-ai-extra={JSON.stringify({ 
                type: sensor.type, 
                value: sensor.current_value, 
                unite: sensor.unite,
                mqtt_topic: sensor.mqtt_topic 
              })}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${getSensorColor(sensor.type)}`}>
                    {getSensorIcon(sensor.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{sensor.nom}</h3>
                    <p className="text-sm text-gray-600">{getTypeLabel(sensor.type)}</p>
                  </div>
                </div>
                
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingSensor(sensor);
                        setIsFormOpen(true);
                      }}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(sensor)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Value */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-purple-600">
                    {sensor.current_value !== null && sensor.current_value !== undefined
                      ? sensor.current_value.toFixed(1)
                      : '--'}
                  </span>
                  <span className="text-lg text-gray-600">{sensor.unite}</span>
                </div>
                {sensor.last_update && (
                  <p className="text-xs text-gray-500 mt-1">
                    Dernière mise à jour : {new Date(sensor.last_update).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm">
                {sensor.emplacement && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">Emplacement :</span>
                    <span>{sensor.emplacement.nom}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">Topic MQTT :</span>
                  <span className="font-mono text-xs">{sensor.mqtt_topic}</span>
                </div>

                {sensor.alert_enabled && (sensor.min_threshold || sensor.max_threshold) && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="font-medium">Seuils :</span>
                    <span>
                      {sensor.min_threshold ? `Min: ${sensor.min_threshold}` : ''}
                      {sensor.min_threshold && sensor.max_threshold ? ' / ' : ''}
                      {sensor.max_threshold ? `Max: ${sensor.max_threshold}` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Alert Badge */}
              {sensor.alert_enabled && sensor.current_value !== null && (
                <>
                  {(sensor.min_threshold && sensor.current_value < sensor.min_threshold) && (
                    <div className="mt-3 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm flex items-center gap-2">
                      ⚠️ Valeur sous le seuil minimum
                    </div>
                  )}
                  {(sensor.max_threshold && sensor.current_value > sensor.max_threshold) && (
                    <div className="mt-3 px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm flex items-center gap-2">
                      🚨 Valeur au-dessus du seuil maximum
                    </div>
                  )}
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <SensorFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        sensor={editingSensor}
        onSuccess={loadSensors}
      />
    </div>
  );
};

export default Sensors;
