import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/use-toast';

const NotificationsSection = () => {
  const { preferences, updatePreferences } = usePreferences();
  const { toast } = useToast();
  const [localPrefs, setLocalPrefs] = useState(preferences || {});

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  const handleChange = async (field, value) => {
    setLocalPrefs({ ...localPrefs, [field]: value });
    try {
      await updatePreferences({ [field]: value });
      toast({ title: 'Succès', description: 'Notifications mises à jour' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de mise à jour', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Activer les notifications</Label>
            <Switch checked={localPrefs.notifications_enabled} onCheckedChange={(v) => handleChange('notifications_enabled', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Notifications par email</Label>
            <Switch checked={localPrefs.email_notifications} onCheckedChange={(v) => handleChange('email_notifications', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Notifications push</Label>
            <Switch checked={localPrefs.push_notifications} onCheckedChange={(v) => handleChange('push_notifications', v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Sons activés</Label>
            <Switch checked={localPrefs.sound_enabled} onCheckedChange={(v) => handleChange('sound_enabled', v)} />
          </div>
          <div>
            <Label>Seuil d'alerte stock bas</Label>
            <Input type="number" value={localPrefs.stock_alert_threshold} onChange={(e) => handleChange('stock_alert_threshold', parseInt(e.target.value))} className="mt-2" min="0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsSection;