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
import { improvementRequestsAPI, equipmentsAPI, locationsAPI } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorFormatter';

const ImprovementRequestFormDialog = ({ open, onOpenChange, request, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [equipments, setEquipments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    priorite: 'AUCUNE',
    equipement_id: '',
    emplacement_id: '',
    date_limite_desiree: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
      if (request) {
        setFormData({
          titre: request.titre || '',
          description: request.description || '',
          priorite: request.priorite || 'AUCUNE',
          equipement_id: request.equipement?.id || '',
          emplacement_id: request.emplacement?.id || '',
          date_limite_desiree: request.date_limite_desiree?.split('T')[0] || ''
        });
      } else {
        setFormData({
          titre: '',
          description: '',
          priorite: 'AUCUNE',
          equipement_id: '',
          emplacement_id: '',
          date_limite_desiree: ''
        });
      }
    }
  }, [open, request]);

  const loadData = async () => {
    try {
      const [eqRes, locRes] = await Promise.all([
        equipmentsAPI.getAll(),
        locationsAPI.getAll()
      ]);
      setEquipments(eqRes.data);
      setLocations(locRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        equipement_id: formData.equipement_id || null,
        emplacement_id: formData.emplacement_id || null,
        date_limite_desiree: formData.date_limite_desiree ? new Date(formData.date_limite_desiree).toISOString() : null
      };

      if (request) {
        await improvementRequestsAPI.update(request.id, submitData);
        toast({
          title: 'Succès',
          description: 'Demande modifiée avec succès'
        });
      } else {
        await improvementRequestsAPI.create(submitData);
        toast({
          title: 'Succès',
          description: 'Demande transmise avec succès'
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
          <DialogTitle>{request ? 'Modifier' : 'Nouvelle'} demande d'intervention</DialogTitle>
          <DialogDescription>
            Remplissez les informations de la demande
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input
              id="titre"
              value={formData.titre}
              onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              placeholder="Titre de la demande"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez la demande..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priorite">Priorité</Label>
              <Select value={formData.priorite} onValueChange={(value) => setFormData({ ...formData, priorite: value })}>
                <SelectTrigger id="priorite">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUCUNE">Normale</SelectItem>
                  <SelectItem value="BASSE">Basse</SelectItem>
                  <SelectItem value="MOYENNE">Moyenne</SelectItem>
                  <SelectItem value="HAUTE">Haute</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_limite_desiree">Date Limite Désirée</Label>
              <Input
                id="date_limite_desiree"
                type="date"
                value={formData.date_limite_desiree}
                onChange={(e) => setFormData({ ...formData, date_limite_desiree: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipement">Équipement</Label>
              <Select
                value={formData.equipement_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, equipement_id: value === "none" ? "" : value })}
              >
                <SelectTrigger id="equipement">
                  <SelectValue placeholder="Sélectionner un équipement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {equipments.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Transmission...' : request ? 'Modifier' : 'Transmettre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ImprovementRequestFormDialog;