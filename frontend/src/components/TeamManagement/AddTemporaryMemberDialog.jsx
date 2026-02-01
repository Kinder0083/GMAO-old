import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { UserPlus, Calendar, Clock, Loader2, X, Plus } from 'lucide-react';

const AddTemporaryMemberDialog = ({ open, onClose, onSave, workRhythms }) => {
  const [saving, setSaving] = useState(false);
  const [competence, setCompetence] = useState('');
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    poste: '',
    service: '',
    mission_start: new Date().toISOString().split('T')[0],
    mission_end: '',
    work_rhythm: 'journee',
    competences: [],
    notes: ''
  });

  // Services disponibles
  const services = ['Maintenance', 'Production', 'QHSE', 'Logistique', 'R&D Innovation'];

  const handleSave = async () => {
    if (!formData.nom || !formData.prenom || !formData.service) {
      alert('Veuillez remplir les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const addCompetence = () => {
    if (competence.trim() && !formData.competences.includes(competence.trim())) {
      setFormData(prev => ({
        ...prev,
        competences: [...prev.competences, competence.trim()]
      }));
      setCompetence('');
    }
  };

  const removeCompetence = (comp) => {
    setFormData(prev => ({
      ...prev,
      competences: prev.competences.filter(c => c !== comp)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-amber-600" />
            Ajouter un membre temporaire
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom"
                value={formData.prenom}
                onChange={(e) => setFormData(prev => ({ ...prev, prenom: e.target.value }))}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                placeholder="Nom"
              />
            </div>
          </div>

          {/* Service & Poste */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service *</Label>
              <Select
                value={formData.service}
                onValueChange={(value) => setFormData(prev => ({ ...prev, service: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="poste">Poste/Fonction</Label>
              <Input
                id="poste"
                value={formData.poste}
                onChange={(e) => setFormData(prev => ({ ...prev, poste: e.target.value }))}
                placeholder="Ex: Technicien"
              />
            </div>
          </div>

          {/* Mission Period */}
          <div className="p-4 bg-amber-50 rounded-lg space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              Période de mission
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mission_start">Date de début *</Label>
                <Input
                  id="mission_start"
                  type="date"
                  value={formData.mission_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, mission_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mission_end">Date de fin *</Label>
                <Input
                  id="mission_end"
                  type="date"
                  value={formData.mission_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, mission_end: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Work Rhythm */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Rythme de travail
            </Label>
            <Select
              value={formData.work_rhythm}
              onValueChange={(value) => setFormData(prev => ({ ...prev, work_rhythm: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workRhythms.map(r => (
                  <SelectItem key={r.code} value={r.code}>
                    {r.name} ({r.config?.default_start} - {r.config?.default_end})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Competences */}
          <div className="space-y-2">
            <Label>Compétences</Label>
            <div className="flex gap-2">
              <Input
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                placeholder="Ajouter une compétence"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetence())}
              />
              <Button type="button" variant="outline" onClick={addCompetence}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.competences.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.competences.map(comp => (
                  <Badge key={comp} variant="secondary" className="flex items-center gap-1">
                    {comp}
                    <button onClick={() => removeCompetence(comp)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Informations complémentaires..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ajout...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter le membre
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTemporaryMemberDialog;
