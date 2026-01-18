import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Shield, Lock, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const PermissionsDialog = ({ open, onOpenChange, user, onSave }) => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState({
    // Modules
    dashboard: { view: true, edit: false },
    workOrders: { view: true, create: true, edit: true, delete: true },
    equipment: { view: true, create: true, edit: true, delete: true },
    inventory: { view: true, create: true, edit: true, delete: true },
    locations: { view: true, create: true, edit: true, delete: true },
    preventiveMaintenance: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, export: true },
    people: { view: true, create: false, edit: false, delete: false },
    vendors: { view: true, create: true, edit: true, delete: true },
    settings: { view: false, edit: false }
  });

  useEffect(() => {
    if (user && user.permissions) {
      setPermissions(user.permissions);
    } else if (user) {
      // Définir les permissions par défaut selon le rôle
      if (user.role === 'ADMIN') {
        // Admin a tous les droits
        setPermissions({
          dashboard: { view: true, edit: true },
          workOrders: { view: true, create: true, edit: true, delete: true },
          equipment: { view: true, create: true, edit: true, delete: true },
          inventory: { view: true, create: true, edit: true, delete: true },
          locations: { view: true, create: true, edit: true, delete: true },
          preventiveMaintenance: { view: true, create: true, edit: true, delete: true },
          reports: { view: true, export: true },
          people: { view: true, create: true, edit: true, delete: true },
          vendors: { view: true, create: true, edit: true, delete: true },
          settings: { view: true, edit: true }
        });
      } else if (user.role === 'TECHNICIEN') {
        // Technicien a des droits limités
        setPermissions({
          dashboard: { view: true, edit: false },
          workOrders: { view: true, create: true, edit: true, delete: false },
          equipment: { view: true, create: false, edit: true, delete: false },
          inventory: { view: true, create: false, edit: true, delete: false },
          locations: { view: true, create: false, edit: false, delete: false },
          preventiveMaintenance: { view: true, create: false, edit: false, delete: false },
          reports: { view: true, export: false },
          people: { view: true, create: false, edit: false, delete: false },
          vendors: { view: true, create: false, edit: false, delete: false },
          settings: { view: false, edit: false }
        });
      } else {
        // Visualiseur en lecture seule
        setPermissions({
          dashboard: { view: true, edit: false },
          workOrders: { view: true, create: false, edit: false, delete: false },
          equipment: { view: true, create: false, edit: false, delete: false },
          inventory: { view: true, create: false, edit: false, delete: false },
          locations: { view: true, create: false, edit: false, delete: false },
          preventiveMaintenance: { view: true, create: false, edit: false, delete: false },
          reports: { view: true, export: false },
          people: { view: false, create: false, edit: false, delete: false },
          vendors: { view: true, create: false, edit: false, delete: false },
          settings: { view: false, edit: false }
        });
      }
    }
  }, [user, open]);

  const handleToggle = (module, action) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action]
      }
    }));
  };

  const handleSave = () => {
    onSave(permissions);
    toast({
      title: 'Succès',
      description: 'Permissions mises à jour avec succès'
    });
    onOpenChange(false);
  };

  if (!user) return null;

  const modules = [
    { key: 'dashboard', label: 'Tableau de bord', actions: ['view', 'edit'] },
    { key: 'interventionRequests', label: 'Demandes d\'inter.', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'workOrders', label: 'Ordres de travail', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'improvementRequests', label: 'Demandes d\'amél.', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'improvements', label: 'Améliorations', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'preventiveMaintenance', label: 'Maintenance prev.', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'planningMprev', label: 'Planning M.Prev.', actions: ['view', 'edit'] },
    { key: 'assets', label: 'Équipements', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'inventory', label: 'Inventaire', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'locations', label: 'Zones', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'meters', label: 'Compteurs', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'surveillance', label: 'Plan de Surveillance', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'surveillanceRapport', label: 'Rapport Surveillance', actions: ['view', 'export'] },
    { key: 'presquaccident', label: 'Presqu\'accident', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'presquaccidentRapport', label: 'Rapport P.accident', actions: ['view', 'export'] },
    { key: 'documentations', label: 'Documentations', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'reports', label: 'Rapports', actions: ['view', 'export'] },
    { key: 'people', label: 'Utilisateurs', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'planning', label: 'Planning', actions: ['view', 'edit'] },
    { key: 'vendors', label: 'Fournisseurs', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'purchaseHistory', label: 'Historique Achat', actions: ['view'] },
    { key: 'importExport', label: 'Import / Export', actions: ['view', 'edit'] },
    { key: 'journal', label: 'Journal d\'audit', actions: ['view'] },
    { key: 'settings', label: 'Paramètres', actions: ['view', 'edit'] },
    { key: 'personalization', label: 'Personnalisation', actions: ['view', 'edit'] }
  ];

  const actionLabels = {
    view: { label: 'Voir', icon: Eye },
    create: { label: 'Créer', icon: Plus },
    edit: { label: 'Modifier', icon: Edit },
    delete: { label: 'Supprimer', icon: Trash2 },
    export: { label: 'Exporter', icon: Shield }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield size={24} className="text-blue-600" />
            Gestion des permissions
          </DialogTitle>
          <DialogDescription>
            Définir les droits d'accès pour {user.prenom} {user.nom}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-bold">
                {user.prenom[0]}{user.nom[0]}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{user.prenom} {user.nom}</h3>
              <Badge className={user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 
                                user.role === 'TECHNICIEN' ? 'bg-blue-100 text-blue-700' : 
                                'bg-gray-100 text-gray-700'}>
                {user.role === 'ADMIN' ? 'Administrateur' : 
                 user.role === 'TECHNICIEN' ? 'Technicien' : 'Visualiseur'}
              </Badge>
            </div>
          </div>

          {/* Permissions Grid */}
          <div className="space-y-4">
            {modules.map((module) => (
              <div key={module.key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{module.label}</h4>
                  <Lock size={16} className="text-gray-400" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {module.actions.map((action) => {
                    const ActionIcon = actionLabels[action]?.icon;
                    return (
                      <div key={action} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${module.key}-${action}`}
                          checked={permissions[module.key]?.[action] || false}
                          onCheckedChange={() => handleToggle(module.key, action)}
                        />
                        <Label
                          htmlFor={`${module.key}-${action}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                        >
                          {ActionIcon && <ActionIcon size={14} className="text-gray-500" />}
                          {actionLabels[action]?.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Enregistrer les permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsDialog;