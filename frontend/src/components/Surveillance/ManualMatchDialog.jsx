import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FileUp, Loader2, Check, X, FileText, AlertTriangle } from 'lucide-react';
import { surveillanceAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';

function ManualMatchDialog({ open, item, onClose }) {
  const { toast } = useToast();
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  }, []);

  const handleAnalyze = async () => {
    if (!file || !item) return;
    setStep('analyzing');
    try {
      const res = await surveillanceAPI.analyzeReportForItem(item.id, file);
      if (res.success) {
        setResult(res);
        setStep('done');
      } else {
        toast({ title: 'Attention', description: res.message || "Le rapport ne correspond pas au contrôle planifié", variant: 'destructive' });
        setStep('upload');
      }
    } catch (error) {
      const detail = error.response?.data?.detail || error.message || 'Erreur inconnue';
      toast({ title: 'Erreur', description: detail, variant: 'destructive' });
      setStep('upload');
    }
  };

  const handleClose = () => {
    const shouldRefresh = step === 'done';
    setStep('upload');
    setFile(null);
    setResult(null);
    onClose(shouldRefresh);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg" data-testid="manual-match-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base" data-testid="manual-match-title">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a4 4 0 0 1 4 4v1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-1v2l3 3v2H6v-2l3-3v-2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2V6a4 4 0 0 1 4-4z"/>
              <circle cx="9" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7" r="1" fill="currentColor"/>
            </svg>
            Correspondance manuelle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info contrôle planifié */}
          <div className="bg-blue-50 rounded-lg p-3 text-sm" data-testid="planned-item-info">
            <p className="font-medium text-blue-800 mb-1">Contrôle planifié :</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-blue-700">
              <span>Type : <strong>{item.classe_type}</strong></span>
              <span>Catégorie : <strong>{item.category}</strong></span>
              <span>Date prévue : <strong>{item.prochain_controle ? new Date(item.prochain_controle).toLocaleDateString('fr-FR') : '-'}</strong></span>
              <span>Périodicité : <strong>{item.periodicite}</strong></span>
            </div>
          </div>

          {step === 'upload' && (
            <>
              <p className="text-sm text-muted-foreground">
                Chargez le rapport de contrôle correspondant. L'IA l'analysera et mettra à jour cette occurrence.
              </p>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('manual-match-file-input').click()}
                data-testid="manual-match-dropzone"
              >
                <FileUp className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium">Glissez-déposez le rapport</p>
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, Excel</p>
                <input
                  id="manual-match-file-input"
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv"
                  onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(0)} Ko)</span>
                  <Button variant="ghost" size="sm" className="ml-auto p-1 h-auto" onClick={() => setFile(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </>
          )}

          {step === 'analyzing' && (
            <div className="flex flex-col items-center py-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Analyse du rapport par l'IA...</p>
            </div>
          )}

          {step === 'done' && result && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 justify-center">
                <div className="bg-emerald-100 rounded-full p-2">
                  <Check className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <p className="text-center font-medium text-sm" data-testid="match-success-msg">{result.message}</p>
              {result.ecart_jours !== null && result.ecart_jours !== undefined && (
                <div className="text-center">
                  <Badge className={result.ecart_jours <= 0 ? 'bg-emerald-600' : result.ecart_jours <= 7 ? 'bg-amber-500' : 'bg-red-500'}>
                    Écart : {result.ecart_jours > 0 ? '+' : ''}{result.ecart_jours} jour{Math.abs(result.ecart_jours) !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose} data-testid="manual-match-cancel">Annuler</Button>
              <Button onClick={handleAnalyze} disabled={!file} data-testid="manual-match-analyze">
                <FileText className="mr-2 h-4 w-4" /> Analyser
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={handleClose} data-testid="manual-match-close">Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ManualMatchDialog;
