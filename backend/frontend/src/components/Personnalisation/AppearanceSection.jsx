import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/use-toast';
import { Sun, Moon, Monitor, Palette, Image as ImageIcon } from 'lucide-react';

const AppearanceSection = () => {
  const { preferences, updatePreferences } = usePreferences();
  const { toast } = useToast();
  const [localPrefs, setLocalPrefs] = useState(preferences || {});

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  const presetThemes = [
    {
      id: 'bleu',
      name: 'Bleu (Par défaut)',
      primary: '#2563eb',
      secondary: '#64748b',
      sidebar: '#1f2937'
    },
    {
      id: 'orange',
      name: 'Orange (Entreprise)',
      primary: '#ea580c',
      secondary: '#fb923c',
      sidebar: '#7c2d12'
    },
    {
      id: 'vert',
      name: 'Vert (Entreprise)',
      primary: '#16a34a',
      secondary: '#4ade80',
      sidebar: '#14532d'
    },
    {
      id: 'blanc',
      name: 'Blanc (Entreprise)',
      primary: '#ffffff',
      secondary: '#f3f4f6',
      sidebar: '#f9fafb'
    },
    {
      id: 'custom',
      name: 'Personnalisé',
      primary: localPrefs.primary_color,
      secondary: localPrefs.secondary_color,
      sidebar: localPrefs.sidebar_bg_color
    }
  ];

  const handleThemeChange = async (field, value) => {
    const updated = { ...localPrefs, [field]: value };
    setLocalPrefs(updated);
    
    try {
      await updatePreferences({ [field]: value });
      toast({
        title: 'Succès',
        description: 'Thème mis à jour'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le thème',
        variant: 'destructive'
      });
    }
  };

  const applyPresetTheme = async (theme) => {
    const updates = {
      preset_theme: theme.id,
      primary_color: theme.primary,
      secondary_color: theme.secondary,
      sidebar_bg_color: theme.sidebar
    };
    
    setLocalPrefs({ ...localPrefs, ...updates });
    
    try {
      await updatePreferences(updates);
      toast({
        title: 'Succès',
        description: `Thème "${theme.name}" appliqué`
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'appliquer le thème',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Thème */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block">Mode d'affichage</Label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={localPrefs.theme_mode === 'light' ? 'default' : 'outline'}
              onClick={() => handleThemeChange('theme_mode', 'light')}
              className="h-20 flex-col gap-2"
            >
              <Sun size={24} />
              <span>Clair</span>
            </Button>
            <Button
              variant={localPrefs.theme_mode === 'dark' ? 'default' : 'outline'}
              onClick={() => handleThemeChange('theme_mode', 'dark')}
              className="h-20 flex-col gap-2"
            >
              <Moon size={24} />
              <span>Sombre</span>
            </Button>
            <Button
              variant={localPrefs.theme_mode === 'auto' ? 'default' : 'outline'}
              onClick={() => handleThemeChange('theme_mode', 'auto')}
              className="h-20 flex-col gap-2"
            >
              <Monitor size={24} />
              <span>Auto</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Thèmes Prédéfinis */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block">Thèmes prédéfinis</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {presetThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => applyPresetTheme(theme)}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                  localPrefs.preset_theme === theme.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: theme.primary }}
                  ></div>
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: theme.secondary }}
                  ></div>
                  <div
                    className="w-8 h-8 rounded-full border border-gray-300"
                    style={{ backgroundColor: theme.sidebar }}
                  ></div>
                </div>
                <p className="text-sm font-medium text-left">{theme.name}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Couleurs Personnalisées */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block">Couleurs personnalisées</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="primary-color" className="mb-2 block">Couleur primaire</Label>
              <div className="flex gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={localPrefs.primary_color}
                  onChange={(e) => handleThemeChange('primary_color', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={localPrefs.primary_color}
                  onChange={(e) => handleThemeChange('primary_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary-color" className="mb-2 block">Couleur secondaire</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={localPrefs.secondary_color}
                  onChange={(e) => handleThemeChange('secondary_color', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={localPrefs.secondary_color}
                  onChange={(e) => handleThemeChange('secondary_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sidebar-color" className="mb-2 block">Couleur sidebar</Label>
              <div className="flex gap-2">
                <Input
                  id="sidebar-color"
                  type="color"
                  value={localPrefs.sidebar_bg_color}
                  onChange={(e) => handleThemeChange('sidebar_bg_color', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={localPrefs.sidebar_bg_color}
                  onChange={(e) => handleThemeChange('sidebar_bg_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Densité et Taille */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">Densité d'affichage</Label>
              <Select value={localPrefs.display_density} onValueChange={(v) => handleThemeChange('display_density', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="spacious">Spacieux</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Taille de police</Label>
              <Select value={localPrefs.font_size} onValueChange={(v) => handleThemeChange('font_size', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Petit</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Grand</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fond d'écran */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-base font-semibold mb-4 block flex items-center gap-2">
            <ImageIcon size={20} />
            Fond d'écran personnalisé
          </Label>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="URL de l'image de fond"
              value={localPrefs.background_image_url || ''}
              onChange={(e) => handleThemeChange('background_image_url', e.target.value)}
            />
            <p className="text-sm text-gray-500">
              Laissez vide pour utiliser le fond par défaut
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppearanceSection;
