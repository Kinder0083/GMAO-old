import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Input } from '../ui/input';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/use-toast';

const SidebarSection = () => {
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
      toast({ title: 'Succès', description: 'Sidebar mis à jour' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de mise à jour', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Position</Label>
            <Select value={localPrefs.sidebar_position} onValueChange={(v) => handleChange('sidebar_position', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Gauche</SelectItem>
                <SelectItem value="right">Droite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Comportement</Label>
            <Select value={localPrefs.sidebar_behavior} onValueChange={(v) => handleChange('sidebar_behavior', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="always_open">Toujours ouvert</SelectItem>
                <SelectItem value="minimizable">Minimisable (manuel)</SelectItem>
                <SelectItem value="auto_collapse">Auto-collapse</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-2">
              {localPrefs.sidebar_behavior === 'always_open' && '📌 La sidebar reste toujours ouverte'}
              {localPrefs.sidebar_behavior === 'minimizable' && '👆 Contrôle manuel via le bouton'}
              {localPrefs.sidebar_behavior === 'auto_collapse' && '⚡ Se ferme automatiquement après navigation et clic en dehors'}
            </p>
          </div>
          <div>
            <Label>Largeur (px): {localPrefs.sidebar_width}</Label>
            <Slider value={[localPrefs.sidebar_width || 256]} onValueChange={(v) => handleChange('sidebar_width', v[0])} min={200} max={350} step={10} className="mt-2" />
          </div>
          <div>
            <Label>Couleur des icônes</Label>
            <div className="flex gap-2">
              <Input type="color" value={localPrefs.sidebar_icon_color} onChange={(e) => handleChange('sidebar_icon_color', e.target.value)} className="w-16 h-10 p-1" />
              <Input type="text" value={localPrefs.sidebar_icon_color} onChange={(e) => handleChange('sidebar_icon_color', e.target.value)} className="flex-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SidebarSection;