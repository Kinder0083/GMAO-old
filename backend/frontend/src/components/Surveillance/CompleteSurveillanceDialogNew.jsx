import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Upload, X, FileText } from 'lucide-react';
import { surveillanceAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import api from '../../services/api';

function CompleteSurveillanceDialog({ open, item, onClose }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date_realisation: new Date().toISOString().split('T')[0],
    commentaires: '',
    duree_intervention: '',
    resultat: 'CONFORME'
  });
  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles([...files, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const calculateNextDate = (currentDate, periodicite) => {
    const date = new Date(currentDate);
    const lower = periodicite.toLowerCase();

    if (lower.includes('jour') || lower.includes('quotidien')) {
      date.setDate(date.getDate() + 1);
    } else if (lower.includes('semaine') || lower.includes('hebdo')) {
      date.setDate(date.getDate() + 7);
    } else if (lower.includes('mensuel') || lower === 'mois') {
      date.setMonth(date.getMonth() + 1);
    } else if (lower.includes('trimestriel') || lower.includes('3')) {
      date.setMonth(date.getMonth() + 3);
    } else if (lower.includes('6')) {
      date.setMonth(date.getMonth() + 6);
    } else if (lower.includes('annuel') || lower.includes('an')) {
      date.setFullYear(date.getFullYear() + 1);
    } else {
      date.setMonth(date.getMonth() + 1); // Par défaut mensuel
    }

    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 1. Créer l'entrée d'historique avec les fichiers
      const historyFormData = new FormData();
      historyFormData.append('control_id', item.id);
      historyFormData.append('date_realisation', formData.date_realisation);
      historyFormData.append('commentaires', formData.commentaires);
      historyFormData.append('duree_intervention', formData.duree_intervention);
      historyFormData.append('resultat', formData.resultat);

      // Ajouter les fichiers
      files.forEach((file) => {
        historyFormData.append('fichiers', file);
      });

      await api.post('/surveillance-history/', historyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 2. Calculer la prochaine date de contrôle
      const nextDate = calculateNextDate(formData.date_realisation, item.periodicite);

      // 3. Mettre à jour l'item de surveillance
      await surveillanceAPI.updateItem(item.id, {
        status: 'REALISE',
        date_realisation: formData.date_realisation,
        prochain_controle: nextDate
      });

      toast({ 
        title: 'Succès', 
        description: `Contrôle enregistré. Prochain contrôle: ${new Date(nextDate).toLocaleDateString('fr-FR')}` 
      });
      onClose(true);
    } catch (error) {
      console.error('Erreur:', error);
      toast({ 
        title: 'Erreur', 
        description: 'Erreur lors de l\'enregistrement', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>✓ Marquer comme réalisé</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            {item?.classe_type} - {item?.batiment}
          </p>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Date de réalisation */}
          <div>
            <Label htmlFor="date_realisation">Date de réalisation *</Label>
            <Input
              id="date_realisation"
              type="date"
              value={formData.date_realisation}
              onChange={(e) => setFormData({ ...formData, date_realisation: e.target.value })}
              required
            />
          </div>

          {/* Durée d'intervention */}
          <div>
            <Label htmlFor="duree_intervention">Durée d'intervention</Label>
            <Input
              id="duree_intervention"
              type="text"
              placeholder="Ex: 2h30, 45 minutes..."
              value={formData.duree_intervention}
              onChange={(e) => setFormData({ ...formData, duree_intervention: e.target.value })}
            />
          </div>

          {/* Résultat */}
          <div>
            <Label htmlFor="resultat">Résultat *</Label>
            <Select
              value={formData.resultat}
              onValueChange={(value) => setFormData({ ...formData, resultat: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONFORME">✓ Conforme</SelectItem>
                <SelectItem value="NON_CONFORME">✗ Non conforme</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Commentaires */}
          <div>
            <Label htmlFor="commentaires">Commentaires / Observations</Label>
            <Textarea
              id="commentaires"
              rows={4}
              placeholder="Décrivez les observations, anomalies détectées, actions correctives..."
              value={formData.commentaires}
              onChange={(e) => setFormData({ ...formData, commentaires: e.target.value })}
            />
          </div>

          {/* Upload de fichiers */}
          <div>
            <Label>Fichiers joints (photos, rapports, PDF...)</Label>
            <div className="mt-2">
              <label className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-center">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Cliquer pour ajouter des fichiers</span>
                </div>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx"
                />
              </label>
            </div>

            {/* Liste des fichiers sélectionnés */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-400">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info sur prochain contrôle */}
          {formData.date_realisation && item && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                📅 Le prochain contrôle sera programmé le :{' '}
                <strong>
                  {new Date(calculateNextDate(formData.date_realisation, item.periodicite)).toLocaleDateString('fr-FR')}
                </strong>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CompleteSurveillanceDialog;
