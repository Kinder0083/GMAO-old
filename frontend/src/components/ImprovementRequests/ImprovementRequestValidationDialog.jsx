import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { improvementRequestsAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';

const ImprovementRequestValidationDialog = ({ open, onOpenChange, request, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [action, setAction] = useState(null); // 'validate' or 'reject'

  const handleAction = async (actionType) => {
    setAction(actionType);
    setLoading(true);

    try {
      const status = actionType === 'validate' ? 'VALIDEE' : 'REJETEE';
      await improvementRequestsAPI.updateStatus(request.id, {
        status,
        comment: comment || undefined
      });

      toast({
        title: actionType === 'validate' ? 'Demande validée' : 'Demande rejetée',
        description: actionType === 'validate' 
          ? 'La demande a été validée et peut maintenant être convertie en projet.'
          : 'La demande a été rejetée. Le demandeur sera notifié.',
        variant: actionType === 'validate' ? 'default' : 'destructive'
      });

      onOpenChange(false);
      setComment('');
      setAction(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erreur validation:', error);
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de mettre à jour le statut',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  const currentStatus = request.status || 'SOUMISE';
  const canValidate = currentStatus === 'SOUMISE' || !currentStatus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Validation de la demande
          </DialogTitle>
          <DialogDescription>
            Validez ou rejetez cette demande d'amélioration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informations de la demande */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-gray-900">{request.titre}</h4>
            <p className="text-sm text-gray-600 line-clamp-3">{request.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
              <span>Par: {request.created_by_name}</span>
              {request.service && <span>Service: {request.service}</span>}
            </div>
          </div>

          {!canValidate && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <p className="text-sm text-amber-800">
                Cette demande a déjà été traitée (statut: {currentStatus})
              </p>
            </div>
          )}

          {canValidate && (
            <div className="space-y-2">
              <Label htmlFor="comment">Commentaire (optionnel pour validation, recommandé pour rejet)</Label>
              <Textarea
                id="comment"
                placeholder="Ajoutez un commentaire explicatif..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          
          {canValidate && (
            <>
              <Button
                variant="destructive"
                onClick={() => handleAction('reject')}
                disabled={loading}
                data-testid="reject-improvement-request-btn"
              >
                {loading && action === 'reject' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Rejeter
              </Button>
              
              <Button
                onClick={() => handleAction('validate')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
                data-testid="validate-improvement-request-btn"
              >
                {loading && action === 'validate' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Valider
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImprovementRequestValidationDialog;
