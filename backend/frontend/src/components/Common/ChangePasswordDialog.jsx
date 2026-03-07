import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { PasswordInput } from '../ui/password-input';
import { Label } from '../ui/label';
import { Lock } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { formatErrorMessage } from '../../utils/errorFormatter';

const ChangePasswordDialog = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.old_password || !formData.new_password || !formData.confirm_password) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs',
        variant: 'destructive'
      });
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      toast({
        title: 'Erreur',
        description: 'Les nouveaux mots de passe ne correspondent pas',
        variant: 'destructive'
      });
      return;
    }

    if (formData.new_password.length < 8) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 8 caractères',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      await authAPI.changePassword({
        old_password: formData.old_password,
        new_password: formData.new_password
      });

      toast({
        title: 'Succès',
        description: 'Votre mot de passe a été modifié avec succès'
      });

      // Réinitialiser le formulaire
      setFormData({
        old_password: '',
        new_password: '',
        confirm_password: ''
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible de modifier le mot de passe'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="text-blue-600" size={20} />
            Changer le mot de passe
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="old_password">Mot de passe actuel</Label>
              <PasswordInput
                id="old_password"
                name="old_password"
                value={formData.old_password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">Nouveau mot de passe</Label>
              <PasswordInput
                id="new_password"
                name="new_password"
                value={formData.new_password}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500">Minimum 8 caractères</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
              <PasswordInput
                id="confirm_password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
              />
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
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Changement en cours...' : 'Changer le mot de passe'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordDialog;
