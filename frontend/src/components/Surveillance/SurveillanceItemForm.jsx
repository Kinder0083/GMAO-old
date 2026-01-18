import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Send } from 'lucide-react';
import { surveillanceAPI, usersAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';

function SurveillanceItemForm({ open, item, onClose }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [existingCategories, setExistingCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    classe_type: '',
    category: '',
    batiment: '',
    periodicite: '',
    responsable: '',
    executant: '',
    description: '',
    derniere_visite: '',
    prochain_controle: '',
    commentaire: '',
    duree_rappel_echeance: 30,
    responsable_notification_id: ''
  });

  useEffect(() => {
    if (open) {
      loadExistingCategories();
      loadUsers();
    }
    if (item) {
      setFormData({
        classe_type: item.classe_type || '',
        category: item.category || '',
        batiment: item.batiment || '',
        periodicite: item.periodicite || '',
        responsable: item.responsable || '',
        executant: item.executant || '',
        description: item.description || '',
        derniere_visite: item.derniere_visite ? item.derniere_visite.split('T')[0] : '',
        prochain_controle: item.prochain_controle ? item.prochain_controle.split('T')[0] : '',
        commentaire: item.commentaire || '',
        duree_rappel_echeance: item.duree_rappel_echeance || 30,
        responsable_notification_id: item.responsable_notification_id || '',
        // Champs booléens pour les mois
        janvier: item.janvier || false,
        fevrier: item.fevrier || false,
        mars: item.mars || false,
        avril: item.avril || false,
        mai: item.mai || false,
        juin: item.juin || false,
        juillet: item.juillet || false,
        aout: item.aout || false,
        septembre: item.septembre || false,
        octobre: item.octobre || false,
        novembre: item.novembre || false,
        decembre: item.decembre || false
      });
    } else {
      // Reset pour création
      setFormData({
        classe_type: '',
        category: '',
        batiment: '',
        periodicite: '',
        responsable: '',
        executant: '',
        description: '',
        derniere_visite: '',
        prochain_controle: '',
        commentaire: '',
        duree_rappel_echeance: 30,
        responsable_notification_id: ''
      });
    }
  }, [item, open]);

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    }
  };

  const loadExistingCategories = async () => {
    try {
      const items = await surveillanceAPI.getItems();
      // Extraire toutes les catégories uniques
      const categories = [...new Set(items.map(i => i.category))].filter(Boolean).sort();
      setExistingCategories(categories);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
      // Catégories par défaut en cas d'erreur
      setExistingCategories(['INCENDIE', 'ELECTRIQUE', 'MMRI', 'SECURITE_ENVIRONNEMENT']);
    }
  };

  // Fonction pour calculer le prochain contrôle automatiquement
  const calculateNextControl = (lastVisitDate, periodicite) => {
    if (!lastVisitDate || !periodicite) return null;

    try {
      const date = new Date(lastVisitDate);
      const periodLower = periodicite.toLowerCase().trim();

      // Parser la périodicité
      if (periodLower.includes('jour')) {
        // "journalier" ou "1 jour" ou "30 jours"
        const match = periodLower.match(/(\d+)/);
        const days = match ? parseInt(match[1]) : 1;
        date.setDate(date.getDate() + days);
      } else if (periodLower.includes('semaine')) {
        // "1 semaine" ou "2 semaines"
        const match = periodLower.match(/(\d+)/);
        const weeks = match ? parseInt(match[1]) : 1;
        date.setDate(date.getDate() + (weeks * 7));
      } else if (periodLower.includes('mois')) {
        // "6 mois" ou "1 mois"
        const match = periodLower.match(/(\d+)/);
        const months = match ? parseInt(match[1]) : 1;
        date.setMonth(date.getMonth() + months);
      } else if (periodLower.includes('an')) {
        // "1 an" ou "3 ans"
        const match = periodLower.match(/(\d+)/);
        const years = match ? parseInt(match[1]) : 1;
        date.setFullYear(date.getFullYear() + years);
      } else {
        // Format non reconnu, retourner null
        return null;
      }

      // Formater la date en YYYY-MM-DD pour l'input date
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Erreur calcul prochain contrôle:', error);
      return null;
    }
  };

  // useEffect pour calculer automatiquement le prochain contrôle
  useEffect(() => {
    if (formData.derniere_visite && formData.periodicite) {
      const nextDate = calculateNextControl(formData.derniere_visite, formData.periodicite);
      if (nextDate && nextDate !== formData.prochain_controle) {
        setFormData(prev => ({ ...prev, prochain_controle: nextDate }));
      }
    }
  }, [formData.derniere_visite, formData.periodicite]);

  const handleSubmit = async () => {
    // Validation des champs obligatoires
    if (!formData.classe_type || !formData.category || !formData.batiment || !formData.periodicite || !formData.responsable || !formData.executant) {
      console.error('❌ Champs manquants:', {
        classe_type: !!formData.classe_type,
        category: !!formData.category,
        batiment: !!formData.batiment,
        periodicite: !!formData.periodicite,
        responsable: !!formData.responsable,
        executant: !!formData.executant
      });
      toast({ title: 'Erreur', description: 'Champs obligatoires manquants', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Nettoyer les données : transformer les chaînes vides en null
      const apiData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      );
      
      console.log('📤 Envoi données au backend:', apiData);
      
      if (item) {
        await surveillanceAPI.updateItem(item.id, apiData);
        toast({ title: 'Succès', description: 'Item mis à jour' });
      } else {
        await surveillanceAPI.createItem(apiData);
        toast({ title: 'Succès', description: 'Item créé' });
      }
      onClose(true);
    } catch (error) {
      console.error('❌ Erreur API:', error);
      console.error('❌ Détails erreur:', error.response?.data || error.message);
      toast({ 
        title: 'Erreur', 
        description: error.response?.data?.detail || 'Erreur enregistrement', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Éditer le contrôle' : 'Nouveau contrôle'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label>Type de contrôle *</Label>
            <Input value={formData.classe_type} onChange={(e) => setFormData({...formData, classe_type: e.target.value})} placeholder="Ex: Protection incendie" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Catégorie *</Label>
              <Input 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value.toUpperCase()})} 
                placeholder="Ex: INCENDIE, ELECTRIQUE, NOUVELLE_CATEGORIE..."
                list="categories-list"
              />
              <datalist id="categories-list">
                {existingCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              <p className="text-xs text-gray-500 mt-1">
                💡 Tapez le nom de la catégorie (ex: INCENDIE) ou créez-en une nouvelle
              </p>
            </div>
            <div>
              <Label>Bâtiment *</Label>
              <Input value={formData.batiment} onChange={(e) => setFormData({...formData, batiment: e.target.value})} placeholder="Ex: BATIMENT 1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Périodicité *</Label>
              <Input value={formData.periodicite} onChange={(e) => setFormData({...formData, periodicite: e.target.value})} placeholder="Ex: 6 mois" />
            </div>
            <div>
              <Label>Responsable *</Label>
              <Select value={formData.responsable} onValueChange={(val) => setFormData({...formData, responsable: val})}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAINT">MAINT</SelectItem>
                  <SelectItem value="PROD">PROD</SelectItem>
                  <SelectItem value="QHSE">QHSE</SelectItem>
                  <SelectItem value="EXTERNE">EXTERNE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Exécutant *</Label>
            <Input value={formData.executant} onChange={(e) => setFormData({...formData, executant: e.target.value})} placeholder="Ex: DESAUTEL" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Dernière visite</Label>
              <Input type="date" value={formData.derniere_visite} onChange={(e) => setFormData({...formData, derniere_visite: e.target.value})} />
            </div>
            <div>
              <Label>Prochain contrôle</Label>
              <Input 
                type="date" 
                value={formData.prochain_controle} 
                onChange={(e) => setFormData({...formData, prochain_controle: e.target.value})} 
                className={formData.derniere_visite && formData.periodicite ? "bg-blue-50 border-blue-200" : ""}
              />
              {formData.derniere_visite && formData.periodicite && (
                <p className="text-xs text-blue-600 mt-1">
                  ✨ Calculé automatiquement : Dernière visite + Périodicité
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>Durée de rappel d'échéance (jours)</Label>
            <Input 
              type="number" 
              min="1" 
              max="365" 
              value={formData.duree_rappel_echeance} 
              onChange={(e) => setFormData({...formData, duree_rappel_echeance: parseInt(e.target.value) || 30})} 
              placeholder="30"
            />
            <p className="text-xs text-gray-500 mt-1">Nombre de jours avant l'échéance pour recevoir un rappel</p>
          </div>

          <div>
            <Label>Responsable de notification</Label>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <Select 
                  value={formData.responsable_notification_id || "none"} 
                  onValueChange={(val) => setFormData({...formData, responsable_notification_id: val === "none" ? "" : val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {users.filter(user => user.id && user.id !== '').map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.prenom || user.first_name} {user.nom || user.last_name}
                        {user.email && ` - ${user.email}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!formData.responsable_notification_id || formData.responsable_notification_id === "none" || sendingEmail || !item}
                onClick={async () => {
                  if (!item?.id) {
                    toast({
                      title: 'Attention',
                      description: 'Veuillez d\'abord enregistrer le contrôle avant d\'envoyer un rappel',
                      variant: 'destructive'
                    });
                    return;
                  }
                  setSendingEmail(true);
                  try {
                    const response = await surveillanceAPI.sendManualReminder(item.id);
                    toast({
                      title: 'Succès',
                      description: 'Email de rappel envoyé avec succès'
                    });
                  } catch (error) {
                    toast({
                      title: 'Erreur',
                      description: error.response?.data?.detail || 'Impossible d\'envoyer l\'email',
                      variant: 'destructive'
                    });
                  } finally {
                    setSendingEmail(false);
                  }
                }}
                className="whitespace-nowrap"
                title={!item ? "Enregistrez d'abord le contrôle" : "Envoyer un email de rappel maintenant"}
              >
                <Send size={16} className="mr-1" />
                {sendingEmail ? 'Envoi...' : 'Envoi Manuel'}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Cette personne recevra un email de rappel avant l'échéance du contrôle</p>
          </div>

          <div>
            <Label>Commentaire</Label>
            <Textarea value={formData.commentaire} onChange={(e) => setFormData({...formData, commentaire: e.target.value})} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={loading}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Enregistrement...' : (item ? 'Mettre à jour' : 'Créer')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SurveillanceItemForm;
