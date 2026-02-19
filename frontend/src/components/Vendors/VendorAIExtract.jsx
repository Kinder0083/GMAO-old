import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import { vendorsAPI } from '../../services/api';
import { Upload, FileText, Loader2, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';

const FIELD_LABELS = {
  nom: "Nom de l'entreprise",
  contact: "Contact principal",
  contact_fonction: "Fonction du contact",
  email: "Email",
  telephone: "Téléphone",
  adresse: "Adresse",
  code_postal: "Code postal",
  ville: "Ville",
  pays: "Pays",
  specialite: "Spécialité",
  tva_intra: "N° TVA intra.",
  siret: "SIRET",
  conditions_paiement: "Conditions paiement",
  devise: "Devise",
  categorie: "Catégorie",
  sous_traitant: "Sous-traitant",
  site_web: "Site web",
  notes: "Notes"
};

const VendorAIExtract = ({ open, onClose, onCreateFromAI }) => {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedData(null);
      setError(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await vendorsAPI.aiExtract(formData);
      const data = response.data || response;
      
      if (data.success && data.extracted_data) {
        setExtractedData(data.extracted_data);
        toast({ title: 'Extraction réussie', description: 'Vérifiez les informations extraites' });
      } else {
        setError("L'IA n'a pas pu extraire les informations");
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Erreur lors de l'analyse";
      setError(msg);
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (extractedData) {
      onCreateFromAI(extractedData);
      handleReset();
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractedData(null);
    setError(null);
    onClose();
  };

  const confidence = extractedData?.confidence;
  const filledFields = extractedData
    ? Object.entries(extractedData).filter(([k, v]) => v !== null && v !== '' && v !== undefined && k !== 'confidence').length
    : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleReset(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="vendor-ai-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Analyse IA - Création fournisseur
          </DialogTitle>
          <DialogDescription>
            Importez un document (Excel, PDF, image) pour extraire automatiquement les informations du fournisseur
          </DialogDescription>
        </DialogHeader>

        {/* Upload */}
        {!extractedData && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                file ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input
                type="file"
                id="vendor-ai-file"
                className="hidden"
                accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.doc,.docx"
                onChange={handleFileChange}
                data-testid="vendor-ai-file-input"
              />
              <label htmlFor="vendor-ai-file" className="cursor-pointer">
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-10 w-10 text-blue-500" />
                    <p className="font-medium text-blue-700">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} Ko</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-gray-400" />
                    <p className="font-medium text-gray-600">Cliquez pour sélectionner un fichier</p>
                    <p className="text-sm text-gray-400">PDF, Excel, Word, Image</p>
                  </div>
                )}
              </label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Résultats d'extraction */}
        {extractedData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-700">{filledFields} champs extraits</span>
              {confidence !== undefined && (
                <Badge className={confidence >= 0.8 ? 'bg-green-100 text-green-700' : confidence >= 0.5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                  Confiance: {Math.round(confidence * 100)}%
                </Badge>
              )}
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(FIELD_LABELS).map(([key, label]) => {
                    const value = extractedData[key];
                    if (value === null || value === undefined || value === '') return null;
                    return (
                      <div key={key} className="flex flex-col" data-testid={`extracted-${key}`}>
                        <span className="text-xs text-gray-500 font-medium">{label}</span>
                        <span className="text-sm text-gray-900">
                          {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-gray-500 italic">
              Vérifiez les informations extraites. Vous pourrez les modifier dans le formulaire avant de créer la fiche.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleReset} data-testid="vendor-ai-cancel-btn">
            Annuler
          </Button>
          {!extractedData ? (
            <Button onClick={handleExtract} disabled={!file || loading} className="bg-blue-600 hover:bg-blue-700" data-testid="vendor-ai-extract-btn">
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyse en cours...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />Analyser le document</>
              )}
            </Button>
          ) : (
            <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700" data-testid="vendor-ai-create-btn">
              <CheckCircle className="mr-2 h-4 w-4" />
              Créer la fiche fournisseur
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VendorAIExtract;
