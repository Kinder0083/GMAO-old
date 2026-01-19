import React, { useState, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Type, 
  AlignLeft, 
  Hash, 
  Calendar, 
  List, 
  CheckSquare, 
  ToggleLeft,
  PenTool,
  Upload,
  Image,
  X,
  Settings
} from 'lucide-react';

// Types de champs disponibles
const FIELD_TYPES = [
  { value: 'text', label: 'Texte court', icon: Type, color: 'bg-blue-100 text-blue-700' },
  { value: 'textarea', label: 'Texte long', icon: AlignLeft, color: 'bg-green-100 text-green-700' },
  { value: 'number', label: 'Nombre', icon: Hash, color: 'bg-purple-100 text-purple-700' },
  { value: 'date', label: 'Date', icon: Calendar, color: 'bg-orange-100 text-orange-700' },
  { value: 'select', label: 'Liste déroulante', icon: List, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'checkbox', label: 'Case à cocher', icon: CheckSquare, color: 'bg-pink-100 text-pink-700' },
  { value: 'switch', label: 'Oui/Non', icon: ToggleLeft, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'signature', label: 'Signature', icon: PenTool, color: 'bg-red-100 text-red-700' },
  { value: 'file', label: 'Fichier joint', icon: Upload, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'logo', label: 'Logo', icon: Image, color: 'bg-teal-100 text-teal-700' }
];

// Composant champ draggable
function SortableField({ field, onUpdate, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldType = FIELD_TYPES.find(t => t.value === field.type) || FIELD_TYPES[0];
  const Icon = fieldType.icon;

  const [showOptions, setShowOptions] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm ${isDragging ? 'shadow-lg' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </button>

      {/* Field info */}
      <div className={`p-2 rounded ${fieldType.color.split(' ')[0]}`}>
        <Icon className={`h-4 w-4 ${fieldType.color.split(' ')[1]}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Input
            value={field.label}
            onChange={(e) => onUpdate(field.id, { label: e.target.value })}
            className="font-medium border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
            placeholder="Nom du champ"
          />
          {field.required && (
            <Badge variant="destructive" className="text-xs">Requis</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">{fieldType.label}</span>
          {field.type === 'select' && field.options && (
            <span className="text-xs text-gray-400">
              ({field.options.length} options)
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowOptions(!showOptions)}
          title="Paramètres du champ"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(field.id)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Supprimer le champ"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Options panel (slide down) */}
      {showOptions && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg p-4 z-10">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => onUpdate(field.id, { required: checked })}
              />
              <Label>Obligatoire</Label>
            </div>
            
            {field.type === 'text' && (
              <div>
                <Label className="text-xs">Placeholder</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
                  placeholder="Texte d'aide"
                  className="h-8 text-sm"
                />
              </div>
            )}
            
            {field.type === 'select' && (
              <div className="col-span-2">
                <Label className="text-xs">Options (une par ligne)</Label>
                <Textarea
                  value={(field.options || []).join('\n')}
                  onChange={(e) => onUpdate(field.id, { 
                    options: e.target.value.split('\n').filter(o => o.trim()) 
                  })}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={3}
                  className="text-sm"
                />
              </div>
            )}
            
            {field.type === 'number' && (
              <>
                <div>
                  <Label className="text-xs">Min</Label>
                  <Input
                    type="number"
                    value={field.min || ''}
                    onChange={(e) => onUpdate(field.id, { min: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Max</Label>
                  <Input
                    type="number"
                    value={field.max || ''}
                    onChange={(e) => onUpdate(field.id, { max: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper pour gérer le positionnement absolu des options
function SortableFieldWrapper({ field, onUpdate, onDelete }) {
  return (
    <div className="relative">
      <SortableField field={field} onUpdate={onUpdate} onDelete={onDelete} />
    </div>
  );
}

// Dialog principal du Form Builder
export default function FormBuilderDialog({ 
  open, 
  onOpenChange, 
  template = null, 
  onSave 
}) {
  const [formData, setFormData] = useState({
    nom: template?.nom || '',
    description: template?.description || '',
    type: template?.type || 'CUSTOM',
    fields: template?.fields || []
  });

  const [showAddField, setShowAddField] = useState(false);
  const [newFieldType, setNewFieldType] = useState('text');

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Reset form when dialog opens with new template
  React.useEffect(() => {
    if (open) {
      setFormData({
        nom: template?.nom || '',
        description: template?.description || '',
        type: template?.type || 'CUSTOM',
        fields: template?.fields || []
      });
    }
  }, [open, template]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setFormData(prev => {
        const oldIndex = prev.fields.findIndex(f => f.id === active.id);
        const newIndex = prev.fields.findIndex(f => f.id === over.id);
        
        return {
          ...prev,
          fields: arrayMove(prev.fields, oldIndex, newIndex)
        };
      });
    }
  }, []);

  const addField = () => {
    const fieldType = FIELD_TYPES.find(t => t.value === newFieldType);
    const newField = {
      id: `field_${Date.now()}`,
      type: newFieldType,
      label: fieldType?.label || 'Nouveau champ',
      required: false,
      placeholder: '',
      options: newFieldType === 'select' ? ['Option 1', 'Option 2'] : undefined
    };
    
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setShowAddField(false);
  };

  const updateField = (fieldId, updates) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => 
        f.id === fieldId ? { ...f, ...updates } : f
      )
    }));
  };

  const deleteField = (fieldId) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
  };

  const handleSubmit = () => {
    if (!formData.nom.trim()) {
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {template ? 'Modifier le modèle' : 'Nouveau modèle de formulaire'}
          </DialogTitle>
          <DialogDescription>
            Créez un formulaire personnalisé en ajoutant et organisant les champs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations de base */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nom du modèle *</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Fiche de non-conformité"
              />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du formulaire..."
                rows={2}
              />
            </div>
          </div>

          {/* Fields Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Champs du formulaire</Label>
              <Badge variant="outline">{formData.fields.length} champ(s)</Badge>
            </div>

            {formData.fields.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-gray-500">
                <Type className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Aucun champ ajouté</p>
                <p className="text-sm">Cliquez sur "Ajouter un champ" pour commencer</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={formData.fields.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {formData.fields.map((field) => (
                      <SortableFieldWrapper
                        key={field.id}
                        field={field}
                        onUpdate={updateField}
                        onDelete={deleteField}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Add field button */}
            {!showAddField ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddField(true)}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un champ
              </Button>
            ) : (
              <div className="border rounded-lg p-4 bg-gray-50">
                <Label className="text-sm font-medium mb-3 block">Type de champ</Label>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {FIELD_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setNewFieldType(type.value)}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          newFieldType === type.value
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mx-auto mb-1 ${
                          newFieldType === type.value ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                        <span className="text-xs block">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={addField} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddField(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.nom.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {template ? 'Enregistrer' : 'Créer le modèle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
