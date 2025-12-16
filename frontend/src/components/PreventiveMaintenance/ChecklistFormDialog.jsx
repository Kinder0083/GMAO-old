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
import { Checkbox } from '../ui/checkbox';
import { useToast } from '../../hooks/use-toast';
import { checklistsAPI, equipmentsAPI } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorFormatter';
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Hash,
  Type,
  AlertCircle
} from 'lucide-react';

const ITEM_TYPES = [
  { value: 'YES_NO', label: 'Oui/Non (Conforme)', icon: CheckSquare },
  { value: 'NUMERIC', label: 'Valeur numérique', icon: Hash },
  { value: 'TEXT', label: 'Texte libre', icon: Type }
];

const ChecklistFormDialog = ({ open, onOpenChange, checklist, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [equipments, setEquipments] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    equipment_ids: [],
    items: [],
    is_template: true
  });

  useEffect(() => {
    if (open) {
      loadEquipments();
      if (checklist) {
        setFormData({
          name: checklist.name || '',
          description: checklist.description || '',
          equipment_ids: checklist.equipment_ids || [],
          items: checklist.items || [],
          is_template: checklist.is_template !== false
        });
      } else {
        setFormData({
          name: '',
          description: '',
          equipment_ids: [],
          items: [],
          is_template: true
        });
      }
    }
  }, [open, checklist]);

  const loadEquipments = async () => {
    try {
      const response = await equipmentsAPI.getAll();
      setEquipments(response.data);
    } catch (error) {
      console.error('Erreur chargement équipements:', error);
    }
  };

  const generateItemId = () => {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const addItem = () => {
    const newItem = {
      id: generateItemId(),
      label: '',
      type: 'YES_NO',
      order: formData.items.length,
      required: true,
      unit: '',
      min_value: null,
      max_value: null,
      expected_value: null,
      instructions: ''
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    // Recalculer les ordres
    updatedItems.forEach((item, i) => item.order = i);
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const moveItem = (index, direction) => {
    if (
      (direction === -1 && index === 0) ||
      (direction === 1 && index === formData.items.length - 1)
    ) return;

    const updatedItems = [...formData.items];
    const targetIndex = index + direction;
    [updatedItems[index], updatedItems[targetIndex]] = [updatedItems[targetIndex], updatedItems[index]];
    
    // Recalculer les ordres
    updatedItems.forEach((item, i) => item.order = i);
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const toggleEquipment = (equipmentId) => {
    setFormData(prev => ({
      ...prev,
      equipment_ids: prev.equipment_ids.includes(equipmentId)
        ? prev.equipment_ids.filter(id => id !== equipmentId)
        : [...prev.equipment_ids, equipmentId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: 'Erreur', description: 'Le nom est requis', variant: 'destructive' });
      return;
    }

    if (formData.items.length === 0) {
      toast({ title: 'Erreur', description: 'Ajoutez au moins un item de contrôle', variant: 'destructive' });
      return;
    }

    // Vérifier que tous les items ont un libellé
    const emptyItems = formData.items.filter(item => !item.label.trim());
    if (emptyItems.length > 0) {
      toast({ title: 'Erreur', description: 'Tous les items doivent avoir un libellé', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        items: formData.items.map(item => ({
          ...item,
          min_value: item.type === 'NUMERIC' ? item.min_value : null,
          max_value: item.type === 'NUMERIC' ? item.max_value : null,
          expected_value: item.type === 'NUMERIC' ? item.expected_value : null,
          unit: item.type === 'NUMERIC' ? item.unit : null
        }))
      };

      if (checklist) {
        await checklistsAPI.updateTemplate(checklist.id, submitData);
        toast({ title: 'Succès', description: 'Checklist modifiée avec succès' });
      } else {
        await checklistsAPI.createTemplate(submitData);
        toast({ title: 'Succès', description: 'Checklist créée avec succès' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Erreur lors de la sauvegarde'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    const found = ITEM_TYPES.find(t => t.value === type);
    return found ? found.icon : CheckSquare;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="text-blue-600" size={24} />
            {checklist ? 'Modifier la Checklist' : 'Nouvelle Checklist de Contrôles Préventifs'}
          </DialogTitle>
          <DialogDescription>
            Créez une checklist de contrôles pour vos équipements. Cette checklist pourra être utilisée lors des maintenances préventives.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du modèle *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Contrôle mensuel compresseur"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la checklist"
              />
            </div>
          </div>

          {/* Équipements associés */}
          <div className="space-y-2">
            <Label>Équipements associés (optionnel)</Label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
              {equipments.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun équipement disponible</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {equipments.map((eq) => (
                    <div key={eq.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`eq-${eq.id}`}
                        checked={formData.equipment_ids.includes(eq.id)}
                        onCheckedChange={() => toggleEquipment(eq.id)}
                      />
                      <label htmlFor={`eq-${eq.id}`} className="text-sm cursor-pointer">
                        {eq.nom}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items de contrôle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Items de contrôle *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus size={16} className="mr-1" />
                Ajouter un item
              </Button>
            </div>

            {formData.items.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <AlertCircle size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Aucun item de contrôle</p>
                <Button type="button" variant="link" onClick={addItem}>
                  Ajouter le premier item
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.items.map((item, index) => {
                  const TypeIcon = getTypeIcon(item.type);
                  return (
                    <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start gap-3">
                        {/* Boutons de déplacement */}
                        <div className="flex flex-col gap-1 pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => moveItem(index, -1)}
                            disabled={index === 0}
                          >
                            <ArrowUp size={14} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => moveItem(index, 1)}
                            disabled={index === formData.items.length - 1}
                          >
                            <ArrowDown size={14} />
                          </Button>
                        </div>

                        {/* Contenu de l'item */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium">
                              #{index + 1}
                            </span>
                            <TypeIcon size={18} className="text-gray-500" />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                              <Input
                                value={item.label}
                                onChange={(e) => updateItem(index, 'label', e.target.value)}
                                placeholder="Libellé du contrôle (ex: Vérifier le niveau huile)"
                              />
                            </div>
                            <Select
                              value={item.type}
                              onValueChange={(value) => updateItem(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {ITEM_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Options pour valeur numérique */}
                          {item.type === 'NUMERIC' && (
                            <div className="grid grid-cols-4 gap-2 bg-white p-3 rounded border">
                              <div>
                                <Label className="text-xs">Unité</Label>
                                <Input
                                  value={item.unit || ''}
                                  onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                  placeholder="°C, bar..."
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Min</Label>
                                <Input
                                  type="number"
                                  value={item.min_value ?? ''}
                                  onChange={(e) => updateItem(index, 'min_value', e.target.value ? parseFloat(e.target.value) : null)}
                                  placeholder="Min"
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Max</Label>
                                <Input
                                  type="number"
                                  value={item.max_value ?? ''}
                                  onChange={(e) => updateItem(index, 'max_value', e.target.value ? parseFloat(e.target.value) : null)}
                                  placeholder="Max"
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Attendu</Label>
                                <Input
                                  type="number"
                                  value={item.expected_value ?? ''}
                                  onChange={(e) => updateItem(index, 'expected_value', e.target.value ? parseFloat(e.target.value) : null)}
                                  placeholder="Valeur"
                                  className="h-8"
                                />
                              </div>
                            </div>
                          )}

                          {/* Instructions */}
                          <Input
                            value={item.instructions || ''}
                            onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                            placeholder="Instructions supplémentaires (optionnel)"
                            className="text-sm"
                          />

                          {/* Options */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`required-${item.id}`}
                                checked={item.required}
                                onCheckedChange={(checked) => updateItem(index, 'required', checked)}
                              />
                              <label htmlFor={`required-${item.id}`} className="text-sm">
                                Obligatoire
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Bouton supprimer */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Enregistrer comme modèle */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Checkbox
              id="is_template"
              checked={formData.is_template}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_template: checked }))}
            />
            <label htmlFor="is_template" className="text-sm">
              <span className="font-medium">Enregistrer comme modèle réutilisable</span>
              <span className="text-gray-500 ml-1">
                (pourra être sélectionné lors de la création d'une planification)
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Enregistrement...' : (checklist ? 'Enregistrer' : 'Créer la checklist')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistFormDialog;
