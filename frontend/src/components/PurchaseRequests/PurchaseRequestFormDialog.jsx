import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { purchaseRequestsAPI, inventoryAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { Loader2 } from 'lucide-react';

const PurchaseRequestFormDialog = ({ open, onOpenChange, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState({
    type: 'PIECE_DETACHEE',
    designation: '',
    description: '',
    quantite: 1,
    unite: 'Unité',
    reference: '',
    fournisseur_suggere: '',
    urgence: 'NORMAL',
    justification: '',
    destinataire_id: '',
    inventory_item_id: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
      // Pré-remplir avec l'utilisateur connecté comme destinataire
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id && !formData.destinataire_id) {
        setFormData(prev => ({ ...prev, destinataire_id: user.id }));
      }
    }
  }, [open]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [usersRes, inventoryRes] = await Promise.all([
        purchaseRequestsAPI.getUsersList(),
        inventoryAPI.getAll()
      ]);
      setUsers(usersRes.data);
      setInventoryItems(inventoryRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleInventorySelect = (itemId) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      setFormData(prev => ({
        ...prev,
        inventory_item_id: itemId,
        designation: item.nom,
        reference: item.reference || '',
        unite: item.unite || 'Unité',
        type: item.categorie === 'piece' ? 'PIECE_DETACHEE' : 'CONSOMMABLE'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        inventory_item_id: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.designation || !formData.justification || !formData.destinataire_id) {
      toast({
        title: 'Champs manquants',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Trouver le nom du destinataire
      const destinataire = users.find(u => u.id === formData.destinataire_id);
      
      const requestData = {
        ...formData,
        destinataire_nom: destinataire ? destinataire.name : 'Inconnu',
        inventory_item_id: formData.inventory_item_id || null
      };

      await purchaseRequestsAPI.create(requestData);

      toast({
        title: 'Succès',
        description: 'Demande d\'achat créée avec succès'
      });

      // Reset form
      setFormData({
        type: 'PIECE_DETACHEE',
        designation: '',
        description: '',
        quantite: 1,
        unite: 'Unité',
        reference: '',
        fournisseur_suggere: '',
        urgence: 'NORMAL',
        justification: '',
        destinataire_id: '',
        inventory_item_id: ''
      });

      onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de créer la demande',
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
          <DialogTitle>Nouvelle Demande d'Achat</DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Lien avec inventaire (optionnel) */}
            <div className="space-y-2">
              <Label>Article depuis l'inventaire (optionnel)</Label>
              <Select
                value={formData.inventory_item_id || "none"}
                onValueChange={(value) => handleInventorySelect(value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un article existant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun (saisie manuelle)</SelectItem>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nom} - Stock: {item.quantite}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Sélectionnez un article existant pour pré-remplir le formulaire
              </p>
            </div>

            {/* Type et urgence */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIECE_DETACHEE">🔧 Pièce détachée</SelectItem>
                    <SelectItem value="EQUIPEMENT">⚙️ Équipement</SelectItem>
                    <SelectItem value="CONSOMMABLE">📦 Consommable</SelectItem>
                    <SelectItem value="SERVICE">🛠️ Service/Prestation</SelectItem>
                    <SelectItem value="OUTILLAGE">🔨 Outillage</SelectItem>
                    <SelectItem value="FOURNITURE">📝 Fourniture</SelectItem>
                    <SelectItem value="AUTRE">📋 Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgence">Urgence *</Label>
                <Select
                  value={formData.urgence}
                  onValueChange={(value) => setFormData({ ...formData, urgence: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="URGENT">⚠️ Urgent</SelectItem>
                    <SelectItem value="TRES_URGENT">🚨 Très urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Désignation et référence */}
            <div className="space-y-2">
              <Label htmlFor="designation">Désignation *</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="Nom de l'article ou du service"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="Référence fabricant, code article..."
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description détaillée</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Caractéristiques techniques, spécifications..."
                rows={3}
              />
            </div>

            {/* Quantité et unité */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantite">Quantité *</Label>
                <Input
                  id="quantite"
                  type="number"
                  min="1"
                  value={formData.quantite}
                  onChange={(e) => setFormData({ ...formData, quantite: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unite">Unité</Label>
                <Select
                  value={formData.unite}
                  onValueChange={(value) => setFormData({ ...formData, unite: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unité">Unité</SelectItem>
                    <SelectItem value="Kg">Kg</SelectItem>
                    <SelectItem value="L">Litre</SelectItem>
                    <SelectItem value="m">Mètre</SelectItem>
                    <SelectItem value="m²">m²</SelectItem>
                    <SelectItem value="m³">m³</SelectItem>
                    <SelectItem value="Boîte">Boîte</SelectItem>
                    <SelectItem value="Carton">Carton</SelectItem>
                    <SelectItem value="Palette">Palette</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fournisseur suggéré */}
            <div className="space-y-2">
              <Label htmlFor="fournisseur">Fournisseur suggéré</Label>
              <Input
                id="fournisseur"
                value={formData.fournisseur_suggere}
                onChange={(e) => setFormData({ ...formData, fournisseur_suggere: e.target.value })}
                placeholder="Nom du fournisseur recommandé"
              />
            </div>

            {/* Destinataire */}
            <div className="space-y-2">
              <Label htmlFor="destinataire">Destinataire final *</Label>
              <Select
                value={formData.destinataire_id}
                onValueChange={(value) => setFormData({ ...formData, destinataire_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le destinataire" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                La personne qui recevra l'article (peut être différente du demandeur)
              </p>
            </div>

            {/* Justification */}
            <div className="space-y-2">
              <Label htmlFor="justification">Justification de l'achat *</Label>
              <Textarea
                id="justification"
                value={formData.justification}
                onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                placeholder="Expliquez pourquoi cet achat est nécessaire (minimum 10 caractères)"
                rows={4}
                required
                minLength={10}
              />
              <p className="text-xs text-gray-500">
                Cette justification sera visible par votre N+1 et le service achat
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer la demande'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseRequestFormDialog;
