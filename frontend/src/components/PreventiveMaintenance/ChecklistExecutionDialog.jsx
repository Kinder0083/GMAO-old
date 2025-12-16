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
import { useToast } from '../../hooks/use-toast';
import { checklistsAPI } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorFormatter';
import { 
  ClipboardCheck, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Camera,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const ChecklistExecutionDialog = ({ 
  open, 
  onOpenChange, 
  template, 
  workOrderId = null,
  preventiveMaintenanceId = null,
  equipmentId = null,
  equipmentName = null,
  onSuccess 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState([]);
  const [generalComment, setGeneralComment] = useState('');
  const [expandedItems, setExpandedItems] = useState(new Set());

  useEffect(() => {
    if (open && template) {
      // Initialiser les réponses pour chaque item
      const initialResponses = template.items.map(item => ({
        item_id: item.id,
        item_label: item.label,
        item_type: item.type,
        value_yes_no: null,
        value_numeric: null,
        value_text: '',
        is_compliant: true,
        has_issue: false,
        issue_description: '',
        issue_photos: []
      }));
      setResponses(initialResponses);
      setGeneralComment('');
      setExpandedItems(new Set());
    }
  }, [open, template]);

  const updateResponse = (index, field, value) => {
    const newResponses = [...responses];
    newResponses[index] = { ...newResponses[index], [field]: value };
    
    // Vérifier automatiquement la conformité pour les valeurs numériques
    if (field === 'value_numeric' && template.items[index].type === 'NUMERIC') {
      const item = template.items[index];
      const numValue = parseFloat(value);
      let isCompliant = true;
      
      if (item.min_value !== null && numValue < item.min_value) {
        isCompliant = false;
      }
      if (item.max_value !== null && numValue > item.max_value) {
        isCompliant = false;
      }
      
      newResponses[index].is_compliant = isCompliant;
      
      // Si non conforme, marquer comme ayant un problème
      if (!isCompliant) {
        newResponses[index].has_issue = true;
      }
    }
    
    setResponses(newResponses);
  };

  const toggleExpanded = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Vérifier que tous les items obligatoires sont remplis
      const missingRequired = responses.some((resp, idx) => {
        const item = template.items[idx];
        if (!item.required) return false;
        
        if (item.type === 'YES_NO' && resp.value_yes_no === null) return true;
        if (item.type === 'NUMERIC' && resp.value_numeric === null) return true;
        if (item.type === 'TEXT' && !resp.value_text) return true;
        
        return false;
      });

      if (missingRequired) {
        toast({
          title: 'Attention',
          description: 'Veuillez remplir tous les items obligatoires',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Étape 1: Créer l'exécution
      const createData = {
        checklist_template_id: template.id,
        work_order_id: workOrderId,
        preventive_maintenance_id: preventiveMaintenanceId,
        equipment_id: executionContext.equipmentId
      };

      const createdExecution = await checklistsAPI.createExecution(createData);

      // Étape 2: Mettre à jour avec les réponses
      const updateData = {
        responses: responses.map(r => ({
          ...r,
          answered_at: new Date().toISOString()
        })),
        general_comment: generalComment,
        status: 'completed'
      };

      await checklistsAPI.updateExecution(createdExecution.data.id, updateData);

      toast({
        title: 'Succès',
        description: 'Checklist exécutée avec succès'
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Une erreur est survenue lors de l\'exécution de la checklist'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="text-blue-600" size={24} />
            Exécution de la checklist
          </DialogTitle>
          <DialogDescription>
            {template.name}
            {equipmentName && <span className="ml-2">- {equipmentName}</span>}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Liste des items de contrôle */}
          <div className="space-y-3">
            {template.items.map((item, index) => {
              const response = responses[index];
              if (!response) return null;

              const isExpanded = expandedItems.has(index);
              const hasIssue = response.has_issue;

              return (
                <div 
                  key={item.id} 
                  className={`border rounded-lg p-4 ${
                    hasIssue ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    {/* En-tête de l'item */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm font-medium">
                            #{index + 1}
                          </span>
                          <Label className="font-medium">
                            {item.label}
                            {item.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                        </div>
                        {item.instructions && (
                          <p className="text-sm text-gray-500 mt-1 ml-12">{item.instructions}</p>
                        )}
                      </div>

                      {/* Indicateur de conformité */}
                      {response.value_yes_no !== null || response.value_numeric !== null || response.value_text ? (
                        response.is_compliant ? (
                          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                        ) : (
                          <XCircle className="text-red-600 flex-shrink-0" size={20} />
                        )
                      ) : null}
                    </div>

                    {/* Champ de réponse selon le type */}
                    <div className="ml-12">
                      {item.type === 'YES_NO' && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={response.value_yes_no === true ? 'default' : 'outline'}
                            className={response.value_yes_no === true ? 'bg-green-600 hover:bg-green-700' : ''}
                            onClick={() => {
                              updateResponse(index, 'value_yes_no', true);
                              updateResponse(index, 'is_compliant', true);
                              updateResponse(index, 'has_issue', false);
                            }}
                          >
                            <CheckCircle size={16} className="mr-2" />
                            Conforme
                          </Button>
                          <Button
                            type="button"
                            variant={response.value_yes_no === false ? 'default' : 'outline'}
                            className={response.value_yes_no === false ? 'bg-red-600 hover:bg-red-700' : ''}
                            onClick={() => {
                              updateResponse(index, 'value_yes_no', false);
                              updateResponse(index, 'is_compliant', false);
                              updateResponse(index, 'has_issue', true);
                              setExpandedItems(new Set([...expandedItems, index]));
                            }}
                          >
                            <XCircle size={16} className="mr-2" />
                            Non conforme
                          </Button>
                        </div>
                      )}

                      {item.type === 'NUMERIC' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={response.value_numeric ?? ''}
                              onChange={(e) => updateResponse(index, 'value_numeric', e.target.value)}
                              placeholder={`Valeur attendue: ${item.expected_value ?? '-'}`}
                              className="w-40"
                            />
                            {item.unit && (
                              <span className="text-gray-600 font-medium">{item.unit}</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.min_value !== null && item.max_value !== null && (
                              <span>Plage acceptable: {item.min_value} - {item.max_value} {item.unit}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {item.type === 'TEXT' && (
                        <Input
                          value={response.value_text}
                          onChange={(e) => updateResponse(index, 'value_text', e.target.value)}
                          placeholder="Saisissez votre observation..."
                        />
                      )}
                    </div>

                    {/* Section problème (dépliable) */}
                    {hasIssue && (
                      <div className="ml-12 mt-3 border-t pt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <AlertTriangle size={16} className="mr-2" />
                          {isExpanded ? 'Masquer' : 'Documenter'} le problème
                          {isExpanded ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />}
                        </Button>

                        {isExpanded && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <Label className="text-sm flex items-center gap-1">
                                <MessageSquare size={14} />
                                Description du problème
                              </Label>
                              <Textarea
                                value={response.issue_description}
                                onChange={(e) => updateResponse(index, 'issue_description', e.target.value)}
                                placeholder="Décrivez le problème constaté..."
                                rows={2}
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label className="text-sm flex items-center gap-1 mb-2">
                                <Camera size={14} />
                                Photos (à implémenter)
                              </Label>
                              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-dashed">
                                La fonctionnalité d'upload de photos sera ajoutée prochainement
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Commentaire général */}
          <div className="space-y-2 p-4 bg-gray-50 rounded-lg border">
            <Label className="flex items-center gap-2">
              <MessageSquare size={16} />
              Commentaire général (optionnel)
            </Label>
            <Textarea
              value={generalComment}
              onChange={(e) => setGeneralComment(e.target.value)}
              placeholder="Ajoutez un commentaire général sur l'exécution de cette checklist..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Enregistrement...' : 'Valider la checklist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistExecutionDialog;
