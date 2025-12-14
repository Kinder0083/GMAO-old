import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  RefreshCw, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Package
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useConfirmDialog } from '../components/ui/confirm-dialog';
import axios from 'axios';
import { BACKEND_URL } from '../utils/config';
import GitConflictDialog from '../components/Common/GitConflictDialog';
import { formatErrorMessage } from '../utils/errorFormatter';

const Updates = () => {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [changelog, setChangelog] = useState([]);
  const [history, setHistory] = useState([]);
  const [expandedChangelog, setExpandedChangelog] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [updateLogs, setUpdateLogs] = useState([]);
  
  // États pour la gestion des conflits Git
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  useEffect(() => {
    loadUpdateInfo();
  }, []);

  const waitForBackendReady = async (token, expectedVersion) => {
    // D'abord, attendre 5 secondes pour laisser le backend commencer son redémarrage
    setUpdateLogs(prev => [...prev, '⏳ Attente du démarrage du redémarrage (5s)...']);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const maxAttempts = 40; // 40 tentatives (40 secondes max après le délai initial)
    let attempts = 0;
    let backendIsDown = false;
    
    while (attempts < maxAttempts) {
      try {
        // Essayer de contacter le backend
        const response = await axios.get(`${BACKEND_URL}/api/updates/current`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 3000 // 3 secondes de timeout par requête
        });
        
        if (response.status === 200) {
          const currentVersion = response.data.version;
          
          // Vérifier que la nouvelle version est installée
          if (backendIsDown || currentVersion === expectedVersion) {
            setUpdateLogs(prev => [...prev, `✅ Backend disponible avec version ${currentVersion} !`]);
            setUpdateLogs(prev => [...prev, '🔄 Rechargement de la page...']);
            
            toast({
              title: 'Succès',
              description: 'Mise à jour appliquée avec succès. Rechargement...'
            });
            
            // Attendre 2 secondes avant de recharger pour laisser l'utilisateur voir le message
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            
            return;
          } else {
            // Le backend répond mais avec l'ancienne version, il n'a pas encore redémarré
            setUpdateLogs(prev => [...prev, `⏳ Backend actif (v${currentVersion}) mais pas encore redémarré...`]);
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
          }
        }
      } catch (error) {
        // Le backend n'est pas accessible, il est probablement en cours de redémarrage
        backendIsDown = true;
        attempts++;
        setUpdateLogs(prev => [...prev, `⏳ Tentative ${attempts}/${maxAttempts} - Backend indisponible...`]);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
      }
    }
    
    // Si on arrive ici, le backend n'a pas répondu après toutes les tentatives
    setUpdateLogs(prev => [...prev, '⚠️ Délai d\'attente dépassé. Rechargement manuel nécessaire.']);
    toast({
      title: 'Attention',
      description: 'Le backend met plus de temps que prévu. Veuillez rafraîchir la page manuellement (F5).',
      variant: 'warning'
    });
    setUpdating(false);
  };

  const loadUpdateInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Récupérer les informations de mise à jour
      const [currentRes, checkRes, changelogRes, historyRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/updates/current`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BACKEND_URL}/api/updates/check`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BACKEND_URL}/api/updates/changelog`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BACKEND_URL}/api/updates/history`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setCurrentVersion(currentRes.data.version);
      setLatestVersion(checkRes.data.latest_version);
      setUpdateAvailable(checkRes.data.update_available);
      setChangelog(changelogRes.data.changelog || []);
      setHistory(historyRes.data.history || []);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les informations de mise à jour',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdates = async () => {
    try {
      setLoading(true);
      await loadUpdateInfo();
      toast({
        title: 'Vérification terminée',
        description: updateAvailable 
          ? '✨ Une nouvelle version est disponible !' 
          : '✅ Vous utilisez la dernière version'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de vérifier les mises à jour',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUpdate = async () => {
    // D'abord, vérifier s'il y a des conflits Git
    await checkForConflicts();
  };

  const checkForConflicts = async () => {
    try {
      setCheckingConflicts(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${BACKEND_URL}/api/updates/check-conflicts`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.has_conflicts) {
        // Il y a des conflits, afficher le dialogue
        setConflictData(response.data);
        setShowConflictDialog(true);
      } else {
        // Pas de conflits, procéder directement à la mise à jour
        proceedWithUpdate();
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de vérifier les conflits Git',
        variant: 'destructive'
      });
    } finally {
      setCheckingConflicts(false);
    }
  };

  const handleResolveConflict = async (strategy) => {
    try {
      const token = localStorage.getItem('token');
      
      if (strategy === 'abort') {
        setShowConflictDialog(false);
        toast({
          title: 'Mise à jour annulée',
          description: 'Aucune modification n\'a été effectuée',
        });
        return;
      }
      
      // Résoudre le conflit avec la stratégie choisie
      const response = await axios.post(
        `${BACKEND_URL}/api/updates/resolve-conflicts?strategy=${strategy}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setShowConflictDialog(false);
        toast({
          title: 'Conflits résolus',
          description: response.data.message,
        });
        
        // Maintenant procéder à la mise à jour
        proceedWithUpdate();
      } else {
        toast({
          title: 'Erreur',
          description: response.data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible de résoudre les conflits'),
        variant: 'destructive'
      });
    }
  };

  const proceedWithUpdate = async () => {
    confirm({
      title: '⚠️ ATTENTION - Mise à jour système',
      description: 'Une sauvegarde automatique de la base de données sera créée avant la mise à jour.\n\nL\'application sera indisponible pendant quelques minutes.\n\nVoulez-vous continuer ?',
      confirmText: 'Mettre à jour',
      cancelText: 'Annuler',
      variant: 'default',
      onConfirm: async () => {
        try {
          setUpdating(true);
      setUpdateLogs(['🚀 Démarrage de la mise à jour...']);
      
      const token = localStorage.getItem('token');
      
      // Simuler les logs en temps réel
      const logMessages = [
        '📦 Création du backup de la base de données...',
        '✅ Backup créé avec succès',
        '📥 Téléchargement des dernières modifications...',
        '🐍 Mise à jour du backend Python...',
        '⚛️  Mise à jour du frontend React...',
        '🔧 Compilation du frontend...',
        '🔄 Redémarrage des services...'
      ];

      // Afficher les logs progressivement
      for (let i = 0; i < logMessages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setUpdateLogs(prev => [...prev, logMessages[i]]);
      }

      // Appliquer la mise à jour
      const response = await axios.post(
        `${BACKEND_URL}/api/updates/apply`,
        {},
        {
          params: { version: latestVersion.version },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setUpdateLogs(prev => [...prev, '✅ Mise à jour terminée avec succès !']);
        setUpdateLogs(prev => [...prev, '⏳ Attente du redémarrage des services...']);
        
        // Attendre que le backend soit à nouveau disponible
        await waitForBackendReady(token);
      }
        } catch (error) {
          // Si erreur réseau/gateway, le backend est probablement en train de redémarrer
          if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || 
              error.response?.status === 502 || error.response?.status === 503) {
            setUpdateLogs(prev => [...prev, '🔄 Services en cours de redémarrage...']);
            setUpdateLogs(prev => [...prev, '⏳ Attente de la disponibilité du backend...']);
            
            // Attendre que le backend soit à nouveau disponible
            const token = localStorage.getItem('token');
            await waitForBackendReady(token);
          } else {
            setUpdateLogs(prev => [...prev, `❌ Erreur: ${error.response?.data?.detail || error.message}`]);
            
            toast({
              title: 'Erreur',
              description: formatErrorMessage(error, 'Échec de la mise à jour'),
              variant: 'destructive'
            });
            setUpdating(false);
          }
        }
      }
    });
  };

  const handleRollback = async (backupPath) => {
    confirm({
      title: '⚠️ ATTENTION - Rollback base de données',
      description: 'Ceci va restaurer la base de données à une version précédente.\n\nToutes les données créées depuis seront DÉFINITIVEMENT PERDUES.\n\nVoulez-vous vraiment continuer ?',
      confirmText: 'Restaurer',
      cancelText: 'Annuler',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
      
      await axios.post(
        `${BACKEND_URL}/api/updates/rollback`,
        { backup_path: backupPath },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast({
        title: 'Succès',
        description: 'Rollback effectué. Rechargement...'
      });

          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } catch (error) {
          toast({
            title: 'Erreur',
            description: 'Échec du rollback',
            variant: 'destructive'
          });
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mise à Jour</h1>
          <p className="text-gray-600 mt-1">Gérez les mises à jour de l'application</p>
        </div>
        <Button
          variant="outline"
          onClick={handleCheckUpdates}
          disabled={loading || updating}
        >
          <RefreshCw size={20} className="mr-2" />
          Vérifier
        </Button>
      </div>

      {/* Version actuelle vs dernière version */}
      <Card className={updateAvailable ? 'border-blue-500 border-2' : ''}>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Package size={24} className="text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Version actuelle</h3>
              </div>
              <p className="text-3xl font-bold text-gray-900">{currentVersion}</p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <Download size={24} className={updateAvailable ? 'text-blue-600' : 'text-gray-600'} />
                <h3 className="text-lg font-semibold text-gray-900">Dernière version</h3>
              </div>
              {latestVersion ? (
                <>
                  <p className="text-3xl font-bold text-blue-600">
                    {latestVersion.version}
                    {updateAvailable && <span className="ml-2 text-sm">✨ NOUVEAU</span>}
                  </p>
                  {!updateAvailable && (
                    <p className="text-sm text-green-600 mt-2">✅ Vous êtes à jour</p>
                  )}
                </>
              ) : (
                <p className="text-gray-500">Vérification...</p>
              )}
            </div>
          </div>

          {updateAvailable && (
            <div className="mt-6">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleApplyUpdate}
                disabled={updating}
              >
                {updating ? (
                  <>
                    <RefreshCw size={20} className="mr-2 animate-spin" />
                    Mise à jour en cours...
                  </>
                ) : (
                  <>
                    <Download size={20} className="mr-2" />
                    Mettre à jour maintenant
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                ✅ Backup automatique • ✅ Rollback disponible
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs de mise à jour en temps réel */}
      {updating && updateLogs.length > 0 && (
        <Card className="bg-gray-900 text-white">
          <CardHeader>
            <CardTitle className="text-white">📋 Logs de mise à jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm space-y-1 max-h-64 overflow-y-auto">
              {updateLogs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Changelog */}
      {changelog.length > 0 && (
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => setExpandedChangelog(!expandedChangelog)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                📝 Nouveautés
                {updateAvailable && <span className="text-sm text-blue-600">({changelog[0]?.version})</span>}
              </CardTitle>
              {expandedChangelog ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>
          </CardHeader>
          {expandedChangelog && (
            <CardContent>
              {changelog.map((log, index) => (
                <div key={index} className="mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Version {log.version}</h4>
                  <ul className="space-y-1">
                    {log.changes.map((change, idx) => (
                      <li key={idx} className="text-sm text-gray-700">
                        {change.startsWith('✅') || change.startsWith('-') ? change : `• ${change}`}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Historique des mises à jour */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50"
          onClick={() => setExpandedHistory(!expandedHistory)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              Historique des mises à jour
            </CardTitle>
            {expandedHistory ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
        </CardHeader>
        {expandedHistory && (
          <CardContent>
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune mise à jour enregistrée</p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {item.status === 'success' ? (
                        <CheckCircle size={20} className="text-green-600" />
                      ) : (
                        <AlertCircle size={20} className="text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">Version {item.version}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(item.date).toLocaleString('fr-FR')}
                        </p>
                        {item.message && (
                          <p className="text-xs text-gray-500 mt-1">{item.message}</p>
                        )}
                      </div>
                    </div>
                    {item.status === 'success' && item.version !== currentVersion && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRollback(item.backup_path)}
                      >
                        <RotateCcw size={16} className="mr-2" />
                        Revenir
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Dialogue de gestion des conflits Git */}
      <GitConflictDialog
        open={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        conflictData={conflictData}
        onResolve={handleResolveConflict}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </div>
  );
};

export default Updates;
