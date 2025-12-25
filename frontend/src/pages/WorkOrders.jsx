import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Plus, Search, Filter, Eye, Pencil, Trash2, Calendar, ArrowUpDown, Paperclip, Wifi, WifiOff } from 'lucide-react';
import WorkOrderDialog from '../components/WorkOrders/WorkOrderDialog';
import WorkOrderFormDialog from '../components/WorkOrders/WorkOrderFormDialog';
import DeleteConfirmDialog from '../components/Common/DeleteConfirmDialog';
import { workOrdersAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { useWorkOrders } from '../hooks/useWorkOrders';
import { useSearchParams } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import AvatarInitials from '../components/ui/avatar-initials';
import { formatTimeToHoursMinutes } from '../utils/timeFormat';
import { formatErrorMessage } from '../utils/errorFormatter';

const WorkOrders = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canEdit, canDelete } = usePermissions();
  
  // Utiliser le hook temps réel au lieu de l'ancien système
  const { 
    workOrders: allWorkOrders, 
    loading: isLoading, 
    wsConnected,
    refresh: refreshWorkOrders,
    setWorkOrders: setAllWorkOrders
  } = useWorkOrders({});
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  // Filtres de date
  const [dateFilter, setDateFilter] = useState('today'); // today, week, month, custom
  const [dateType, setDateType] = useState('creation'); // creation ou echeance
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  useEffect(() => {
    loadWorkOrders();
  }, [dateFilter, dateType, customStartDate, customEndDate]);

  // Gérer l'ouverture automatique d'un ordre via l'URL ?open=id
  useEffect(() => {
    const openWorkOrderId = searchParams.get('open');
    if (openWorkOrderId) {
      console.log('Tentative d\'ouverture de l\'ordre:', openWorkOrderId);
      // Charger l'ordre directement par son ID
      const loadAndOpenWorkOrder = async () => {
        try {
          console.log('Appel API pour l\'ordre:', openWorkOrderId);
          const response = await workOrdersAPI.getById(openWorkOrderId);
          console.log('Réponse API:', response);
          if (response && response.data) {
            setSelectedWorkOrder(response.data);
            setFormDialogOpen(true);
            // Retirer le paramètre de l'URL après ouverture
            searchParams.delete('open');
            setSearchParams(searchParams);
          } else {
            throw new Error('Pas de données dans la réponse');
          }
        } catch (error) {
          console.error('Erreur complète:', error);
          console.error('Détails erreur:', error.response?.data);
          toast({
            title: 'Erreur',
            description: formatErrorMessage(error, 'Impossible d\'ouvrir l\'ordre de travail'),
            variant: 'destructive'
          });
          // Retirer le paramètre même en cas d'erreur
          searchParams.delete('open');
          setSearchParams(searchParams);
        }
      };
      loadAndOpenWorkOrder();
    }
  }, [searchParams]);

  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate, endDate;
    
    switch (dateFilter) {
      case 'today':
        startDate = new Date(today);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
      default:
        return {};
    }
    
    if (startDate && endDate) {
      return {
        date_debut: startDate.toISOString(),
        date_fin: endDate.toISOString(),
        date_type: dateType
      };
    }
    
    return {};
  };

  // Plus besoin de loadWorkOrders ni useAutoRefresh !
  // Le hook useWorkOrders gère tout automatiquement
  
  const handleDelete = async (id) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await workOrdersAPI.delete(itemToDelete);
      toast({
        title: 'Succès',
        description: 'Ordre de travail supprimé'
      });
      loadWorkOrders();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'ordre de travail',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const filteredWorkOrders = allWorkOrders.filter(wo => {
    const matchesSearch = wo.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (wo.numero && wo.numero.toString().includes(searchTerm));
    const matchesStatus = filterStatus === 'ALL' || wo.statut === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (statut) => {
    const badges = {
      'OUVERT': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Ouvert' },
      'EN_COURS': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En cours' },
      'EN_ATTENTE': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En attente' },
      'TERMINE': { bg: 'bg-green-100', text: 'text-green-700', label: 'Terminé' }
    };
    const badge = badges[statut] || badges['OUVERT'];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priorite) => {
    const badges = {
      'HAUTE': { bg: 'bg-red-100', text: 'text-red-700', label: 'Haute' },
      'MOYENNE': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Moyenne' },
      'BASSE': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Basse' },
      'AUCUNE': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Normale' }
    };
    const badge = badges[priorite] || badges['AUCUNE'];
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getCategoryLabel = (categorie) => {
    const labels = {
      'CHANGEMENT_FORMAT': 'Changement de Format',
      'TRAVAUX_PREVENTIFS': 'Travaux Préventifs',
      'TRAVAUX_CURATIF': 'Travaux Curatif',
      'TRAVAUX_DIVERS': 'Travaux Divers',
      'FORMATION': 'Formation',
      'REGLAGE': 'Réglage'
    };
    return labels[categorie] || '-';
  };

  const handleViewWorkOrder = (wo) => {
    setSelectedWorkOrder(wo);
    setDialogOpen(true);
  };

  const statuses = [
    { value: 'ALL', label: 'Tous' },
    { value: 'OUVERT', label: 'Ouvert' },
    { value: 'EN_COURS', label: 'En cours' },
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'TERMINE', label: 'Terminé' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ordres de travail</h1>
          <p className="text-gray-600 mt-1">Gérez vos interventions et maintenances</p>
        </div>
        {canEdit('workOrders') && (
          <Button 
            id="btn-nouvel-ordre"
            data-action="creer-ot"
            className="bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={() => {
              setSelectedWorkOrder(null);
              setFormDialogOpen(true);
            }}
          >
            <Plus size={20} className="mr-2" />
            Nouvel ordre
          </Button>
        )}
      </div>

      {/* Filtres de date */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Type de tri date */}
            <div className="flex items-center gap-2">
              <Button
                variant={dateType === 'creation' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateType(dateType === 'creation' ? 'echeance' : 'creation')}
                className="gap-2"
              >
                <ArrowUpDown size={16} />
                {dateType === 'creation' ? 'Créé le' : 'Échéance'}
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            {/* Filtres prédéfinis */}
            <div className="flex gap-2">
              <Button
                variant={dateFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setDateFilter('today');
                  setShowCustomDatePicker(false);
                }}
                className={dateFilter === 'today' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                Aujourd'hui
              </Button>
              <Button
                variant={dateFilter === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setDateFilter('week');
                  setShowCustomDatePicker(false);
                }}
                className={dateFilter === 'week' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                Cette semaine
              </Button>
              <Button
                variant={dateFilter === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setDateFilter('month');
                  setShowCustomDatePicker(false);
                }}
                className={dateFilter === 'month' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                Ce mois
              </Button>
              <Button
                variant={dateFilter === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowCustomDatePicker(!showCustomDatePicker);
                  if (!showCustomDatePicker) setDateFilter('custom');
                }}
                className={dateFilter === 'custom' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                <Calendar size={16} className="mr-2" />
                Personnalisé
              </Button>
            </div>

            {/* Sélecteur de dates personnalisé */}
            {showCustomDatePicker && (
              <>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex gap-2 items-center">
                  <Label className="text-sm">Du</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-40"
                  />
                  <Label className="text-sm">Au</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Rechercher par titre ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Filter size={20} className="text-gray-400 mt-2" />
              <div className="flex gap-2 flex-wrap">
                {statuses.map(status => (
                  <Button
                    key={status.value}
                    variant={filterStatus === status.value ? 'default' : 'outline'}
                    onClick={() => setFilterStatus(status.value)}
                    size="sm"
                    className={filterStatus === status.value ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  >
                    {status.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des ordres ({filteredWorkOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Statut</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Titre</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Priorité</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Catégorie</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Assigné</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Emplacement</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Équipement</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date limite</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Temps réel</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkOrders.map((wo) => (
                    <tr 
                      key={wo.id} 
                      className="border-b hover:bg-gray-50 transition-colors"
                      data-ai-type="WORK_ORDER"
                      data-ai-id={wo.id}
                      data-ai-name={wo.titre}
                      data-ai-status={wo.statut}
                      data-ai-extra={JSON.stringify({ numero: wo.numero, priorite: wo.priorite, categorie: wo.categorie })}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900 font-medium">#{wo.numero}</span>
                          {wo.attachments && wo.attachments.length > 0 && (
                            <Paperclip size={14} className="text-gray-500" title={`${wo.attachments.length} pièce(s) jointe(s)`} />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(wo.statut)}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium">{wo.titre}</td>
                      <td className="py-3 px-4">{getPriorityBadge(wo.priorite)}</td>
                      <td className="py-3 px-4">
                        {wo.categorie ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            {getCategoryLabel(wo.categorie)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {wo.assigneA ? (
                          <div className="flex items-center justify-center">
                            <AvatarInitials 
                              prenom={wo.assigneA.prenom} 
                              nom={wo.assigneA.nom}
                            />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">{wo.emplacement?.nom || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{wo.equipement?.nom || '-'}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {wo.dateLimite ? new Date(wo.dateLimite).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 font-medium">
                        {wo.tempsReel ? formatTimeToHoursMinutes(wo.tempsReel) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedWorkOrder(wo);
                                    setDialogOpen(true);
                                  }}
                                  className="hover:bg-blue-50 hover:text-blue-600"
                                >
                                  <Eye size={16} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p>Voir les détails</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {canEdit('workOrders') && (
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedWorkOrder(wo);
                                      setFormDialogOpen(true);
                                    }}
                                    className="hover:bg-green-50 hover:text-green-600"
                                  >
                                    <Pencil size={16} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Modifier</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {canDelete('workOrders') && (
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(wo.id)}
                                    className="hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Supprimer</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <WorkOrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workOrder={selectedWorkOrder}
        onSuccess={loadWorkOrders}
      />

      <WorkOrderFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        workOrder={selectedWorkOrder}
        onSuccess={loadWorkOrders}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Supprimer l'ordre de travail"
        description="Êtes-vous sûr de vouloir supprimer cet ordre de travail ? Cette action est irréversible."
      />
    </div>
  );
};

export default WorkOrders;