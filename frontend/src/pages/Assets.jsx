import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Search, Wrench, AlertCircle, CheckCircle2, Clock, Pencil, Trash2, List, GitBranch, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EquipmentFormDialog from '../components/Equipment/EquipmentFormDialog';
import EquipmentTreeView from '../components/Equipment/EquipmentTreeView';
import QuickStatusChanger from '../components/Equipment/QuickStatusChanger';
import DeleteConfirmDialog from '../components/Common/DeleteConfirmDialog';
import { equipmentsAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { useEquipments } from '../hooks/useEquipments';

const Assets = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('tree'); // 'list' ou 'tree' - arborescence par défaut
  const [parentForNewChild, setParentForNewChild] = useState(null);

  // Utiliser le hook temps réel
  const { 
    equipments, 
    loading, 
    refresh: refreshEquipments 
  } = useEquipments();

  const handleDelete = async (equipment) => {
    setItemToDelete(equipment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await equipmentsAPI.delete(itemToDelete.id);
      toast({
        title: 'Succès',
        description: 'Équipement supprimé'
      });
      refreshEquipments();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'équipement',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleAddChild = (parent) => {
    setParentForNewChild(parent);
    setSelectedEquipment(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (equipment) => {
    setParentForNewChild(null);
    setSelectedEquipment(equipment);
    setFormDialogOpen(true);
  };

  const handleAdd = () => {
    setParentForNewChild(null);
    setSelectedEquipment(null);
    setFormDialogOpen(true);
  };

  const handleViewDetails = (equipment) => {
    navigate(`/assets/${equipment.id}`);
  };

  const handleStatusChange = async (equipmentId, newStatus) => {
    // Recharger toute la liste pour obtenir les changements de statut parent
    await refreshEquipments();
  };

  const filteredEquipments = equipments.filter(eq => {
    const matchesSearch = eq.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (eq.numeroSerie && eq.numeroSerie.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'ALL' || eq.statut === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (statut) => {
    const badges = {
      'OPERATIONNEL': { 
        bg: 'bg-green-100', 
        text: 'text-green-700', 
        label: 'Opérationnel',
        icon: CheckCircle2,
        iconColor: 'text-green-600'
      },
      'EN_FONCTIONNEMENT': { 
        bg: 'bg-emerald-100', 
        text: 'text-emerald-700', 
        label: 'En Fonctionnement',
        icon: CheckCircle2,
        iconColor: 'text-emerald-600'
      },
      'A_LARRET': { 
        bg: 'bg-gray-100', 
        text: 'text-gray-700', 
        label: 'A l\'arrêt',
        icon: Clock,
        iconColor: 'text-gray-600'
      },
      'EN_MAINTENANCE': { 
        bg: 'bg-orange-100', 
        text: 'text-orange-700', 
        label: 'En maintenance',
        icon: Clock,
        iconColor: 'text-orange-600'
      },
      'HORS_SERVICE': { 
        bg: 'bg-red-100', 
        text: 'text-red-700', 
        label: 'Hors service',
        icon: AlertCircle,
        iconColor: 'text-red-600'
      },
      'EN_CT': { 
        bg: 'bg-purple-100', 
        text: 'text-purple-700', 
        label: 'En C.T',
        icon: FileCheck,
        iconColor: 'text-purple-600'
      },
      'ALERTE_S_EQUIP': { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-700', 
        label: 'Alerte S.Equip',
        icon: AlertCircle,
        iconColor: 'text-yellow-600'
      }
    };
    const badge = badges[statut] || badges['OPERATIONNEL'];
    const Icon = badge.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text} flex items-center gap-1 w-fit`}>
        <Icon size={14} className={badge.iconColor} />
        {badge.label}
      </span>
    );
  };

  // Définition de tous les statuts avec leurs compteurs
  const allStatuses = [
    { value: 'ALL', label: 'Tous', count: equipments.length },
    { value: 'OPERATIONNEL', label: 'Opérationnel', count: equipments.filter(e => e.statut === 'OPERATIONNEL').length },
    { value: 'EN_FONCTIONNEMENT', label: 'En Fonctionnement', count: equipments.filter(e => e.statut === 'EN_FONCTIONNEMENT').length },
    { value: 'A_LARRET', label: 'A l\'arrêt', count: equipments.filter(e => e.statut === 'A_LARRET').length },
    { value: 'EN_MAINTENANCE', label: 'En maintenance', count: equipments.filter(e => e.statut === 'EN_MAINTENANCE').length },
    { value: 'HORS_SERVICE', label: 'Hors service', count: equipments.filter(e => e.statut === 'HORS_SERVICE').length },
    { value: 'EN_CT', label: 'En C.T', count: equipments.filter(e => e.statut === 'EN_CT').length },
    { value: 'ALERTE_S_EQUIP', label: 'Alerte S.Equip', count: equipments.filter(e => e.statut === 'ALERTE_S_EQUIP').length }
  ];

  // Filtrer pour n'afficher que les statuts avec count > 0 (sauf "Tous")
  const statuses = allStatuses.filter(s => s.value === 'ALL' || s.count > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Équipements</h1>
          <p className="text-gray-600 mt-1">Gérez votre parc d'équipements</p>
        </div>
        <div className="flex gap-3">
          {/* Toggle View Mode */}
          <div className="flex gap-1 bg-gray-200 p-1 rounded-lg border border-gray-300">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : 'hover:bg-gray-100'}
            >
              <List size={18} className="mr-2" />
              Liste
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('tree')}
              className={viewMode === 'tree' ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : 'hover:bg-gray-100'}
            >
              <GitBranch size={18} className="mr-2" />
              Arborescence
            </Button>
          </div>
          
          <Button 
            id="btn-nouvel-equipement"
            data-action="creer-equipement"
            className="bg-blue-600 hover:bg-blue-700 text-white" 
            onClick={handleAdd}
          >
            <Plus size={20} className="mr-2" />
            Nouvel équipement
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Opérationnel</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {equipments.filter(e => e.statut === 'OPERATIONNEL').length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <CheckCircle2 size={24} className="text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En maintenance</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {equipments.filter(e => e.statut === 'EN_MAINTENANCE').length}
                </p>
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
                <p className="text-sm font-medium text-gray-600">En C.T</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {equipments.filter(e => e.statut === 'EN_CT').length}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <FileCheck size={24} className="text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hors service</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {equipments.filter(e => e.statut === 'HORS_SERVICE').length}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <AlertCircle size={24} className="text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Rechercher par nom ou numéro de série..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {statuses.map(status => (
                <Button
                  key={status.value}
                  variant={filterStatus === status.value ? 'default' : 'outline'}
                  onClick={() => setFilterStatus(status.value)}
                  size="sm"
                  className={filterStatus === status.value ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  {status.label} ({status.count})
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Display - Mode List or Tree */}
      {viewMode === 'tree' ? (
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Chargement...</p>
              </div>
            ) : (
              <EquipmentTreeView
                equipments={filteredEquipments}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddChild={handleAddChild}
                onViewDetails={handleViewDetails}
                onStatusChange={handleStatusChange}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : filteredEquipments.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">Aucun équipement trouvé</p>
            </div>
          ) : (
            filteredEquipments.filter(eq => !eq.parent_id).map((equipment) => (
              <Card 
                key={equipment.id} 
                className="hover:shadow-xl transition-all duration-300 cursor-pointer group"
                data-ai-type="EQUIPMENT"
                data-ai-id={equipment.id}
                data-ai-name={equipment.nom}
                data-ai-status={equipment.statut}
                data-ai-extra={JSON.stringify({ categorie: equipment.categorie, emplacement: equipment.emplacement?.nom })}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Wrench size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{equipment.nom}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">{equipment.categorie}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <QuickStatusChanger 
                      equipment={equipment} 
                      onStatusChange={handleStatusChange}
                    />
                    
                    <div className="space-y-2 text-sm">
                      {equipment.numeroSerie && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">N° Série:</span>
                          <span className="font-medium text-gray-900">{equipment.numeroSerie}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Emplacement:</span>
                        <span className="font-medium text-gray-900">{equipment.emplacement?.nom || '-'}</span>
                      </div>
                      {equipment.dateAchat && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date d'achat:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(equipment.dateAchat).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                      {equipment.coutAchat && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Coût d'achat:</span>
                          <span className="font-medium text-gray-900">{equipment.coutAchat.toLocaleString('fr-FR')} €</span>
                        </div>
                      )}
                      {equipment.anneeFabrication && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Année de Fabrication:</span>
                          <span className="font-medium text-gray-900">{equipment.anneeFabrication}</span>
                        </div>
                      )}
                      {equipment.derniereMaintenance && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dernière maintenance:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(equipment.derniereMaintenance).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                      {equipment.hasChildren && (
                        <div className="flex justify-between">
                          <span className="text-blue-600 font-semibold">A des sous-équipements</span>
                          <span className="font-medium text-blue-600">Cliquer pour voir</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 min-w-[100px] hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => handleViewDetails(equipment)}
                      >
                        Voir détails
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="hover:bg-green-50 hover:text-green-600 h-9 w-9 p-0"
                        onClick={() => handleAddChild(equipment)}
                        title="Ajouter un sous-équipement"
                      >
                        <Plus size={16} />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="hover:bg-yellow-50 hover:text-yellow-600 h-9 w-9 p-0"
                        onClick={() => handleEdit(equipment)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="hover:bg-red-50 hover:text-red-600 h-9 w-9 p-0"
                        onClick={() => handleDelete(equipment)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <EquipmentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        equipment={selectedEquipment}
        onSuccess={refreshEquipments}
        parentId={parentForNewChild?.id}
        defaultLocation={parentForNewChild?.emplacement_id}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Supprimer l'équipement"
        description={`Êtes-vous sûr de vouloir supprimer ${itemToDelete?.nom} ? Cette action est irréversible.`}
      />
    </div>
  );
};

export default Assets;