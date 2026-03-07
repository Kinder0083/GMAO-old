import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { purchaseRequestsAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle, Package } from 'lucide-react';

const AddToInventoryDialog = ({ open, onOpenChange, request, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('checking'); // checking, duplicates, adding
  const [duplicates, setDuplicates] = useState([]);

  const checkAndAdd = async () => {
    try {
      setLoading(true);
      setStep('checking');

      console.log('Checking inventory for request:', request.id);
      const response = await purchaseRequestsAPI.addToInventory(request.id);
      console.log('Response:', response.data);

      if (response.data.has_duplicates) {
        // Il y a des doublons potentiels
        setDuplicates(response.data.matches);
        setStep('duplicates');
        setLoading(false);
      } else if (response.data.success) {
        // Ajouté avec succès
        toast({
          title: 'Succès',
          description: 'Article ajouté à l\'inventaire avec succès'
        });
        setLoading(false);
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error adding to inventory:', error);
      setLoading(false);
      setStep('error');
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible d\'ajouter à l\'inventaire',
        variant: 'destructive'
      });
      // Ne pas fermer le dialog immédiatement, laisser l'utilisateur voir l'erreur
      setTimeout(() => onOpenChange(false), 3000);
    }
  };

  const addToExisting = async (inventoryItemId) => {
    try {
      setLoading(true);
      setStep('adding');

      await purchaseRequestsAPI.addToExistingInventory(request.id, inventoryItemId);

      toast({
        title: 'Succès',
        description: 'Quantité ajoutée à l\'article existant'
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible d\'ajouter à l\'inventaire',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createNew = async () => {
    try {
      setLoading(true);
      setStep('adding');

      // Forcer la création d'un nouvel article en passant un ID vide
      const response = await purchaseRequestsAPI.addToInventory(request.id);

      toast({
        title: 'Succès',
        description: 'Nouvel article créé dans l\'inventaire'
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de créer l\'article',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      setStep('checking');
      setDuplicates([]);
      checkAndAdd();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter à l'inventaire</DialogTitle>
        </DialogHeader>

        {step === 'checking' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Vérification des doublons...</p>
          </div>
        )}

        {step === 'duplicates' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-yellow-900">Articles similaires trouvés</div>
                  <div className="text-sm text-yellow-800 mt-1">
                    Des articles avec des désignations similaires existent dans l'inventaire. 
                    Voulez-vous ajouter la quantité à un article existant ou créer un nouvel article ?
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <div className="font-semibold text-blue-900 mb-2">Article à ajouter :</div>
              <div className="text-sm text-blue-800">
                <div><strong>Désignation:</strong> {request.designation}</div>
                <div><strong>Quantité:</strong> {request.quantite} {request.unite}</div>
                {request.reference && <div><strong>Référence:</strong> {request.reference}</div>}
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-semibold">Articles similaires trouvés :</div>
              {duplicates.map((item) => (
                <div
                  key={item.id}
                  className="border rounded p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="font-medium">{item.nom}</div>
                        {item.match_type === 'exact' && (
                          <Badge className="bg-red-100 text-red-800">Correspondance exacte</Badge>
                        )}
                        {item.match_type === 'partial' && (
                          <Badge className="bg-orange-100 text-orange-800">Correspondance partielle</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Stock actuel: {item.quantite} {item.unite}</div>
                        {item.reference && <div>Référence: {item.reference}</div>}
                        {item.emplacement && <div>Emplacement: {item.emplacement}</div>}
                      </div>
                    </div>
                    <Button
                      onClick={() => addToExisting(item.id)}
                      disabled={loading}
                      className="ml-4"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Ajouter ici'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                onClick={createNew}
                disabled={loading}
                variant="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Créer un nouvel article
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'adding' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
            <p className="text-gray-600">Ajout en cours...</p>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
            <p className="text-gray-600">Une erreur s'est produite</p>
            <p className="text-sm text-gray-500 mt-2">Le dialog va se fermer automatiquement...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddToInventoryDialog;
