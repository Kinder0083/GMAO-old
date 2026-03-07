import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';
import { getBackendURL } from '../../utils/config';

const ForgotPasswordDialog = ({ open, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer votre adresse email',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const backend_url = getBackendURL();
      await axios.post(`${backend_url}/api/auth/forgot-password`, { email });
      
      setSent(true);
      toast({
        title: 'Email envoyé',
        description: 'Si cet email existe dans notre base, vous recevrez un lien de réinitialisation.'
      });
    } catch (error) {
      // Ne pas révéler si l'email existe ou non pour la sécurité
      setSent(true);
      toast({
        title: 'Email envoyé',
        description: 'Si cet email existe dans notre base, vous recevrez un lien de réinitialisation.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setSent(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mot de passe oublié</DialogTitle>
          <DialogDescription>
            {sent 
              ? "Un email de réinitialisation a été envoyé si l'adresse existe dans notre système."
              : "Entrez votre adresse email pour recevoir un lien de réinitialisation."
            }
          </DialogDescription>
        </DialogHeader>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
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
              <Button type="submit" disabled={loading}>
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <DialogFooter>
            <Button onClick={handleClose}>Fermer</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
