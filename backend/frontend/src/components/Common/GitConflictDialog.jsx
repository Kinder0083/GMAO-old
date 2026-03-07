import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertTriangle, Save, Trash2, X, FileWarning } from 'lucide-react';

const GitConflictDialog = ({ open, onClose, conflictData, onResolve }) => {
  const { modified_files = [] } = conflictData || {};

  const handleResolve = (strategy) => {
    onResolve(strategy);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 rounded-full p-3">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">Modifications locales détectées</DialogTitle>
              <DialogDescription className="mt-2 text-base">
                Des modifications ont été faites sur votre serveur et pourraient être écrasées par la mise à jour
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Liste des fichiers modifiés */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm">
            <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-orange-600" />
              Fichiers modifiés ({modified_files.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {modified_files.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-white rounded hover:bg-gray-50 transition-colors">
                  <div className="bg-orange-200 text-orange-800 px-3 py-1 rounded text-sm font-mono font-semibold min-w-[80px] text-center">
                    {file.status}
                  </div>
                  <span className="text-gray-700 font-mono text-sm flex-1">{file.file}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Explication */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-5 shadow-sm">
            <p className="text-base text-blue-900 leading-relaxed">
              <strong className="text-lg">Que faire ?</strong><br/>
              <span className="mt-2 block">Vous avez 3 options pour gérer ces modifications avant de continuer la mise à jour :</span>
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-4 mt-4">
          {/* Option 1 : Écraser */}
          <Button
            onClick={() => handleResolve('reset')}
            variant="destructive"
            className="w-full justify-start py-6 px-5 h-auto hover:shadow-lg transition-all"
          >
            <Trash2 className="h-6 w-6 mr-3 flex-shrink-0" />
            <div className="text-left flex-1">
              <div className="font-bold text-base mb-1">Écraser mes modifications</div>
              <div className="text-sm font-normal opacity-90 leading-relaxed">
                Supprimer mes changements et appliquer la mise à jour (recommandé si les modifications ne sont pas importantes)
              </div>
            </div>
          </Button>

          {/* Option 2 : Sauvegarder */}
          <Button
            onClick={() => handleResolve('stash')}
            variant="outline"
            className="w-full justify-start py-6 px-5 h-auto border-2 border-green-400 hover:bg-green-50 hover:shadow-lg transition-all"
          >
            <Save className="h-6 w-6 mr-3 text-green-600 flex-shrink-0" />
            <div className="text-left flex-1">
              <div className="font-bold text-base mb-1 text-gray-900">Sauvegarder puis mettre à jour</div>
              <div className="text-sm font-normal text-gray-600 leading-relaxed">
                Sauvegarder temporairement mes modifications (git stash) puis appliquer la mise à jour
              </div>
            </div>
          </Button>

          {/* Option 3 : Annuler */}
          <Button
            onClick={() => handleResolve('abort')}
            variant="outline"
            className="w-full justify-start py-6 px-5 h-auto hover:shadow-lg transition-all"
          >
            <X className="h-6 w-6 mr-3 flex-shrink-0" />
            <div className="text-left flex-1">
              <div className="font-bold text-base mb-1">Annuler la mise à jour</div>
              <div className="text-sm font-normal text-gray-600 leading-relaxed">
                Garder mes modifications et ne pas faire la mise à jour maintenant
              </div>
            </div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GitConflictDialog;
