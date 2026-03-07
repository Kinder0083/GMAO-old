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
import { usersAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';
import PermissionsGrid from './PermissionsGrid';
import { formatErrorMessage } from '../../utils/errorFormatter';

const PermissionsManagementDialog = ({ open, onOpenChange, user, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    if (user && open) {
      // Charger les permissions actuelles de l'utilisateur
      setPermissions(user.permissions || {});
    }
  }, [user, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) return;

    setLoading(true);
    try {
      await usersAPI.updatePermissions(user.id, { permissions });
      
      toast({
        title: 'Succès',
        description: 'Les permissions ont été mises à jour avec succès',
        variant: 'default',
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible de mettre à jour les permissions'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionsChange = (newPermissions) => {
    setPermissions(newPermissions);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <DialogTitle>Modifier les permissions</DialogTitle>
          </div>
          <DialogDescription>
            Gérer les permissions de {user.prenom} {user.nom} ({user.email})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Rôle actuel :</strong> {user.role}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Les permissions ci-dessous remplacent les permissions par défaut du rôle.
              </p>
            </div>

            <PermissionsGrid
              role={user.role}
              permissions={permissions}
              onChange={handlePermissionsChange}
            />
          </div>

          <DialogFooter className="mt-6">
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
              Enregistrer les permissions
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsManagementDialog;
