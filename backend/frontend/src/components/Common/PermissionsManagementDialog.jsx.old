import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { usersAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

const PermissionsManagementDialog = ({ open, onOpenChange, user, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [permissions, setPermissions] = useState({
    dashboard: { view: false, edit: false, delete: false },
    workOrders: { view: false, edit: false, delete: false },
    assets: { view: false, edit: false, delete: false },
    preventiveMaintenance: { view: false, edit: false, delete: false },
    inventory: { view: false, edit: false, delete: false },
    locations: { view: false, edit: false, delete: false },
    vendors: { view: false, edit: false, delete: false },
    reports: { view: false, edit: false, delete: false }
  });

  const modules = [
    { key: 'dashboard', label: 'Tableau de bord' },
    { key: 'workOrders', label: 'Ordres de travail' },
    { key: 'assets', label: 'Équipements' },
    { key: 'preventiveMaintenance', label: 'Maintenance préventive' },
    { key: 'inventory', label: 'Inventaire' },
    { key: 'locations', label: 'Zones' },
    { key: 'vendors', label: 'Fournisseurs' },
    { key: 'reports', label: 'Rapports' }
  ];

  useEffect(() => {
    if (open && user) {
      loadPermissions();
    }
  }, [open, user]);

  const loadPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const response = await usersAPI.getPermissions(user.id);
      setPermissions(response.data);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les permissions',
        variant: 'destructive'
      });
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handlePermissionChange = (module, permissionType, value) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [permissionType]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await usersAPI.updatePermissions(user.id, { permissions });
      
      toast({
        title: 'Succès',
        description: 'Les permissions ont été mises à jour',
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de mettre à jour les permissions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const setAllPermissions = (module, value) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        view: value,
        edit: value,
        delete: value
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les permissions</DialogTitle>
          <DialogDescription>
            Configurez les permissions pour {user?.prenom} {user?.nom}
          </DialogDescription>
        </DialogHeader>

        {loadingPermissions ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 gap-4 px-4 font-semibold text-sm text-gray-600 border-b pb-2">
                <div>Module</div>
                <div className="flex items-center justify-center gap-1">
                  <Eye size={16} />
                  <span>Visualisation</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Edit size={16} />
                  <span>Édition</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Trash2 size={16} />
                  <span>Suppression</span>
                </div>
              </div>

              {modules.map(module => (
                <Card key={module.key} className="border">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <div className="font-medium text-gray-900">
                        {module.label}
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="ml-2 h-auto p-0 text-xs text-blue-600"
                          onClick={() => {
                            const allChecked = permissions[module.key].view && 
                                              permissions[module.key].edit && 
                                              permissions[module.key].delete;
                            setAllPermissions(module.key, !allChecked);
                          }}
                        >
                          {permissions[module.key].view && permissions[module.key].edit && permissions[module.key].delete ? 'Tout désactiver' : 'Tout activer'}
                        </Button>
                      </div>

                      <div className="flex justify-center">
                        <Checkbox
                          checked={permissions[module.key].view}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(module.key, 'view', checked)
                          }
                        />
                      </div>

                      <div className="flex justify-center">
                        <Checkbox
                          checked={permissions[module.key].edit}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(module.key, 'edit', checked)
                          }
                          disabled={!permissions[module.key].view}
                        />
                      </div>

                      <div className="flex justify-center">
                        <Checkbox
                          checked={permissions[module.key].delete}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(module.key, 'delete', checked)
                          }
                          disabled={!permissions[module.key].view || !permissions[module.key].edit}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="text-sm text-gray-500 mt-4 p-4 bg-blue-50 rounded-lg">
                <strong>Note :</strong> La permission d'édition nécessite la permission de visualisation. 
                La permission de suppression nécessite les permissions de visualisation et d'édition.
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsManagementDialog;
