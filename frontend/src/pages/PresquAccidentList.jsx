import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, Download, Upload, AlertTriangle, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { presquAccidentAPI } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useConfirmDialog } from '../components/ui/confirm-dialog';
import { usePresquAccident } from '../hooks/usePresquAccident';

function PresquAccidentList() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const importInputRef = useRef(null);
  const [filteredItems, setFilteredItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [openForm, setOpenForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Utiliser le hook temps réel
  const { items, loading, refresh: loadItems } = usePresquAccident();
  
  const [filters, setFilters] = useState({
    service: '',
    status: '',
    severite: '',
    search: ''
  });

  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    date_incident: new Date().toISOString().split('T')[0],
    lieu: '',
    service: 'AUTRE',
    personnes_impliquees: '',
    declarant: '',
    contexte_cause: '',
    severite: 'MOYEN',
    actions_proposees: '',
    actions_preventions: '',
    responsable_action: '',
    date_echeance_action: '',
    commentaire: ''
  });

  // Charger les stats séparément
  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (items) {
      applyFilters();
    }
  }, [items, filters]);

  const loadStats = async () => {
    try {
      const statsData = await presquAccidentAPI.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  const loadData = async () => {
    await loadItems();
    await loadStats();
  };

  const applyFilters = () => {
    let filtered = [...items];
    if (filters.service) filtered = filtered.filter(item => item.service === filters.service);
    if (filters.status) filtered = filtered.filter(item => item.status === filters.status);
    if (filters.severite) filtered = filtered.filter(item => item.severite === filters.severite);
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.titre?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.lieu?.toLowerCase().includes(search)
      );
    }
    setFilteredItems(filtered);
  };

  const handleCreate = () => {
    setSelectedItem(null);
    setFormData({
      titre: '',
      description: '',
      date_incident: new Date().toISOString().split('T')[0],
      lieu: '',
      service: 'AUTRE',
      personnes_impliquees: '',
      declarant: '',
      contexte_cause: '',
      severite: 'MOYEN',
      actions_proposees: '',
      actions_preventions: '',
      responsable_action: '',
      date_echeance_action: '',
      commentaire: ''
    });
    setOpenForm(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      titre: item.titre || '',
      description: item.description || '',
      date_incident: item.date_incident || '',
      lieu: item.lieu || '',
      service: item.service || 'AUTRE',
      personnes_impliquees: item.personnes_impliquees || '',
      declarant: item.declarant || '',
      contexte_cause: item.contexte_cause || '',
      severite: item.severite || 'MOYEN',
      actions_proposees: item.actions_proposees || '',
      actions_preventions: item.actions_preventions || '',
      responsable_action: item.responsable_action || '',
      date_echeance_action: item.date_echeance_action || '',
      commentaire: item.commentaire || ''
    });
    setOpenForm(true);
  };

  const handleDelete = async (itemId) => {
    confirm({
      title: 'Supprimer le presqu\'accident',
      description: 'Êtes-vous sûr de vouloir supprimer ce presqu\'accident ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await presquAccidentAPI.deleteItem(itemId);
          toast({ title: 'Succès', description: 'Presqu\'accident supprimé' });
          loadData();
        } catch (error) {
          toast({ title: 'Erreur', description: 'Erreur lors de la suppression', variant: 'destructive' });
        }
      }
    });
  };

  const handleExportTemplate = async () => {
    try {
      const blob = await presquAccidentAPI.exportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_presqu_accidents.csv';
      a.click();
      toast({ title: 'Succès', description: 'Template téléchargé' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur téléchargement', variant: 'destructive' });
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await presquAccidentAPI.importData(formData);
      toast({ 
        title: 'Succès', 
        description: `${result.imported_count} presqu'accident(s) importé(s)` 
      });
      loadData();
      if (importInputRef.current) importInputRef.current.value = '';
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors de l\'import', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await presquAccidentAPI.updateItem(selectedItem.id, formData);
        toast({ title: 'Succès', description: 'Presqu\'accident mis à jour' });
      } else {
        await presquAccidentAPI.createItem(formData);
        toast({ title: 'Succès', description: 'Presqu\'accident créé' });
      }
      setOpenForm(false);
      loadData();
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors de l\'enregistrement', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'A_TRAITER': 'destructive',
      'EN_COURS': 'default',
      'TERMINE': 'secondary',
      'ARCHIVE': 'outline'
    };
    const labels = {
      'A_TRAITER': 'À traiter',
      'EN_COURS': 'En cours',
      'TERMINE': 'Terminé',
      'ARCHIVE': 'Archivé'
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  const getSeveriteBadge = (severite) => {
    const variants = {
      'FAIBLE': 'outline',
      'MOYEN': 'default',
      'ELEVE': 'secondary',
      'CRITIQUE': 'destructive'
    };
    const labels = {
      'FAIBLE': 'Faible',
      'MOYEN': 'Moyen',
      'ELEVE': 'Élevé',
      'CRITIQUE': 'Critique'
    };
    return <Badge variant={variants[severite] || 'default'}>{labels[severite] || severite}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Presqu'accidents</h1>
          <p className="text-gray-500">Gestion des presqu'accidents et incidents évités</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Template CSV
          </Button>
          <Button variant="outline" onClick={() => importInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Importer
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.global.total}</div>
              <p className="text-sm text-gray-500">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.global.a_traiter}</div>
              <p className="text-sm text-gray-500">À traiter</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.global.en_cours}</div>
              <p className="text-sm text-gray-500">En cours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.global.termine}</div>
              <p className="text-sm text-gray-500">Terminés</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="pl-10"
              />
            </div>
            <Select value={filters.service || "all"} onValueChange={(value) => setFilters({...filters, service: value === "all" ? "" : value})}>
              <SelectTrigger>
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les services</SelectItem>
                <SelectItem value="ADV">ADV</SelectItem>
                <SelectItem value="LOGISTIQUE">Logistique</SelectItem>
                <SelectItem value="PRODUCTION">Production</SelectItem>
                <SelectItem value="QHSE">QHSE</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="LABO">Labo</SelectItem>
                <SelectItem value="INDUS">Indus</SelectItem>
                <SelectItem value="AUTRE">Autre</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={(value) => setFilters({...filters, status: value === "all" ? "" : value})}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="A_TRAITER">À traiter</SelectItem>
                <SelectItem value="EN_COURS">En cours</SelectItem>
                <SelectItem value="TERMINE">Terminé</SelectItem>
                <SelectItem value="ARCHIVE">Archivé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.severite || "all"} onValueChange={(value) => setFilters({...filters, severite: value === "all" ? "" : value})}>
              <SelectTrigger>
                <SelectValue placeholder="Sévérité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sévérités</SelectItem>
                <SelectItem value="FAIBLE">Faible</SelectItem>
                <SelectItem value="MOYEN">Moyen</SelectItem>
                <SelectItem value="ELEVE">Élevé</SelectItem>
                <SelectItem value="CRITIQUE">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Presqu'accidents ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucun presqu'accident trouvé</p>
            ) : (
              filteredItems.map(item => (
                <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{item.titre}</h3>
                        {getStatusBadge(item.status)}
                        {getSeveriteBadge(item.severite)}
                        <Badge variant="outline">{item.service}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>📍 {item.lieu}</span>
                        <span>📅 {new Date(item.date_incident).toLocaleDateString('fr-FR')}</span>
                        {item.personnes_impliquees && <span>👤 {item.personnes_impliquees}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Modifier' : 'Nouveau'} Presqu'accident</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Titre *</Label>
                <Input 
                  value={formData.titre} 
                  onChange={(e) => setFormData({...formData, titre: e.target.value})}
                  required
                />
              </div>
              
              <div className="col-span-2">
                <Label>Description *</Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label>Date incident *</Label>
                <Input 
                  type="date"
                  value={formData.date_incident} 
                  onChange={(e) => setFormData({...formData, date_incident: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label>Lieu *</Label>
                <Input 
                  value={formData.lieu} 
                  onChange={(e) => setFormData({...formData, lieu: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label>Service *</Label>
                <Select value={formData.service} onValueChange={(value) => setFormData({...formData, service: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADV">ADV</SelectItem>
                    <SelectItem value="LOGISTIQUE">Logistique</SelectItem>
                    <SelectItem value="PRODUCTION">Production</SelectItem>
                    <SelectItem value="QHSE">QHSE</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="LABO">Labo</SelectItem>
                    <SelectItem value="INDUS">Indus</SelectItem>
                    <SelectItem value="AUTRE">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Sévérité</Label>
                <Select value={formData.severite} onValueChange={(value) => setFormData({...formData, severite: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FAIBLE">Faible</SelectItem>
                    <SelectItem value="MOYEN">Moyen</SelectItem>
                    <SelectItem value="ELEVE">Élevé</SelectItem>
                    <SelectItem value="CRITIQUE">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Personnes impliquées</Label>
                <Input 
                  value={formData.personnes_impliquees} 
                  onChange={(e) => setFormData({...formData, personnes_impliquees: e.target.value})}
                  placeholder="Nom, Prénom"
                />
              </div>

              <div>
                <Label>Déclarant</Label>
                <Input 
                  value={formData.declarant} 
                  onChange={(e) => setFormData({...formData, declarant: e.target.value})}
                />
              </div>

              <div className="col-span-2">
                <Label>Contexte / Cause probable</Label>
                <Textarea 
                  value={formData.contexte_cause} 
                  onChange={(e) => setFormData({...formData, contexte_cause: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="col-span-2">
                <Label>Actions proposées</Label>
                <Textarea 
                  value={formData.actions_proposees} 
                  onChange={(e) => setFormData({...formData, actions_proposees: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="col-span-2">
                <Label>Actions de prévention</Label>
                <Textarea 
                  value={formData.actions_preventions} 
                  onChange={(e) => setFormData({...formData, actions_preventions: e.target.value})}
                  rows={2}
                />
              </div>

              <div>
                <Label>Responsable action</Label>
                <Input 
                  value={formData.responsable_action} 
                  onChange={(e) => setFormData({...formData, responsable_action: e.target.value})}
                />
              </div>

              <div>
                <Label>Date échéance action</Label>
                <Input 
                  type="date"
                  value={formData.date_echeance_action} 
                  onChange={(e) => setFormData({...formData, date_echeance_action: e.target.value})}
                />
              </div>

              <div className="col-span-2">
                <Label>Commentaire</Label>
                <Textarea 
                  value={formData.commentaire} 
                  onChange={(e) => setFormData({...formData, commentaire: e.target.value})}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>
                Annuler
              </Button>
              <Button type="submit">
                {selectedItem ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </div>
  );
}

export default PresquAccidentList;
