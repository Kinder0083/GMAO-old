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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { equipmentsAPI, locationsAPI } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorFormatter';

const EquipmentFormDialog = ({ open, onOpenChange, equipment, onSuccess, parentId = null, defaultLocation = null }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    nom: '',
    categorie: '',
    emplacement_id: '',
    statut: 'OPERATIONNEL',
    numeroSerie: '',
    anneeFabrication: '',
    garantie: '',
    parent_id: null
  });

  useEffect(() => {
    if (open) {
      loadLocations();
      if (equipment) {
        setFormData({
          nom: equipment.nom || '',
          categorie: equipment.categorie || '',
          emplacement_id: equipment.emplacement?.id || equipment.emplacement_id || '',
          statut: equipment.statut || 'OPERATIONNEL',
          numeroSerie: equipment.numeroSerie || '',
          anneeFabrication: equipment.anneeFabrication || '',
          garantie: equipment.garantie || '',
          parent_id: equipment.parent_id || null
        });
      } else {
        setFormData({
          nom: '',
          categorie: '',
          emplacement_id: defaultLocation || '',
          statut: 'OPERATIONNEL',
          numeroSerie: '',
          anneeFabrication: '',
          garantie: '',
          parent_id: parentId || null
        });
      }
    }
  }, [open, equipment, parentId, defaultLocation]);

  const loadLocations = async () => {
    try {
      const response = await locationsAPI.getAll();
      setLocations(response.data);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        nom: formData.nom,
        statut: formData.statut,
        emplacement_id: formData.emplacement_id,
      };

      // Ajouter les champs optionnels seulement s'ils sont remplis
      if (formData.categorie) submitData.categorie = formData.categorie;
      if (formData.numeroSerie) submitData.numeroSerie = formData.numeroSerie;
      if (formData.anneeFabrication) submitData.anneeFabrication = parseInt(formData.anneeFabrication);
      if (formData.dateAchat) submitData.dateAchat = new Date(formData.dateAchat).toISOString();
      if (formData.coutAchat) submitData.coutAchat = parseFloat(formData.coutAchat);
      if (formData.garantie) submitData.garantie = formData.garantie;
      if (formData.parent_id) submitData.parent_id = formData.parent_id;

      if (equipment) {
        await equipmentsAPI.update(equipment.id, submitData);
        toast({
          title: 'Succès',
          description: 'Équipement modifié avec succès'
        });
      } else {
        await equipmentsAPI.create(submitData);
        toast({
          title: 'Succès',
          description: 'Équipement créé avec succès'
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{equipment ? 'Modifier' : 'Nouvel'} équipement</DialogTitle>
          <DialogDescription>
            Remplissez les informations de l'équipement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie</Label>
              <Input
                id="categorie"
                value={formData.categorie}
                onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATIONNEL">Opérationnel</SelectItem>
                  <SelectItem value="EN_MAINTENANCE">En maintenance</SelectItem>
                  <SelectItem value="EN_CT">En C.T</SelectItem>
                  <SelectItem value="HORS_SERVICE">Hors service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emplacement_id">Emplacement *</Label>
            <Select value={formData.emplacement_id} onValueChange={(value) => setFormData({ ...formData, emplacement_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un emplacement" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroSerie">Numéro de série</Label>
              <Input
                id="numeroSerie"
                value={formData.numeroSerie}
                onChange={(e) => setFormData({ ...formData, numeroSerie: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anneeFabrication">Année de Fabrication</Label>
              <Input
                id="anneeFabrication"
                type="number"
                placeholder="Ex: 2023"
                value={formData.anneeFabrication}
                onChange={(e) => setFormData({ ...formData, anneeFabrication: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateAchat">Date d'achat</Label>
              <Input
                id="dateAchat"
                type="date"
                value={formData.dateAchat}
                onChange={(e) => setFormData({ ...formData, dateAchat: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coutAchat">Coût d'achat (€)</Label>
              <Input
                id="coutAchat"
                type="number"
                step="0.01"
                value={formData.coutAchat}
                onChange={(e) => setFormData({ ...formData, coutAchat: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Enregistrement...' : equipment ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentFormDialog;