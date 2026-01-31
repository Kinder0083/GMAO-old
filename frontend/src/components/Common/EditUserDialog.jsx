import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Edit, Building2, Clock, Radio } from 'lucide-react';
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
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser?.role === 'ADMIN';
  
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    service: '',
    regime: 'Journée',
    role: 'VISUALISEUR',
    mqtt_topic: '',
    mqtt_action_ok: '',
    mqtt_action_reception: '',
    mqtt_topic_discret: ''
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
        role: user.role || 'VISUALISEUR',
        mqtt_topic: user.mqtt_topic || '',
        mqtt_action_ok: user.mqtt_action_ok || '',
        mqtt_action_reception: user.mqtt_action_reception || '',
        mqtt_topic_discret: user.mqtt_topic_discret || ''
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
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
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
              <Label htmlFor="regime" className="flex items-center gap-2">
                <Clock size={16} className="text-purple-600" />
                Régime de travail
              </Label>
              <select
                id="regime"
                name="regime"
                value={formData.regime}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                data-testid="regime-select"
              >
                {REGIMES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Définit l'affichage dans le Planning (case pleine, 2 parties ou 3 secteurs)
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

            {/* Section MQTT - Visible uniquement pour les administrateurs */}
            {isAdmin && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-orange-600">
                  <Radio size={18} />
                  <span className="font-medium text-sm">Configuration MQTT (Consignes)</span>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mqtt_topic" className="text-sm">
                    Topic Récepteur MQTT
                  </Label>
                  <Input
                    id="mqtt_topic"
                    name="mqtt_topic"
                    value={formData.mqtt_topic}
                    onChange={handleChange}
                    placeholder="Ex: factory/user1"
                    className="font-mono text-sm"
                    data-testid="mqtt-topic-input"
                  />
                  <p className="text-xs text-gray-500">
                    Topic MQTT de base pour cet utilisateur
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mqtt_action_reception" className="text-sm">
                    Action Réception
                  </Label>
                  <Input
                    id="mqtt_action_reception"
                    name="mqtt_action_reception"
                    value={formData.mqtt_action_reception}
                    onChange={handleChange}
                    placeholder="Ex: /consigne/received"
                    className="font-mono text-sm"
                    data-testid="mqtt-action-reception-input"
                  />
                  <p className="text-xs text-gray-500">
                    Suffixe ajouté au topic lors de la réception d&apos;une consigne
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mqtt_action_ok" className="text-sm">
                    Action OK
                  </Label>
                  <Input
                    id="mqtt_action_ok"
                    name="mqtt_action_ok"
                    value={formData.mqtt_action_ok}
                    onChange={handleChange}
                    placeholder="Ex: /consigne/ack"
                    className="font-mono text-sm"
                    data-testid="mqtt-action-ok-input"
                  />
                  <p className="text-xs text-gray-500">
                    Suffixe ajouté au topic lors du clic sur OK
                  </p>
                </div>
              </div>
            )}
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
