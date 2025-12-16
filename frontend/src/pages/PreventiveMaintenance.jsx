import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../components/ui/dialog';
import { Plus, Calendar, Clock, CheckCircle, List, Grid, Trash2, ClipboardCheck, Edit, Eye } from 'lucide-react';
import PreventiveMaintenanceFormDialog from '../components/PreventiveMaintenance/PreventiveMaintenanceFormDialog';
import ChecklistFormDialog from '../components/PreventiveMaintenance/ChecklistFormDialog';
import { preventiveMaintenanceAPI, workOrdersAPI, checklistsAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { useConfirmDialog } from '../components/ui/confirm-dialog';

const PreventiveMaintenance = () => {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'tree', ou 'checklists'
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState(null);
  
  // États pour les checklists
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [loadingChecklists, setLoadingChecklists] = useState(false);

  // Vérifier les permissions
  const canDelete = user?.permissions?.preventiveMaintenance?.delete === true;
  const canEdit = user?.permissions?.preventiveMaintenance?.edit === true;

  // Fonction pour afficher le badge de statut
  const getStatusBadge = (statut) => {
    const statusConfig = {
      'ACTIF': { label: 'Actif', className: 'bg-green-100 text-green-800' },
      'INACTIF': { label: 'Inactif', className: 'bg-gray-100 text-gray-800' },
      'SUSPENDU': { label: 'Suspendu', className: 'bg-yellow-100 text-yellow-800' }
    };
    
    const config = statusConfig[statut] || statusConfig['INACTIF'];
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  useEffect(() => {
    loadMaintenance();
    loadChecklists();
  }, []);

  const loadChecklists = async () => {
    try {
      setLoadingChecklists(true);
      const response = await checklistsAPI.getTemplates();
      setChecklists(response.data);
    } catch (error) {
      console.error('Erreur chargement checklists:', error);
    } finally {
      setLoadingChecklists(false);
    }
  };

  const loadMaintenance = async () => {
    try {
      setLoading(true);
      const response = await preventiveMaintenanceAPI.getAll();
      setMaintenance(response.data);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les maintenances préventives',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!maintenanceToDelete) return;

    try {
      await preventiveMaintenanceAPI.delete(maintenanceToDelete.id);
      toast({
        title: 'Succès',
        description: 'Maintenance préventive supprimée'
      });
      setDeleteDialogOpen(false);
      setMaintenanceToDelete(null);
      loadMaintenance();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la maintenance préventive',
        variant: 'destructive'
      });
    }
  };

  const handleExecuteNow = async (pm) => {
    confirm({
      title: 'Créer un ordre de travail',
      description: `Voulez-vous créer un ordre de travail pour la maintenance "${pm.titre}" ?`,
      confirmText: 'Créer',
      cancelText: 'Annuler',
      variant: 'default',
      onConfirm: async () => {
        try {
          // Créer un ordre de travail basé sur la maintenance préventive
          await workOrdersAPI.create({
            titre: pm.titre,
            description: `Maintenance préventive: ${pm.titre}`,
            statut: 'OUVERT',
            priorite: 'MOYENNE',
            equipement_id: pm.equipement?.id,
            assigne_a_id: pm.assigneA?.id,
            tempsEstime: pm.duree,
            dateLimite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // +7 jours
          });
          
          toast({
            title: 'Succès',
            description: 'Ordre de travail créé avec succès'
          });
        } catch (error) {
          toast({
            title: 'Erreur',
            description: 'Impossible de créer l\'ordre de travail',
            variant: 'destructive'
          });
        }
      }
    });
  };

  const getFrequencyBadge = (frequency) => {
    const badges = {
      'HEBDOMADAIRE': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Hebdomadaire' },
      'MENSUEL': { bg: 'bg-green-100', text: 'text-green-700', label: 'Mensuel' },
      'TRIMESTRIEL': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Trimestriel' },
      'ANNUEL': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Annuel' }
    };
    const badge = badges[frequency] || badges['MENSUEL'];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const upcomingMaintenance = maintenance.filter(m => m.statut === 'ACTIF');
  
  // Calculer les maintenances à venir cette semaine
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingThisWeek = upcomingMaintenance.filter(m => {
    const nextMaintDate = new Date(m.prochaineMaintenance);
    return nextMaintDate >= now && nextMaintDate <= nextWeek;
  }).length;

  // Calculer les maintenances complétées ce mois
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const completedThisMonth = maintenance.filter(m => {
    if (m.derniereMaintenance) {
      const lastMaintDate = new Date(m.derniereMaintenance);
      return lastMaintDate >= startOfMonth && lastMaintDate <= endOfMonth;
    }
    return false;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Préventive</h1>
          <p className="text-gray-600 mt-1">Planifiez et suivez vos maintenances programmées</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              <List size={16} className="mr-1" />
              Liste
            </Button>
            <Button
              variant={viewMode === 'tree' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('tree')}
              className={viewMode === 'tree' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              <Grid size={16} className="mr-1" />
              Arborescence
            </Button>
            <Button
              variant={viewMode === 'checklists' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('checklists')}
              className={viewMode === 'checklists' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              <ClipboardCheck size={16} className="mr-1" />
              Checklists
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
              setSelectedMaintenance(null);
              setFormDialogOpen(true);
            }}>
              <Plus size={20} className="mr-2" />
              Nouvelle planification
            </Button>
            <Button 
              variant="outline" 
              className="border-green-500 text-green-600 hover:bg-green-50"
              onClick={() => {
                setSelectedChecklist(null);
                setChecklistDialogOpen(true);
              }}
            >
              <Plus size={20} className="mr-2" />
              Nouvelle Checklist
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Maintenances actives</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{upcomingMaintenance.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Calendar size={24} className="text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prochainement</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{upcomingThisWeek}</p>
                <p className="text-xs text-gray-500 mt-1">Cette semaine</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-xl">
                <Clock size={24} className="text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Complétées ce mois</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{completedThisMonth}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <CheckCircle size={24} className="text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Cards ou Arborescence */}
      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : maintenance.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">Aucune maintenance préventive trouvée</p>
            </div>
          ) : (
            maintenance.map((item) => (
            <Card key={item.id} className="hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{item.titre}</CardTitle>
                    {getFrequencyBadge(item.frequence)}
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    {item.statut}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Equipment */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Équipement</p>
                    <p className="font-medium text-gray-900">{item.equipement?.nom || '-'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Next Maintenance */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar size={16} className="text-blue-600" />
                        <p className="text-xs text-gray-600">Prochaine maintenance</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.prochaineMaintenance ? new Date(item.prochaineMaintenance).toLocaleDateString('fr-FR') : '-'}
                      </p>
                    </div>

                    {/* Last Maintenance */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={16} className="text-green-600" />
                        <p className="text-xs text-gray-600">Dernière maintenance</p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.derniereMaintenance ? new Date(item.derniereMaintenance).toLocaleDateString('fr-FR') : 'Jamais'}
                      </p>
                    </div>
                  </div>

                  {/* Assigned To */}
                  {item.assigneA && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Assigné à</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {item.assigneA.prenom[0]}{item.assigneA.nom[0]}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {item.assigneA.prenom} {item.assigneA.nom}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Duration */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Clock size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700">Durée estimée: <span className="font-medium">{item.duree}h</span></span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 hover:bg-blue-50 hover:text-blue-600"
                      onClick={() => {
                        setSelectedMaintenance(item);
                        setFormDialogOpen(true);
                      }}
                    >
                      Modifier
                    </Button>
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleExecuteNow(item)}
                    >
                      Exécuter maintenant
                    </Button>
                    {canDelete && (
                      <Button 
                        variant="outline" 
                        className="hover:bg-red-50 hover:text-red-600"
                        onClick={() => {
                          setMaintenanceToDelete(item);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      ) : (
        /* Vue Arborescence - Groupée par fréquence */
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Chargement...</p>
              </div>
            ) : maintenance.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucune maintenance préventive trouvée</p>
              </div>
            ) : (
              <div className="space-y-6">
                {['QUOTIDIEN', 'HEBDOMADAIRE', 'MENSUEL', 'TRIMESTRIEL', 'ANNUEL'].map((freq) => {
                  const items = maintenance.filter(m => m.frequence === freq);
                  if (items.length === 0) return null;
                  
                  const freqLabels = {
                    'QUOTIDIEN': 'Quotidien',
                    'HEBDOMADAIRE': 'Hebdomadaire',
                    'MENSUEL': 'Mensuel',
                    'TRIMESTRIEL': 'Trimestriel',
                    'ANNUEL': 'Annuel'
                  };
                  
                  return (
                    <div key={freq} className="border rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-600" />
                        {freqLabels[freq]} ({items.length})
                      </h3>
                      <div className="space-y-3 pl-6">
                        {items.map((item) => (
                          <div key={item.id} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{item.titre}</p>
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                  <span>Équipement: {item.equipement?.nom || 'Non assigné'}</span>
                                  <span>Prochaine: {new Date(item.prochaineMaintenance).toLocaleDateString()}</span>
                                  {getStatusBadge(item.statut)}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedMaintenance(item);
                                    setFormDialogOpen(true);
                                  }}
                                  className="hover:bg-blue-50"
                                >
                                  Modifier
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleExecuteNow(item)}
                                  className="hover:bg-green-50"
                                >
                                  Exécuter
                                </Button>
                                {canDelete && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setMaintenanceToDelete(item);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vue Checklists */}
      {viewMode === 'checklists' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck size={24} className="text-green-600" />
                Modèles de Checklists
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedChecklist(null);
                  setChecklistDialogOpen(true);
                }}
              >
                <Plus size={16} className="mr-1" />
                Nouvelle Checklist
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingChecklists ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Chargement...</p>
              </div>
            ) : checklists.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardCheck size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">Aucune checklist créée</p>
                <Button
                  variant="outline"
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
                  <Card key={checklist.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{checklist.name}</h3>
                          {checklist.description && (
                            <p className="text-sm text-gray-500 mt-1">{checklist.description}</p>
                          )}
                        </div>
                        {checklist.is_template && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
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
                          Créée par {checklist.created_by_name}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedChecklist(checklist);
                            setChecklistDialogOpen(true);
                          }}
                        >
                          <Edit size={14} className="mr-1" />
                          Modifier
                        </Button>
                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => {
                              confirm({
                                title: 'Supprimer la checklist',
                                description: `Voulez-vous vraiment supprimer la checklist "${checklist.name}" ?`,
                                confirmText: 'Supprimer',
                                cancelText: 'Annuler',
                                variant: 'destructive',
                                onConfirm: async () => {
                                  try {
                                    await checklistsAPI.deleteTemplate(checklist.id);
                                    toast({ title: 'Succès', description: 'Checklist supprimée' });
                                    loadChecklists();
                                  } catch (error) {
                                    toast({ title: 'Erreur', description: 'Erreur de suppression', variant: 'destructive' });
                                  }
                                }
                              });
                            }}
                          >
                            <Trash2 size={14} />
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
      )}

      <PreventiveMaintenanceFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        maintenance={selectedMaintenance}
        onSuccess={loadMaintenance}
        checklists={checklists}
      />

      <ChecklistFormDialog
        open={checklistDialogOpen}
        onOpenChange={setChecklistDialogOpen}
        checklist={selectedChecklist}
        onSuccess={loadChecklists}
      />

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la maintenance préventive "{maintenanceToDelete?.titre}" ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </div>
  );
};

export default PreventiveMaintenance;