import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Copy, 
  ArrowLeft, 
  FileText, 
  Clock, 
  Settings2,
  ChevronDown,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { workOrderTemplatesAPI, equipmentsAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import DeleteConfirmDialog from '../components/Common/DeleteConfirmDialog';

// Catégories d'ordres de travail
const CATEGORIES = [
  { value: 'CHANGEMENT_FORMAT', label: 'Changement de Format', color: 'bg-blue-100 text-blue-700' },
  { value: 'TRAVAUX_PREVENTIFS', label: 'Travaux Préventifs', color: 'bg-green-100 text-green-700' },
  { value: 'TRAVAUX_CURATIF', label: 'Travaux Curatif', color: 'bg-red-100 text-red-700' },
  { value: 'TRAVAUX_DIVERS', label: 'Travaux Divers', color: 'bg-gray-100 text-gray-700' },
  { value: 'FORMATION', label: 'Formation', color: 'bg-purple-100 text-purple-700' },
  { value: 'REGLAGE', label: 'Réglage', color: 'bg-orange-100 text-orange-700' }
];

const PRIORITES = [
  { value: 'AUCUNE', label: 'Aucune' },
  { value: 'BASSE', label: 'Basse' },
  { value: 'NORMALE', label: 'Normale' },
  { value: 'HAUTE', label: 'Haute' },
  { value: 'URGENTE', label: 'Urgente' }
];

const STATUTS = [
  { value: 'OUVERT', label: 'Ouvert' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'EN_ATTENTE', label: 'En attente' }
];

const WorkOrderTemplatesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    categorie: '',
    priorite: 'AUCUNE',
    statut_defaut: 'OUVERT',
    equipement_id: '',
    temps_estime: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, equipmentsData] = await Promise.all([
        workOrderTemplatesAPI.getAll(),
        equipmentsAPI.getAll()
      ]);
      setTemplates(templatesData);
      setEquipments(equipmentsData.data || []);
      
      // Expand all categories by default
      const expanded = {};
      CATEGORIES.forEach(cat => {
        expanded[cat.value] = true;
      });
      setExpandedCategories(expanded);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les ordres type',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        nom: template.nom || '',
        description: template.description || '',
        categorie: template.categorie || '',
        priorite: template.priorite || 'AUCUNE',
        statut_defaut: template.statut_defaut || 'OUVERT',
        equipement_id: template.equipement_id || '',
        temps_estime: template.temps_estime || ''
      });
    } else {
      setSelectedTemplate(null);
      setFormData({
        nom: '',
        description: '',
        categorie: '',
        priorite: 'AUCUNE',
        statut_defaut: 'OUVERT',
        equipement_id: '',
        temps_estime: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nom.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du modèle est requis',
        variant: 'destructive'
      });
      return;
    }
    
    if (!formData.categorie) {
      toast({
        title: 'Erreur',
        description: 'La catégorie est requise',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      
      // Trouver le nom de l'équipement si sélectionné
      const equipment = equipments.find(e => e.id === formData.equipement_id);
      const dataToSave = {
        ...formData,
        equipement_nom: equipment?.nom || null
      };
      
      if (selectedTemplate) {
        await workOrderTemplatesAPI.update(selectedTemplate.id, dataToSave);
        toast({
          title: 'Succès',
          description: 'Ordre type modifié avec succès'
        });
      } else {
        await workOrderTemplatesAPI.create(dataToSave);
        toast({
          title: 'Succès',
          description: 'Ordre type créé avec succès'
        });
      }
      
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de sauvegarder',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    
    try {
      await workOrderTemplatesAPI.delete(selectedTemplate.id);
      toast({
        title: 'Succès',
        description: 'Ordre type supprimé avec succès'
      });
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'ordre type',
        variant: 'destructive'
      });
    }
  };

  const handleDuplicate = async (template) => {
    try {
      await workOrderTemplatesAPI.duplicate(template.id);
      toast({
        title: 'Succès',
        description: 'Ordre type dupliqué avec succès'
      });
      loadData();
    } catch (error) {
      console.error('Erreur duplication:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de dupliquer l\'ordre type',
        variant: 'destructive'
      });
    }
  };

  const toggleCategory = (categoryValue) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryValue]: !prev[categoryValue]
    }));
  };

  // Filtrer par recherche
  const filteredTemplates = templates.filter(t => 
    t.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouper par catégorie
  const templatesByCategory = CATEGORIES.map(cat => ({
    ...cat,
    templates: filteredTemplates.filter(t => t.categorie === cat.value)
  })).filter(cat => cat.templates.length > 0 || searchTerm === '');

  const getCategoryBadge = (categoryValue) => {
    const cat = CATEGORIES.find(c => c.value === categoryValue);
    return cat ? (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.color}`}>
        {cat.label}
      </span>
    ) : null;
  };

  const getPrioriteBadge = (priorite) => {
    const colors = {
      'AUCUNE': 'bg-gray-100 text-gray-600',
      'BASSE': 'bg-blue-100 text-blue-600',
      'NORMALE': 'bg-green-100 text-green-600',
      'HAUTE': 'bg-orange-100 text-orange-600',
      'URGENTE': 'bg-red-100 text-red-600'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[priorite] || colors['AUCUNE']}`}>
        {PRIORITES.find(p => p.value === priorite)?.label || priorite}
      </span>
    );
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/work-orders')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Ordres Type</h1>
              <p className="text-gray-600 mt-1">
                Modèles d'ordres de travail pour créer rapidement des OT
              </p>
            </div>
          </div>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            onClick={() => handleOpenDialog()}
          >
            <Plus size={20} />
            Nouveau modèle
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total modèles</p>
                  <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl">
                  <FileText size={24} className="text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Catégories</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Set(templates.map(t => t.categorie)).size}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-xl">
                  <Settings2 size={24} className="text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Utilisations totales</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {templates.reduce((sum, t) => sum + (t.usage_count || 0), 0)}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-xl">
                  <BarChart3 size={24} className="text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Plus utilisé</p>
                  <p className="text-lg font-bold text-gray-900 truncate max-w-[150px]">
                    {templates.length > 0 
                      ? templates.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))[0]?.nom || '-'
                      : '-'}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-xl">
                  <Clock size={24} className="text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recherche */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Rechercher un modèle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Liste par catégorie */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : templatesByCategory.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">Aucun ordre type créé</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus size={16} className="mr-2" />
                Créer votre premier modèle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {templatesByCategory.map(category => (
              <Card key={category.value}>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                  onClick={() => toggleCategory(category.value)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedCategories[category.value] ? (
                        <ChevronDown size={20} className="text-gray-500" />
                      ) : (
                        <ChevronRight size={20} className="text-gray-500" />
                      )}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
                        {category.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({category.templates.length} modèle{category.templates.length > 1 ? 's' : ''})
                      </span>
                    </div>
                  </div>
                </CardHeader>
                
                {expandedCategories[category.value] && (
                  <CardContent className="pt-0">
                    {category.templates.length === 0 ? (
                      <p className="text-gray-500 text-sm py-4 text-center">
                        Aucun modèle dans cette catégorie
                      </p>
                    ) : (
                      <div className="divide-y">
                        {category.templates.map(template => (
                          <div 
                            key={template.id} 
                            className="py-4 flex items-center justify-between hover:bg-gray-50 px-4 -mx-4 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-medium text-gray-900 truncate">
                                  {template.nom}
                                </h3>
                                {getPrioriteBadge(template.priorite)}
                              </div>
                              {template.description && (
                                <p className="text-sm text-gray-500 truncate max-w-xl">
                                  {template.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                {template.equipement_nom && (
                                  <span>Équipement : {template.equipement_nom}</span>
                                )}
                                {template.temps_estime && (
                                  <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {template.temps_estime}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <BarChart3 size={12} />
                                  {template.usage_count || 0} utilisation{(template.usage_count || 0) > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDuplicate(template)}
                                    className="hover:bg-blue-50 hover:text-blue-600"
                                  >
                                    <Copy size={18} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Dupliquer ce modèle</p>
                                </TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenDialog(template)}
                                    className="hover:bg-green-50 hover:text-green-600"
                                  >
                                    <Pencil size={18} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Modifier ce modèle</p>
                                </TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedTemplate(template);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 size={18} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Supprimer ce modèle</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Dialog création/modification */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {selectedTemplate ? 'Modifier l\'ordre type' : 'Créer un ordre type'}
              </DialogTitle>
              <DialogDescription>
                Ce modèle sera utilisé pour créer rapidement des ordres de travail pré-remplis.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom du modèle *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: Remplacement courroie machine X"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description / Instructions</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Instructions détaillées pour ce type de travail..."
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categorie">Catégorie *</Label>
                  <Select 
                    value={formData.categorie} 
                    onValueChange={(value) => setFormData({ ...formData, categorie: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priorite">Priorité par défaut</Label>
                  <Select 
                    value={formData.priorite} 
                    onValueChange={(value) => setFormData({ ...formData, priorite: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une priorité" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITES.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="statut_defaut">Statut par défaut</Label>
                  <Select 
                    value={formData.statut_defaut} 
                    onValueChange={(value) => setFormData({ ...formData, statut_defaut: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="temps_estime">Temps estimé</Label>
                  <Input
                    id="temps_estime"
                    value={formData.temps_estime}
                    onChange={(e) => setFormData({ ...formData, temps_estime: e.target.value })}
                    placeholder="Ex: 2h, 30min"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="equipement_id">Équipement par défaut</Label>
                <Select 
                  value={formData.equipement_id || "none"} 
                  onValueChange={(value) => setFormData({ ...formData, equipement_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun équipement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {equipments.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Enregistrement...' : (selectedTemplate ? 'Modifier' : 'Créer')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmation de suppression */}
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDelete}
          title="Supprimer l'ordre type"
          description={`Êtes-vous sûr de vouloir supprimer le modèle "${selectedTemplate?.nom}" ? Cette action est irréversible.`}
        />
      </div>
    </TooltipProvider>
  );
};

export default WorkOrderTemplatesPage;
