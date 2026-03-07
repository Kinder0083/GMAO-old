import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Calendar, Wrench, AlertTriangle } from 'lucide-react';

/**
 * Dialog de confirmation pour la fin anticipée d'une maintenance préventive
 */
const MaintenanceEndConfirmDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  maintenanceInfo,
  newStatus,
  loading = false 
}) => {
  const getStatusLabel = (status) => {
    const labels = {
      'OPERATIONNEL': 'Opérationnel',
      'EN_FONCTIONNEMENT': 'En Fonctionnement',
      'A_LARRET': 'À l\'arrêt',
      'EN_MAINTENANCE': 'En maintenance',
      'EN_CT': 'En C.T',
      'HORS_SERVICE': 'Hors service',
      'DEGRADE': 'Dégradé',
      'ALERTE_S_EQUIP': 'Alerte S.Équip'
    };
    return labels[status] || status;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Maintenance préventive en cours</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p className="text-gray-600">
                Cet équipement est actuellement en maintenance préventive planifiée. 
                Voulez-vous <strong>terminer cette maintenance de manière anticipée</strong> et 
                changer le statut vers <strong className="text-blue-600">"{getStatusLabel(newStatus)}"</strong> ?
              </p>
              
              {maintenanceInfo && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 font-medium">
                    <Wrench className="h-4 w-4" />
                    <span>Détails de la maintenance</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        <strong>Début :</strong> {formatDate(maintenanceInfo.date_debut)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        <strong>Fin prévue :</strong> {formatDate(maintenanceInfo.date_fin)}
                      </span>
                    </div>
                    {maintenanceInfo.motif && (
                      <div className="mt-2 pt-2 border-t border-amber-200">
                        <strong>Motif :</strong> {maintenanceInfo.motif}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-500">
                La date de fin de la maintenance sera mise à jour à aujourd'hui.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Traitement...
              </>
            ) : (
              'Terminer la maintenance et changer le statut'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default MaintenanceEndConfirmDialog;
