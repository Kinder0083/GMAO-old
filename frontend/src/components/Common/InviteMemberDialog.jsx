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
import { Loader2, Mail, Copy, CheckCircle, AlertTriangle, Link2 } from 'lucide-react';
import { formatErrorMessage } from '../../utils/errorFormatter';

const InviteMemberDialog = ({ open, onOpenChange, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [invitationLink, setInvitationLink] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'TECHNICIEN'
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyLink = async () => {
    if (invitationLink) {
      try {
        await navigator.clipboard.writeText(invitationLink);
        setLinkCopied(true);
        toast({
          title: 'Lien copié !',
          description: 'Le lien d\'invitation a été copié dans le presse-papiers',
        });
        setTimeout(() => setLinkCopied(false), 3000);
      } catch (err) {
        toast({
          title: 'Erreur',
          description: 'Impossible de copier le lien',
          variant: 'destructive'
        });
      }
    }
  };

  const handleClose = () => {
    setInvitationLink(null);
    setLinkCopied(false);
    setFormData({ email: '', role: 'TECHNICIEN' });
    onOpenChange(false);
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
      const response = await usersAPI.inviteMember(formData);
      const data = response.data;
      
      if (data.email_sent) {
        // Email envoyé avec succès
        toast({
          title: '✅ Invitation envoyée !',
          description: `Un email d'invitation a été envoyé à ${formData.email}`,
        });
        
        setFormData({ email: '', role: 'TECHNICIEN' });
        setInvitationLink(null);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        // Email non envoyé mais lien généré
        setInvitationLink(data.invitation_link);
        toast({
          title: '⚠️ Email non envoyé',
          description: 'L\'email n\'a pas pu être envoyé. Copiez le lien d\'invitation ci-dessous.',
          variant: 'destructive'
        });
      }
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Inviter un membre
          </DialogTitle>
          <DialogDescription>
            Un email sera envoyé avec un lien d&apos;inscription. Le membre pourra compléter son profil lui-même.
          </DialogDescription>
        </DialogHeader>

        {invitationLink ? (
          // Affichage du lien d'invitation si l'email a échoué
          <div className="py-4 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-800">Email non envoyé</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    L&apos;email d&apos;invitation n&apos;a pas pu être envoyé (vérifiez la configuration SMTP).
                    Vous pouvez copier le lien ci-dessous et l&apos;envoyer manuellement à <strong>{formData.email}</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Lien d&apos;invitation
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={invitationLink}
                  className="text-xs bg-gray-50"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="flex-shrink-0"
                >
                  {linkCopied ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Ce lien est valide pendant 7 jours
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Fermer
              </Button>
              <Button
                type="button"
                onClick={handleCopyLink}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copier le lien
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Formulaire d'invitation
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
                  Un lien d&apos;invitation valide 7 jours sera envoyé
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
                  Le rôle sera défini et ne pourra pas être modifié par le membre lors de l&apos;inscription
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
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
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberDialog;
