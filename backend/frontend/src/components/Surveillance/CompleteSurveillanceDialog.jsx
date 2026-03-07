import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Upload } from 'lucide-react';
import { surveillanceAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';

function CompleteSurveillanceDialog({ open, item, onClose }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date_realisation: new Date().toISOString().split('T')[0],
    commentaire: '',
    status: 'REALISE'
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await surveillanceAPI.updateItem(item.id, {
        status: formData.status,
        date_realisation: formData.date_realisation,
        commentaire: formData.commentaire
      });

      if (selectedFile) {
        await surveillanceAPI.uploadFile(item.id, selectedFile);
      }

      toast({ title: 'Succès', description: 'Contrôle marqué comme réalisé' });
      onClose(true);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur mise à jour', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marquer comme réalisé</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm font-semibold">{item?.classe_type}</p>
            <p className="text-sm text-gray-600">{item?.batiment}</p>
          </div>

          <div>
            <Label>Date de réalisation</Label>
            <Input type="date" value={formData.date_realisation} onChange={(e) => setFormData({...formData, date_realisation: e.target.value})} />
          </div>

          <div>
            <Label>Commentaire</Label>
            <Textarea value={formData.commentaire} onChange={(e) => setFormData({...formData, commentaire: e.target.value})} rows={3} placeholder="Observations, remarques..." />
          </div>

          <div>
            <Label>Fichier (optionnel)</Label>
            <Button variant="outline" className="w-full" asChild>
              <label>
                <Upload className="mr-2 h-4 w-4" />
                {selectedFile ? selectedFile.name : 'Joindre un fichier'}
                <input type="file" hidden onChange={(e) => setSelectedFile(e.target.files[0])} />
              </label>
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={loading}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Enregistrement...' : 'Valider'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CompleteSurveillanceDialog;
