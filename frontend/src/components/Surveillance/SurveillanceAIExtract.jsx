import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { FileUp, Loader2, Check, X, AlertTriangle, FileText, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { surveillanceAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';

function SurveillanceAIExtract({ open, onClose }) {
  const { toast } = useToast();
  const [step, setStep] = useState('upload'); // upload | extracting | review | creating | done
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedControles, setSelectedControles] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
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
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleExtract = async () => {
    if (!file) return;
    setStep('extracting');
    try {
      const result = await surveillanceAPI.extractFromDocument(file);
      if (result.success) {
        setExtractedData(result.data);
        const indices = result.data.controles.map((_, i) => i);
        setSelectedControles(indices);
        setStep('review');
      } else {
        toast({ title: 'Erreur', description: result.error || "Échec de l'extraction", variant: 'destructive' });
        setStep('upload');
      }
    } catch (error) {
      toast({ title: 'Erreur', description: "Erreur lors de l'analyse du document", variant: 'destructive' });
      setStep('upload');
    }
  };

  const toggleControle = (index) => {
    setSelectedControles(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleCreate = async () => {
    if (selectedControles.length === 0) {
      toast({ title: 'Attention', description: 'Sélectionnez au moins un contrôle', variant: 'destructive' });
      return;
    }
    setStep('creating');
    try {
      const selectedData = {
        document_info: extractedData.document_info,
        controles: selectedControles.map(i => {
          const ctrl = extractedData.controles[i];
          return {
            ...ctrl,
            periodicite: ctrl.periodicite_detectee || 'Non déterminée'
          };
        })
      };
      const result = await surveillanceAPI.createBatchFromAI(selectedData);
      if (result.success) {
        setResult(result);
        setStep('done');
      } else {
        toast({ title: 'Erreur', description: 'Échec de la création', variant: 'destructive' });
        setStep('review');
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors de la création', variant: 'destructive' });
      setStep('review');
    }
  };

  const handleClose = () => {
    const shouldRefresh = step === 'done';
    setStep('upload');
    setFile(null);
    setExtractedData(null);
    setSelectedControles([]);
    setResult(null);
    onClose(shouldRefresh);
  };

  const getResultBadge = (resultat) => {
    if (resultat === 'CONFORME') return <Badge className="bg-emerald-600 text-white" data-testid="badge-conforme">Conforme</Badge>;
    if (resultat === 'NON_CONFORME') return <Badge variant="destructive" data-testid="badge-non-conforme">Non conforme</Badge>;
    if (resultat === 'AVEC_RESERVES') return <Badge className="bg-amber-500 text-white" data-testid="badge-reserves">Avec réserves</Badge>;
    return <Badge variant="secondary">{resultat}</Badge>;
  };

  const getConfidenceBadge = (conf) => {
    if (conf === 'HAUTE') return <Badge className="bg-emerald-600 text-white text-xs">Confiance haute</Badge>;
    if (conf === 'MOYENNE') return <Badge className="bg-amber-500 text-white text-xs">Confiance moyenne</Badge>;
    return <Badge variant="destructive" className="text-xs">Confiance basse</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" data-testid="ai-extract-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="ai-extract-title">
            <FileText className="h-5 w-5" />
            {step === 'upload' && "Analyse IA d'un document de contrôle"}
            {step === 'extracting' && "Analyse en cours..."}
            {step === 'review' && "Contrôles détectés"}
            {step === 'creating' && "Création en cours..."}
            {step === 'done' && "Création terminée"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* STEP: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Déposez un rapport de contrôle (PDF) pour que l'IA analyse son contenu et crée automatiquement
                les contrôles correspondants dans le plan de surveillance.
              </p>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('ai-file-input').click()}
                data-testid="ai-dropzone"
              >
                <FileUp className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium">Glissez-déposez votre document ici</p>
                <p className="text-xs text-gray-500 mt-1">ou cliquez pour sélectionner (PDF, JPG, PNG)</p>
                <input
                  id="ai-file-input"
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg" data-testid="selected-file">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(0)} Ko)</span>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP: Extracting */}
          {step === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Analyse du document par l'IA...</p>
              <p className="text-xs text-muted-foreground">Extraction des contrôles et recherche des périodicités réglementaires</p>
            </div>
          )}

          {/* STEP: Review */}
          {step === 'review' && extractedData && (
            <ScrollArea className="h-[55vh] pr-2">
              <div className="space-y-4">
                {/* Document info */}
                <div className="bg-gray-50 rounded-lg p-3 text-sm" data-testid="document-info">
                  <p className="font-medium mb-1">Informations du document</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                    {extractedData.document_info?.organisme_controle && (
                      <span>Organisme : <strong>{extractedData.document_info.organisme_controle}</strong></span>
                    )}
                    {extractedData.document_info?.date_intervention && (
                      <span>Date : <strong>{extractedData.document_info.date_intervention}</strong></span>
                    )}
                    {extractedData.document_info?.numero_rapport && (
                      <span>Rapport : <strong>{extractedData.document_info.numero_rapport}</strong></span>
                    )}
                    {extractedData.document_info?.site_controle && (
                      <span>Site : <strong>{extractedData.document_info.site_controle}</strong></span>
                    )}
                  </div>
                </div>

                <p className="text-sm font-medium">{extractedData.controles.length} type(s) de contrôle détecté(s) :</p>

                {extractedData.controles.map((ctrl, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg transition-all ${
                      selectedControles.includes(index) ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 opacity-60'
                    }`}
                    data-testid={`controle-card-${index}`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => toggleControle(index)}>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                        selectedControles.includes(index) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'
                      }`}>
                        {selectedControles.includes(index) && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{ctrl.classe_type}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">{ctrl.category}</Badge>
                          {getResultBadge(ctrl.resultat)}
                          {ctrl.anomalies && (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1">
                              <Wrench className="h-3 w-3" /> BT curatif auto
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setExpandedIndex(expandedIndex === index ? null : index); }}
                      >
                        {expandedIndex === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Card Details */}
                    {expandedIndex === index && (
                      <div className="border-t px-3 pb-3 pt-2 space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div><span className="text-gray-500">Bâtiment :</span> {ctrl.batiment || 'N/A'}</div>
                          <div><span className="text-gray-500">Exécutant :</span> {ctrl.executant || 'N/A'}</div>
                          <div><span className="text-gray-500">Date visite :</span> {ctrl.derniere_visite || 'N/A'}</div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Périodicité :</span>
                            <strong>{ctrl.periodicite_detectee || 'Non trouvée'}</strong>
                            {ctrl.periodicite_confiance && getConfidenceBadge(ctrl.periodicite_confiance)}
                          </div>
                        </div>
                        {ctrl.description && (
                          <div><span className="text-gray-500">Description :</span> {ctrl.description}</div>
                        )}
                        {ctrl.references_reglementaires && (
                          <div><span className="text-gray-500">Réf. réglementaires :</span> {ctrl.references_reglementaires}</div>
                        )}
                        {ctrl.periodicite_explication && (
                          <div className="bg-blue-50 p-2 rounded text-blue-700">
                            <span className="font-medium">Périodicité :</span> {ctrl.periodicite_explication}
                          </div>
                        )}
                        {!ctrl.periodicite_detectee && (
                          <Alert className="border-amber-400 bg-amber-50">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-700 text-xs">
                              La périodicité réglementaire n'a pas pu être déterminée automatiquement.
                              Vous pourrez la modifier manuellement après création.
                            </AlertDescription>
                          </Alert>
                        )}
                        {ctrl.anomalies && (
                          <div className="bg-red-50 p-2 rounded border border-red-200">
                            <span className="text-red-700 font-medium">Anomalies :</span>
                            <p className="text-red-600 mt-1 whitespace-pre-line">{ctrl.anomalies}</p>
                            <p className="text-red-500 mt-1 italic flex items-center gap-1">
                              <Wrench className="h-3 w-3" /> Un bon de travail curatif sera créé automatiquement
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* STEP: Creating */}
          {step === 'creating' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Création des contrôles...</p>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && result && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 justify-center">
                <div className="bg-emerald-100 rounded-full p-3">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-center font-medium" data-testid="creation-success">{result.message}</p>
              
              {result.work_orders_created?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="work-orders-created">
                  <p className="font-medium text-amber-800 text-sm flex items-center gap-1 mb-2">
                    <Wrench className="h-4 w-4" /> Bons de travail curatifs créés :
                  </p>
                  {result.work_orders_created.map((wo) => (
                    <div key={wo.id} className="text-xs text-amber-700 ml-5">
                      - BT #{wo.numero} : {wo.titre}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose} data-testid="cancel-btn">Annuler</Button>
              <Button onClick={handleExtract} disabled={!file} data-testid="analyze-btn">
                <FileText className="mr-2 h-4 w-4" /> Analyser le document
              </Button>
            </>
          )}
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); setExtractedData(null); }} data-testid="back-btn">
                Retour
              </Button>
              <Button onClick={handleCreate} disabled={selectedControles.length === 0} data-testid="create-btn">
                <Check className="mr-2 h-4 w-4" />
                Créer {selectedControles.length} contrôle(s)
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={handleClose} data-testid="close-btn">Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SurveillanceAIExtract;
