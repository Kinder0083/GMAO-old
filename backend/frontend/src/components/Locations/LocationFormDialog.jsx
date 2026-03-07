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
import { useToast } from '../../hooks/use-toast';
import { locationsAPI } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorFormatter';

const LocationFormDialog = ({ open, onOpenChange, location, parentLocation, onSuccess, allLocations = [] }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    type: '',
    parent_id: null
  });

  useEffect(() => {
    if (open) {
      if (location) {
        setFormData({
          nom: location.nom || '',
          type: location.type || '',
          parent_id: location.parent_id || null
        });
      } else if (parentLocation) {
        // Création d'une sous-zone
        setFormData({
          nom: '',
          type: '',
          parent_id: parentLocation.id
        });
      } else {
        setFormData({
          nom: '',
          type: '',
          parent_id: null
        });
      }
    }
  }, [open, location, parentLocation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Nettoyer les données avant envoi
      const dataToSend = {
        ...formData,
        parent_id: formData.parent_id || null
      };

      if (location) {
        await locationsAPI.update(location.id, dataToSend);
        toast({
          title: 'Succès',
          description: 'Zone modifiée avec succès'
        });
      } else {
        await locationsAPI.create(dataToSend);
        toast({
          title: 'Succès',
          description: parentLocation ? 'Sous-zone créée avec succès' : 'Zone créée avec succès'
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {location ? 'Modifier la zone' : parentLocation ? `Nouvelle sous-zone de "${parentLocation.nom}"` : 'Nouvelle zone'}
          </DialogTitle>
          <DialogDescription>
            {parentLocation && `Cette sous-zone sera créée sous la zone "${parentLocation.nom}"`}
            {!parentLocation && 'Remplissez les informations de la zone'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {parentLocation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Zone parente:</strong> {parentLocation.nom}
                {parentLocation.level !== undefined && ` (Niveau ${parentLocation.level})`}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Input
              id="type"
              placeholder="Ex: Production, Bureau, Stockage"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Enregistrement...' : location ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LocationFormDialog;