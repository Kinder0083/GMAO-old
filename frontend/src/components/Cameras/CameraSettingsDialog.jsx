/**
 * Dialog pour les paramètres des snapshots
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import {
  Settings,
  Loader2,
  Clock,
  Calendar,
  Hash,
  HardDrive,
  Trash2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const CameraSettingsDialog = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [settings, setSettings] = useState({
    snapshot_frequency_seconds: 30,
    retention_days: 7,
    retention_max_count: 1000,
    storage_path: ''
  });

  // Charger les paramètres
  useEffect(() => {
    if (!open) return;
    
    const loadSettings = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/cameras/settings/snapshot`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Erreur chargement paramètres:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [open]);

  // Sauvegarder les paramètres
  const handleSave = async () => {
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras/settings/snapshot`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          snapshot_frequency_seconds: settings.snapshot_frequency_seconds,
          retention_days: settings.retention_days,
          retention_max_count: settings.retention_max_count
        })
      });
      
      if (!response.ok) throw new Error('Erreur sauvegarde');
      
      toast({
        title: 'Succès',
        description: 'Paramètres enregistrés'
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Lancer le nettoyage
  const handleCleanup = async () => {
    if (!window.confirm('Lancer le nettoyage des anciens snapshots ?')) return;
    
    setCleaning(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/cameras/cleanup/snapshots`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      
      toast({
        title: 'Nettoyage terminé',
        description: result.message
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Échec du nettoyage',
        variant: 'destructive'
      });
    } finally {
      setCleaning(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="camera-settings-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Paramètres des snapshots
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Fréquence */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="frequency">Fréquence de capture</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="frequency"
                        type="number"
                        min={10}
                        max={300}
                        value={settings.snapshot_frequency_seconds}
                        onChange={(e) => handleChange('snapshot_frequency_seconds', parseInt(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-500">secondes</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Intervalle entre chaque capture (10-300s)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Rétention durée */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="retention-days">Durée de rétention</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="retention-days"
                        type="number"
                        min={1}
                        max={90}
                        value={settings.retention_days}
                        onChange={(e) => handleChange('retention_days', parseInt(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-500">jours</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Les snapshots plus anciens seront supprimés
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Rétention nombre */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Hash className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="retention-count">Nombre maximum</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="retention-count"
                        type="number"
                        min={100}
                        max={10000}
                        value={settings.retention_max_count}
                        onChange={(e) => handleChange('retention_max_count', parseInt(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-500">par caméra</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Nombre maximum de snapshots conservés
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Stockage */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <HardDrive className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div className="flex-1">
                    <Label>Emplacement de stockage</Label>
                    <p className="text-sm text-gray-600 mt-1 font-mono bg-gray-100 p-2 rounded">
                      {settings.storage_path || '/app/data/cameras/snapshots'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Bouton nettoyage */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCleanup}
              disabled={cleaning}
            >
              {cleaning ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Lancer le nettoyage maintenant
            </Button>
          </div>
        )}
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CameraSettingsDialog;
