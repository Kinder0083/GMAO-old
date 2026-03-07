import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { 
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
  RotateCcw,
  Save,
  Loader2,
  FileText,
  X
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';

// Types de champs avec leurs icônes
const FIELD_ICONS = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  date: Calendar,
  select: List,
  checkbox: CheckSquare,
  switch: ToggleLeft,
  signature: PenTool,
  file: Upload,
  logo: Image
};

// Composant Signature Pad simple
function SignaturePadComponent({ value, onChange }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      
      // Si on a une valeur existante, la charger
      if (value) {
        const img = new window.Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          setHasSignature(true);
        };
        img.src = value;
      }
    }
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      // Sauvegarder l'image
      const dataUrl = canvasRef.current.toDataURL();
      onChange(dataUrl);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className="w-full border rounded-lg bg-white cursor-crosshair touch-none"
        style={{ maxWidth: '100%', height: '150px' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="flex gap-2 items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Effacer
        </Button>
        {hasSignature && (
          <Badge variant="outline" className="text-green-600">
            ✓ Signature enregistrée
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function CustomFormFiller({
  open,
  onOpenChange,
  template,
  poleId,
  existingForm = null,
  onSaved
}) {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const [loading, setSaving] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [signatureData, setSignatureData] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [titre, setTitre] = useState('');

  // Initialiser les valeurs
  useEffect(() => {
    if (open && template) {
      if (existingForm) {
        setFieldValues(existingForm.field_values || {});
        setSignatureData(existingForm.signature_data || null);
        setLogoUrl(existingForm.logo_url || null);
        setAttachments(existingForm.attachments || []);
        setTitre(existingForm.titre || template.nom);
      } else {
        // Initialiser avec des valeurs par défaut
        const initialValues = {};
        (template.fields || []).forEach(field => {
          if (field.type === 'checkbox' || field.type === 'switch') {
            initialValues[field.id] = false;
          } else {
            initialValues[field.id] = '';
          }
        });
        setFieldValues(initialValues);
        setSignatureData(null);
        setLogoUrl(null);
        setAttachments([]);
        setTitre(template.nom);
      }
    }
  }, [open, template, existingForm]);

  const updateFieldValue = (fieldId, value) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFileUpload = async (e, fieldId) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const fileData = {
        id: `file_${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        fieldId
      };
      
      setAttachments(prev => [...prev, fileData]);
      toast({ title: 'Fichier ajouté', description: file.name });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors de l\'upload', variant: 'destructive' });
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors de l\'upload du logo', variant: 'destructive' });
    }
  };

  const removeAttachment = (fileId) => {
    setAttachments(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmit = async (status = 'BROUILLON') => {
    try {
      setSaving(true);

      // Valider les champs requis
      const missingRequired = (template.fields || []).filter(field => {
        if (!field.required) return false;
        const value = fieldValues[field.id];
        if (field.type === 'checkbox' || field.type === 'switch') {
          return false;
        }
        return !value || value === '';
      });

      if (missingRequired.length > 0) {
        toast({
          title: 'Champs requis manquants',
          description: `Veuillez remplir: ${missingRequired.map(f => f.label).join(', ')}`,
          variant: 'destructive'
        });
        return;
      }

      const formPayload = {
        template_id: template.id,
        pole_id: poleId,
        titre,
        field_values: fieldValues,
        signature_data: signatureData,
        logo_url: logoUrl,
        attachments,
        status
      };

      let result;
      if (existingForm) {
        result = await api.put(`/documentations/custom-forms/${existingForm.id}`, formPayload);
      } else {
        result = await api.post('/documentations/custom-forms', formPayload);
      }

      toast({ 
        title: 'Succès', 
        description: existingForm ? 'Formulaire mis à jour' : 'Formulaire créé' 
      });
      
      onSaved && onSaved(result.data);
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la sauvegarde',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    const value = fieldValues[field.id];

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder || ''}
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            min={field.min}
            max={field.max}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
          />
        );

      case 'select':
        return (
          <Select 
            value={value || ''} 
            onValueChange={(v) => updateFieldValue(field.id, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option, idx) => (
                <SelectItem key={idx} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={value || false}
              onCheckedChange={(checked) => updateFieldValue(field.id, checked)}
            />
            <span className="text-sm text-gray-600">
              {value ? 'Coché' : 'Non coché'}
            </span>
          </div>
        );

      case 'switch':
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={value || false}
              onCheckedChange={(checked) => updateFieldValue(field.id, checked)}
            />
            <span className={`text-sm ${value ? 'text-green-600' : 'text-gray-500'}`}>
              {value ? 'Oui' : 'Non'}
            </span>
          </div>
        );

      case 'signature':
        return (
          <SignaturePadComponent
            value={signatureData}
            onChange={setSignatureData}
          />
        );

      case 'file':
        return (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFileUpload(e, field.id)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Ajouter un fichier
            </Button>
            {attachments.filter(a => a.fieldId === field.id).map(file => (
              <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm flex-1">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(file.id)}
                  title="Supprimer ce fichier"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        );

      case 'logo':
        return (
          <div className="space-y-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            {logoUrl ? (
              <div className="relative inline-block">
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="max-h-20 border rounded p-2"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                  onClick={() => setLogoUrl(null)}
                  title="Supprimer le logo"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => logoInputRef.current?.click()}
                title="Cliquer pour ajouter un logo"
              >
                <Image className="h-4 w-4 mr-2" />
                Ajouter un logo
              </Button>
            )}
          </div>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
          />
        );
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {existingForm ? 'Modifier le formulaire' : template.nom}
          </DialogTitle>
          <DialogDescription>
            {template.description || 'Remplissez les champs ci-dessous'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Titre du formulaire */}
          <div>
            <Label>Titre du formulaire</Label>
            <Input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Titre..."
            />
          </div>

          {/* Champs du formulaire */}
          {(template.fields || []).map((field) => {
            const Icon = FIELD_ICONS[field.type] || Type;
            return (
              <div key={field.id} className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-gray-500" />
                  {field.label}
                  {field.required && (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                {renderField(field)}
              </div>
            );
          })}

          {/* Message si pas de champs */}
          {(!template.fields || template.fields.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Ce modèle n'a pas de champs personnalisés</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            onClick={() => handleSubmit('BROUILLON')}
            disabled={loading}
            variant="outline"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enregistrer brouillon
          </Button>
          <Button
            onClick={() => handleSubmit('VALIDE')}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
