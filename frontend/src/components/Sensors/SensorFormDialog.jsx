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
import { HelpCircle, Calculator, Check, X, Loader2 } from 'lucide-react';

const SensorFormDialog = ({ open, onOpenChange, sensor, onSuccess }) => {
  const [locations, setLocations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(!sensor);
  const [formulaTestValue, setFormulaTestValue] = useState('100');
  const [formulaTestResult, setFormulaTestResult] = useState(null);
  const [testingFormula, setTestingFormula] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'TEMPERATURE',
    emplacement_id: '',
    unite: '°C',
    mqtt_topic: '',
    format_json: false,
    formula: '',
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
      loadTemplates();
      setFormulaTestResult(null);
      
      if (sensor) {
        setFormData({
          nom: sensor.nom || '',
          type: sensor.type || 'TEMPERATURE',
          emplacement_id: sensor.emplacement?.id || '',
          unite: sensor.unite || '°C',
          mqtt_topic: sensor.mqtt_topic || '',
          format_json: sensor.format_json || false,
          formula: sensor.formula || '',
          min_threshold: sensor.min_threshold || '',
          max_threshold: sensor.max_threshold || '',
          alert_enabled: sensor.alert_enabled || false,
          notes: sensor.notes || ''
        });
        setShowTemplates(false);
      } else {
        setFormData({
          nom: '',
          type: 'TEMPERATURE',
          emplacement_id: '',
          unite: '°C',
          mqtt_topic: '',
          format_json: false,
          formula: '',
          min_threshold: '',
          max_threshold: '',
          alert_enabled: false,
          notes: ''
        });
        setShowTemplates(true);
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

  const loadTemplates = async () => {
    try {
      const response = await api.sensors.getTemplates();
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
    }
  };

  const applyTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      type: template.type,
      unite: template.unit,
      format_json: template.format_json || false,
      formula: template.formula || '',
      min_threshold: template.default_min_threshold?.toString() || '',
      max_threshold: template.default_max_threshold?.toString() || '',
      alert_enabled: !!template.default_min_threshold || !!template.default_max_threshold,
      notes: template.description
    }));
    setShowTemplates(false);
    toast({
      title: 'Modèle appliqué',
      description: `Modèle "${template.name}" appliqué. Personnalisez les valeurs selon vos besoins.`
    });
  };

  const handleTypeChange = (type) => {
    const selectedType = sensorTypes.find(t => t.value === type);
    setFormData({
      ...formData,
      type,
      unite: selectedType?.defaultUnit || formData.unite
    });
  };

  const handleTestFormula = async () => {
    if (!formData.formula.trim()) {
      toast({
        title: 'Formule vide',
        description: 'Veuillez saisir une formule à tester',
        variant: 'destructive'
      });
      return;
    }

    const testVal = parseFloat(formulaTestValue);
    if (isNaN(testVal)) {
      toast({
        title: 'Valeur invalide',
        description: 'Veuillez saisir une valeur numérique de test',
        variant: 'destructive'
      });
      return;
    }

    setTestingFormula(true);
    setFormulaTestResult(null);

    try {
      const response = await api.sensors.testFormula(formData.formula, testVal);
      setFormulaTestResult(response.data);
    } catch (error) {
      setFormulaTestResult({
        success: false,
        error: error.response?.data?.detail || 'Erreur lors du test'
      });
    } finally {
      setTestingFormula(false);
    }
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
        formula: formData.formula.trim() || null,
        min_threshold: formData.min_threshold ? parseFloat(formData.min_threshold) : null,
        max_threshold: formData.max_threshold ? parseFloat(formData.max_threshold) : null
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

        {/* Templates Section */}
        {!sensor && showTemplates && templates.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-purple-900">🎯 Utiliser un modèle</h3>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="text-sm text-purple-600 hover:text-purple-800"
              >
                Ignorer
              </button>
            </div>
            <p className="text-sm text-purple-700">
              Choisissez un modèle prédéfini pour gagner du temps
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="p-3 bg-white border border-purple-300 rounded-lg hover:bg-purple-100 hover:border-purple-400 transition-colors text-left"
                >
                  <div className="text-sm font-medium text-purple-900">{template.name}</div>
                  <div className="text-xs text-purple-600 mt-1">{template.unit}</div>
                </button>
              ))}
            </div>
          </div>
        )}

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
              <div className="space-y-2">
                <Label htmlFor="mqtt_topic">Topic MQTT *</Label>
                <Input
                  id="mqtt_topic"
                  value={formData.mqtt_topic}
                  onChange={(e) => setFormData({ ...formData, mqtt_topic: e.target.value })}
                  placeholder="Ex: home/sensors/temperature1"
                  required
                />
                <p className="text-xs text-gray-600">
                  Le capteur sera mis à jour à chaque message reçu sur ce topic
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="format_json"
                  checked={formData.format_json}
                  onChange={(e) => setFormData({ ...formData, format_json: e.target.checked })}
                  className="w-4 h-4 text-purple-600"
                />
                <Label htmlFor="format_json" className="cursor-pointer">
                  Mettre en forme le contenu JSON
                </Label>
              </div>

              {/* Section Formule */}
              <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="formula" className="font-semibold text-blue-900">
                    🔢 Formule à appliquer
                  </Label>
                  <div className="relative group">
                    <HelpCircle size={16} className="text-blue-500 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
                      <p className="font-semibold mb-2">Transformez la valeur reçue avant affichage</p>
                      <p className="mb-2">Utilisez <code className="bg-gray-700 px-1 rounded">x</code> pour représenter la valeur brute.</p>
                      <p className="font-semibold mt-2">Exemples :</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><code className="bg-gray-700 px-1 rounded">x/100</code> → Diviser par 100</li>
                        <li><code className="bg-gray-700 px-1 rounded">x*1000</code> → mV vers V</li>
                        <li><code className="bg-gray-700 px-1 rounded">(x-32)*5/9</code> → °F vers °C</li>
                        <li><code className="bg-gray-700 px-1 rounded">x+2.5</code> → Offset calibration</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <Input
                  id="formula"
                  value={formData.formula}
                  onChange={(e) => {
                    setFormData({ ...formData, formula: e.target.value });
                    setFormulaTestResult(null);
                  }}
                  placeholder="Ex: x/100 ou (x-32)*5/9"
                  className="bg-white"
                />
                <p className="text-xs text-blue-700">
                  Laissez vide pour utiliser la valeur brute. Opérateurs : + - * / ( ) et fonctions abs, round, min, max, pow
                </p>

                {/* Test de formule */}
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Label htmlFor="test_value" className="text-sm whitespace-nowrap">Valeur de test :</Label>
                    <Input
                      id="test_value"
                      type="number"
                      step="any"
                      value={formulaTestValue}
                      onChange={(e) => setFormulaTestValue(e.target.value)}
                      className="w-24 bg-white"
                      placeholder="100"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestFormula}
                    disabled={testingFormula || !formData.formula.trim()}
                    className="flex items-center gap-1"
                  >
                    {testingFormula ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Calculator size={14} />
                    )}
                    Tester
                  </Button>
                </div>

                {/* Résultat du test */}
                {formulaTestResult && (
                  <div className={`mt-2 p-2 rounded-lg flex items-center gap-2 ${
                    formulaTestResult.success 
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {formulaTestResult.success ? (
                      <>
                        <Check size={16} className="text-green-600" />
                        <span className="text-sm">
                          <strong>{formulaTestResult.input_value}</strong> → <strong>{formulaTestResult.output_value}</strong>
                        </span>
                      </>
                    ) : (
                      <>
                        <X size={16} className="text-red-600" />
                        <span className="text-sm">{formulaTestResult.error}</span>
                      </>
                    )}
                  </div>
                )}
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
