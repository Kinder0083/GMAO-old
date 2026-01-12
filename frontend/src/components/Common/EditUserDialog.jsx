import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Edit, Building2, Clock } from 'lucide-react';
import { usersAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { formatErrorMessage } from '../../utils/errorFormatter';

// Services prédéfinis pour le regroupement dans le Planning
const PREDEFINED_SERVICES = [
  'Maintenance',
  'Production',
  'QHSE',
  'Logistique',
  'Laboratoire',
  'Industrialisation',
  'Administration',
  'Direction',
  'ADV'
];

// Régimes de travail
const REGIMES = [
  { value: 'Journée', label: 'Journée' },
  { value: '2*8', label: '2×8 (Matin/Après-midi)' },
  { value: '3*8', label: '3×8 (Matin/Après-midi/Nuit)' }
];

const EditUserDialog = ({ open, onOpenChange, user, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isCustomService, setIsCustomService] = useState(false);
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    service: '',
    regime: 'Journée',
    role: 'VISUALISEUR'
  });

  useEffect(() => {
    if (user) {
      const userService = user.service || '';
      const isCustom = userService && !PREDEFINED_SERVICES.includes(userService);
      setIsCustomService(isCustom);
      setFormData({
        prenom: user.prenom || '',
        nom: user.nom || '',
        email: user.email || '',
        telephone: user.telephone || '',
        service: userService,
        regime: user.regime || 'Journée',
        role: user.role || 'VISUALISEUR'
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.prenom || !formData.nom || !formData.email || !formData.role) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      await usersAPI.update(user.id, formData);
      
      toast({
        title: 'Succès',
        description: 'Les informations de l\'utilisateur ont été modifiées avec succès'
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible de modifier l\'utilisateur'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="text-blue-600" size={20} />
            Modifier l'utilisateur
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                placeholder="Ex: 06 12 34 56 78"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service" className="flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                Service (pour le Planning)
              </Label>
              <select
                id="service"
                name="service"
                value={isCustomService ? '__custom__' : formData.service}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomService(true);
                    setFormData({ ...formData, service: '' });
                  } else {
                    setIsCustomService(false);
                    setFormData({ ...formData, service: e.target.value });
                  }
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="service-select"
              >
                <option value="">-- Aucun service --</option>
                {PREDEFINED_SERVICES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="__custom__">Autre (saisir manuellement)</option>
              </select>
              {isCustomService && (
                <Input
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                  placeholder="Saisir le nom du service"
                  className="mt-2"
                  autoFocus
                  data-testid="service-custom-input"
                />
              )}
              <p className="text-xs text-gray-500">
                Le service permet de regrouper le personnel dans le Planning
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rôle *</Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="ADMIN">Administrateur - Accès complet</option>
                <option value="DIRECTEUR">Directeur</option>
                <option value="QHSE">QHSE</option>
                <option value="RSP_PROD">Responsable Production</option>
                <option value="PROD">Production</option>
                <option value="INDUS">Industrialisation</option>
                <option value="LOGISTIQUE">Logistique</option>
                <option value="LABO">Laboratoire</option>
                <option value="ADV">ADV</option>
                <option value="TECHNICIEN">Technicien</option>
                <option value="VISUALISEUR">Visualiseur - Accès en lecture seule</option>
              </select>
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
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
