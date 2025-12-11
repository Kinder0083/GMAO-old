import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/use-toast';
import {
  GripVertical,
  Eye,
  EyeOff,
  Star,
  Plus,
  Trash2,
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
  FolderOpen,
  Database
} from 'lucide-react';

const DEFAULT_MENU_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', path: '/dashboard', icon: 'LayoutDashboard', module: 'dashboard', visible: true, favorite: false, order: 0 },
  { id: 'intervention-requests', label: 'Demandes d\'inter.', path: '/intervention-requests', icon: 'MessageSquare', module: 'interventionRequests', visible: true, favorite: false, order: 1 },
  { id: 'work-orders', label: 'Ordres de travail', path: '/work-orders', icon: 'ClipboardList', module: 'workOrders', visible: true, favorite: false, order: 2 },
  { id: 'improvement-requests', label: 'Demandes d\'amél.', path: '/improvement-requests', icon: 'Lightbulb', module: 'improvementRequests', visible: true, favorite: false, order: 3 },
  { id: 'improvements', label: 'Améliorations', path: '/improvements', icon: 'Sparkles', module: 'improvements', visible: true, favorite: false, order: 4 },
  { id: 'preventive-maintenance', label: 'Maintenance prev.', path: '/preventive-maintenance', icon: 'Calendar', module: 'preventiveMaintenance', visible: true, favorite: false, order: 5 },
  { id: 'planning-mprev', label: 'Planning M.Prev.', path: '/planning-mprev', icon: 'Calendar', module: 'preventiveMaintenance', visible: true, favorite: false, order: 6 },
  { id: 'assets', label: 'Équipements', path: '/assets', icon: 'Wrench', module: 'assets', visible: true, favorite: false, order: 7 },
  { id: 'inventory', label: 'Inventaire', path: '/inventory', icon: 'Package', module: 'inventory', visible: true, favorite: false, order: 8 },
  { id: 'locations', label: 'Zones', path: '/locations', icon: 'MapPin', module: 'locations', visible: true, favorite: false, order: 9 },
  { id: 'meters', label: 'Compteurs', path: '/meters', icon: 'Gauge', module: 'meters', visible: true, favorite: false, order: 10 },
  { id: 'surveillance-plan', label: 'Plan de Surveillance', path: '/surveillance-plan', icon: 'Shield', module: 'surveillance', visible: true, favorite: false, order: 11 },
  { id: 'surveillance-rapport', label: 'Rapport Surveillance', path: '/surveillance-rapport', icon: 'FileText', module: 'surveillance', visible: true, favorite: false, order: 12 },
  { id: 'presqu-accident', label: 'Presqu\'accident', path: '/presqu-accident', icon: 'AlertTriangle', module: 'presquaccident', visible: true, favorite: false, order: 13 },
  { id: 'presqu-accident-rapport', label: 'Rapport P.accident', path: '/presqu-accident-rapport', icon: 'FileText', module: 'presquaccident', visible: true, favorite: false, order: 14 },
  { id: 'documentations', label: 'Documentations', path: '/documentations', icon: 'FolderOpen', module: 'documentations', visible: true, favorite: false, order: 15 },
  { id: 'reports', label: 'Rapports', path: '/reports', icon: 'BarChart3', module: 'reports', visible: true, favorite: false, order: 16 },
  { id: 'people', label: 'Équipes', path: '/people', icon: 'Users', module: 'people', visible: true, favorite: false, order: 17 },
  { id: 'planning', label: 'Planning', path: '/planning', icon: 'Calendar', module: 'planning', visible: true, favorite: false, order: 18 },
  { id: 'vendors', label: 'Fournisseurs', path: '/vendors', icon: 'ShoppingCart', module: 'vendors', visible: true, favorite: false, order: 19 },
  { id: 'purchase-history', label: 'Historique Achat', path: '/purchase-history', icon: 'ShoppingBag', module: 'purchaseHistory', visible: true, favorite: false, order: 20 },
  { id: 'import-export', label: 'Import / Export', path: '/import-export', icon: 'Database', module: 'importExport', visible: true, favorite: false, order: 21 },
  { id: 'sensors', label: '📡 Capteurs MQTT', path: '/sensors', icon: 'Activity', module: 'sensors', visible: true, favorite: false, order: 22 },
  { id: 'iot-dashboard', label: '📊 Dashboard IoT', path: '/iot-dashboard', icon: 'BarChart3', module: 'iotDashboard', visible: true, favorite: false, order: 23 },
  { id: 'mqtt-logs', label: '🔍 Logs MQTT', path: '/mqtt-logs', icon: 'Terminal', module: 'mqttLogs', visible: true, favorite: false, order: 24 }
];

const MenuOrganizationSection = () => {
  const { preferences, updatePreferences } = usePreferences();
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState(preferences?.menu_items || DEFAULT_MENU_ITEMS);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    if (preferences?.menu_items && preferences.menu_items.length > 0) {
      setMenuItems(preferences.menu_items);
    } else {
      setMenuItems(DEFAULT_MENU_ITEMS);
    }
  }, [preferences]);

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (dropIndex) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const items = Array.from(menuItems);
    const [draggedItem] = items.splice(draggedIndex, 1);
    items.splice(dropIndex, 0, draggedItem);

    // Mettre à jour les ordres
    const updatedItems = items.map((item, index) => ({ ...item, order: index }));
    setMenuItems(updatedItems);
    setDraggedIndex(null);

    try {
      await updatePreferences({ menu_items: updatedItems });
      toast({ title: 'Succès', description: 'Ordre des menus mis à jour' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de mise à jour', variant: 'destructive' });
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

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
      
      // Recharger les préférences
      window.location.reload();
    } catch (error) {
      toast({ 
        title: 'Erreur', 
        description: error.message || 'Erreur de migration', 
        variant: 'destructive' 
      });
    }
  };

  const resetOrder = async () => {
    setMenuItems(DEFAULT_MENU_ITEMS);
    try {
      await updatePreferences({ menu_items: DEFAULT_MENU_ITEMS });
      toast({ title: 'Succès', description: 'Ordre par défaut restauré' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur de réinitialisation', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <Label className="text-base font-semibold">Organiser les éléments du menu</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={migrateMenus}>
                Ajouter les menus manquants
              </Button>
              <Button variant="outline" size="sm" onClick={resetOrder}>
                Réinitialiser l'ordre
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Glissez-déposez pour réorganiser, utilisez les icônes pour masquer/favoriser
          </p>

          <div className="space-y-2">
            {menuItems.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  draggedIndex === index ? 'bg-blue-50 border-blue-300 opacity-50' : 'bg-white border-gray-200'
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuOrganizationSection;