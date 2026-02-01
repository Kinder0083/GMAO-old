import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useToast } from '../../hooks/use-toast';
import { HelpCircle, Send, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

/**
 * SupportRequestDialog - Dialogue pour envoyer une demande d'aide au support (administrateurs)
 */
const SupportRequestDialog = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: 'Message requis',
        description: 'Veuillez décrire votre problème ou question',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      await api.post('/support/request', {
        subject: subject.trim() || 'Demande d\'assistance',
        message: message.trim()
      });

      setSuccess(true);
      
      // Réinitialiser après 2 secondes
      setTimeout(() => {
        setSuccess(false);
        setSubject('');
        setMessage('');
        onOpenChange(false);
      }, 2000);

    } catch (error) {
      console.error('Erreur envoi demande support:', error);
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible d\'envoyer votre demande. Veuillez réessayer.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSubject('');
      setMessage('');
      setSuccess(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <HelpCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Centre d'aide</DialogTitle>
              <DialogDescription>
                Décrivez votre problème ou posez votre question
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Demande envoyée !
            </h3>
            <p className="text-gray-600">
              Un administrateur vous répondra dans les plus brefs délais.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Sujet (optionnel)</Label>
                <Input
                  id="subject"
                  placeholder="Ex: Problème de connexion, Question sur..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">
                  Votre message <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="message"
                  placeholder="Décrivez votre problème ou votre question en détail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  disabled={loading}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  Soyez le plus précis possible pour que nous puissions vous aider rapidement.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !message.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SupportRequestDialog;
