import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { preventiveMaintenanceAPI, equipmentsAPI, usersAPI } from '../../services/api';
import { formatErrorMessage } from '../../utils/errorFormatter';
import { ClipboardCheck, CheckCircle } from 'lucide-react';

const PreventiveMaintenanceFormDialog = ({ open, onOpenChange, maintenance, onSuccess, checklists = [] }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [equipments, setEquipments] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    titre: '',
    equipement_id: '',
    frequence: 'MENSUEL',
    prochaineMaintenance: '',
    assigne_a_id: '',
    duree: '',
    statut: 'ACTIF',
    checklist_template_id: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
      if (maintenance) {
        setFormData({
          titre: maintenance.titre || '',
          equipement_id: maintenance.equipement?.id || '',
          frequence: maintenance.frequence || 'MENSUEL',
          prochaineMaintenance: maintenance.prochaineMaintenance?.split('T')[0] || '',
          assigne_a_id: maintenance.assigneA?.id || '',
          duree: maintenance.duree || '',
          statut: maintenance.statut || 'ACTIF',
          checklist_template_id: maintenance.checklist_template_id || ''
        });
      } else {
        setFormData({
          titre: '',
          equipement_id: '',
          frequence: 'MENSUEL',
          prochaineMaintenance: '',
          assigne_a_id: '',
          duree: '',
          statut: 'ACTIF',
          checklist_template_id: ''
        });
      }
    }
  }, [open, maintenance]);

  const loadData = async () => {
    try {
      const [equipRes, userRes] = await Promise.all([
        equipmentsAPI.getAll(),
        usersAPI.getAll()
      ]);
      setEquipments(equipRes.data);
      setUsers(userRes.data);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        duree: parseFloat(formData.duree),
        prochaineMaintenance: new Date(formData.prochaineMaintenance).toISOString(),
        checklist_template_id: formData.checklist_template_id || null
      };

      if (maintenance) {
        await preventiveMaintenanceAPI.update(maintenance.id, submitData);
        toast({
          title: 'Succès',
          description: 'Maintenance préventive modifiée avec succès'
        });
      } else {
        await preventiveMaintenanceAPI.create(submitData);
        toast({
          title: 'Succès',
          description: 'Maintenance préventive créée avec succès'
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

  // Filtrer les checklists par équipement sélectionné (si applicable)
  const availableChecklists = checklists.filter(cl => 
    cl.is_template && (
      cl.equipment_ids?.length === 0 || 
      !formData.equipement_id ||
      cl.equipment_ids?.includes(formData.equipement_id)
    )
  );

  const selectedChecklist = checklists.find(cl => cl.id === formData.checklist_template_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{maintenance ? 'Modifier' : 'Nouvelle'} maintenance préventive</DialogTitle>
          <DialogDescription>
            Remplissez les informations de la maintenance préventive
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre *</Label>
            <Input
              id="titre"
              value={formData.titre}
              onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipement_id">Équipement *</Label>
            <Select value={formData.equipement_id} onValueChange={(value) => setFormData({ ...formData, equipement_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un équipement" />
              </SelectTrigger>
              <SelectContent>
                {equipments.map(eq => (
                  <SelectItem key={eq.id} value={eq.id}>{eq.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequence">Fréquence *</Label>
              <Select value={formData.frequence} onValueChange={(value) => setFormData({ ...formData, frequence: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HEBDOMADAIRE">Hebdomadaire</SelectItem>
                  <SelectItem value="MENSUEL">Mensuel</SelectItem>
                  <SelectItem value="TRIMESTRIEL">Trimestriel</SelectItem>
                  <SelectItem value="ANNUEL">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statut">Statut</Label>
              <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIF">Actif</SelectItem>
                  <SelectItem value="INACTIF">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigne_a_id">Assigné à *</Label>
            <Select value={formData.assigne_a_id} onValueChange={(value) => setFormData({ ...formData, assigne_a_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un technicien" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.prenom} {user.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prochaineMaintenance">Prochaine maintenance *</Label>
              <Input
                id="prochaineMaintenance"
                type="date"
                value={formData.prochaineMaintenance}
                onChange={(e) => setFormData({ ...formData, prochaineMaintenance: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duree">Durée estimée (heures) *</Label>
              <Input
                id="duree"
                type="number"
                step="0.5"
                value={formData.duree}
                onChange={(e) => setFormData({ ...formData, duree: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Sélection de checklist */}
          <div className="space-y-2 p-4 bg-green-50 rounded-lg border border-green-200">
            <Label htmlFor="checklist_template_id" className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-green-600" />
              Checklist de contrôle (optionnel)
            </Label>
            <Select 
              value={formData.checklist_template_id} 
              onValueChange={(value) => setFormData({ ...formData, checklist_template_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une checklist..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune checklist</SelectItem>
                {availableChecklists.map(cl => (
                  <SelectItem key={cl.id} value={cl.id}>
                    {cl.name} ({cl.items?.length || 0} items)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedChecklist && (
              <div className="mt-2 p-3 bg-white rounded border">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Aperçu : {selectedChecklist.name}
                </p>
                <div className="space-y-1">
                  {selectedChecklist.items?.slice(0, 3).map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={14} className="text-green-500" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                  {selectedChecklist.items?.length > 3 && (
                    <p className="text-xs text-gray-400 mt-1">
                      + {selectedChecklist.items.length - 3} autres items...
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {checklists.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Aucune checklist disponible. Créez-en une depuis l&apos;onglet Checklists.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Enregistrement...' : maintenance ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PreventiveMaintenanceFormDialog;
