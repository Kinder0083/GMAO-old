import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { metersAPI, locationsAPI } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorFormatter';

const MeterFormDialog = ({ open, onOpenChange, meter, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    nom: '',
    type: 'ELECTRICITE',
    numero_serie: '',
    emplacement_id: '',
    unite: 'kWh',
    prix_unitaire: '',
    abonnement_mensuel: '',
    notes: '',
    mqtt_enabled: false,
    mqtt_topic: '',
    mqtt_json_path: '',
    mqtt_refresh_interval: 5
  });

  useEffect(() => {
    if (open) {
      loadLocations();
      if (meter) {
        setFormData({
          nom: meter.nom || '',
          type: meter.type || 'ELECTRICITE',
          numero_serie: meter.numero_serie || '',
          emplacement_id: meter.emplacement?.id || '',
          unite: meter.unite || 'kWh',
          prix_unitaire: meter.prix_unitaire || '',
          abonnement_mensuel: meter.abonnement_mensuel || '',
          notes: meter.notes || '',
          mqtt_enabled: meter.mqtt_enabled || false,
          mqtt_topic: meter.mqtt_topic || '',
          mqtt_json_path: meter.mqtt_json_path || '',
          mqtt_refresh_interval: meter.mqtt_refresh_interval || 5
        });
      } else {
        setFormData({
          nom: '',
          type: 'ELECTRICITE',
          numero_serie: '',
          emplacement_id: '',
          unite: 'kWh',
          prix_unitaire: '',
          abonnement_mensuel: '',
          notes: '',
          mqtt_enabled: false,
          mqtt_topic: '',
          mqtt_json_path: '',
          mqtt_refresh_interval: 5
        });
      }
    }
  }, [open, meter]);

  const loadLocations = async () => {
    try {
      const response = await locationsAPI.getAll();
      setLocations(response.data);
    } catch (error) {
      console.error('Erreur chargement emplacements:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        prix_unitaire: formData.prix_unitaire ? parseFloat(formData.prix_unitaire) : null,
        abonnement_mensuel: formData.abonnement_mensuel ? parseFloat(formData.abonnement_mensuel) : null,
        emplacement_id: formData.emplacement_id || null
      };

      if (meter) {
        await metersAPI.update(meter.id, submitData);
        toast({
          title: 'Succès',
          description: 'Compteur modifié avec succès'
        });
      } else {
        await metersAPI.create(submitData);
        toast({
          title: 'Succès',
          description: 'Compteur créé avec succès'
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Une erreur est survenue'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const types = [
    { value: 'EAU', label: 'Eau', unite: 'm³' },
    { value: 'GAZ', label: 'Gaz', unite: 'm³' },
    { value: 'ELECTRICITE', label: 'Électricité', unite: 'kWh' },
    { value: 'AIR_COMPRIME', label: 'Air comprimé', unite: 'm³' },
    { value: 'VAPEUR', label: 'Vapeur', unite: 't' },
    { value: 'FUEL', label: 'Fuel', unite: 'L' },
    { value: 'SOLAIRE', label: 'Solaire', unite: 'kWh' },
    { value: 'AUTRE', label: 'Autre', unite: '' }
  ];

  const handleTypeChange = (newType) => {
    const selectedType = types.find(t => t.value === newType);
    setFormData({
      ...formData,
      type: newType,
      unite: selectedType?.unite || formData.unite
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meter ? 'Modifier' : 'Nouveau'} compteur</DialogTitle>
          <DialogDescription>
            Remplissez les informations du compteur
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom du compteur *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Compteur électrique principal"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_serie">Numéro de série</Label>
              <Input
                id="numero_serie"
                value={formData.numero_serie}
                onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                placeholder="Ex: ABC123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emplacement">Emplacement</Label>
              <Select
                value={formData.emplacement_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, emplacement_id: value === "none" ? "" : value })}
              >
                <SelectTrigger id="emplacement">
                  <SelectValue placeholder="Sélectionner un emplacement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unite">Unité de mesure *</Label>
              <Input
                id="unite"
                value={formData.unite}
                onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                placeholder="Ex: kWh, m³, L"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prix_unitaire">Prix unitaire (€)</Label>
              <Input
                id="prix_unitaire"
                type="number"
                step="0.001"
                value={formData.prix_unitaire}
                onChange={(e) => setFormData({ ...formData, prix_unitaire: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="abonnement_mensuel">Abonnement mensuel (€)</Label>
              <Input
                id="abonnement_mensuel"
                type="number"
                step="0.01"
                value={formData.abonnement_mensuel}
                onChange={(e) => setFormData({ ...formData, abonnement_mensuel: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Enregistrement...' : meter ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MeterFormDialog;