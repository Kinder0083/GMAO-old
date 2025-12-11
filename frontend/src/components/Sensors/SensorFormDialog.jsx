import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../hooks/use-toast';
import api from '../../services/api';

const SensorFormDialog = ({ open, onOpenChange, sensor, onSuccess }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'TEMPERATURE',
    emplacement_id: '',
    unite: '°C',
    mqtt_topic: '',
    mqtt_json_path: '',
    refresh_interval: 1,
    min_threshold: '',
    max_threshold: '',
    alert_enabled: false,
    notes: ''
  });

  const { toast } = useToast();

  const sensorTypes = [
    { value: 'TEMPERATURE', label: 'Température', defaultUnit: '°C' },
    { value: 'HUMIDITY', label: 'Humidité', defaultUnit: '%' },
    { value: 'PRESSURE', label: 'Pression', defaultUnit: 'bar' },
    { value: 'AIR_QUALITY', label: 'Qualité de l\'air', defaultUnit: 'ppm' },
    { value: 'LIGHT', label: 'Luminosité', defaultUnit: 'lux' },
    { value: 'MOTION', label: 'Mouvement/Présence', defaultUnit: '' },
    { value: 'DOOR', label: 'Ouverture porte/fenêtre', defaultUnit: '' },
    { value: 'WATER_LEVEL', label: 'Niveau d\'eau', defaultUnit: 'cm' },
    { value: 'VOLTAGE', label: 'Tension électrique', defaultUnit: 'V' },
    { value: 'CURRENT', label: 'Courant électrique', defaultUnit: 'A' },
    { value: 'POWER', label: 'Puissance électrique', defaultUnit: 'W' },
    { value: 'ENERGY', label: 'Énergie', defaultUnit: 'kWh' },
    { value: 'FLOW', label: 'Débit', defaultUnit: 'L/min' },
    { value: 'VIBRATION', label: 'Vibration', defaultUnit: 'Hz' },
    { value: 'NOISE', label: 'Niveau sonore', defaultUnit: 'dB' },
    { value: 'CO2', label: 'CO2', defaultUnit: 'ppm' },
    { value: 'OTHER', label: 'Autre', defaultUnit: '' }
  ];

  useEffect(() => {
    if (open) {
      loadLocations();
      if (sensor) {
        setFormData({
          nom: sensor.nom || '',
          type: sensor.type || 'TEMPERATURE',
          emplacement_id: sensor.emplacement?.id || '',
          unite: sensor.unite || '°C',
          mqtt_topic: sensor.mqtt_topic || '',
          mqtt_json_path: sensor.mqtt_json_path || '',
          refresh_interval: sensor.refresh_interval || 1,
          min_threshold: sensor.min_threshold || '',
          max_threshold: sensor.max_threshold || '',
          alert_enabled: sensor.alert_enabled || false,
          notes: sensor.notes || ''
        });
      } else {
        setFormData({
          nom: '',
          type: 'TEMPERATURE',
          emplacement_id: '',
          unite: '°C',
          mqtt_topic: '',
          mqtt_json_path: '',
          refresh_interval: 1,
          min_threshold: '',
          max_threshold: '',
          alert_enabled: false,
          notes: ''
        });
      }
    }
  }, [open, sensor]);

  const loadLocations = async () => {
    try {
      const response = await api.locations.getAll();
      setLocations(response.data);
    } catch (error) {
      console.error('Erreur chargement emplacements:', error);
    }
  };

  const handleTypeChange = (type) => {
    const selectedType = sensorTypes.find(t => t.value === type);
    setFormData({
      ...formData,
      type,
      unite: selectedType?.defaultUnit || formData.unite
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.nom.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du capteur est requis',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.mqtt_topic.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le topic MQTT est requis',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        min_threshold: formData.min_threshold ? parseFloat(formData.min_threshold) : null,
        max_threshold: formData.max_threshold ? parseFloat(formData.max_threshold) : null,
        refresh_interval: parseInt(formData.refresh_interval) || 1
      };

      if (sensor) {
        await api.sensors.update(sensor.id, payload);
        toast({
          title: 'Succès',
          description: 'Capteur mis à jour'
        });
      } else {
        await api.sensors.create(payload);
        toast({
          title: 'Succès',
          description: 'Capteur créé avec succès'
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Erreur lors de la sauvegarde',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {sensor ? 'Modifier le capteur' : 'Nouveau capteur'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du capteur *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Température Bureau"
                required
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type de capteur *</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                {sensorTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Emplacement */}
            <div className="space-y-2">
              <Label htmlFor="emplacement_id">Emplacement</Label>
              <select
                id="emplacement_id"
                value={formData.emplacement_id}
                onChange={(e) => setFormData({ ...formData, emplacement_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Sélectionner...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Unité */}
            <div className="space-y-2">
              <Label htmlFor="unite">Unité *</Label>
              <Input
                id="unite"
                value={formData.unite}
                onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                placeholder="Ex: °C, %, bar..."
                required
              />
            </div>
          </div>

          {/* Section MQTT */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">📡 Configuration MQTT</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="mqtt_topic">Topic MQTT *</Label>
                  <Input
                    id="mqtt_topic"
                    value={formData.mqtt_topic}
                    onChange={(e) => setFormData({ ...formData, mqtt_topic: e.target.value })}
                    placeholder="Ex: home/sensors/temperature1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mqtt_json_path">Chemin JSON (optionnel)</Label>
                  <Input
                    id="mqtt_json_path"
                    value={formData.mqtt_json_path}
                    onChange={(e) => setFormData({ ...formData, mqtt_json_path: e.target.value })}
                    placeholder="Ex: value ou sensor.temperature"
                  />
                  <p className="text-xs text-gray-600">
                    Laisser vide si la valeur est directe
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refresh_interval">Intervalle (min) *</Label>
                  <Input
                    id="refresh_interval"
                    type="number"
                    min="1"
                    max="1440"
                    value={formData.refresh_interval}
                    onChange={(e) => setFormData({ ...formData, refresh_interval: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section Alertes */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="alert_enabled"
                checked={formData.alert_enabled}
                onChange={(e) => setFormData({ ...formData, alert_enabled: e.target.checked })}
                className="w-4 h-4 text-purple-600"
              />
              <Label htmlFor="alert_enabled" className="text-base font-semibold">
                🚨 Activer les alertes automatiques
              </Label>
            </div>

            {formData.alert_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="min_threshold">Seuil minimum</Label>
                  <Input
                    id="min_threshold"
                    type="number"
                    step="0.1"
                    value={formData.min_threshold}
                    onChange={(e) => setFormData({ ...formData, min_threshold: e.target.value })}
                    placeholder="Ex: 18"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_threshold">Seuil maximum</Label>
                  <Input
                    id="max_threshold"
                    type="number"
                    step="0.1"
                    value={formData.max_threshold}
                    onChange={(e) => setFormData({ ...formData, max_threshold: e.target.value })}
                    placeholder="Ex: 26"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informations complémentaires..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : sensor ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SensorFormDialog;
