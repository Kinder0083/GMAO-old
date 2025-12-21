import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/use-toast';
import { usePermissions } from '../../hooks/usePermissions';

const DisplayPreferencesSection = () => {
  const { preferences, updatePreferences } = usePreferences();
  const { toast } = useToast();
  const { canView } = usePermissions();
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
      toast({ title: 'Succès', description: 'Préférences mises à jour' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de mise à jour', variant: 'destructive' });
    }
  };

  // Liste de toutes les pages disponibles avec leurs permissions
  const availablePages = [
    { value: '/dashboard', label: 'Tableau de bord', module: 'dashboard' },
    { value: '/intervention-requests', label: 'Demandes d\'intervention', module: 'interventionRequests' },
    { value: '/work-orders', label: 'Ordres de travail', module: 'workOrders' },
    { value: '/improvement-requests', label: 'Demandes d\'amélioration', module: 'improvementRequests' },
    { value: '/improvements', label: 'Améliorations', module: 'improvements' },
    { value: '/preventive-maintenance', label: 'Maintenance préventive', module: 'preventiveMaintenance' },
    { value: '/planning-mprev', label: 'Planning M.Prev.', module: 'preventiveMaintenance' },
    { value: '/assets', label: 'Équipements', module: 'assets' },
    { value: '/inventory', label: 'Inventaire', module: 'inventory' },
    { value: '/locations', label: 'Zones', module: 'locations' },
    { value: '/meters', label: 'Compteurs', module: 'meters' },
    { value: '/surveillance-plan', label: 'Plan de Surveillance', module: 'surveillance' },
    { value: '/surveillance-rapport', label: 'Rapport Surveillance', module: 'surveillance' },
    { value: '/presqu-accident', label: 'Presqu\'accident', module: 'presquaccident' },
    { value: '/presqu-accident-rapport', label: 'Rapport P.accident', module: 'presquaccident' },
    { value: '/documentations', label: 'Documentations', module: 'documentations' },
    { value: '/reports', label: 'Rapports', module: 'reports' },
    { value: '/people', label: 'Équipes', module: 'people' },
    { value: '/planning', label: 'Planning', module: 'planning' },
    { value: '/vendors', label: 'Fournisseurs', module: 'vendors' },
    { value: '/purchase-history', label: 'Historique Achat', module: 'purchaseHistory' },
    { value: '/import-export', label: 'Import / Export', module: 'importExport' },
    { value: '/sensors', label: 'Capteurs MQTT', module: 'sensors' },
    { value: '/iot-dashboard', label: 'Dashboard IoT', module: 'iotDashboard' },
    { value: '/mqtt-logs', label: 'Logs MQTT', module: 'mqttLogs' },
    { value: '/whiteboard', label: 'Tableau d\'affichage', module: 'whiteboard' }
  ].filter(page => canView(page.module));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Page d'accueil par défaut</Label>
            <Select value={localPrefs.default_home_page} onValueChange={(v) => handleChange('default_home_page', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availablePages.map(page => (
                  <SelectItem key={page.value} value={page.value}>
                    {page.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-2">
              Cette page s'ouvrira automatiquement après votre connexion
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Format de date</Label>
              <Select value={localPrefs.date_format} onValueChange={(v) => handleChange('date_format', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Format d'heure</Label>
              <Select value={localPrefs.time_format} onValueChange={(v) => handleChange('time_format', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 heures</SelectItem>
                  <SelectItem value="12h">12 heures (AM/PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Devise</Label>
              <Select value={localPrefs.currency} onValueChange={(v) => handleChange('currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="€">Euro (€)</SelectItem>
                  <SelectItem value="$">Dollar ($)</SelectItem>
                  <SelectItem value="£">Livre (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DisplayPreferencesSection;