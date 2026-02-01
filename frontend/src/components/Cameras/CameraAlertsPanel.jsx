/**
 * Panel de configuration des alertes pour chaque caméra
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Bell,
  BellOff,
  Mail,
  Clock,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Camera
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const CameraAlertCard = ({ camera, onUpdate }) => {
  const { toast } = useToast();
  const [alertEnabled, setAlertEnabled] = useState(camera.alert_enabled || false);
  const [alertEmail, setAlertEmail] = useState(camera.alert_email || '');
  const [alertDelay, setAlertDelay] = useState(camera.alert_delay_minutes || 5);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Détecter les changements
  useEffect(() => {
    const changed = 
      alertEnabled !== (camera.alert_enabled || false) ||
      alertEmail !== (camera.alert_email || '') ||
      alertDelay !== (camera.alert_delay_minutes || 5);
    setHasChanges(changed);
  }, [alertEnabled, alertEmail, alertDelay, camera]);

  const handleSave = async () => {
    if (alertEnabled && !alertEmail) {
      toast({
        title: 'Email requis',
        description: 'Veuillez saisir une adresse email pour recevoir les alertes',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras/${camera.id}/alert`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alert_enabled: alertEnabled,
          alert_email: alertEmail || null,
          alert_delay_minutes: alertDelay
        })
      });

      if (!response.ok) throw new Error('Erreur sauvegarde');

      const updatedCamera = await response.json();
      onUpdate(updatedCamera);
      setHasChanges(false);

      toast({
        title: 'Paramètres sauvegardés',
        description: alertEnabled 
          ? `Alertes activées pour ${camera.name}` 
          : `Alertes désactivées pour ${camera.name}`
      });
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={`transition-all ${alertEnabled ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              camera.is_online ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <Camera className={`w-5 h-5 ${camera.is_online ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <CardTitle className="text-base">{camera.name}</CardTitle>
              <p className="text-xs text-gray-500">{camera.location || 'Emplacement non défini'}</p>
            </div>
          </div>
          <Badge variant={camera.is_online ? 'success' : 'destructive'}>
            {camera.is_online ? 'En ligne' : 'Hors ligne'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Toggle activation */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            {alertEnabled ? (
              <Bell className="w-5 h-5 text-blue-600" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <Label htmlFor={`alert-${camera.id}`} className="font-medium cursor-pointer">
              Alertes email activées
            </Label>
          </div>
          <Switch
            id={`alert-${camera.id}`}
            checked={alertEnabled}
            onCheckedChange={setAlertEnabled}
          />
        </div>

        {/* Configuration (visible si activé) */}
        {alertEnabled && (
          <div className="space-y-4 pt-2 border-t">
            {/* Email destinataire */}
            <div className="space-y-2">
              <Label htmlFor={`email-${camera.id}`} className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Destinataire des alertes
              </Label>
              <Input
                id={`email-${camera.id}`}
                type="email"
                placeholder="email@exemple.com"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Délai avant alerte */}
            <div className="space-y-2">
              <Label htmlFor={`delay-${camera.id}`} className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Délai avant envoi d'alerte
              </Label>
              <Select
                value={String(alertDelay)}
                onValueChange={(value) => setAlertDelay(parseInt(value))}
              >
                <SelectTrigger id={`delay-${camera.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="2">2 minutes</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Temps pendant lequel la caméra doit être hors ligne avant d'envoyer une alerte
              </p>
            </div>
          </div>
        )}

        {/* Statut dernière alerte */}
        {camera.last_alert_sent && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
            <AlertTriangle className="w-4 h-4" />
            Dernière alerte : {new Date(camera.last_alert_sent).toLocaleString('fr-FR')}
          </div>
        )}

        {/* Bouton sauvegarder */}
        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const CameraAlertsPanel = ({ cameras, onCameraUpdate }) => {
  const alertsConfigured = cameras.filter(c => c.alert_enabled).length;

  return (
    <div className="space-y-4" data-testid="camera-alerts-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Configuration des Alertes
        </h3>
        <Badge variant="outline">
          {alertsConfigured}/{cameras.length} configurées
        </Badge>
      </div>

      <p className="text-sm text-gray-500">
        Configurez des alertes email individuelles pour chaque caméra. Chaque caméra peut avoir 
        un destinataire différent et un délai d'alerte personnalisé.
      </p>

      {cameras.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <Camera className="w-16 h-16 mb-4" />
          <p className="text-lg font-medium">Aucune caméra configurée</p>
          <p className="text-sm">Ajoutez des caméras pour configurer les alertes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cameras.map(camera => (
            <CameraAlertCard
              key={camera.id}
              camera={camera}
              onUpdate={onCameraUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CameraAlertsPanel;
