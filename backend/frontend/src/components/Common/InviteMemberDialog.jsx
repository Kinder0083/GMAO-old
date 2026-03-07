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
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { usersAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import { formatErrorMessage } from '../../utils/errorFormatter';

const InviteMemberDialog = ({ open, onOpenChange, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'TECHNICIEN'
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un email',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      await usersAPI.inviteMember(formData);
      
      toast({
        title: 'Invitation envoyée !',
        description: `Un email d'invitation a été envoyé à ${formData.email}`,
      });

      // Reset form
      setFormData({
        email: '',
        role: 'TECHNICIEN'
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible d\'envoyer l\'invitation'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Inviter un membre
          </DialogTitle>
          <DialogDescription>
            Un email sera envoyé avec un lien d'inscription. Le membre pourra compléter son profil lui-même.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email du membre *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="exemple@email.com"
                required
              />
              <p className="text-xs text-gray-500">
                Un lien d'invitation valide 7 jours sera envoyé
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Rôle attribué *</Label>
              <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrateur - Accès complet</SelectItem>
                  <SelectItem value="DIRECTEUR">Directeur</SelectItem>
                  <SelectItem value="QHSE">QHSE</SelectItem>
                  <SelectItem value="RSP_PROD">Responsable Production</SelectItem>
                  <SelectItem value="PROD">Production</SelectItem>
                  <SelectItem value="INDUS">Industrialisation</SelectItem>
                  <SelectItem value="LOGISTIQUE">Logistique</SelectItem>
                  <SelectItem value="LABO">Laboratoire</SelectItem>
                  <SelectItem value="ADV">ADV</SelectItem>
                  <SelectItem value="TECHNICIEN">Technicien</SelectItem>
                  <SelectItem value="VISUALISEUR">Visualiseur - Accès en lecture seule</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Le rôle sera défini et ne pourra pas être modifié par le membre lors de l'inscription
              </p>
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
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer l'invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;
