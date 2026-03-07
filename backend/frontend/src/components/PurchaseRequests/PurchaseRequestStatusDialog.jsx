import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { purchaseRequestsAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';

const PurchaseRequestStatusDialog = ({ open, onOpenChange, request, currentUser, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [comment, setComment] = useState('');

  const getAvailableStatuses = () => {
    if (!request || !currentUser) return [];

    const isAdmin = currentUser.role === 'ADMIN';
    const isN1 = request.responsable_n1_id === currentUser.id;

    const statuses = [];

    // Si N+1 et statut = SOUMISE
    if (isN1 && request.status === 'SOUMISE') {
      statuses.push(
        { value: 'VALIDEE_N1', label: '✓ Valider (N+1)', color: 'text-green-600' },
        { value: 'REFUSEE_N1', label: '✗ Refuser (N+1)', color: 'text-red-600' }
      );
    }

    // Si Admin
    if (isAdmin) {
      switch (request.status) {
        case 'SOUMISE':
          statuses.push(
            { value: 'VALIDEE_N1', label: '✓ Valider (N+1)', color: 'text-green-600' },
            { value: 'REFUSEE_N1', label: '✗ Refuser (N+1)', color: 'text-red-600' }
          );
          break;
        
        case 'VALIDEE_N1':
          statuses.push(
            { value: 'APPROUVEE_ACHAT', label: '✓ Approuver l\'achat', color: 'text-green-600' },
            { value: 'REFUSEE_ACHAT', label: '✗ Refuser l\'achat', color: 'text-red-600' }
          );
          break;
        
        case 'APPROUVEE_ACHAT':
          statuses.push(
            { value: 'ACHAT_EFFECTUE', label: '📦 Marquer achat effectué', color: 'text-blue-600' }
          );
          break;
        
        case 'ACHAT_EFFECTUE':
          statuses.push(
            { value: 'RECEPTIONNEE', label: '📥 Marquer réceptionnée', color: 'text-indigo-600' }
          );
          break;
        
        case 'RECEPTIONNEE':
          statuses.push(
            { value: 'DISTRIBUEE', label: '👤 Marquer distribuée', color: 'text-emerald-600' }
          );
          break;
      }
    }

    return statuses;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newStatus) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un nouveau statut',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      await purchaseRequestsAPI.updateStatus(request.id, {
        status: newStatus,
        comment: comment || null
      });

      toast({
        title: 'Succès',
        description: 'Le statut a été mis à jour avec succès'
      });

      setNewStatus('');
      setComment('');
      onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de mettre à jour le statut',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const availableStatuses = getAvailableStatuses();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Changer le statut</DialogTitle>
        </DialogHeader>

        {availableStatuses.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              Aucun changement de statut disponible pour cette demande.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <div className="text-sm font-semibold text-blue-900 mb-1">Statut actuel</div>
              <div className="text-sm text-blue-800">
                {request.status === 'SOUMISE' && 'Transmise au N+1'}
                {request.status === 'VALIDEE_N1' && 'Validée par N+1'}
                {request.status === 'APPROUVEE_ACHAT' && 'Approuvée Achat'}
                {request.status === 'ACHAT_EFFECTUE' && 'Achat Effectué'}
                {request.status === 'RECEPTIONNEE' && 'Réceptionnée'}
                {request.status === 'DISTRIBUEE' && 'Distribuée'}
                {request.status === 'REFUSEE_N1' && 'Refusée par N+1'}
                {request.status === 'REFUSEE_ACHAT' && 'Refusée Achat'}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newStatus">Nouveau statut *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <span className={status.color}>{status.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Commentaire (optionnel)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajoutez un commentaire pour expliquer ce changement..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading || !newStatus}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  'Confirmer'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseRequestStatusDialog;
