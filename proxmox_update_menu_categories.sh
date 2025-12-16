#!/bin/bash
# ============================================================
# SCRIPT DE MISE À JOUR - Groupement personnalisé des menus
# Version: 1.1.5
# À exécuter sur votre serveur Proxmox
# ============================================================

set -e
echo "=== Mise à jour du groupement des menus ==="

cd /opt/gmao-iris

# Backup des fichiers existants
echo "[1/4] Sauvegarde des fichiers..."
cp frontend/src/components/Personnalisation/MenuOrganizationSection.jsx frontend/src/components/Personnalisation/MenuOrganizationSection.jsx.backup.$(date +%Y%m%d_%H%M%S)
cp frontend/src/components/Layout/MainLayout.jsx frontend/src/components/Layout/MainLayout.jsx.backup.$(date +%Y%m%d_%H%M%S)

# Mise à jour de MenuOrganizationSection.jsx
echo "[2/4] Mise à jour de MenuOrganizationSection.jsx..."
cat > frontend/src/components/Personnalisation/MenuOrganizationSection.jsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  GripVertical,
  Eye,
  EyeOff,
  Star,
  Plus,
  Trash2,
  Edit,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  X,
  LayoutDashboard,
  ClipboardList,
  Package,
  MapPin,
  Wrench,
  BarChart3,
  Users,
  ShoppingCart,
  ShoppingBag,
  Calendar,
  MessageSquare,
  Lightbulb,
  Sparkles,
  Gauge,
  Shield,
  FileText,
  AlertTriangle,
  FolderOpen as FolderOpenIcon,
  Database,
  Activity,
  Terminal,
  Mail
} from 'lucide-react';

// Liste des icônes disponibles pour les catégories
const AVAILABLE_ICONS = [
  { id: 'Folder', icon: Folder, label: 'Dossier' },
  { id: 'FolderOpen', icon: FolderOpen, label: 'Dossier Ouvert' },
  { id: 'LayoutDashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'ClipboardList', icon: ClipboardList, label: 'Liste' },
  { id: 'Wrench', icon: Wrench, label: 'Maintenance' },
  { id: 'Package', icon: Package, label: 'Stock' },
  { id: 'BarChart3', icon: BarChart3, label: 'Rapports' },
  { id: 'Users', icon: Users, label: 'Équipes' },
  { id: 'Calendar', icon: Calendar, label: 'Planning' },
  { id: 'ShoppingCart', icon: ShoppingCart, label: 'Achats' },
  { id: 'Shield', icon: Shield, label: 'Sécurité' },
  { id: 'Activity', icon: Activity, label: 'IoT' },
  { id: 'Database', icon: Database, label: 'Données' },
  { id: 'MessageSquare', icon: MessageSquare, label: 'Messages' },
];

const DEFAULT_MENU_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', path: '/dashboard', icon: 'LayoutDashboard', module: 'dashboard', visible: true, favorite: false, order: 0, category_id: null },
  { id: 'chat-live', label: 'Chat Live', path: '/chat-live', icon: 'Mail', module: 'chatLive', visible: true, favorite: false, order: 1, category_id: null },
  { id: 'intervention-requests', label: 'Demandes d\'inter.', path: '/intervention-requests', icon: 'MessageSquare', module: 'interventionRequests', visible: true, favorite: false, order: 2, category_id: null },
  { id: 'work-orders', label: 'Ordres de travail', path: '/work-orders', icon: 'ClipboardList', module: 'workOrders', visible: true, favorite: false, order: 3, category_id: null },
  { id: 'improvement-requests', label: 'Demandes d\'amél.', path: '/improvement-requests', icon: 'Lightbulb', module: 'improvementRequests', visible: true, favorite: false, order: 4, category_id: null },
  { id: 'improvements', label: 'Améliorations', path: '/improvements', icon: 'Sparkles', module: 'improvements', visible: true, favorite: false, order: 5, category_id: null },
  { id: 'preventive-maintenance', label: 'Maintenance prev.', path: '/preventive-maintenance', icon: 'Calendar', module: 'preventiveMaintenance', visible: true, favorite: false, order: 6, category_id: null },
  { id: 'planning-mprev', label: 'Planning M.Prev.', path: '/planning-mprev', icon: 'Calendar', module: 'preventiveMaintenance', visible: true, favorite: false, order: 7, category_id: null },
  { id: 'assets', label: 'Équipements', path: '/assets', icon: 'Wrench', module: 'assets', visible: true, favorite: false, order: 8, category_id: null },
  { id: 'inventory', label: 'Inventaire', path: '/inventory', icon: 'Package', module: 'inventory', visible: true, favorite: false, order: 9, category_id: null },
  { id: 'purchase-requests', label: 'Demandes d\'Achat', path: '/purchase-requests', icon: 'ShoppingCart', module: 'purchaseRequests', visible: true, favorite: false, order: 10, category_id: null },
  { id: 'locations', label: 'Zones', path: '/locations', icon: 'MapPin', module: 'locations', visible: true, favorite: false, order: 11, category_id: null },
  { id: 'meters', label: 'Compteurs', path: '/meters', icon: 'Gauge', module: 'meters', visible: true, favorite: false, order: 12, category_id: null },
  { id: 'surveillance-plan', label: 'Plan de Surveillance', path: '/surveillance-plan', icon: 'Shield', module: 'surveillance', visible: true, favorite: false, order: 13, category_id: null },
  { id: 'surveillance-rapport', label: 'Rapport Surveillance', path: '/surveillance-rapport', icon: 'FileText', module: 'surveillance', visible: true, favorite: false, order: 14, category_id: null },
  { id: 'presqu-accident', label: 'Presqu\'accident', path: '/presqu-accident', icon: 'AlertTriangle', module: 'presquaccident', visible: true, favorite: false, order: 15, category_id: null },
  { id: 'presqu-accident-rapport', label: 'Rapport P.accident', path: '/presqu-accident-rapport', icon: 'FileText', module: 'presquaccident', visible: true, favorite: false, order: 16, category_id: null },
  { id: 'documentations', label: 'Documentations', path: '/documentations', icon: 'FolderOpen', module: 'documentations', visible: true, favorite: false, order: 17, category_id: null },
  { id: 'reports', label: 'Rapports', path: '/reports', icon: 'BarChart3', module: 'reports', visible: true, favorite: false, order: 18, category_id: null },
  { id: 'people', label: 'Équipes', path: '/people', icon: 'Users', module: 'people', visible: true, favorite: false, order: 19, category_id: null },
  { id: 'planning', label: 'Planning', path: '/planning', icon: 'Calendar', module: 'planning', visible: true, favorite: false, order: 20, category_id: null },
  { id: 'vendors', label: 'Fournisseurs', path: '/vendors', icon: 'ShoppingCart', module: 'vendors', visible: true, favorite: false, order: 21, category_id: null },
  { id: 'purchase-history', label: 'Historique Achat', path: '/purchase-history', icon: 'ShoppingBag', module: 'purchaseHistory', visible: true, favorite: false, order: 22, category_id: null },
  { id: 'import-export', label: 'Import / Export', path: '/import-export', icon: 'Database', module: 'importExport', visible: true, favorite: false, order: 23, category_id: null },
  { id: 'sensors', label: 'Capteurs MQTT', path: '/sensors', icon: 'Activity', module: 'sensors', visible: true, favorite: false, order: 24, category_id: null },
  { id: 'iot-dashboard', label: 'Dashboard IoT', path: '/iot-dashboard', icon: 'BarChart3', module: 'iotDashboard', visible: true, favorite: false, order: 25, category_id: null },
  { id: 'mqtt-logs', label: 'Logs MQTT', path: '/mqtt-logs', icon: 'Terminal', module: 'mqttLogs', visible: true, favorite: false, order: 26, category_id: null }
];

const MenuOrganizationSection = () => {
  const { preferences, updatePreferences } = usePreferences();
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  
  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Folder');

  useEffect(() => {
    // Charger les menus depuis les préférences ou utiliser les valeurs par défaut
    const loadedMenuItems = preferences?.menu_items?.length > 0 
      ? preferences.menu_items.map(item => ({
          ...item,
          category_id: item.category_id || null
        }))
      : DEFAULT_MENU_ITEMS;
    
    setMenuItems(loadedMenuItems);
    
    // Charger les catégories
    const loadedCategories = preferences?.menu_categories || [];
    setCategories(loadedCategories);
    
    // Initialiser les catégories comme expandées
    const initialExpanded = {};
    loadedCategories.forEach(cat => {
      initialExpanded[cat.id] = true;
    });
    setExpandedCategories(initialExpanded);
  }, [preferences]);

  // Générer un ID unique
  const generateId = () => {
    return 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  // Créer une nouvelle catégorie
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: 'Erreur', description: 'Le nom de la catégorie est requis', variant: 'destructive' });
      return;
    }

    const newCategory = {
      id: editingCategory?.id || generateId(),
      name: newCategoryName.trim(),
      icon: newCategoryIcon,
      order: editingCategory?.order ?? categories.length,
      items: editingCategory?.items || []
    };

    let updatedCategories;
    if (editingCategory) {
      updatedCategories = categories.map(cat => 
        cat.id === editingCategory.id ? newCategory : cat
      );
    } else {
      updatedCategories = [...categories, newCategory];
    }

    setCategories(updatedCategories);
    setExpandedCategories(prev => ({ ...prev, [newCategory.id]: true }));

    try {
      await updatePreferences({ menu_categories: updatedCategories });
      toast({ 
        title: 'Succès', 
        description: editingCategory ? 'Catégorie modifiée' : 'Catégorie créée' 
      });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de sauvegarde', variant: 'destructive' });
    }

    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryIcon('Folder');
  };

  // Supprimer une catégorie
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Supprimer cette catégorie ? Les menus seront déplacés vers "Sans catégorie".')) {
      return;
    }

    // Retirer les menus de cette catégorie
    const updatedMenuItems = menuItems.map(item => 
      item.category_id === categoryId ? { ...item, category_id: null } : item
    );
    
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);

    setMenuItems(updatedMenuItems);
    setCategories(updatedCategories);

    try {
      await updatePreferences({ 
        menu_categories: updatedCategories,
        menu_items: updatedMenuItems 
      });
      toast({ title: 'Succès', description: 'Catégorie supprimée' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de suppression', variant: 'destructive' });
    }
  };

  // Ouvrir le dialog pour modifier une catégorie
  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryIcon(category.icon || 'Folder');
    setCategoryDialogOpen(true);
  };

  // Toggle visibilité d'un menu
  const toggleVisibility = async (itemId) => {
    const updatedItems = menuItems.map(item =>
      item.id === itemId ? { ...item, visible: !item.visible } : item
    );
    setMenuItems(updatedItems);

    try {
      await updatePreferences({ menu_items: updatedItems });
      toast({ title: 'Succès', description: 'Visibilité mise à jour' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de mise à jour', variant: 'destructive' });
    }
  };

  // Toggle favori d'un menu
  const toggleFavorite = async (itemId) => {
    const updatedItems = menuItems.map(item =>
      item.id === itemId ? { ...item, favorite: !item.favorite } : item
    );
    setMenuItems(updatedItems);

    try {
      await updatePreferences({ menu_items: updatedItems });
      toast({ title: 'Succès', description: 'Favori mis à jour' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de mise à jour', variant: 'destructive' });
    }
  };

  // Drag & Drop pour les menus
  const handleDragStart = (item, type) => {
    setDraggedItem({ item, type });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnCategory = async (categoryId) => {
    if (!draggedItem || draggedItem.type !== 'menu') return;

    const updatedItems = menuItems.map(item =>
      item.id === draggedItem.item.id ? { ...item, category_id: categoryId } : item
    );
    setMenuItems(updatedItems);
    setDraggedItem(null);

    try {
      await updatePreferences({ menu_items: updatedItems });
      toast({ title: 'Succès', description: 'Menu déplacé dans la catégorie' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de déplacement', variant: 'destructive' });
    }
  };

  const handleDropOnUncategorized = async () => {
    if (!draggedItem || draggedItem.type !== 'menu') return;

    const updatedItems = menuItems.map(item =>
      item.id === draggedItem.item.id ? { ...item, category_id: null } : item
    );
    setMenuItems(updatedItems);
    setDraggedItem(null);

    try {
      await updatePreferences({ menu_items: updatedItems });
      toast({ title: 'Succès', description: 'Menu retiré de la catégorie' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de déplacement', variant: 'destructive' });
    }
  };

  // Toggle expansion d'une catégorie
  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Réordonner les menus à l'intérieur d'une catégorie
  const handleDropOnMenuItem = async (targetItemId, targetCategoryId) => {
    if (!draggedItem || draggedItem.type !== 'menu') return;
    if (draggedItem.item.id === targetItemId) {
      setDraggedItem(null);
      return;
    }

    const updatedItems = [...menuItems];
    const draggedIndex = updatedItems.findIndex(item => item.id === draggedItem.item.id);
    const targetIndex = updatedItems.findIndex(item => item.id === targetItemId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // Retirer l'élément dragué
    const [removed] = updatedItems.splice(draggedIndex, 1);
    
    // Mettre à jour la catégorie si nécessaire
    removed.category_id = targetCategoryId;
    
    // Insérer à la nouvelle position
    const newTargetIndex = updatedItems.findIndex(item => item.id === targetItemId);
    updatedItems.splice(newTargetIndex, 0, removed);

    // Mettre à jour les ordres
    const finalItems = updatedItems.map((item, index) => ({ ...item, order: index }));

    setMenuItems(finalItems);
    setDraggedItem(null);

    try {
      await updatePreferences({ menu_items: finalItems });
      toast({ title: 'Succès', description: 'Ordre mis à jour' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de réorganisation', variant: 'destructive' });
    }
  };

  // Migration des menus
  const migrateMenus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user-preferences/migrate-menus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Erreur lors de la migration');
      }
      
      toast({ 
        title: 'Succès', 
        description: data.message || 'Menus mis à jour' 
      });
      
      window.location.reload();
    } catch (error) {
      toast({ 
        title: 'Erreur', 
        description: error.message || 'Erreur de migration', 
        variant: 'destructive' 
      });
    }
  };

  // Réinitialiser l'ordre
  const resetOrder = async () => {
    if (!window.confirm('Réinitialiser tous les menus et catégories ?')) return;
    
    setMenuItems(DEFAULT_MENU_ITEMS);
    setCategories([]);
    
    try {
      await updatePreferences({ 
        menu_items: DEFAULT_MENU_ITEMS,
        menu_categories: []
      });
      toast({ title: 'Succès', description: 'Menus réinitialisés' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de réinitialisation', variant: 'destructive' });
    }
  };

  // Obtenir l'icône d'une catégorie
  const getCategoryIcon = (iconId) => {
    const iconDef = AVAILABLE_ICONS.find(i => i.id === iconId);
    return iconDef ? iconDef.icon : Folder;
  };

  // Filtrer les menus par catégorie
  const getMenusByCategory = (categoryId) => {
    return menuItems
      .filter(item => item.category_id === categoryId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  // Menus sans catégorie
  const uncategorizedMenus = menuItems
    .filter(item => !item.category_id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Fonction de rendu pour un menu item
  const renderMenuItemRow = (item, categoryId) => (
    <div
      key={item.id}
      draggable
      onDragStart={() => handleDragStart(item, 'menu')}
      onDragOver={handleDragOver}
      onDrop={() => handleDropOnMenuItem(item.id, categoryId)}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        draggedItem?.item?.id === item.id ? 'bg-blue-50 border-blue-300 opacity-50' : 'bg-white border-gray-200'
      } ${!item.visible ? 'opacity-50' : ''} cursor-move hover:border-blue-200`}
    >
      <div className="cursor-grab active:cursor-grabbing">
        <GripVertical size={20} className="text-gray-400" />
      </div>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-sm font-medium">{item.label}</span>
        {item.favorite && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleFavorite(item.id)}
          title={item.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Star size={16} className={item.favorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleVisibility(item.id)}
          title={item.visible ? 'Masquer' : 'Afficher'}
        >
          {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <Label className="text-base font-semibold">Organiser les menus par catégories</Label>
              <p className="text-sm text-gray-500 mt-1">
                Créez des catégories et glissez-déposez les menus pour les organiser
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => {
                  setEditingCategory(null);
                  setNewCategoryName('');
                  setNewCategoryIcon('Folder');
                  setCategoryDialogOpen(true);
                }}
                className="gap-2"
              >
                <FolderPlus size={16} />
                Nouvelle catégorie
              </Button>
              <Button variant="outline" size="sm" onClick={migrateMenus}>
                Ajouter les menus manquants
              </Button>
              <Button variant="outline" size="sm" onClick={resetOrder}>
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catégories */}
      {categories.length > 0 && (
        <div className="space-y-4">
          <Label className="text-sm font-semibold text-gray-700">Catégories</Label>
          {categories
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(category => {
              const CategoryIcon = getCategoryIcon(category.icon);
              const categoryMenus = getMenusByCategory(category.id);
              const isExpanded = expandedCategories[category.id];

              return (
                <Card 
                  key={category.id}
                  className="overflow-hidden"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDropOnCategory(category.id)}
                >
                  <div 
                    className={`flex items-center gap-3 p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors ${
                      draggedItem?.type === 'menu' ? 'ring-2 ring-blue-300 ring-inset' : ''
                    }`}
                    onClick={() => toggleCategoryExpansion(category.id)}
                  >
                    <button className="p-1">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <CategoryIcon size={20} className="text-blue-600" />
                    <span className="font-semibold flex-1">{category.name}</span>
                    <span className="text-sm text-gray-500">{categoryMenus.length} menu(s)</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCategory(category);
                        }}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <CardContent className="pt-3 pb-3 space-y-2">
                      {categoryMenus.length > 0 ? (
                        categoryMenus.map(item => renderMenuItemRow(item, category.id))
                      ) : (
                        <div className="text-center py-6 text-gray-400 border-2 border-dashed rounded-lg">
                          <FolderOpenIcon size={32} className="mx-auto mb-2 opacity-50" />
                          <p>Glissez des menus ici</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
        </div>
      )}

      {/* Menus sans catégorie */}
      <Card
        onDragOver={handleDragOver}
        onDrop={handleDropOnUncategorized}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <Folder size={20} className="text-gray-400" />
            <Label className="text-base font-semibold">Sans catégorie</Label>
            <span className="text-sm text-gray-500">({uncategorizedMenus.length} menu(s))</span>
          </div>
          
          <div className={`space-y-2 ${draggedItem?.type === 'menu' ? 'ring-2 ring-gray-300 ring-inset rounded-lg p-2' : ''}`}>
            {uncategorizedMenus.map(item => renderMenuItemRow(item, null))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de création/modification de catégorie */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom de la catégorie</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Maintenance, Stock, Administration..."
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>Icône</Label>
              <div className="grid grid-cols-7 gap-2 mt-2">
                {AVAILABLE_ICONS.map(({ id, icon: IconComponent, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setNewCategoryIcon(id)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      newCategoryIcon === id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    title={label}
                  >
                    <IconComponent size={20} className={newCategoryIcon === id ? 'text-blue-600' : 'text-gray-600'} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateCategory}>
              {editingCategory ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuOrganizationSection;
EOF

# Mise à jour de MainLayout.jsx
echo "[3/4] Mise à jour de MainLayout.jsx..."
cat > frontend/src/components/Layout/MainLayout.jsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  MapPin,
  Wrench,
  BarChart3,
  Users,
  ShoppingCart,
  ShoppingBag,
  Calendar,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Bell,
  Database,
  RefreshCw,
  FileText,
  Gauge,
  MessageSquare,
  Lightbulb,
  Sparkles,
  Shield,
  Eye,
  AlertTriangle,
  FolderOpen,
  Folder,
  Terminal,
  Palette,
  Mail,
  Radio,
  Activity
} from 'lucide-react';
import FirstLoginPasswordDialog from '../Common/FirstLoginPasswordDialog';
import UpdateNotificationBadge from '../Common/UpdateNotificationBadge';
import HelpButton from '../Common/HelpButton';
import ManualButton from '../Common/ManualButton';
import RecentUpdatePopup from '../Common/RecentUpdatePopup';
import AlertNotifications from '../Common/AlertNotifications';
import InactivityHandler from '../Common/InactivityHandler';
import TokenValidator from '../Common/TokenValidator';
import { usePermissions } from '../../hooks/usePermissions';
import { getBackendURL } from '../../utils/config';
import { usePreferences } from '../../contexts/PreferencesContext';

const MainLayout = () => {
  const { preferences } = usePreferences();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [firstLoginDialogOpen, setFirstLoginDialogOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState({ nom: 'Utilisateur', role: 'VIEWER', firstLogin: false, id: '' });
  const [workOrdersCount, setWorkOrdersCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0); // Nombre d'échéances dépassées TOTAL
  const [overdueDetails, setOverdueDetails] = useState({}); // Détails par module
  const [overdueMenuOpen, setOverdueMenuOpen] = useState(false); // Menu déroulant échéances
  // Compteurs séparés par catégorie
  const [overdueExecutionCount, setOverdueExecutionCount] = useState(0); // Work orders + Improvements (orange)
  const [overdueRequestsCount, setOverdueRequestsCount] = useState(0); // Demandes d'inter. + Demandes d'amél. (jaune)
  const [overdueMaintenanceCount, setOverdueMaintenanceCount] = useState(0); // Maintenances préventives (bleu)
  const [surveillanceBadge, setSurveillanceBadge] = useState({ echeances_proches: 0, pourcentage_realisation: 0 });
  const [inventoryStats, setInventoryStats] = useState({ rupture: 0, niveau_bas: 0 }); // Stats inventaire
  const [chatUnreadCount, setChatUnreadCount] = useState(0); // Messages non lus du chat
  const { canView, isAdmin } = usePermissions();

  // Gérer le comportement auto-collapse de la sidebar
  useEffect(() => {
    if (preferences?.sidebar_behavior === 'auto_collapse') {
      // En mode auto-collapse, fermer la sidebar après chaque navigation
      setSidebarOpen(false);
    } else if (preferences?.sidebar_behavior === 'always_open') {
      // En mode always_open, toujours ouvrir la sidebar
      setSidebarOpen(true);
    }
    // En mode minimizable, on laisse l'utilisateur gérer manuellement
  }, [location.pathname, preferences?.sidebar_behavior]);

  // Gérer le clic en dehors de la sidebar en mode auto-collapse
  useEffect(() => {
    if (preferences?.sidebar_behavior !== 'auto_collapse' || !sidebarOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      const sidebar = document.getElementById('main-sidebar');
      const toggleButton = document.getElementById('sidebar-toggle');
      
      if (sidebar && !sidebar.contains(event.target) && toggleButton && !toggleButton.contains(event.target)) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [preferences?.sidebar_behavior, sidebarOpen]);

  useEffect(() => {
    // Récupérer les informations de l'utilisateur depuis localStorage
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo);
        setUser({
          nom: `${parsedUser.prenom || ''} ${parsedUser.nom || ''}`.trim() || 'Utilisateur',
          role: parsedUser.role || 'VIEWER',
          firstLogin: parsedUser.firstLogin || false,
          id: parsedUser.id
        });
        
        // Afficher le dialog de changement de mot de passe si c'est la première connexion
        if (parsedUser.firstLogin === true) {
          setFirstLoginDialogOpen(true);
        }

        // Charger le nombre d'ordres de travail assignés
        loadWorkOrdersCount(parsedUser.id);
        // Charger le nombre d'échéances dépassées
        loadOverdueCount();
        // Charger les stats du badge de surveillance
        loadSurveillanceBadgeStats();
        // Charger les stats de l'inventaire
        loadInventoryStats();
        
        // Rafraîchir les notifications toutes les 60 secondes
        const intervalId = setInterval(() => {
          loadWorkOrdersCount(parsedUser.id);
          loadOverdueCount();
          loadSurveillanceBadgeStats();
          loadInventoryStats();
        }, 60000); // 60 secondes
        
        // Écouter les événements de création/modification/suppression
        const handleWorkOrderChange = () => {
          loadWorkOrdersCount(parsedUser.id);
          loadOverdueCount(); // Aussi rafraîchir les échéances
        };
        
        const handleSurveillanceChange = () => {
          loadSurveillanceBadgeStats();
        };
        
        const handleInventoryChange = () => {
          loadInventoryStats();
        };
        
        window.addEventListener('workOrderCreated', handleWorkOrderChange);
        window.addEventListener('workOrderUpdated', handleWorkOrderChange);
        window.addEventListener('workOrderDeleted', handleWorkOrderChange);
        window.addEventListener('improvementCreated', handleWorkOrderChange);
        window.addEventListener('improvementUpdated', handleWorkOrderChange);
        window.addEventListener('improvementDeleted', handleWorkOrderChange);
        window.addEventListener('surveillanceItemCreated', handleSurveillanceChange);
        window.addEventListener('surveillanceItemUpdated', handleSurveillanceChange);
        window.addEventListener('surveillanceItemDeleted', handleSurveillanceChange);
        window.addEventListener('inventoryItemCreated', handleInventoryChange);
        window.addEventListener('inventoryItemUpdated', handleInventoryChange);
        window.addEventListener('inventoryItemDeleted', handleInventoryChange);
        
        // Nettoyer les listeners et l'intervalle au démontage
        return () => {
          clearInterval(intervalId);
          window.removeEventListener('workOrderCreated', handleWorkOrderChange);
          window.removeEventListener('workOrderUpdated', handleWorkOrderChange);
          window.removeEventListener('workOrderDeleted', handleWorkOrderChange);
          window.removeEventListener('improvementCreated', handleWorkOrderChange);
          window.removeEventListener('improvementUpdated', handleWorkOrderChange);
          window.removeEventListener('improvementDeleted', handleWorkOrderChange);
          window.removeEventListener('surveillanceItemCreated', handleSurveillanceChange);
          window.removeEventListener('surveillanceItemUpdated', handleSurveillanceChange);
          window.removeEventListener('surveillanceItemDeleted', handleSurveillanceChange);
          window.removeEventListener('inventoryItemCreated', handleInventoryChange);
          window.removeEventListener('inventoryItemUpdated', handleInventoryChange);
          window.removeEventListener('inventoryItemDeleted', handleInventoryChange);
        };
      } catch (error) {
        console.error('Erreur lors du parsing des infos utilisateur:', error);
      }
    }
  }, []);

  // Fermer le menu des échéances quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overdueMenuOpen && !event.target.closest('.relative')) {
        setOverdueMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [overdueMenuOpen]);

  const loadWorkOrdersCount = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      const response = await fetch(`${backend_url}/api/work-orders`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Compter les ordres de travail assignés à l'utilisateur avec statut OUVERT uniquement
        // Vérifier à la fois assigne_a_id (string) et assigneA.id (objet)
        const assignedOrders = data.filter(order => {
          const isAssigned = order.assigne_a_id === userId || 
                           (order.assigneA && order.assigneA.id === userId);
          const isOpen = order.statut === 'OUVERT';
          return isAssigned && isOpen;
        });
        setWorkOrdersCount(assignedOrders.length);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des ordres de travail:', error);
    }
  };

  const loadOverdueCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      // Récupérer les permissions depuis localStorage
      const userInfo = localStorage.getItem('user');
      const permissions = userInfo ? JSON.parse(userInfo).permissions : {};
      
      const canViewModule = (module) => {
        return permissions[module]?.view === true;
      };
      
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      let total = 0;
      let executionCount = 0; // Work orders + Improvements
      let requestsCount = 0; // Demandes d'inter. + Demandes d'amél.
      let maintenanceCount = 0; // Maintenances préventives
      const details = {};
      
      // 1. Ordres de travail en retard (ORANGE)
      if (canViewModule('workOrders')) {
        try {
          const woResponse = await fetch(`${backend_url}/api/work-orders`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (woResponse.ok) {
            const workOrders = await woResponse.json();
            const overdueWO = workOrders.filter(wo => {
              if (!wo.dateLimite || wo.statut === 'TERMINE' || wo.statut === 'ANNULE') return false;
              const dueDate = new Date(wo.dateLimite);
              return dueDate < today;
            });
            if (overdueWO.length > 0) {
              details.workOrders = {
                count: overdueWO.length,
                label: 'Ordres de travail',
                route: '/work-orders',
                category: 'execution'
              };
              executionCount += overdueWO.length;
              total += overdueWO.length;
            }
          }
        } catch (err) {
          console.error('Erreur work orders:', err);
        }
      }
      
      // 2. Améliorations en retard (ORANGE)
      if (canViewModule('improvements')) {
        try {
          const impResponse = await fetch(`${backend_url}/api/improvements`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (impResponse.ok) {
            const improvements = await impResponse.json();
            const overdueImp = improvements.filter(imp => {
              if (!imp.dateLimite || imp.statut === 'TERMINE' || imp.statut === 'ANNULE') return false;
              const dueDate = new Date(imp.dateLimite);
              return dueDate < today;
            });
            if (overdueImp.length > 0) {
              details.improvements = {
                count: overdueImp.length,
                label: 'Améliorations',
                route: '/improvements',
                category: 'execution'
              };
              executionCount += overdueImp.length;
              total += overdueImp.length;
            }
          }
        } catch (err) {
          console.error('Erreur improvements:', err);
        }
      }
      
      // 3. Demandes d'intervention en retard (JAUNE)
      if (canViewModule('interventionRequests')) {
        try {
          const irResponse = await fetch(`${backend_url}/api/intervention-requests`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (irResponse.ok) {
            const interventionRequests = await irResponse.json();
            const overdueIR = interventionRequests.filter(ir => {
              if (!ir.date_limite_desiree || ir.statut === 'TERMINE' || ir.statut === 'ANNULE') return false;
              const dueDate = new Date(ir.date_limite_desiree);
              return dueDate < today;
            });
            if (overdueIR.length > 0) {
              details.interventionRequests = {
                count: overdueIR.length,
                label: "Demandes d'intervention",
                route: '/intervention-requests',
                category: 'requests'
              };
              requestsCount += overdueIR.length;
              total += overdueIR.length;
            }
          }
        } catch (err) {
          console.error('Erreur intervention requests:', err);
        }
      }
      
      // 4. Demandes d'amélioration en retard (JAUNE)
      if (canViewModule('improvementRequests')) {
        try {
          const imprResponse = await fetch(`${backend_url}/api/improvement-requests`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (imprResponse.ok) {
            const improvementRequests = await imprResponse.json();
            const overdueIMPR = improvementRequests.filter(impr => {
              if (!impr.date_limite_desiree || impr.statut === 'TERMINE' || impr.statut === 'ANNULE') return false;
              const dueDate = new Date(impr.date_limite_desiree);
              return dueDate < today;
            });
            if (overdueIMPR.length > 0) {
              details.improvementRequests = {
                count: overdueIMPR.length,
                label: "Demandes d'amélioration",
                route: '/improvement-requests',
                category: 'requests'
              };
              requestsCount += overdueIMPR.length;
              total += overdueIMPR.length;
            }
          }
        } catch (err) {
          console.error('Erreur improvement requests:', err);
        }
      }
      
      // 5. Maintenances préventives (BLEU)
      if (canViewModule('preventiveMaintenance')) {
        try {
          const pmResponse = await fetch(`${backend_url}/api/preventive-maintenance`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (pmResponse.ok) {
            const pms = await pmResponse.json();
            const overduePM = pms.filter(pm => {
              if (!pm.prochaineMaintenance || pm.statut !== 'ACTIF') return false;
              const nextDate = new Date(pm.prochaineMaintenance);
              return nextDate < today;
            });
            if (overduePM.length > 0) {
              details.preventiveMaintenance = {
                count: overduePM.length,
                label: 'Maintenances préventives',
                route: '/preventive-maintenance',
                category: 'maintenance'
              };
              maintenanceCount += overduePM.length;
              total += overduePM.length;
            }
          }
        } catch (err) {
          console.error('Erreur preventive maintenance:', err);
        }
      }
      
      setOverdueCount(total);
      setOverdueExecutionCount(executionCount);
      setOverdueRequestsCount(requestsCount);
      setOverdueMaintenanceCount(maintenanceCount);
      setOverdueDetails(details);
    } catch (error) {
      console.error('Erreur lors du chargement des échéances:', error);
    }
  };

  const loadSurveillanceBadgeStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      const response = await fetch(`${backend_url}/api/surveillance/badge-stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSurveillanceBadge(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats de surveillance:', error);
    }
  };

  const loadInventoryStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      const response = await fetch(`${backend_url}/api/inventory/stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setInventoryStats(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats inventaire:', error);
    }
  };

  const loadChatUnreadCount = async () => {
    // Ne charger que si l'utilisateur a accès au chat
    if (!canView('chatLive')) return;
    
    // Si l'utilisateur est sur la page Chat Live, ne pas afficher de badge
    if (location.pathname === '/chat-live') {
      setChatUnreadCount(0);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const backend_url = getBackendURL();
      
      const response = await fetch(`${backend_url}/api/chat/unread-count`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du nombre de messages non lus:', error);
    }
  };

  // Polling pour les messages non lus toutes les 10 secondes
  useEffect(() => {
    loadChatUnreadCount();
    const interval = setInterval(loadChatUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [canView, location.pathname]);


  // Mapping des icônes
  const iconMap = {
    'LayoutDashboard': LayoutDashboard,
    'Mail': Mail,
    'MessageSquare': MessageSquare,
    'ClipboardList': ClipboardList,
    'Lightbulb': Lightbulb,
    'Sparkles': Sparkles,
    'Calendar': Calendar,
    'Wrench': Wrench,
    'Package': Package,
    'MapPin': MapPin,
    'Gauge': Gauge,
    'Eye': Eye,
    'FileText': FileText,
    'AlertTriangle': AlertTriangle,
    'FolderOpen': FolderOpen,
    'Folder': Folder,
    'BarChart3': BarChart3,
    'Users': Users,
    'ShoppingCart': ShoppingCart,
    'ShoppingBag': ShoppingBag,
    'Database': Database,
    'Activity': Activity,
    'Terminal': Terminal,
    'Shield': Shield
  };

  // Toggle expansion d'une catégorie
  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Récupérer les catégories depuis les préférences
  const menuCategories = preferences?.menu_categories || [];

  // Liste par défaut des menus
  const defaultMenuItems = [
    { id: 'dashboard', icon: 'LayoutDashboard', label: 'Tableau de bord', path: '/dashboard', module: 'dashboard', visible: true, order: 0 },
    { id: 'chat-live', icon: 'Mail', label: 'Chat Live', path: '/chat-live', module: 'chatLive', visible: true, order: 0.5 },
    { id: 'intervention-requests', icon: 'MessageSquare', label: 'Demandes d\'inter.', path: '/intervention-requests', module: 'interventionRequests', visible: true, order: 1 },
    { id: 'work-orders', icon: 'ClipboardList', label: 'Ordres de travail', path: '/work-orders', module: 'workOrders', visible: true, order: 2 },
    { id: 'improvement-requests', icon: 'Lightbulb', label: 'Demandes d\'amél.', path: '/improvement-requests', module: 'improvementRequests', visible: true, order: 3 },
    { id: 'improvements', icon: 'Sparkles', label: 'Améliorations', path: '/improvements', module: 'improvements', visible: true, order: 4 },
    { id: 'preventive-maintenance', icon: 'Calendar', label: 'Maintenance prev.', path: '/preventive-maintenance', module: 'preventiveMaintenance', visible: true, order: 5 },
    { id: 'planning-mprev', icon: 'Calendar', label: 'Planning M.Prev.', path: '/planning-mprev', module: 'planningMprev', visible: true, order: 6 },
    { id: 'assets', icon: 'Wrench', label: 'Équipements', path: '/assets', module: 'assets', visible: true, order: 7 },
    { id: 'inventory', icon: 'Package', label: 'Inventaire', path: '/inventory', module: 'inventory', visible: true, order: 8 },
    { id: 'purchase-requests', icon: 'ShoppingCart', label: 'Demandes d\'Achat', path: '/purchase-requests', module: 'purchaseRequests', visible: true, order: 8.5 },
    { id: 'locations', icon: 'MapPin', label: 'Zones', path: '/locations', module: 'locations', visible: true, order: 9 },
    { id: 'meters', icon: 'Gauge', label: 'Compteurs', path: '/meters', module: 'meters', visible: true, order: 10 },
    { id: 'sensors', icon: 'Activity', label: 'Capteurs MQTT', path: '/sensors', module: 'sensors', visible: isAdmin(), order: 11 },
    { id: 'iot-dashboard', icon: 'BarChart3', label: 'Dashboard IoT', path: '/iot-dashboard', module: 'sensors', visible: isAdmin(), order: 12 },
    { id: 'mqtt-logs', icon: 'Terminal', label: 'Logs MQTT', path: '/mqtt-logs', module: 'sensors', visible: isAdmin(), order: 13 },
    { id: 'surveillance-plan', icon: 'Eye', label: 'Plan de Surveillance', path: '/surveillance-plan', module: 'surveillance', visible: true, order: 11 },
    { id: 'surveillance-rapport', icon: 'FileText', label: 'Rapport Surveillance', path: '/surveillance-rapport', module: 'surveillanceRapport', visible: true, order: 12 },
    { id: 'presqu-accident', icon: 'AlertTriangle', label: 'Presqu\'accident', path: '/presqu-accident', module: 'presquaccident', visible: true, order: 13 },
    { id: 'presqu-accident-rapport', icon: 'FileText', label: 'Rapport P.accident', path: '/presqu-accident-rapport', module: 'presquaccidentRapport', visible: true, order: 14 },
    { id: 'documentations', icon: 'FolderOpen', label: 'Documentations', path: '/documentations', module: 'documentations', visible: true, order: 15 },
    { id: 'reports', icon: 'BarChart3', label: 'Rapports', path: '/reports', module: 'reports', visible: true, order: 16 },
    { id: 'people', icon: 'Users', label: 'Équipes', path: '/people', module: 'people', visible: true, order: 17 },
    { id: 'planning', icon: 'Calendar', label: 'Planning', path: '/planning', module: 'planning', visible: true, order: 18 },
    { id: 'vendors', icon: 'ShoppingCart', label: 'Fournisseurs', path: '/vendors', module: 'vendors', visible: true, order: 19 },
    { id: 'purchase-history', icon: 'ShoppingBag', label: 'Historique Achat', path: '/purchase-history', module: 'purchaseHistory', visible: true, order: 20 },
    { id: 'import-export', icon: 'Database', label: 'Import / Export', path: '/import-export', module: 'importExport', visible: true, order: 21 }
  ];

  // Utiliser les préférences ou la liste par défaut
  const userMenuItems = preferences?.menu_items && preferences.menu_items.length > 0 
    ? preferences.menu_items 
    : defaultMenuItems;

  // Trier par ordre et filtrer par visibilité et permissions
  const menuItems = userMenuItems
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .filter(item => {
      // Filtrer par visibilité
      if (item.visible === false) return false;
      
      // Filtrer par permissions
      if (item.module && !canView(item.module)) return false;
      
      return true;
    })
    .map(item => ({
      ...item,
      icon: iconMap[item.icon] || LayoutDashboard,
      // Supprimer les emojis du label pour éviter les doubles icônes
      label: item.label ? item.label.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() : item.label
    }));

  // Grouper les menus par catégorie
  const getMenusByCategory = (categoryId) => {
    return menuItems.filter(item => item.category_id === categoryId);
  };

  // Menus sans catégorie
  const uncategorizedMenus = menuItems.filter(item => !item.category_id);

  // Vérifier si une catégorie contient le menu actif
  const categoryHasActiveMenu = (categoryId) => {
    return menuItems.some(item => item.category_id === categoryId && location.pathname === item.path);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleFirstLoginSuccess = () => {
    // Mettre à jour le user dans localStorage pour marquer firstLogin comme false
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo);
        parsedUser.firstLogin = false;
        localStorage.setItem('user', JSON.stringify(parsedUser));
        setUser(prev => ({ ...prev, firstLogin: false }));
      } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
      }
    }
  };

  // Helper pour obtenir les styles de boutons sidebar
  const getSidebarButtonStyle = (isActive = false) => ({
    backgroundColor: isActive ? (preferences?.primary_color || '#2563eb') : 'transparent',
    color: preferences?.sidebar_icon_color || '#ffffff'
  });

  const handleSidebarButtonHover = (e, isActive) => {
    if (!isActive) {
      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
    }
  };

  const handleSidebarButtonLeave = (e, isActive) => {
    if (!isActive) {
      e.currentTarget.style.backgroundColor = 'transparent';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            id="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={sidebarOpen ? "Minimiser le menu" : "Agrandir le menu"}
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-semibold text-gray-800 text-lg">GMAO Iris</span>
          </div>
          
          {/* Boutons Manuel et Aide */}
          <div className="flex items-center gap-2">
            <ManualButton />
            <HelpButton />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Icône Chat Live avec badge messages non lus */}
          {canView('chatLive') && (
            <button
              onClick={() => navigate('/chat-live')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              title="Chat Live"
            >
              <Mail className="w-5 h-5 text-gray-600" />
              {chatUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                  {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                </span>
              )}
            </button>
          )}

          {/* Icône rappel échéances avec 3 badges */}
          <div className="relative">
            <button 
              onClick={() => setOverdueMenuOpen(!overdueMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
              title="Échéances dépassées"
            >
              <img src="/rappel-calendrier.jpg" alt="Rappel" className="w-6 h-6 object-contain" />
              
              {/* Badge ORANGE - Coin supérieur droit - Work Orders + Improvements */}
              {overdueExecutionCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                  {overdueExecutionCount > 9 ? '9+' : overdueExecutionCount}
                </span>
              )}
              
              {/* Badge JAUNE - Coin supérieur gauche - Demandes d'inter. + Demandes d'amél. */}
              {overdueRequestsCount > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                  {overdueRequestsCount > 9 ? '9+' : overdueRequestsCount}
                </span>
              )}
              
              {/* Badge BLEU - Coin inférieur gauche - Maintenances préventives */}
              {overdueMaintenanceCount > 0 && (
                <span className="absolute -bottom-1 -left-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                  {overdueMaintenanceCount > 9 ? '9+' : overdueMaintenanceCount}
                </span>
              )}
            </button>

            {/* Menu déroulant des échéances */}
            {overdueMenuOpen && overdueCount > 0 && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">Échéances dépassées</h3>
                  <p className="text-xs text-gray-500 mt-1">{overdueCount} élément{overdueCount > 1 ? 's' : ''} en retard</p>
                </div>
                <div className="py-2 max-h-80 overflow-y-auto">
                  {Object.entries(overdueDetails).map(([key, detail]) => {
                    // Couleur selon la catégorie
                    const categoryColors = {
                      execution: { dot: 'bg-orange-500', text: 'text-orange-500', hover: 'group-hover:text-orange-600' },
                      requests: { dot: 'bg-yellow-500', text: 'text-yellow-600', hover: 'group-hover:text-yellow-700' },
                      maintenance: { dot: 'bg-blue-500', text: 'text-blue-500', hover: 'group-hover:text-blue-600' }
                    };
                    const colors = categoryColors[detail.category] || categoryColors.execution;
                    
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          navigate(detail.route);
                          setOverdueMenuOpen(false);
                        }}
                        className="w-full px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 ${colors.dot} rounded-full`}></div>
                          <span className={`text-sm text-gray-700 ${colors.hover} font-medium`}>
                            {detail.label}
                          </span>
                        </div>
                        <span className={`text-sm font-semibold ${colors.text}`}>
                          {detail.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Message si aucune échéance */}
            {overdueMenuOpen && overdueCount === 0 && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500">Aucune échéance dépassée</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Badge de mise à jour (Admin uniquement) */}
          {isAdmin() && <UpdateNotificationBadge />}
          
          {/* Badge Plan de Surveillance */}
          <button 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative group"
            onClick={() => navigate('/surveillance-plan', { state: { showOverdueOnly: true } })}
            title="Plan de Surveillance - Voir les contrôles en retard"
          >
            <Eye size={20} className="text-gray-600" />
            {surveillanceBadge.echeances_proches > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {surveillanceBadge.echeances_proches > 9 ? '9+' : surveillanceBadge.echeances_proches}
              </span>
            )}
            {/* Tooltip avec détails */}
            <div className="absolute hidden group-hover:block right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-3">
              <div className="text-sm font-semibold text-gray-800 mb-2">Plan de Surveillance</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Échéances proches:</span>
                  <span className="font-bold text-orange-600">{surveillanceBadge.echeances_proches}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Taux de réalisation:</span>
                  <span className={`font-bold ${surveillanceBadge.pourcentage_realisation >= 75 ? 'text-green-600' : surveillanceBadge.pourcentage_realisation >= 50 ? 'text-orange-600' : 'text-red-600'}`}>
                    {surveillanceBadge.pourcentage_realisation}%
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                💡 Cliquez pour voir uniquement les contrôles en retard
              </div>
            </div>
          </button>
          
          {/* Badge Inventaire (Niveau bas + Rupture) */}
          <button 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative group"
            onClick={() => navigate('/inventory', { state: { filterAlert: true } })}
            title="Inventaire - Articles en alerte"
          >
            <Package size={20} className="text-gray-600" />
            {(inventoryStats.rupture + inventoryStats.niveau_bas) > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {(inventoryStats.rupture + inventoryStats.niveau_bas) > 9 ? '9+' : (inventoryStats.rupture + inventoryStats.niveau_bas)}
              </span>
            )}
            {/* Tooltip avec détails */}
            <div className="absolute hidden group-hover:block right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-3">
              <div className="text-sm font-semibold text-gray-800 mb-2">Alertes Inventaire</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">En rupture:</span>
                  <span className="font-bold text-red-600">{inventoryStats.rupture}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Niveau bas:</span>
                  <span className="font-bold text-orange-600">{inventoryStats.niveau_bas}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                💡 Cliquez pour voir les articles en alerte
              </div>
            </div>
          </button>
          
          {/* Alertes MQTT */}
          <AlertNotifications />
          
          {/* Cloche OT en attente */}
          <button 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
            onClick={() => navigate('/work-orders')}
            title="Ordres de travail en attente"
          >
            <Bell size={20} className="text-gray-600" />
            {workOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {workOrdersCount > 9 ? '9+' : workOrdersCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors cursor-pointer"
          >
            <div className="text-right">
              <div className="text-sm font-medium text-gray-800">{user.nom}</div>
              <div className="text-xs text-gray-500">{user.role}</div>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user.nom.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div
        id="main-sidebar"
        className="fixed top-16 bottom-0 text-white transition-all duration-300 z-20"
        style={{
          backgroundColor: preferences?.sidebar_bg_color || '#1f2937',
          width: sidebarOpen ? `${preferences?.sidebar_width || 256}px` : '80px',
          left: preferences?.sidebar_position === 'right' ? 'auto' : 0,
          right: preferences?.sidebar_position === 'right' ? 0 : 'auto'
        }}
      >
        <div className="p-4 space-y-1 h-full overflow-y-auto">
          {/* Rendu des catégories avec sous-menus */}
          {menuCategories
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(category => {
              const categoryMenus = getMenusByCategory(category.id);
              if (categoryMenus.length === 0) return null;
              
              const CategoryIcon = iconMap[category.icon] || Folder;
              const isExpanded = expandedCategories[category.id] !== false; // Par défaut ouvert
              const hasActiveMenu = categoryHasActiveMenu(category.id);

              return (
                <div key={category.id} className="mb-1">
                  {/* Header de catégorie */}
                  <button
                    onClick={() => toggleCategoryExpansion(category.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      !sidebarOpen ? 'justify-center px-2' : ''
                    }`}
                    style={{
                      backgroundColor: hasActiveMenu ? 'rgba(255,255,255,0.05)' : 'transparent',
                      color: preferences?.sidebar_icon_color || '#ffffff'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = hasActiveMenu ? 'rgba(255,255,255,0.05)' : 'transparent';
                    }}
                    title={!sidebarOpen ? category.name : ''}
                  >
                    <CategoryIcon size={18} className="flex-shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="text-sm font-semibold flex-1 text-left">{category.name}</span>
                        <ChevronDown 
                          size={16} 
                          className={`flex-shrink-0 transition-transform ${isExpanded ? '' : '-rotate-90'}`} 
                        />
                      </>
                    )}
                  </button>
                  
                  {/* Sous-menus de la catégorie */}
                  {(isExpanded || !sidebarOpen) && (
                    <div className={sidebarOpen ? 'ml-3 border-l border-white/10 pl-2 space-y-1 mt-1' : 'space-y-1 mt-1'}>
                      {categoryMenus
                        .filter(item => !item.adminOnly || user.role === 'ADMIN')
                        .map((item, index) => {
                          const Icon = item.icon;
                          const isActive = location.pathname === item.path;
                          return (
                            <button
                              key={index}
                              onClick={() => navigate(item.path)}
                              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                                !sidebarOpen ? 'justify-center px-2' : ''
                              }`}
                              style={{
                                backgroundColor: isActive ? (preferences?.primary_color || '#2563eb') : 'transparent',
                                color: preferences?.sidebar_icon_color || '#ffffff'
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                              title={!sidebarOpen ? item.label : ''}
                            >
                              <Icon size={18} className="flex-shrink-0" />
                              {sidebarOpen && <span className="text-sm">{item.label}</span>}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          
          {/* Menus sans catégorie */}
          {uncategorizedMenus
            .filter(item => !item.adminOnly || user.role === 'ADMIN')
            .map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={`uncategorized-${index}`}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    !sidebarOpen ? 'justify-center px-2' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? (preferences?.primary_color || '#2563eb') : 'transparent',
                    color: preferences?.sidebar_icon_color || '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  title={!sidebarOpen ? item.label : ''}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              );
            })}
          
          <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => navigate('/settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
              style={getSidebarButtonStyle(location.pathname === '/settings')}
              onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/settings')}
              onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/settings')}
              title={!sidebarOpen ? 'Paramètres' : ''}
            >
              <Settings size={20} className="flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">Paramètres</span>}
            </button>
            {user.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => navigate('/special-settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                  style={getSidebarButtonStyle(location.pathname === '/special-settings')}
                  onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/special-settings')}
                  onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/special-settings')}
                  title={!sidebarOpen ? 'Paramètres Spéciaux' : ''}
                >
                  <Shield size={20} className="flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">Paramètres Spéciaux</span>}
                </button>
                <button
                  onClick={() => navigate('/mqtt-pubsub')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                  style={getSidebarButtonStyle(location.pathname === '/mqtt-pubsub')}
                  onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/mqtt-pubsub')}
                  onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/mqtt-pubsub')}
                  title={!sidebarOpen ? 'P/L MQTT' : ''}
                >
                  <Radio size={20} className="flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">P/L MQTT</span>}
                </button>
                <button
                  onClick={() => navigate('/updates')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                  style={getSidebarButtonStyle(location.pathname === '/updates')}
                  onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/updates')}
                  onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/updates')}
                  title={!sidebarOpen ? 'Mise à jour' : ''}
                >
                  <RefreshCw size={20} className="flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">Mise à jour</span>}
                </button>
                <button
                  onClick={() => navigate('/journal')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                  style={getSidebarButtonStyle(location.pathname === '/journal')}
                  onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/journal')}
                  onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/journal')}
                  title={!sidebarOpen ? 'Journal' : ''}
                >
                  <FileText size={20} className="flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">Journal</span>}
                </button>
                <button
                  onClick={() => navigate('/ssh')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                  style={getSidebarButtonStyle(location.pathname === '/ssh')}
                  onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/ssh')}
                  onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/ssh')}
                  title={!sidebarOpen ? 'SSH' : ''}
                >
                  <Terminal size={20} className="flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">SSH</span>}
                </button>
              </>
            )}
            
            {/* Personnalisation */}
            <button
              onClick={() => navigate('/personnalisation')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
              style={getSidebarButtonStyle(location.pathname === '/personnalisation')}
              onMouseEnter={(e) => handleSidebarButtonHover(e, location.pathname === '/personnalisation')}
              onMouseLeave={(e) => handleSidebarButtonLeave(e, location.pathname === '/personnalisation')}
              title={!sidebarOpen ? 'Personnalisation' : ''}
            >
              <Palette size={20} className="flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">Personnalisation</span>}
            </button>
            
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen ? 'justify-center px-2' : ''}`}
              style={{ backgroundColor: 'transparent', color: preferences?.sidebar_icon_color || '#ffffff' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              title={!sidebarOpen ? 'Déconnexion' : ''}
            >
              <LogOut size={20} className="flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">Déconnexion</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className="transition-all duration-300"
        style={{
          marginLeft: preferences?.sidebar_position === 'right' ? 0 : (sidebarOpen ? `${preferences?.sidebar_width || 256}px` : '80px'),
          marginRight: preferences?.sidebar_position === 'right' ? (sidebarOpen ? `${preferences?.sidebar_width || 256}px` : '80px') : 0
        }}
      >
        <div className="p-6 pt-20">
          <Outlet />
        </div>
      </div>
      
      {/* Popups */}
      <FirstLoginPasswordDialog 
        open={firstLoginDialogOpen}
        onOpenChange={setFirstLoginDialogOpen}
        userId={user.id}
        onSuccess={() => {
          // Mettre à jour l'état local du user
          setUser(prev => ({ ...prev, firstLogin: false }));
          setFirstLoginDialogOpen(false);
        }}
      />
      
      {/* Popup de mise à jour récente (tous les utilisateurs) */}
      <RecentUpdatePopup />
      
      {/* Validation du token au démarrage */}
      <TokenValidator />
      
      {/* Gestion de l'inactivité */}
      <InactivityHandler />
    </div>
  );
};

export default MainLayout;EOF

# Reconstruire le frontend
echo "[4/4] Reconstruction du frontend..."
cd /opt/gmao-iris/frontend
yarn build

# Redémarrer le service
echo "Redémarrage du frontend..."
sudo supervisorctl restart frontend

echo ""
echo "============================================"
echo "✅ MISE À JOUR TERMINÉE AVEC SUCCÈS !"
echo "============================================"
echo "Rafraîchissez votre navigateur (Ctrl+F5)"
