import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { checklistsAPI } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorFormatter';
import { 
  ClipboardCheck, 
  CheckCircle, 
  XCircle, 
  Calendar,
  User,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const ChecklistHistoryView = ({ 
  open, 
  onOpenChange,
  workOrderId = null,
  preventiveMaintenanceId = null,
  equipmentId = null
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [executions, setExecutions] = useState([]);
  const [selectedExecution, setSelectedExecution] = useState(null);

  useEffect(() => {
    if (open) {
      loadExecutions();
    }
  }, [open, workOrderId, preventiveMaintenanceId, equipmentId]);

  const loadExecutions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (workOrderId) params.work_order_id = workOrderId;
      if (preventiveMaintenanceId) params.preventive_maintenance_id = preventiveMaintenanceId;
      if (equipmentId) params.equipment_id = equipmentId;

      const response = await checklistsAPI.getExecutions(params);
      setExecutions(response.data);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Erreur lors du chargement de l\'historique'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getComplianceRate = (execution) => {
    if (execution.total_items === 0) return 0;
    return Math.round((execution.compliant_items / execution.total_items) * 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="text-blue-600" size={24} />
            Historique des Checklists
          </DialogTitle>
          <DialogDescription>
            Consultez l'historique des exécutions de checklists
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Chargement de l'historique...
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ClipboardCheck size={48} className="mx-auto mb-3 text-gray-300" />
              Aucune checklist exécutée pour le moment
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((execution) => {
                const complianceRate = getComplianceRate(execution);
                const isExpanded = selectedExecution?.id === execution.id;

                return (
                  <div 
                    key={execution.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* En-tête de l'exécution */}
                    <div 
                      className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => setSelectedExecution(isExpanded ? null : execution)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {execution.checklist_name}
                            </h3>
                            <Badge 
                              variant={execution.status === 'completed' ? 'default' : 'secondary'}
                              className={execution.status === 'completed' ? 'bg-green-600' : ''}
                            >
                              {execution.status === 'completed' ? 'Terminée' : 'En cours'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {formatDate(execution.started_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              {execution.executed_by_name}
                            </span>
                            {execution.equipment_name && (
                              <span className="text-gray-500">
                                {execution.equipment_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Indicateur de conformité */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              complianceRate >= 80 ? 'text-green-600' : 
                              complianceRate >= 50 ? 'text-orange-500' : 
                              'text-red-600'
                            }`}>
                              {complianceRate}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {execution.compliant_items}/{execution.total_items} conformes
                            </div>
                          </div>

                          {isExpanded ? (
                            <ChevronUp className="text-gray-400" size={20} />
                          ) : (
                            <ChevronDown className="text-gray-400" size={20} />
                          )}
                        </div>
                      </div>

                      {/* Alerte si non-conformités */}
                      {execution.non_compliant_items > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-orange-600 text-sm">
                          <AlertTriangle size={14} />
                          <span>{execution.non_compliant_items} point(s) non conforme(s) détecté(s)</span>
                        </div>
                      )}
                    </div>

                    {/* Détails de l'exécution (dépliable) */}
                    {isExpanded && (
                      <div className="p-4 border-t bg-white">
                        <div className="space-y-3">
                          {execution.responses?.map((response, idx) => {
                            const isCompliant = response.is_compliant;
                            const hasIssue = response.has_issue;

                            return (
                              <div 
                                key={response.item_id}
                                className={`p-3 rounded border ${
                                  hasIssue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                                        #{idx + 1}
                                      </span>
                                      <span className="font-medium text-gray-900">
                                        {response.item_label}
                                      </span>
                                      {isCompliant ? (
                                        <CheckCircle className="text-green-600" size={16} />
                                      ) : (
                                        <XCircle className="text-red-600" size={16} />
                                      )}
                                    </div>

                                    {/* Valeur de la réponse */}
                                    <div className="ml-7 mt-2 space-y-1">
                                      {response.item_type === 'YES_NO' && (
                                        <div className="text-sm">
                                          <span className="text-gray-600">Réponse: </span>
                                          <span className={response.value_yes_no ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                            {response.value_yes_no ? 'Conforme' : 'Non conforme'}
                                          </span>
                                        </div>
                                      )}
                                      {response.item_type === 'NUMERIC' && (
                                        <div className="text-sm">
                                          <span className="text-gray-600">Valeur mesurée: </span>
                                          <span className="font-medium">
                                            {response.value_numeric}
                                          </span>
                                        </div>
                                      )}
                                      {response.item_type === 'TEXT' && (
                                        <div className="text-sm">
                                          <span className="text-gray-600">Observation: </span>
                                          <span className="font-medium">
                                            {response.value_text}
                                          </span>
                                        </div>
                                      )}

                                      {/* Problème signalé */}
                                      {hasIssue && response.issue_description && (
                                        <div className="mt-2 p-2 bg-white rounded border border-red-200">
                                          <div className="flex items-start gap-2">
                                            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={14} />
                                            <div className="text-sm text-red-800">
                                              {response.issue_description}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Commentaire général */}
                          {execution.general_comment && (
                            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                              <div className="flex items-start gap-2">
                                <FileText className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
                                <div>
                                  <div className="font-medium text-blue-900 text-sm mb-1">
                                    Commentaire général
                                  </div>
                                  <div className="text-sm text-blue-800">
                                    {execution.general_comment}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChecklistHistoryView;
