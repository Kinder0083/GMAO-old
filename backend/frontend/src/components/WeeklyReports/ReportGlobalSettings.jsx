import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Settings, Save, Loader2, Globe, Mail, Sparkles, FileText } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../hooks/use-toast';

const ReportGlobalSettings = ({ onSave }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializingTemplates, setInitializingTemplates] = useState(false);
  const [defaultTemplates, setDefaultTemplates] = useState([]);
  const [settings, setSettings] = useState({
    enabled: true,
    default_timezone: 'Europe/Paris',
    sender_email: '',
    sender_name: 'FSAO Iris - Rapports'
  });

  useEffect(() => {
    loadSettings();
    loadDefaultTemplatesInfo();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/weekly-reports/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultTemplatesInfo = async () => {
    try {
      const response = await api.get('/weekly-reports/default-templates');
      setDefaultTemplates(response.data.available_templates || []);
    } catch (error) {
      console.error('Erreur chargement templates par défaut:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/weekly-reports/settings', settings);
      toast({
        title: 'Succès',
        description: 'Paramètres enregistrés'
      });
      if (onSave) onSave();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer les paramètres',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            Paramètres globaux
          </CardTitle>
          <CardDescription>
            Configuration générale des rapports automatiques
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Activer les rapports automatiques</Label>
              <p className="text-sm text-gray-500">
                Désactiver cette option suspend tous les envois planifiés
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-500" />
              Fuseau horaire par défaut
            </Label>
            <select
              value={settings.default_timezone}
              onChange={(e) => setSettings(prev => ({ ...prev, default_timezone: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="Europe/Paris">Europe/Paris (UTC+1/+2)</option>
              <option value="Europe/London">Europe/London (UTC+0/+1)</option>
              <option value="America/New_York">America/New_York (UTC-5/-4)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (UTC-8/-7)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
              <option value="UTC">UTC</option>
            </select>
            <p className="text-xs text-gray-500">
              Utilisé pour les nouveaux modèles de rapport
            </p>
          </div>

          {/* Sender Email */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              Email expéditeur (optionnel)
            </Label>
            <Input
              type="email"
              value={settings.sender_email || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, sender_email: e.target.value }))}
              placeholder="rapports@entreprise.com"
            />
            <p className="text-xs text-gray-500">
              Si vide, l'email par défaut du serveur SMTP sera utilisé
            </p>
          </div>

          {/* Sender Name */}
          <div className="space-y-2">
            <Label>Nom d'affichage</Label>
            <Input
              value={settings.sender_name}
              onChange={(e) => setSettings(prev => ({ ...prev, sender_name: e.target.value }))}
              placeholder="FSAO Iris - Rapports"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ À propos des rapports automatiques</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Les rapports sont envoyés automatiquement selon leur planification</li>
            <li>• Chaque modèle peut avoir sa propre fréquence (hebdomadaire, mensuel, annuel)</li>
            <li>• Un PDF est généré et joint à chaque email</li>
            <li>• Les rapports inactifs ne sont pas envoyés</li>
          </ul>
        </CardContent>
      </Card>

      {/* Default Templates Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Templates pré-configurés
          </CardTitle>
          <CardDescription>
            Créez automatiquement des templates optimisés pour chaque service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {defaultTemplates.map(template => (
              <div key={template.service} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                <FileText className="h-4 w-4 text-purple-500 flex-shrink-0" />
                <span className="truncate">{template.service}</span>
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-3">
              Cette action crée un template par défaut pour chaque service qui n'en possède pas encore.
              Les templates sont créés <strong>inactifs</strong> par défaut.
            </p>
            <Button 
              onClick={async () => {
                setInitializingTemplates(true);
                try {
                  const response = await api.post('/weekly-reports/init-default-templates');
                  toast({
                    title: 'Succès',
                    description: response.data.message
                  });
                  if (onSave) onSave();
                } catch (error) {
                  toast({
                    title: 'Erreur',
                    description: error.response?.data?.detail || 'Impossible de créer les templates',
                    variant: 'destructive'
                  });
                } finally {
                  setInitializingTemplates(false);
                }
              }}
              disabled={initializingTemplates}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {initializingTemplates ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Créer les templates pour tous les services
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportGlobalSettings;
