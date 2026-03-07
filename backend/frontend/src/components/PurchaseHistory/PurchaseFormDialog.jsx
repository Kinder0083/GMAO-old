import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';
import { purchaseHistoryAPI } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorFormatter';

const PurchaseFormDialog = ({ open, onOpenChange, purchase, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fournisseur: '',
    numeroCommande: '',
    numeroReception: '',
    dateCreation: new Date().toISOString().split('T')[0],
    article: '',
    description: '',
    groupeStatistique: '',
    quantite: 0,
    montantLigneHT: 0,
    quantiteRetournee: 0,
    site: ''
  });

  useEffect(() => {
    if (open) {
      if (purchase) {
        setFormData({
          fournisseur: purchase.fournisseur || '',
          numeroCommande: purchase.numeroCommande || '',
          numeroReception: purchase.numeroReception || '',
          dateCreation: purchase.dateCreation ? new Date(purchase.dateCreation).toISOString().split('T')[0] : '',
          article: purchase.article || '',
          description: purchase.description || '',
          groupeStatistique: purchase.groupeStatistique || '',
          quantite: purchase.quantite || 0,
          montantLigneHT: purchase.montantLigneHT || 0,
          quantiteRetournee: purchase.quantiteRetournee || 0,
          site: purchase.site || ''
        });
      } else {
        setFormData({
          fournisseur: '',
          numeroCommande: '',
          numeroReception: '',
          dateCreation: new Date().toISOString().split('T')[0],
          article: '',
          description: '',
          groupeStatistique: '',
          quantite: 0,
          montantLigneHT: 0,
          quantiteRetournee: 0,
          site: ''
        });
      }
    }
  }, [open, purchase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convertir la date en ISO datetime
      const dataToSend = {
        ...formData,
        dateCreation: new Date(formData.dateCreation).toISOString(),
        quantite: parseFloat(formData.quantite),
        montantLigneHT: parseFloat(formData.montantLigneHT),
        quantiteRetournee: parseFloat(formData.quantiteRetournee) || 0
      };

      if (purchase) {
        await purchaseHistoryAPI.update(purchase.id, dataToSend);
        toast({
          title: 'Succès',
          description: 'Achat modifié avec succès'
        });
      } else {
        await purchaseHistoryAPI.create(dataToSend);
        toast({
          title: 'Succès',
          description: 'Achat créé avec succès'
        });
      }

      onSuccess();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{purchase ? 'Modifier' : 'Nouvel'} achat</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fournisseur">Fournisseur *</Label>
              <Input
                id="fournisseur"
                value={formData.fournisseur}
                onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateCreation">Date de création *</Label>
              <Input
                id="dateCreation"
                type="date"
                value={formData.dateCreation}
                onChange={(e) => setFormData({ ...formData, dateCreation: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroCommande">N° Commande *</Label>
              <Input
                id="numeroCommande"
                value={formData.numeroCommande}
                onChange={(e) => setFormData({ ...formData, numeroCommande: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroReception">N° Réception</Label>
              <Input
                id="numeroReception"
                value={formData.numeroReception}
                onChange={(e) => setFormData({ ...formData, numeroReception: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="article">Article *</Label>
            <Input
              id="article"
              value={formData.article}
              onChange={(e) => setFormData({ ...formData, article: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="groupeStatistique">Groupe statistique STK</Label>
              <Input
                id="groupeStatistique"
                value={formData.groupeStatistique}
                onChange={(e) => setFormData({ ...formData, groupeStatistique: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site">Site</Label>
              <Input
                id="site"
                value={formData.site}
                onChange={(e) => setFormData({ ...formData, site: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantite">Quantité *</Label>
              <Input
                id="quantite"
                type="number"
                step="0.01"
                value={formData.quantite}
                onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="montantLigneHT">Montant ligne HT (€) *</Label>
              <Input
                id="montantLigneHT"
                type="number"
                step="0.01"
                value={formData.montantLigneHT}
                onChange={(e) => setFormData({ ...formData, montantLigneHT: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantiteRetournee">Quantité retournée</Label>
              <Input
                id="quantiteRetournee"
                type="number"
                step="0.01"
                value={formData.quantiteRetournee}
                onChange={(e) => setFormData({ ...formData, quantiteRetournee: e.target.value })}
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
              {loading ? 'Enregistrement...' : purchase ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseFormDialog;
