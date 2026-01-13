import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Minus, Search, Package, AlertTriangle, AlertCircle, TrendingDown, Pencil, Trash2, X, EyeOff, Eye, Settings, Filter } from 'lucide-react';
import InventoryFormDialog from '../components/Inventory/InventoryFormDialog';
import DeleteConfirmDialog from '../components/Common/DeleteConfirmDialog';
import { inventoryAPI, equipmentsAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { useInventory } from '../hooks/useInventory';

const Inventory = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlert, setFilterAlert] = useState(false);
  const [filterEquipment, setFilterEquipment] = useState(''); // Filtre par équipement
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [loadingEquipments, setLoadingEquipments] = useState(false);

  // Utiliser le hook temps réel
  const { 
    inventory, 
    loading, 
    refresh: refreshInventory,
    setInventory 
  } = useInventory();

  // Charger les équipements
  useEffect(() => {
    const loadEquipments = async () => {
      setLoadingEquipments(true);
      try {
        const response = await equipmentsAPI.getAll();
        setEquipments(response.data || []);
      } catch (error) {
        console.error('Erreur chargement équipements:', error);
      } finally {
        setLoadingEquipments(false);
      }
    };
    loadEquipments();
  }, []);

  useEffect(() => {
    // Vérifier si on doit afficher le filtre alerte
    if (location.state?.filterAlert) {
      setFilterAlert(true);
    }
    // Vérifier si on doit filtrer par équipement (depuis la page Équipements)
    if (location.state?.filterEquipment) {
      setFilterEquipment(location.state.filterEquipment);
    }
  }, [location]);

  // Construire la hiérarchie des équipements pour le filtre
  const equipmentOptions = useMemo(() => {
    const mainEquipments = equipments.filter(e => !e.parent_id);
    const options = [];
    
    mainEquipments.forEach(main => {
      options.push({ id: main.id, name: main.nom, isMain: true });
      // Ajouter les sous-équipements
      const subs = equipments.filter(e => e.parent_id === main.id);
      subs.forEach(sub => {
        options.push({ id: sub.id, name: `  └─ ${sub.nom}`, isMain: false, parentName: main.nom });
      });
    });
    
    return options;
  }, [equipments]);

  // Obtenir le nom d'un équipement par ID
  const getEquipmentName = (id) => {
    const equipment = equipments.find(e => e.id === id);
    if (!equipment) return null;
    
    if (equipment.parent_id) {
      const parent = equipments.find(e => e.id === equipment.parent_id);
      return parent ? `${parent.nom} > ${equipment.nom}` : equipment.nom;
    }
    return equipment.nom;
  };

  const adjustQuantity = async (item, delta) => {
    try {
      const newQuantity = item.quantite + delta;
      await inventoryAPI.update(item.id, { ...item, quantite: newQuantity });
      
      // Mise à jour locale immédiate
      setInventory(prev => prev.map(i => 
        i.id === item.id ? { ...i, quantite: newQuantity } : i
      ));
      
      // Déclencher l'événement pour mettre à jour le badge dans le header
      window.dispatchEvent(new Event('inventoryItemUpdated'));
      
      toast({
        title: 'Quantité mise à jour',
        description: `${item.nom}: ${item.quantite} → ${newQuantity}`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la quantité',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await inventoryAPI.delete(itemToDelete);
      
      // Déclencher l'événement pour mettre à jour le badge dans le header
      window.dispatchEvent(new Event('inventoryItemDeleted'));
      
      toast({
        title: 'Succès',
        description: 'Article supprimé'
      });
      refreshInventory();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'article',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleToggleMonitoring = async (item) => {
    try {
      const response = await inventoryAPI.toggleMonitoring(item.id);
      const newStatus = response.data.stock_monitoring_enabled;
      
      toast({
        title: 'Succès',
        description: `Surveillance ${newStatus ? 'activée' : 'désactivée'} pour ${item.nom}`,
      });
      refreshInventory();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la surveillance',
        variant: 'destructive'
      });
    }
  };

  const filteredInventory = inventory.filter(item => {
    // Filtre de recherche par texte
    const matchesSearch = item.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.categorie.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtre alerte (rupture ou niveau bas)
    if (filterAlert) {
      const isAlert = item.quantite <= item.quantiteMin;
      if (!isAlert) return false;
    }
    
    // Filtre par équipement
    if (filterEquipment) {
      const equipmentIds = item.equipment_ids || [];
      if (!equipmentIds.includes(filterEquipment)) {
        // Vérifier aussi si c'est un sous-équipement du filtre
        const filterEq = equipments.find(e => e.id === filterEquipment);
        if (filterEq && !filterEq.parent_id) {
          // C'est un équipement principal, vérifier si l'article appartient à un de ses sous-équipements
          const subIds = equipments.filter(e => e.parent_id === filterEquipment).map(e => e.id);
          const hasSubEquipment = equipmentIds.some(id => subIds.includes(id));
          if (!hasSubEquipment && !equipmentIds.includes(filterEquipment)) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
    
    return matchesSearch;
  });

  // Filtrer uniquement les articles avec surveillance active pour les stats
  const monitoredItems = inventory.filter(item => item.stock_monitoring_enabled !== false);
  
  const lowStockItems = monitoredItems.filter(item => 
    (item.quantite || 0) <= (item.quantiteMin || item.seuil_alerte || 0)
  );
  const totalValue = monitoredItems.reduce((sum, item) => 
    sum + ((item.quantite || 0) * (item.prixUnitaire || item.prix_unitaire || 0)), 0
  );

  const getStockStatus = (item) => {
    const quantite = item.quantite || 0;
    const seuilMin = item.quantiteMin || item.seuil_alerte || 0;
    
    if (quantite <= 0) {
      return { color: 'text-red-600', bg: 'bg-red-100', label: 'Rupture', icon: AlertCircle };
    } else if (quantite <= seuilMin) {
      return { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Stock bas', icon: AlertTriangle };
    }
    return { color: 'text-green-600', bg: 'bg-green-100', label: 'En stock', icon: Package };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventaire</h1>
          <p className="text-gray-600 mt-1">Gérez vos pièces et fournitures</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
          setSelectedItem(null);
          setFormDialogOpen(true);
        }}>
          <Plus size={20} className="mr-2" />
          Nouvel article
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Articles totaux</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{inventory.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Package size={24} className="text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valeur totale</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {totalValue.toLocaleString('fr-FR')} €
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <TrendingDown size={24} className="text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Alertes stock bas</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{lowStockItems.length}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-xl">
                <AlertTriangle size={24} className="text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-orange-600 mt-1" size={20} />
              <div>
                <h3 className="font-semibold text-orange-900">Alerte de stock bas</h3>
                <p className="text-sm text-orange-700 mt-1">
                  {lowStockItems.length} article(s) nécessite(nt) un réapprovisionnement :
                  <span className="font-medium"> {lowStockItems.map(item => item.nom).join(', ')}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  placeholder="Rechercher par nom, référence ou catégorie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filtre par équipement */}
              <div className="w-72">
                <select
                  value={filterEquipment}
                  onChange={(e) => setFilterEquipment(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="equipment-filter"
                >
                  <option value="">🔧 Tous les équipements</option>
                  {equipmentOptions.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Badges filtres actifs */}
            <div className="flex flex-wrap gap-2">
              {filterAlert && (
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={16} className="text-orange-600" />
                  <span className="text-sm text-orange-800 font-medium">
                    Articles en alerte
                  </span>
                  <button
                    onClick={() => setFilterAlert(false)}
                    className="text-orange-600 hover:text-orange-800"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              
              {filterEquipment && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <Settings size={16} className="text-blue-600" />
                  <span className="text-sm text-blue-800 font-medium">
                    {getEquipmentName(filterEquipment) || 'Équipement'}
                  </span>
                  <button
                    onClick={() => setFilterEquipment('')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des articles ({filteredInventory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Référence</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nom</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Catégorie</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Appartenance</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Quantité</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Min.</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Prix unit.</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Statut</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const status = getStockStatus(item);
                    const StatusIcon = status.icon;
                    const equipmentNames = (item.equipment_ids || [])
                      .map(id => getEquipmentName(id))
                      .filter(Boolean);
                    
                    return (
                      <tr key={item.id} className={`border-b hover:bg-gray-50 transition-colors ${item.stock_monitoring_enabled === false ? 'opacity-60' : ''}`}>
                        <td className="py-3 px-4 text-sm text-gray-900 font-medium">{item.reference}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                          <div className="flex items-center gap-2">
                            {item.nom}
                            {item.stock_monitoring_enabled === false && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded" title="Surveillance désactivée">
                                <EyeOff size={12} className="inline" /> Non surveillé
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700">{item.categorie}</td>
                        <td className="py-3 px-4">
                          {equipmentNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {equipmentNames.slice(0, 2).map((name, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs"
                                  title={name}
                                >
                                  <Settings size={10} />
                                  <span className="truncate max-w-[100px]">{name}</span>
                                </span>
                              ))}
                              {equipmentNames.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{equipmentNames.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => adjustQuantity(item, -1)}
                              className="h-7 w-7 p-0 hover:bg-red-50 hover:border-red-300"
                            >
                              <Minus size={14} />
                            </Button>
                            <span className="text-sm text-gray-900 font-bold min-w-[40px] text-center">
                              {item.quantite}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => adjustQuantity(item, 1)}
                              className="h-7 w-7 p-0 hover:bg-green-50 hover:border-green-300"
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{item.quantiteMin || item.seuil_alerte || 0}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          {(item.prixUnitaire || item.prix_unitaire || 0).toFixed(2)} €
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color} flex items-center gap-1 w-fit`}>
                            <StatusIcon size={14} />
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleMonitoring(item)}
                              className={item.stock_monitoring_enabled === false ? "hover:bg-blue-50 hover:text-blue-600" : "hover:bg-gray-50 hover:text-gray-600"}
                              title={item.stock_monitoring_enabled === false ? "Activer la surveillance du stock" : "Désactiver la surveillance du stock"}
                            >
                              {item.stock_monitoring_enabled === false ? <Eye size={16} /> : <EyeOff size={16} />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setFormDialogOpen(true);
                              }}
                              className="hover:bg-green-50 hover:text-green-600"
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <InventoryFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        item={selectedItem}
        onSuccess={refreshInventory}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Supprimer l'article"
        message="Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible."
      />
    </div>
  );
};

export default Inventory;
