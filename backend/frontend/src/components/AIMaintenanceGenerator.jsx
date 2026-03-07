import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Upload, FileText, Loader2, Check, AlertTriangle, Sparkles, Wrench, Clock, ListChecks } from 'lucide-react';
import { aiMaintenanceAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

export default function AIMaintenanceGenerator({ open, onClose, equipmentId, equipmentName }) {
  const { toast } = useToast();
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [createdItems, setCreatedItems] = useState(null);
  const [error, setError] = useState(null);

  const freqLabels = {
    'JOURNALIER': 'Journalier', 'HEBDOMADAIRE': 'Hebdomadaire', 'MENSUEL': 'Mensuel',
    'TRIMESTRIEL': 'Trimestriel', 'SEMESTRIEL': 'Semestriel', 'ANNUEL': 'Annuel'
  };

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep('analyzing');
    setError(null);
    try {
      const result = await aiMaintenanceAPI.generateMaintenanceProgram(file);
      if (result.success) {
        setExtractedData(result.data);
        setStep('preview');
      } else {
        setError(result.error);
        setStep('upload');
      }
    } catch (err) {
      setError(err.message);
      setStep('upload');
    }
  };

  const handleCreateAll = async () => {
    setStep('creating');
    try {
      const result = await aiMaintenanceAPI.createMaintenanceBatch({
        programme_maintenance: extractedData.programme_maintenance,
        equipment_id: equipmentId || '',
        source_filename: file?.name
      });
      if (result.success) {
        setCreatedItems(result);
        setStep('done');
        toast({
          title: 'Programme de maintenance créé',
          description: `${result.created_maintenance} plan(s) + ${result.created_checklists} checklist(s) créé(s)`
        });
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
    setCreatedItems(null);
    setError(null);
    onClose(step === 'done');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Génération IA - Programme de Maintenance
          </DialogTitle>
          <DialogDescription>
            Uploadez un document constructeur pour générer le programme de maintenance complet.
            {equipmentName && <span className="font-medium"> Equipement : {equipmentName}</span>}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-2">
          {/* STEP: Upload */}
          {step === 'upload' && (
            <div className="space-y-4 py-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
                onClick={() => document.getElementById('ai-maint-file')?.click()}
                data-testid="ai-maintenance-dropzone"
              >
                <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium">Cliquez ou glissez un fichier ici</p>
                <p className="text-xs text-gray-500 mt-1">Carnet de maintenance constructeur, notice d'entretien, fiche technique</p>
                <input id="ai-maint-file" type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFileSelect} />
              </div>
              {file && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(0)} Ko)</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                  <AlertTriangle className="h-4 w-4" /> {error}
                </div>
              )}
              <Button onClick={handleAnalyze} disabled={!file} className="w-full bg-purple-600 hover:bg-purple-700" data-testid="ai-maintenance-analyze-btn">
                <Sparkles className="mr-2 h-4 w-4" /> Analyser avec l'IA
              </Button>
            </div>
          )}

          {/* STEP: Analyzing */}
          {step === 'analyzing' && (
            <div className="py-12 text-center">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-purple-600 mb-4" />
              <p className="font-medium">Analyse IA en cours...</p>
              <p className="text-sm text-gray-500 mt-1">L'IA extrait le programme de maintenance du document</p>
            </div>
          )}

          {/* STEP: Preview */}
          {step === 'preview' && extractedData && (
            <div className="space-y-4 py-2">
              {extractedData.equipement_info && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                  <p><strong>Equipement :</strong> {extractedData.equipement_info.nom}</p>
                  {extractedData.equipement_info.fabricant && <p><strong>Fabricant :</strong> {extractedData.equipement_info.fabricant}</p>}
                  {extractedData.equipement_info.modele && <p><strong>Modèle :</strong> {extractedData.equipement_info.modele}</p>}
                </div>
              )}

              <p className="text-sm font-medium">{extractedData.programme_maintenance?.length || 0} opération(s) de maintenance détectée(s) :</p>

              {extractedData.programme_maintenance?.map((op, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-purple-600" />
                      {op.titre}
                    </h4>
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {freqLabels[op.frequence] || op.frequence}
                      </Badge>
                      {op.duree_estimee_heures && (
                        <Badge variant="secondary" className="text-xs">{op.duree_estimee_heures}h</Badge>
                      )}
                    </div>
                  </div>
                  {op.description && <p className="text-xs text-gray-600">{op.description}</p>}
                  {op.competences_requises && (
                    <p className="text-xs"><strong>Compétences :</strong> {op.competences_requises}</p>
                  )}
                  {op.pieces_rechange && (
                    <p className="text-xs"><strong>Pièces :</strong> {op.pieces_rechange}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <ListChecks className="h-3 w-3" />
                    {op.checklist_items?.length || 0} point(s) de contrôle
                  </div>
                </div>
              ))}

              {extractedData.recommandations_generales && (
                <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
                  <strong>Recommandations :</strong> {extractedData.recommandations_generales}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { setStep('upload'); setExtractedData(null); }} className="flex-1">
                  Recommencer
                </Button>
                <Button onClick={handleCreateAll} className="flex-1 bg-purple-600 hover:bg-purple-700" data-testid="ai-maintenance-create-btn">
                  <Check className="mr-2 h-4 w-4" /> Créer le programme complet
                </Button>
              </div>
            </div>
          )}

          {/* STEP: Creating */}
          {step === 'creating' && (
            <div className="py-12 text-center">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-purple-600 mb-4" />
              <p className="font-medium">Création du programme...</p>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && createdItems && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-lg">Programme créé avec succès</p>
                <p className="text-sm text-gray-500 mt-1">
                  {createdItems.created_maintenance} plan(s) de maintenance + {createdItems.created_checklists} checklist(s) associée(s)
                </p>
              </div>
              <div className="space-y-1 text-left">
                {createdItems.maintenance?.map((m, i) => (
                  <div key={i} className="text-sm p-2 bg-green-50 rounded flex items-center gap-2">
                    <Wrench className="h-3 w-3 text-green-600" />
                    {m.titre}
                    <Badge variant="secondary" className="text-[10px] ml-auto">{freqLabels[m.frequence] || m.frequence}</Badge>
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
