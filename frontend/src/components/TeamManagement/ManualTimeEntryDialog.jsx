import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Clock, Edit, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../hooks/use-toast';

const ManualTimeEntryDialog = ({ open, onClose, member, onSave }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    clock_in: member?.work_rhythm_config?.default_start || '08:00',
    clock_out: member?.work_rhythm_config?.default_end || '17:00',
    reason: 'Saisie manuelle',
    notes: ''
  });

  const reasons = [
    'Saisie manuelle',
    'Oubli de pointage',
    'Problème technique',
    'Régularisation',
    'Autre'
  ];

  const handleSave = async () => {
    if (!formData.clock_in || !formData.clock_out) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir les heures d\'arrivée et de départ',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      await api.post('/time-tracking/manual-entry', {
        member_id: member.id,
        date: formData.date,
        clock_in: formData.clock_in,
        clock_out: formData.clock_out,
        reason: formData.reason,
        notes: formData.notes
      });
      
      toast({
        title: 'Succès',
        description: 'Pointage enregistré'
      });
      
      onSave();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible d\'enregistrer le pointage',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-600" />
            Saisie manuelle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Member Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium">{member?.prenom} {member?.nom}</p>
            <p className="text-sm text-gray-500">
              Rythme: {member?.work_rhythm_config?.default_start} - {member?.work_rhythm_config?.default_end}
            </p>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clock_in" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                Heure d'arrivée
              </Label>
              <Input
                id="clock_in"
                type="time"
                value={formData.clock_in}
                onChange={(e) => setFormData(prev => ({ ...prev, clock_in: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clock_out" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                Heure de départ
              </Label>
              <Input
                id="clock_out"
                type="time"
                value={formData.clock_out}
                onChange={(e) => setFormData(prev => ({ ...prev, clock_out: e.target.value }))}
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Motif</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
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
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualTimeEntryDialog;
