import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../hooks/use-toast';

const AbsenceDeclarationDialog = ({ open, onClose, member, onSave }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [absenceTypes, setAbsenceTypes] = useState([]);
  const [formData, setFormData] = useState({
    absence_type: 'CP',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
    notes: ''
  });

  useEffect(() => {
    loadAbsenceTypes();
  }, []);

  const loadAbsenceTypes = async () => {
    try {
      const response = await api.get('/time-tracking/absence-types');
      setAbsenceTypes(response.data);
    } catch (error) {
      console.error('Erreur chargement types absence:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.start_date || !formData.end_date) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir les dates',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      await api.post('/time-tracking/absences', {
        member_id: member.id,
        member_type: member.type,
        absence_type: formData.absence_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        notes: formData.notes
      });
      
      toast({
        title: 'Succès',
        description: 'Absence déclarée'
      });
      
      onSave();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de déclarer l\'absence',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getTypeColor = (code) => {
    const type = absenceTypes.find(t => t.code === code);
    return type?.color || '#6b7280';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Déclarer une absence
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Member Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium">{member?.prenom} {member?.nom}</p>
            <p className="text-sm text-gray-500">{member?.service}</p>
          </div>

          {/* Absence Type */}
          <div className="space-y-2">
            <Label>Type d'absence</Label>
            <Select
              value={formData.absence_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, absence_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {absenceTypes.map(type => (
                  <SelectItem key={type.code} value={type.code}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Date de début</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Date de fin</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motif (optionnel)</Label>
            <Input
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Raison de l'absence..."
            />
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
          <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Déclarer l\'absence'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AbsenceDeclarationDialog;
