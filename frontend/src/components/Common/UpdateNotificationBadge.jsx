import React, { useState, useEffect } from 'react';
import { Bell, Download, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { useConfirmDialog } from '../ui/confirm-dialog';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/config';
import { formatErrorMessage } from '../../utils/errorFormatter';

const UpdateNotificationBadge = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    checkForUpdates();
    // Vérifier toutes les heures
    const interval = setInterval(checkForUpdates, 3600000);
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/updates/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.update_available) {
        setUpdateAvailable(true);
        setUpdateInfo(response.data);
      } else {
        setUpdateAvailable(false);
      }
    } catch (error) {
      // Silently fail - user might not be admin
      console.debug('Update check failed:', error.message);
    }
  };

  const handleCheckNow = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/updates/check`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.available) {
        setUpdateAvailable(true);
        setUpdateInfo(response.data);
        toast({
          title: 'Mise à jour disponible',
          description: `Version ${response.data.new_version} - ${response.data.version_name}`,
        });
      } else {
        toast({
          title: 'Application à jour',
          description: response.data.message || 'Vous disposez de la dernière version',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de vérifier les mises à jour',
        variant: 'destructive'
      });
    }
  };

  const handleApplyUpdate = async () => {
    if (!updateInfo) return;

    confirm({
      title: '⚠️ ATTENTION - Installation de la mise à jour',
      description: 
        `Vous allez installer la version ${updateInfo.new_version || updateInfo.version}.\n\n` +
        `Cette opération va:\n` +
        `• Envoyer un avertissement à TOUS les utilisateurs connectés\n` +
        `• Déconnecter automatiquement tous les utilisateurs après 30 secondes\n` +
        `• Créer une sauvegarde complète de la base de données\n` +
        `• Télécharger la mise à jour depuis GitHub\n` +
        `• Redémarrer tous les services\n\n` +
        `L'application sera indisponible pendant environ 5 minutes.\n\n` +
        `Voulez-vous continuer ?`,
      confirmText: 'Envoyer l\'avertissement et installer',
      cancelText: 'Annuler',
      variant: 'default',
      onConfirm: async () => {
        setIsApplying(true);

        try {
          const token = localStorage.getItem('token');
          const version = updateInfo.new_version || updateInfo.version;
          
          // Étape 1 : Broadcaster l'avertissement à tous les utilisateurs
          toast({
            title: '📢 Envoi de l\'avertissement...',
            description: 'Notification envoyée à tous les utilisateurs connectés',
          });

          await axios.post(
            `${BACKEND_URL}/api/updates/broadcast-warning`,
            null,
            {
              params: { version },
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          // Étape 2 : Attendre 32 secondes (30s countdown + 2s marge) puis appliquer la MAJ
          toast({
            title: '⏳ Avertissement envoyé',
            description: 'La mise à jour sera appliquée dans 30 secondes après la déconnexion des utilisateurs...',
          });

          setTimeout(async () => {
            try {
              const response = await axios.post(
                `${BACKEND_URL}/api/updates/apply`,
                null,
                {
                  params: { version },
                  headers: { Authorization: `Bearer ${token}` },
                  timeout: 300000
                }
              );

              if (response.data.success) {
                toast({
                  title: 'Mise à jour en cours',
                  description: 'Les services redémarrent. Veuillez patienter...',
                });
              }
            } catch (applyError) {
              console.error('Erreur application MAJ:', applyError);
            }
          }, 32000);

        } catch (error) {
          toast({
            title: 'Erreur',
            description: formatErrorMessage(error, 'Erreur lors de l\'envoi de l\'avertissement'),
            variant: 'destructive'
          });
          setIsApplying(false);
        }
      }
    });
  };

  const handleDismiss = async () => {
    try {
      const token = localStorage.getItem('token');
      const version = updateInfo.new_version || updateInfo.version;
      
      await axios.post(
        `${BACKEND_URL}/api/updates/dismiss/${version}`,
        null,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUpdateAvailable(false);
      setShowModal(false);
      
      toast({
        title: 'Notification masquée',
        description: 'La notification de mise à jour a été masquée',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de masquer la notification',
        variant: 'destructive'
      });
    }
  };

  if (!updateAvailable) return null;

  return (
    <>
      {/* Badge de notification */}
      <div className="relative">
        <button
          onClick={() => setShowModal(true)}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Mise à jour disponible"
        >
          <Download className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 items-center justify-center text-white text-xs font-bold">
              1
            </span>
          </span>
        </button>
      </div>

      {/* Modal de mise à jour */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Download className="w-6 h-6 text-blue-600" />
              Mise à jour disponible
            </DialogTitle>
            <DialogDescription>
              Une nouvelle version de FSAO Iris est disponible
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Info version */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg text-blue-900">
                    {updateInfo?.version_name || 'Nouvelle version'}
                  </h3>
                  <p className="text-sm text-blue-700">
                    Version {updateInfo?.new_version || updateInfo?.version}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Publiée le {updateInfo?.release_date ? new Date(updateInfo.release_date).toLocaleDateString('fr-FR') : 'N/A'}
                  </p>
                </div>
                <Badge variant="default" className="bg-green-500">
                  {updateInfo?.current_version} → {updateInfo?.new_version || updateInfo?.version}
                </Badge>
              </div>
            </div>

            {/* Description */}
            {updateInfo?.description && (
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-gray-600">{updateInfo.description}</p>
              </div>
            )}

            {/* Changements */}
            {updateInfo?.changes && updateInfo.changes.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Nouveautés et améliorations</h4>
                <ul className="space-y-1">
                  {updateInfo.changes.map((change, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Avertissement breaking changes */}
            {updateInfo?.breaking && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900">
                    Attention : Changements importants
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Cette mise à jour contient des modifications importantes qui peuvent affecter le fonctionnement de l'application.
                  </p>
                </div>
              </div>
            )}

            {/* Info processus */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                Processus de mise à jour :
              </p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>✓ Sauvegarde complète de la base de données MongoDB</li>
                <li>✓ Export Excel de toutes les données</li>
                <li>✓ Téléchargement de la mise à jour depuis GitHub</li>
                <li>✓ Installation des dépendances</li>
                <li>✓ Redémarrage automatique des services</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2 italic">
                ⏱️ Temps estimé : 2-5 minutes
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckNow}
                disabled={isApplying}
              >
                Vérifier maintenant
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                disabled={isApplying}
              >
                <X className="w-4 h-4 mr-1" />
                Masquer
              </Button>
            </div>
            <Button
              onClick={handleApplyUpdate}
              disabled={isApplying}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isApplying ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Installation en cours...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Installer maintenant
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </>
  );
};

export default UpdateNotificationBadge;
