import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Upload, FileText, Loader2, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { aiMaintenanceAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

export default function AIChecklistGenerator({ open, onClose }) {
  const { toast } = useToast();
  const [step, setStep] = useState('upload'); // upload, analyzing, preview, creating, done
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [createdChecklists, setCreatedChecklists] = useState([]);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep('analyzing');
    setError(null);
    try {
      const result = await aiMaintenanceAPI.generateChecklist(file);
      if (result.success) {
        setExtractedData(result.data);
        setStep('preview');
      } else {
        setError(result.error || 'Erreur lors de l\'analyse');
        setStep('upload');
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'analyse');
      setStep('upload');
    }
  };

  const handleCreateAll = async () => {
    setStep('creating');
    try {
      const result = await aiMaintenanceAPI.createChecklistsBatch({
        checklists: extractedData.checklists,
        source_filename: file?.name
      });
      if (result.success) {
        setCreatedChecklists(result.checklists || []);
        setStep('done');
        toast({ title: 'Checklists créées', description: `${result.created_count} checklist(s) créée(s) avec succès` });
      }
    } catch (err) {
      setError(err.message);
      setStep('preview');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setExtractedData(null);
    setCreatedChecklists([]);
    setError(null);
    onClose(step === 'done');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Génération IA de Checklists
          </DialogTitle>
          <DialogDescription>
            Uploadez un document technique pour générer automatiquement des checklists de contrôle.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-2">
          {/* STEP: Upload */}
          {step === 'upload' && (
            <div className="space-y-4 py-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => document.getElementById('ai-checklist-file')?.click()}
                data-testid="ai-checklist-dropzone"
              >
                <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium">Cliquez ou glissez un fichier ici</p>
                <p className="text-xs text-gray-500 mt-1">PDF, images (PNG, JPG) - Manuel technique, fiche constructeur, norme</p>
                <input id="ai-checklist-file" type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFileSelect} />
              </div>
              {file && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(0)} Ko)</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <Button onClick={handleAnalyze} disabled={!file} className="w-full" data-testid="ai-checklist-analyze-btn">
                <Sparkles className="mr-2 h-4 w-4" /> Analyser avec l'IA
              </Button>
            </div>
          )}

          {/* STEP: Analyzing */}
          {step === 'analyzing' && (
            <div className="py-12 text-center">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-blue-600 mb-4" />
              <p className="font-medium">Analyse IA en cours...</p>
              <p className="text-sm text-gray-500 mt-1">L'IA extrait les points de contrôle du document</p>
            </div>
          )}

          {/* STEP: Preview */}
          {step === 'preview' && extractedData && (
            <div className="space-y-4 py-2">
              {extractedData.document_info && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                  <p><strong>Document :</strong> {extractedData.document_info.titre}</p>
                  {extractedData.document_info.equipement && <p><strong>Equipement :</strong> {extractedData.document_info.equipement}</p>}
                  {extractedData.document_info.fabricant && <p><strong>Fabricant :</strong> {extractedData.document_info.fabricant}</p>}
                </div>
              )}

              {extractedData.checklists?.map((cl, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{cl.name}</h4>
                    <Badge variant="outline">{cl.frequence_recommandee || 'Non spécifié'}</Badge>
                  </div>
                  {cl.description && <p className="text-xs text-gray-600">{cl.description}</p>}
                  <div className="space-y-1">
                    {cl.items?.map((item, iIdx) => (
                      <div key={iIdx} className="flex items-center gap-2 text-xs p-1.5 bg-gray-50 rounded">
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {item.type}
                        </Badge>
                        <span className="flex-1">{item.label}</span>
                        {item.unit && <span className="text-gray-500">({item.unit})</span>}
                        {item.min_value != null && item.max_value != null && (
                          <span className="text-gray-500">[{item.min_value}-{item.max_value}]</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">{cl.items?.length || 0} point(s) de contrôle</p>
                </div>
              ))}

              {extractedData.notes_supplementaires && (
                <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
                  <strong>Notes :</strong> {extractedData.notes_supplementaires}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { setStep('upload'); setExtractedData(null); }} className="flex-1">
                  Recommencer
                </Button>
                <Button onClick={handleCreateAll} className="flex-1" data-testid="ai-checklist-create-btn">
                  <Check className="mr-2 h-4 w-4" /> Créer {extractedData.checklists?.length || 0} checklist(s)
                </Button>
              </div>
            </div>
          )}

          {/* STEP: Creating */}
          {step === 'creating' && (
            <div className="py-12 text-center">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-blue-600 mb-4" />
              <p className="font-medium">Création des checklists...</p>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-lg">{createdChecklists.length} checklist(s) créée(s)</p>
                <p className="text-sm text-gray-500 mt-1">Les checklists sont disponibles dans la section Checklists</p>
              </div>
              <div className="space-y-1 text-left">
                {createdChecklists.map((cl, i) => (
                  <div key={i} className="text-sm p-2 bg-green-50 rounded flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-600" />
                    {cl.name} ({cl.items?.length || 0} items)
                  </div>
                ))}
              </div>
              <Button onClick={handleClose} className="w-full">Fermer</Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
