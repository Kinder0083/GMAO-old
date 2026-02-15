import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RotateCcw, Upload, AlertTriangle, CheckCircle, XCircle, Database, FileArchive, FolderOpen, Shield } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';
import { getBackendURL } from '../utils/config';
import { formatErrorMessage } from '../utils/errorFormatter';
import { modules } from './importExportModules';

const RestoreTab = () => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [restoreMode, setRestoreMode] = useState('merge');
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);
  const [confirmFull, setConfirmFull] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      toast({ title: 'Format invalide', description: 'Veuillez sélectionner un fichier ZIP de sauvegarde GMAO', variant: 'destructive' });
      event.target.value = '';
      return;
    }
    setSelectedFile(file);
    setRestoreResult(null);
    setConfirmFull(false);
  };

  const handleRestore = async () => {
    if (!selectedFile) return;
    if (restoreMode === 'full' && !confirmFull) {
      setConfirmFull(true);
      return;
    }

    try {
      setRestoring(true);
      setConfirmFull(false);
      const backend_url = getBackendURL();
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(
        `${backend_url}/api/restore/backup`,
        formData,
        {
          params: { mode: restoreMode },
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
          timeout: 300000
        }
      );

      setRestoreResult(response.data.stats || response.data);
      toast({ title: 'Restauration terminée', description: response.data.message });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast({ title: 'Erreur', description: formatErrorMessage(error, 'Impossible de restaurer la sauvegarde'), variant: 'destructive' });
    } finally {
      setRestoring(false);
    }
  };

  const cancelRestore = () => {
    setConfirmFull(false);
  };

  return (
    <>
      <Card data-testid="restore-backup-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw size={24} className="text-purple-600" />
            Restaurer une sauvegarde
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 space-y-2">
            <p className="font-medium text-gray-900">Comment utiliser cette fonctionnalité :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Sélectionnez un fichier <strong>.zip</strong> généré par les sauvegardes automatiques de GMAO Iris</li>
              <li>Le ZIP doit contenir un fichier <strong>data.xlsx</strong> (données) et éventuellement un dossier <strong>uploads/</strong> (fichiers joints)</li>
              <li>Choisissez le mode de restauration puis cliquez sur "Restaurer"</li>
            </ul>
          </div>

          {/* Mode de restauration */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Mode de restauration</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="restore-mode-merge"
                onClick={() => { setRestoreMode('merge'); setConfirmFull(false); }}
                className={`p-4 rounded-lg border-2 text-left transition-all ${restoreMode === 'merge' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={18} className="text-blue-600" />
                  <span className="font-semibold text-gray-900">Fusionner</span>
                </div>
                <p className="text-xs text-gray-500">Ajoute les nouvelles données et met à jour les existantes. Les données actuelles sont conservées.</p>
              </button>
              <button
                type="button"
                data-testid="restore-mode-full"
                onClick={() => { setRestoreMode('full'); setConfirmFull(false); }}
                className={`p-4 rounded-lg border-2 text-left transition-all ${restoreMode === 'full' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={18} className="text-red-600" />
                  <span className="font-semibold text-gray-900">Restauration complète</span>
                </div>
                <p className="text-xs text-gray-500">Vide les collections avant d'importer. Toutes les données actuelles seront remplacées par le contenu du backup.</p>
              </button>
            </div>
          </div>

          {/* Sélection du fichier */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Fichier de sauvegarde (.zip)</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all"
              data-testid="restore-file-dropzone"
            >
              <FileArchive size={36} className="mx-auto mb-2 text-gray-400" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-purple-700">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} Mo</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">Cliquez pour sélectionner un fichier ZIP de backup</p>
                  <p className="text-xs text-gray-400 mt-1">backup_gmao_*.zip</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="restore-file-input"
            />
          </div>

          {/* Avertissement restauration complète */}
          {restoreMode === 'full' && selectedFile && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-red-800">Attention : Restauration complète</p>
                  <p className="text-red-700 mt-1">Toutes les données existantes dans les modules présents dans le backup seront supprimées et remplacées. Cette action est irréversible.</p>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation pour mode full */}
          {confirmFull && (
            <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4 space-y-3">
              <p className="text-sm font-bold text-red-800">Confirmez-vous la restauration complète ? Toutes les données actuelles seront écrasées.</p>
              <div className="flex gap-3">
                <Button
                  onClick={handleRestore}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="restore-confirm-button"
                >
                  Oui, restaurer
                </Button>
                <Button variant="outline" onClick={cancelRestore} data-testid="restore-cancel-button">
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Bouton restaurer */}
          {!confirmFull && (
            <Button
              data-testid="restore-button"
              onClick={handleRestore}
              disabled={restoring || !selectedFile}
              className={`w-full ${restoreMode === 'full' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {restoring ? (
                <>
                  <RotateCcw size={20} className="mr-2 animate-spin" />
                  Restauration en cours...
                </>
              ) : (
                <>
                  <Upload size={20} className="mr-2" />
                  {restoreMode === 'full' ? 'Restaurer (écraser les données)' : 'Restaurer (fusionner)'}
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Résultat de la restauration */}
      {restoreResult && (
        <Card data-testid="restore-result-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              Résultat de la restauration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Database size={24} className="text-blue-600" />
                <div><p className="text-sm text-gray-600">Total</p><p className="text-2xl font-bold text-blue-600">{restoreResult.total}</p></div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle size={24} className="text-green-600" />
                <div><p className="text-sm text-gray-600">Insérés</p><p className="text-2xl font-bold text-green-600">{restoreResult.inserted}</p></div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                <RotateCcw size={24} className="text-amber-600" />
                <div><p className="text-sm text-gray-600">Mis à jour</p><p className="text-2xl font-bold text-amber-600">{restoreResult.updated}</p></div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                <FolderOpen size={24} className="text-purple-600" />
                <div><p className="text-sm text-gray-600">Fichiers</p><p className="text-2xl font-bold text-purple-600">{restoreResult.restored_files || 0}</p></div>
              </div>
            </div>

            {restoreResult.collections_cleared > 0 && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                {restoreResult.collections_cleared} collection(s) vidée(s) avant import (mode restauration complète)
              </div>
            )}

            {restoreResult.modules && Object.keys(restoreResult.modules).length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Détails par module</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(restoreResult.modules).map(([moduleName, moduleStats]) => (
                    <div key={moduleName} className="border rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-2 capitalize">
                        {modules.find(m => m.value === moduleName)?.label || moduleName}
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Total:</span><span className="font-medium">{moduleStats.total}</span></div>
                        <div className="flex justify-between"><span className="text-green-600">Insérés:</span><span className="font-medium text-green-600">{moduleStats.inserted}</span></div>
                        <div className="flex justify-between"><span className="text-amber-600">Mis à jour:</span><span className="font-medium text-amber-600">{moduleStats.updated}</span></div>
                        {moduleStats.skipped > 0 && (
                          <div className="flex justify-between"><span className="text-red-600">Ignorés:</span><span className="font-medium text-red-600">{moduleStats.skipped}</span></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {restoreResult.errors && restoreResult.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">Erreurs ({restoreResult.errors.length})</h3>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {restoreResult.errors.slice(0, 10).map((error, idx) => (
                    <p key={idx} className="text-sm text-red-700">{error}</p>
                  ))}
                  {restoreResult.errors.length > 10 && (
                    <p className="text-sm text-red-600 font-medium mt-2">... et {restoreResult.errors.length - 10} autres erreurs</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default RestoreTab;
