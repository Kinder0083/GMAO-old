import React, { useState, useEffect, useMemo } from 'react';
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
import { inventoryAPI, equipmentsAPI } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorFormatter';
import { X, Settings, ChevronRight } from 'lucide-react';

const InventoryFormDialog = ({ open, onOpenChange, item, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [equipments, setEquipments] = useState([]);
  const [loadingEquipments, setLoadingEquipments] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    reference: '',
    categorie: '',
    quantite: '',
    quantiteMin: '',
    prixUnitaire: '',
    fournisseur: '',
    emplacement: '',
    equipment_ids: []
  });

  // États pour le sélecteur d'équipements
  const [selectedMainEquipment, setSelectedMainEquipment] = useState('');
  const [selectedSubEquipment, setSelectedSubEquipment] = useState('');

  // Charger les équipements
  useEffect(() => {
    const loadEquipments = async () => {
      setLoadingEquipments(true);
      try {
        const response = await equipmentsAPI.getAll();
        setEquipments(response.data || []);
      } catch (error) {
        console.error('Erreur chargement équipements:', error);
      } finally {
        setLoadingEquipments(false);
      }
    };
    
    if (open) {
      loadEquipments();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (item) {
        setFormData({
          nom: item.nom || '',
          reference: item.reference || '',
          categorie: item.categorie || '',
          quantite: item.quantite || '',
          quantiteMin: item.quantiteMin || '',
          prixUnitaire: item.prixUnitaire || '',
          fournisseur: item.fournisseur || '',
          emplacement: item.emplacement || '',
          equipment_ids: item.equipment_ids || []
        });
      } else {
        setFormData({
          nom: '',
          reference: '',
          categorie: '',
          quantite: '',
          quantiteMin: '',
          prixUnitaire: '',
          fournisseur: '',
          emplacement: '',
          equipment_ids: []
        });
      }
      setSelectedMainEquipment('');
      setSelectedSubEquipment('');
    }
  }, [open, item]);

  // Construire la hiérarchie des équipements
  const equipmentHierarchy = useMemo(() => {
    // Équipements principaux (sans parent)
    const mainEquipments = equipments.filter(e => !e.parent_id);
    
    // Map des sous-équipements par parent_id
    const subEquipmentsByParent = {};
    equipments.forEach(e => {
      if (e.parent_id) {
        if (!subEquipmentsByParent[e.parent_id]) {
          subEquipmentsByParent[e.parent_id] = [];
        }
        subEquipmentsByParent[e.parent_id].push(e);
      }
    });
    
    return { mainEquipments, subEquipmentsByParent };
  }, [equipments]);

  // Sous-équipements du main sélectionné
  const availableSubEquipments = useMemo(() => {
    if (!selectedMainEquipment) return [];
    return equipmentHierarchy.subEquipmentsByParent[selectedMainEquipment] || [];
  }, [selectedMainEquipment, equipmentHierarchy]);

  // Ajouter un équipement à la liste
  const addEquipment = () => {
    const idToAdd = selectedSubEquipment || selectedMainEquipment;
    if (idToAdd && !formData.equipment_ids.includes(idToAdd)) {
      setFormData(prev => ({
        ...prev,
        equipment_ids: [...prev.equipment_ids, idToAdd]
      }));
    }
    setSelectedMainEquipment('');
    setSelectedSubEquipment('');
  };

  // Retirer un équipement de la liste
  const removeEquipment = (id) => {
    setFormData(prev => ({
      ...prev,
      equipment_ids: prev.equipment_ids.filter(eId => eId !== id)
    }));
  };

  // Obtenir le nom d'un équipement par son ID
  const getEquipmentName = (id) => {
    const equipment = equipments.find(e => e.id === id);
    if (!equipment) return 'Équipement inconnu';
    
    // Si c'est un sous-équipement, afficher parent > enfant
    if (equipment.parent_id) {
      const parent = equipments.find(e => e.id === equipment.parent_id);
      return parent ? `${parent.nom} > ${equipment.nom}` : equipment.nom;
    }
    return equipment.nom;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        quantite: parseInt(formData.quantite),
        quantiteMin: parseInt(formData.quantiteMin),
        prixUnitaire: parseFloat(formData.prixUnitaire),
        equipment_ids: formData.equipment_ids
      };

      if (item) {
        await inventoryAPI.update(item.id, submitData);
        
        // Déclencher l'événement pour mettre à jour le badge dans le header
        window.dispatchEvent(new Event('inventoryItemUpdated'));
        
        toast({
          title: 'Succès',
          description: 'Article modifié avec succès'
        });
      } else {
        await inventoryAPI.create(submitData);
        
        // Déclencher l'événement pour mettre à jour le badge dans le header
        window.dispatchEvent(new Event('inventoryItemCreated'));
        
        toast({
          title: 'Succès',
          description: 'Article créé avec succès'
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
          <DialogTitle>{item ? 'Modifier' : 'Nouvel'} article</DialogTitle>
          <DialogDescription>
            Remplissez les informations de l'article
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="reference">Référence *</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categorie">Catégorie *</Label>
            <Input
              id="categorie"
              value={formData.categorie}
              onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantite">Quantité *</Label>
              <Input
                id="quantite"
                type="number"
                value={formData.quantite}
                onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantiteMin">Quantité min *</Label>
              <Input
                id="quantiteMin"
                type="number"
                value={formData.quantiteMin}
                onChange={(e) => setFormData({ ...formData, quantiteMin: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prixUnitaire">Prix unitaire (€) *</Label>
              <Input
                id="prixUnitaire"
                type="number"
                step="0.01"
                value={formData.prixUnitaire}
                onChange={(e) => setFormData({ ...formData, prixUnitaire: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fournisseur">Fournisseur *</Label>
              <Input
                id="fournisseur"
                value={formData.fournisseur}
                onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emplacement">Emplacement *</Label>
              <Input
                id="emplacement"
                placeholder="Ex: Entrepôt - Étagère A3"
                value={formData.emplacement}
                onChange={(e) => setFormData({ ...formData, emplacement: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Section Appartenance aux équipements */}
          <div className="space-y-3 border-t pt-4">
            <Label className="flex items-center gap-2 text-base font-semibold">
              <Settings size={18} className="text-blue-600" />
              Appartenance aux équipements
            </Label>
            <p className="text-xs text-gray-500">
              Associez cet article à un ou plusieurs équipements/sous-équipements
            </p>

            {/* Sélecteur en cascade */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-gray-600">Équipement principal</Label>
                <select
                  value={selectedMainEquipment}
                  onChange={(e) => {
                    setSelectedMainEquipment(e.target.value);
                    setSelectedSubEquipment('');
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingEquipments}
                  data-testid="main-equipment-select"
                >
                  <option value="">-- Sélectionner --</option>
                  {equipmentHierarchy.mainEquipments.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nom}</option>
                  ))}
                </select>
              </div>

              {availableSubEquipments.length > 0 && (
                <>
                  <ChevronRight size={20} className="text-gray-400 mb-2" />
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-gray-600">Sous-équipement (optionnel)</Label>
                    <select
                      value={selectedSubEquipment}
                      onChange={(e) => setSelectedSubEquipment(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      data-testid="sub-equipment-select"
                    >
                      <option value="">-- Aucun (équipement principal) --</option>
                      {availableSubEquipments.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.nom}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={addEquipment}
                disabled={!selectedMainEquipment}
                className="mb-0"
              >
                Ajouter
              </Button>
            </div>

            {/* Liste des équipements associés */}
            {formData.equipment_ids.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Équipements associés :</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.equipment_ids.map(id => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                    >
                      <Settings size={14} />
                      {getEquipmentName(id)}
                      <button
                        type="button"
                        onClick={() => removeEquipment(id)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Enregistrement...' : item ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryFormDialog;
