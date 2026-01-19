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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Clock, Settings2, FileText, BarChart3 } from 'lucide-react';
import { workOrderTemplatesAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';

// Catégories d'ordres de travail
const CATEGORIES = [
  { value: 'CHANGEMENT_FORMAT', label: 'Changement de Format', color: 'bg-blue-100 text-blue-700' },
  { value: 'TRAVAUX_PREVENTIFS', label: 'Travaux Préventifs', color: 'bg-green-100 text-green-700' },
  { value: 'TRAVAUX_CURATIF', label: 'Travaux Curatif', color: 'bg-red-100 text-red-700' },
  { value: 'TRAVAUX_DIVERS', label: 'Travaux Divers', color: 'bg-gray-100 text-gray-700' },
  { value: 'FORMATION', label: 'Formation', color: 'bg-purple-100 text-purple-700' },
  { value: 'REGLAGE', label: 'Réglage', color: 'bg-orange-100 text-orange-700' }
];

const PRIORITES = {
  'AUCUNE': { label: 'Aucune', color: 'bg-gray-100 text-gray-600' },
  'BASSE': { label: 'Basse', color: 'bg-blue-100 text-blue-600' },
  'NORMALE': { label: 'Normale', color: 'bg-green-100 text-green-600' },
  'HAUTE': { label: 'Haute', color: 'bg-orange-100 text-orange-600' },
  'URGENTE': { label: 'Urgente', color: 'bg-red-100 text-red-600' }
};

const TemplateSelectionDialog = ({ open, onOpenChange, onSelectTemplate }) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    if (open) {
      loadTemplates();
      setSelectedTemplateId('');
      setSelectedTemplate(null);
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await workOrderTemplatesAPI.getAll();
      setTemplates(data);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les modèles',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (templateId) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
    }
  };

  const getCategoryLabel = (value) => {
    const cat = CATEGORIES.find(c => c.value === value);
    return cat?.label || value;
  };

  const getCategoryColor = (value) => {
    const cat = CATEGORIES.find(c => c.value === value);
    return cat?.color || 'bg-gray-100 text-gray-700';
  };

  // Grouper les templates par catégorie pour le select
  const groupedTemplates = CATEGORIES.reduce((acc, cat) => {
    const catTemplates = templates.filter(t => t.categorie === cat.value);
    if (catTemplates.length > 0) {
      acc.push({
        ...cat,
        templates: catTemplates
      });
    }
    return acc;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="text-blue-600" size={20} />
            Créer depuis un modèle
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un modèle d'ordre de travail pour pré-remplir le formulaire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Chargement des modèles...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">Aucun modèle disponible</p>
              <p className="text-sm text-gray-400">
                Créez des modèles depuis la page "Ordres Type"
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="template">Modèle d'ordre de travail</Label>
                <Select value={selectedTemplateId} onValueChange={handleSelectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedTemplates.map(group => (
                      <React.Fragment key={group.value}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50">
                          {group.label}
                        </div>
                        {group.templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <span>{template.nom}</span>
                              <span className="text-xs text-gray-400">
                                ({template.usage_count || 0} utilisations)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Aperçu du modèle sélectionné */}
              {selectedTemplate && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">
                          {selectedTemplate.nom}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(selectedTemplate.categorie)}`}>
                          {getCategoryLabel(selectedTemplate.categorie)}
                        </span>
                      </div>

                      {selectedTemplate.description && (
                        <p className="text-sm text-gray-600">
                          {selectedTemplate.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 text-sm">
                        {selectedTemplate.priorite && selectedTemplate.priorite !== 'AUCUNE' && (
                          <div className="flex items-center gap-1.5">
                            <Settings2 size={14} className="text-gray-500" />
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITES[selectedTemplate.priorite]?.color || PRIORITES['AUCUNE'].color}`}>
                              {PRIORITES[selectedTemplate.priorite]?.label || selectedTemplate.priorite}
                            </span>
                          </div>
                        )}

                        {selectedTemplate.temps_estime && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Clock size={14} className="text-gray-500" />
                            <span>{selectedTemplate.temps_estime}</span>
                          </div>
                        )}

                        {selectedTemplate.equipement_nom && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <span className="text-gray-500">Équipement:</span>
                            <span>{selectedTemplate.equipement_nom}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-gray-500">
                          <BarChart3 size={14} />
                          <span>{selectedTemplate.usage_count || 0} utilisation{(selectedTemplate.usage_count || 0) > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedTemplate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Utiliser ce modèle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelectionDialog;
