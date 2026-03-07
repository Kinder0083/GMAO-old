import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus, ClipboardCheck, CheckCircle, Grid, Play, Pencil, Trash2, History, ArrowLeft, Sparkles } from 'lucide-react';
import ChecklistFormDialog from '../components/PreventiveMaintenance/ChecklistFormDialog';
import ChecklistExecutionDialog from '../components/PreventiveMaintenance/ChecklistExecutionDialog';
import ChecklistHistoryView from '../components/PreventiveMaintenance/ChecklistHistoryView';
import AIChecklistGenerator from '../components/AIChecklistGenerator';
import { checklistsAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { useConfirmDialog } from '../components/ui/confirm-dialog';

const ChecklistsManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false);
  const [checklistToExecute, setChecklistToExecute] = useState(null);
  const [executionContext, setExecutionContext] = useState({ equipmentId: null, equipmentName: '' });
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);

  const canDelete = user.role === 'ADMIN' || user.permissions?.preventiveMaintenance?.delete;

  useEffect(() => {
    loadChecklists();
  }, []);

  const loadChecklists = async () => {
    try {
      setLoading(true);
      const response = await checklistsAPI.getTemplates();
      setChecklists(response.data);
    } catch (error) {
      console.error('Erreur chargement checklists:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les checklists',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteChecklist = (checklist) => {
    setChecklistToExecute(checklist);
    setExecutionContext({
      equipmentId: checklist.equipment_ids?.[0] || null,
      equipmentName: 'Équipement'
    });
    setExecutionDialogOpen(true);
  };

  const handleDeleteChecklist = (checklist) => {
    confirm({
      title: 'Supprimer la checklist',
      description: `Voulez-vous vraiment supprimer la checklist "${checklist.name}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await checklistsAPI.deleteTemplate(checklist.id);
          toast({ title: 'Succès', description: 'Checklist supprimée' });
          loadChecklists();
        } catch (error) {
          toast({ 
            title: 'Erreur', 
            description: 'Impossible de supprimer la checklist', 
            variant: 'destructive' 
          });
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/preventive-maintenance')}
            className="hover:bg-gray-100"
          >
            <ArrowLeft size={20} className="mr-1" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Checklists</h1>
            <p className="text-gray-600 mt-1">Créez et gérez vos modèles de checklists pour les maintenances préventives</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setAiGeneratorOpen(true)}
            data-testid="ai-checklist-generator-btn"
          >
            <Sparkles size={20} className="mr-2 text-blue-600" />
            Générer avec IA
          </Button>
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => {
              setSelectedChecklist(null);
              setChecklistDialogOpen(true);
            }}
            data-testid="new-checklist-btn"
          >
            <Plus size={20} className="mr-2" />
            Nouvelle Checklist
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Checklists</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{checklists.length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <ClipboardCheck size={24} className="text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Items de contrôle</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {checklists.reduce((total, c) => total + (c.items?.length || 0), 0)}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <CheckCircle size={24} className="text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Modèles actifs</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {checklists.filter(c => c.is_template).length}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Grid size={24} className="text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklists Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck size={24} className="text-green-600" />
            Modèles de Checklists
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : checklists.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck size={64} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4 text-lg">Aucune checklist créée</p>
              <p className="text-gray-400 mb-6">Créez votre première checklist pour commencer à standardiser vos maintenances</p>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setSelectedChecklist(null);
                  setChecklistDialogOpen(true);
                }}
              >
                <Plus size={16} className="mr-1" />
                Créer votre première checklist
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checklists.map((checklist) => (
                <Card key={checklist.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{checklist.name}</h3>
                        {checklist.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{checklist.description}</p>
                        )}
                      </div>
                      {checklist.is_template && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full ml-2">
                          Modèle
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle size={16} className="text-blue-500" />
                        <span>{checklist.items?.length || 0} items de contrôle</span>
                      </div>
                      {checklist.equipment_ids?.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Grid size={16} className="text-gray-400" />
                          <span>{checklist.equipment_ids.length} équipement(s) associé(s)</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        Créée par {checklist.created_by_name || 'Inconnu'}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-green-50 hover:text-green-600"
                        onClick={() => handleExecuteChecklist(checklist)}
                        title="Exécuter"
                      >
                        <Play size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => {
                          setSelectedChecklist(checklist);
                          setChecklistDialogOpen(true);
                        }}
                        title="Modifier"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-purple-50 hover:text-purple-600"
                        onClick={() => setHistoryDialogOpen(true)}
                        title="Historique"
                      >
                        <History size={16} />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="hover:bg-red-50 hover:text-red-600 ml-auto"
                          onClick={() => handleDeleteChecklist(checklist)}
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ChecklistFormDialog
        open={checklistDialogOpen}
        onOpenChange={setChecklistDialogOpen}
        checklist={selectedChecklist}
        onSuccess={loadChecklists}
      />

      <ChecklistExecutionDialog
        open={executionDialogOpen}
        onOpenChange={setExecutionDialogOpen}
        template={checklistToExecute}
        equipmentId={executionContext.equipmentId}
        equipmentName={executionContext.equipmentName}
        onSuccess={() => {
          loadChecklists();
          toast({
            title: 'Succès',
            description: 'Checklist exécutée avec succès'
          });
        }}
      />

      <ChecklistHistoryView
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
      />

      <ConfirmDialog />
      <AIChecklistGenerator
        open={aiGeneratorOpen}
        onClose={(shouldRefresh) => {
          setAiGeneratorOpen(false);
          if (shouldRefresh) loadChecklists();
        }}
      />
    </div>
  );
};

export default ChecklistsManagement;
