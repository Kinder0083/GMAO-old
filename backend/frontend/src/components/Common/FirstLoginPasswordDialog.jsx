import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { PasswordInput } from '../ui/password-input';
import { Label } from '../ui/label';
import { authAPI, usersAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import { formatErrorMessage } from '../../utils/errorFormatter';

const FirstLoginPasswordDialog = ({ open, onOpenChange, onSuccess, userId }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.oldPassword) {
      newErrors.oldPassword = 'Le mot de passe actuel est requis';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'Le nouveau mot de passe est requis';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Veuillez confirmer le mot de passe';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (formData.oldPassword && formData.newPassword && formData.oldPassword === formData.newPassword) {
      newErrors.newPassword = 'Le nouveau mot de passe doit être différent de l\'ancien';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await authAPI.changePasswordFirstLogin({
        old_password: formData.oldPassword,
        new_password: formData.newPassword
      });
      
      toast({
        title: 'Mot de passe changé !',
        description: 'Votre mot de passe a été mis à jour avec succès.',
      });

      // Reset form
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible de changer le mot de passe'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPasswordChange = () => {
    // Ouvrir le dialog de confirmation
    setConfirmDialogOpen(true);
  };

  const handleConfirmSkip = async () => {
    try {
      setLoading(true);
      await usersAPI.setPasswordPermanent(userId);
      
      // Mettre à jour le localStorage pour retirer le flag firstLogin
      const userInfo = localStorage.getItem('user');
      if (userInfo) {
        const parsedUser = JSON.parse(userInfo);
        parsedUser.firstLogin = false;
        localStorage.setItem('user', JSON.stringify(parsedUser));
      }
      
      toast({
        title: 'Mot de passe conservé',
        description: 'Vous avez choisi de garder votre mot de passe temporaire.',
        variant: 'default'
      });

      // Fermer les deux dialogs
      setConfirmDialogOpen(false);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Une erreur est survenue'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSkip = () => {
    // Fermer seulement le dialog de confirmation
    setConfirmDialogOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-full">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle>Changement de mot de passe requis</DialogTitle>
              <DialogDescription className="mt-1">
                Pour des raisons de sécurité, vous devez changer votre mot de passe temporaire.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="oldPassword">Mot de passe actuel *</Label>
              <PasswordInput
                id="oldPassword"
                value={formData.oldPassword}
                onChange={(e) => handleChange('oldPassword', e.target.value)}
                className={errors.oldPassword ? 'border-red-500' : ''}
              />
              {errors.oldPassword && (
                <p className="text-xs text-red-500">{errors.oldPassword}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="newPassword">Nouveau mot de passe *</Label>
              <PasswordInput
                id="newPassword"
                value={formData.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                className={errors.newPassword ? 'border-red-500' : ''}
              />
              {errors.newPassword && (
                <p className="text-xs text-red-500">{errors.newPassword}</p>
              )}
              <p className="text-xs text-gray-500">Minimum 8 caractères</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe *</Label>
              <PasswordInput
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className={errors.confirmPassword ? 'border-red-500' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changement en cours...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Changer le mot de passe
                </>
              )}
            </Button>
            
            <Button
              type="button"
              onClick={handleSkipPasswordChange}
              disabled={loading}
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  En cours...
                </>
              ) : (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Ne pas changer le mot de passe à vos risques
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Dialog de confirmation pour conserver le mot de passe */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 p-3 rounded-full flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-orange-900 text-lg leading-tight">
                  ⚠️ Êtes-vous bien sûr de ne pas vouloir changer de mot de passe ?
                </DialogTitle>
                <DialogDescription className="mt-2 text-orange-800 text-sm">
                  Cela représente un risque de sécurité car d'autres personnes peuvent connaître ce mot de passe temporaire.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
            <p className="text-sm text-orange-900">
              <strong>Attention :</strong> En conservant votre mot de passe temporaire, vous acceptez les risques de sécurité associés.
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              onClick={handleCancelSkip}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              Non, je veux changer mon mot de passe
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSkip}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  En cours...
                </>
              ) : (
                'Oui, je conserve ce mot de passe'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default FirstLoginPasswordDialog;
