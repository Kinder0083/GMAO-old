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
import { PasswordInput } from '../ui/password-input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { usersAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { Loader2, UserPlus, Building2 } from 'lucide-react';
import PermissionsGrid from './PermissionsGrid';
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

const CreateMemberDialog = ({ open, onOpenChange, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isCustomService, setIsCustomService] = useState(false);
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    service: '',
    role: 'TECHNICIEN',
    password: '',
    permissions: {}
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.prenom || !formData.email || !formData.password) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive'
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 8 caractères',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      await usersAPI.createMember(formData);
      
      toast({
        title: 'Membre créé !',
        description: 'Le membre a été créé avec succès. Un email avec ses identifiants lui a été envoyé.',
      });

      // Reset form
      setFormData({
        prenom: '',
        nom: '',
        email: '',
        telephone: '',
        service: '',
        role: 'TECHNICIEN',
        password: '',
        permissions: {}
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible de créer le membre'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Créer un membre
          </DialogTitle>
          <DialogDescription>
            Créez un nouveau membre directement. Il devra changer son mot de passe lors de sa première connexion.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-2">
            {/* Informations personnelles - sur 2 colonnes */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Informations personnelles</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => handleChange('prenom', e.target.value)}
                    placeholder="Jean"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => handleChange('nom', e.target.value)}
                    placeholder="Dupont"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="jean.dupont@example.com"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => handleChange('telephone', e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>
            </div>

            {/* Rôle et accès - sur 2 colonnes */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Rôle et accès</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="service" className="flex items-center gap-2">
                    <Building2 size={14} className="text-blue-600" />
                    Service (pour le Planning)
                  </Label>
                  <Select 
                    value={PREDEFINED_SERVICES.includes(formData.service) ? formData.service : (formData.service ? '__custom__' : '__none__')} 
                    onValueChange={(value) => {
                      if (value === '__custom__') {
                        handleChange('service', '');
                      } else if (value === '__none__') {
                        handleChange('service', '');
                      } else {
                        handleChange('service', value);
                      }
                    }}
                  >
                    <SelectTrigger data-testid="create-service-select">
                      <SelectValue placeholder="Sélectionner un service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Aucun service --</SelectItem>
                      {PREDEFINED_SERVICES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                      <SelectItem value="__custom__">Autre (saisir manuellement)</SelectItem>
                    </SelectContent>
                  </Select>
                  {(!PREDEFINED_SERVICES.includes(formData.service) && formData.service !== '') && (
                    <Input
                      value={formData.service}
                      onChange={(e) => handleChange('service', e.target.value)}
                      placeholder="Saisir le nom du service"
                      className="mt-1"
                      data-testid="create-service-custom-input"
                    />
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="role">Rôle *</Label>
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
                </div>

                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="password">Mot de passe temporaire *</Label>
                  <PasswordInput
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Minimum 8 caractères"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Le membre devra changer ce mot de passe lors de sa première connexion
                  </p>
                </div>
              </div>
            </div>

            {/* Grille de permissions - pleine largeur avec hauteur limitée */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Permissions personnalisées</h3>
              <p className="text-xs text-gray-500 mb-3">
                Personnalisez les accès selon vos besoins (par défaut basé sur le rôle)
              </p>
              <PermissionsGrid
                role={formData.role}
                permissions={formData.permissions}
                onChange={(permissions) => handleChange('permissions', permissions)}
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
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Créer le membre
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateMemberDialog;
