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
  Package,
  GitBranch,
  History,
  FileText,
  Terminal
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
  const [gitHistory, setGitHistory] = useState([]);
  const [expandedChangelog, setExpandedChangelog] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [expandedGitHistory, setExpandedGitHistory] = useState(true);
  const [updateLogs, setUpdateLogs] = useState([]);
  const [rollingBack, setRollingBack] = useState(false);
  
  // États pour les logs serveur de mise à jour
  const [serverLog, setServerLog] = useState('');
  const [serverLogLoading, setServerLogLoading] = useState(false);
  const [expandedServerLog, setExpandedServerLog] = useState(false);
  const [serverLogInfo, setServerLogInfo] = useState(null);

  // États pour la gestion des conflits Git
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  useEffect(() => {
    loadUpdateInfo();
  }, []);

  const loadServerLog = async () => {
    try {
      setServerLogLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/updates/log`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      });
      if (response.data.found) {
        setServerLog(response.data.content);
        setServerLogInfo({
          path: response.data.path,
          size: response.data.size,
          in_progress: response.data.in_progress
        });
      } else {
        setServerLog('');
        setServerLogInfo(null);
      }
    } catch (error) {
      console.error('Erreur chargement logs:', error);
      const detail = error.response?.data?.detail || error.message || 'Erreur inconnue';
      setServerLog(`Impossible de charger les logs du serveur.\n\nErreur: ${detail}\n\nCela peut arriver si:\n- Le serveur vient de redemarrer apres une mise a jour\n- L'endpoint /api/updates/log n'est pas encore deploye\n- Vous n'etes pas connecte en tant qu'administrateur`);
    } finally {
      setServerLogLoading(false);
    }
  };

  const waitForBackendReady = async (token, expectedVersion) => {
    // Attendre que le restart commence
    setUpdateLogs(prev => [...prev, '⏳ Attente du redémarrage des services (5s)...']);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const maxAttempts = 40;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/updates/current`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 3000
        });
        
        if (response.status === 200) {
          const currentVersion = response.data.version;
          setUpdateLogs(prev => [...prev, `✅ Backend disponible (version ${currentVersion})`]);
          
          // Vérifier le résultat RÉEL de la mise à jour depuis la base de données
          try {
            const resultRes = await axios.get(`${BACKEND_URL}/api/updates/last-result`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 5000
            });
            
            if (resultRes.data?.has_result) {
              const result = resultRes.data;
              if (result.success && result.code_updated) {
                setUpdateLogs(prev => [...prev, `✅ Code source mis à jour avec succès`]);
                toast({
                  title: 'Mise à jour réussie',
                  description: `Version ${result.version_after || currentVersion} installée. Rechargement...`
                });
              } else if (!result.code_updated) {
                setUpdateLogs(prev => [...prev, `⚠️ ATTENTION : Le code source n'a PAS été mis à jour !`]);
                if (result.errors?.length > 0) {
                  result.errors.forEach(err => {
                    setUpdateLogs(prev => [...prev, `❌ ${err}`]);
                  });
                }
                toast({
                  title: 'Mise à jour échouée',
                  description: 'Le code n\'a pas pu être synchronisé depuis GitHub. Vérifiez les logs.',
                  variant: 'destructive'
                });
                setUpdating(false);
                return;
              } else if (result.errors?.length > 0) {
                setUpdateLogs(prev => [...prev, `⚠️ Mise à jour partielle avec erreurs :`]);
                result.errors.forEach(err => {
                  setUpdateLogs(prev => [...prev, `❌ ${err}`]);
                });
                toast({
                  title: 'Mise à jour partielle',
                  description: 'Des erreurs se sont produites. Vérifiez les détails.',
                  variant: 'warning'
                });
                setUpdating(false);
                return;
              }
            }
          } catch (verifyError) {
            // Impossible de vérifier - continuer quand même
            setUpdateLogs(prev => [...prev, '⚠️ Impossible de vérifier le résultat de la mise à jour']);
          }
          
          setUpdateLogs(prev => [...prev, '🔄 Rechargement de la page...']);
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          
          return;
        }
      } catch (error) {
        attempts++;
        setUpdateLogs(prev => [...prev, `⏳ Tentative ${attempts}/${maxAttempts} - Backend indisponible...`]);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Timeout - recharger quand même la page
    setUpdateLogs(prev => [...prev, '⚠️ Délai dépassé. Rechargement de la page...']);
    toast({
      title: 'Attention',
      description: 'Le redémarrage prend plus de temps que prévu. Rechargement en cours...',
      variant: 'warning'
    });
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  };

  const loadUpdateInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Récupérer les informations de mise à jour
      const [currentRes, checkRes, changelogRes, historyRes, gitHistoryRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/updates/current`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BACKEND_URL}/api/updates/check`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BACKEND_URL}/api/updates/changelog`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BACKEND_URL}/api/updates/history-list`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${BACKEND_URL}/api/updates/git-history`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { commits: [] } })) // Fallback si Git non disponible
      ]);

      setCurrentVersion(currentRes.data.version);
      setLatestVersion(checkRes.data.latest_version);
      setUpdateAvailable(checkRes.data.update_available);
      setChangelog(changelogRes.data.changelog || []);
      setHistory(historyRes.data.data || []);
      setGitHistory(gitHistoryRes.data.commits || []);
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
      description: 'Cette opération va :\n\n• Envoyer un avertissement à TOUS les utilisateurs connectés\n• Déconnecter automatiquement tous les utilisateurs après 30 secondes\n• Créer une sauvegarde complète de la base de données\n• Télécharger et installer la mise à jour\n• Redémarrer tous les services\n\nL\'application sera indisponible pendant environ 5 minutes.\n\nVoulez-vous continuer ?',
      confirmText: 'Envoyer l\'avertissement et installer',
      cancelText: 'Annuler',
      variant: 'default',
      onConfirm: async () => {
        try {
          setUpdating(true);
          const token = localStorage.getItem('token');
          const version = latestVersion?.version || '';

          // Étape 1: Broadcaster l'avertissement à tous les utilisateurs connectés
          setUpdateLogs(['📢 Envoi de l\'avertissement aux utilisateurs connectés...']);

          try {
            const warningRes = await axios.post(
              `${BACKEND_URL}/api/updates/broadcast-warning`,
              null,
              {
                params: { version },
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            const connectedCount = warningRes.data?.connected_users || 0;
            setUpdateLogs(prev => [...prev, `✅ Avertissement envoyé à ${connectedCount} utilisateur(s)`]);
          } catch (warningError) {
            setUpdateLogs(prev => [...prev, '⚠️ Impossible d\'envoyer l\'avertissement (non bloquant)']);
          }

          // Étape 2: Attendre 32 secondes pour que les utilisateurs soient déconnectés
          setUpdateLogs(prev => [...prev, '⏳ Attente de 30 secondes pour la déconnexion des utilisateurs...']);
          for (let i = 30; i > 0; i -= 5) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            if (i > 5) {
              setUpdateLogs(prev => [...prev, `⏳ ${i - 5} secondes restantes...`]);
            }
          }
          setUpdateLogs(prev => [...prev, '✅ Tous les utilisateurs ont été déconnectés']);

          // Étape 3: Lancer la mise à jour (retour immédiat HTTP 202)
          setUpdateLogs(prev => [...prev, '📦 Lancement de la mise à jour en arrière-plan...']);

          try {
            const response = await axios.post(
              `${BACKEND_URL}/api/updates/apply`,
              {},
              {
                params: { version },
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30000
              }
            );

            if (response.data.accepted || response.data.success) {
              setUpdateLogs(prev => [...prev, '✅ Script de mise à jour lancé avec succès']);
              setUpdateLogs(prev => [...prev, '📥 Téléchargement et installation en cours...']);
              setUpdateLogs(prev => [...prev, '⏳ Les services vont redémarrer automatiquement...']);
            }
          } catch (applyError) {
            if (applyError.code === 'ERR_NETWORK' || applyError.code === 'ECONNABORTED' ||
                applyError.response?.status === 502 || applyError.response?.status === 503) {
              setUpdateLogs(prev => [...prev, '🔄 Connexion interrompue (mise à jour en cours)...']);
            } else {
              throw applyError;
            }
          }

          // Attendre que le script ait le temps de s'exécuter
          setUpdateLogs(prev => [...prev, '⏳ Attente de la fin de la mise à jour (60-120s)...']);
          await new Promise(resolve => setTimeout(resolve, 10000));
          setUpdateLogs(prev => [...prev, '⏳ Vérification de la disponibilité du backend...']);
          await waitForBackendReady(token, version);
        } catch (error) {
          if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || 
              error.response?.status === 502 || error.response?.status === 503) {
            setUpdateLogs(prev => [...prev, '🔄 Connexion interrompue (services en cours de redémarrage)...']);
            setUpdateLogs(prev => [...prev, '⏳ Attente de la disponibilité du backend...']);
            const reconnToken = localStorage.getItem('token');
            await waitForBackendReady(reconnToken, latestVersion?.version);
          } else {
            const errorDetail = error.response?.data?.detail || error.message;
            setUpdateLogs(prev => [...prev, `❌ Erreur: ${errorDetail}`]);
            toast({
              title: 'Erreur de mise à jour',
              description: formatErrorMessage(error, 'Échec de la mise à jour. Consultez les logs pour plus de détails.'),
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

  const handleGitRollback = async (commitHash, commitMessage) => {
    confirm({
      title: '⚠️ ATTENTION - Rollback vers une version précédente',
      description: `Ceci va restaurer le code source vers le commit:\n\n"${commitMessage.substring(0, 100)}${commitMessage.length > 100 ? '...' : ''}"\n\nUn backup de la base de données sera créé automatiquement.\nL'application redémarrera après le rollback.\n\nVoulez-vous continuer ?`,
      confirmText: 'Revenir à cette version',
      cancelText: 'Annuler',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          setRollingBack(true);
          const token = localStorage.getItem('token');
          
          const response = await axios.post(
            `${BACKEND_URL}/api/updates/git-rollback?commit_hash=${commitHash}`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          if (response.data.success) {
            toast({
              title: 'Rollback réussi',
              description: 'L\'application va redémarrer. Veuillez patienter...'
            });

            // Attendre et recharger
            setTimeout(() => {
              window.location.reload();
            }, 5000);
          }
        } catch (error) {
          toast({
            title: 'Erreur',
            description: formatErrorMessage(error, 'Échec du rollback'),
            variant: 'destructive'
          });
          setRollingBack(false);
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
          <p className="text-gray-600 mt-1">Gérez les mises à jour de l&apos;application</p>
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
            <CardTitle className="text-white">Logs de mise à jour</CardTitle>
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

      {/* Logs serveur persistants (diagnostic) */}
      <Card className="border-amber-200">
        <CardHeader 
          className="cursor-pointer hover:bg-amber-50"
          onClick={() => {
            const next = !expandedServerLog;
            setExpandedServerLog(next);
            if (next && !serverLog) loadServerLog();
          }}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-amber-700" data-testid="server-log-title">
              <Terminal size={20} />
              Logs du serveur (diagnostic)
              {serverLogInfo && (
                <span className="text-xs font-normal text-gray-500">
                  ({Math.round(serverLogInfo.size / 1024)} Ko)
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {expandedServerLog && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-700"
                  onClick={(e) => { e.stopPropagation(); loadServerLog(); }}
                  disabled={serverLogLoading}
                  data-testid="refresh-server-log-btn"
                >
                  <RefreshCw size={14} className={serverLogLoading ? 'animate-spin' : ''} />
                </Button>
              )}
              {expandedServerLog ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </div>
          </div>
        </CardHeader>
        {expandedServerLog && (
          <CardContent>
            {serverLogLoading && !serverLog ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={24} className="animate-spin text-amber-600" />
                <span className="ml-2 text-gray-600">Chargement des logs...</span>
              </div>
            ) : serverLog ? (
              <div className="space-y-2">
                {serverLogInfo && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <FileText size={12} />
                    <span>Fichier: {serverLogInfo.path}</span>
                    {serverLogInfo.in_progress && (
                      <>
                        <span>|</span>
                        <span className="text-amber-600 font-medium">Mise a jour en cours...</span>
                      </>
                    )}
                  </div>
                )}
                <div 
                  className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap"
                  data-testid="server-log-content"
                >
                  {serverLog}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Terminal size={32} className="mx-auto text-gray-300 mb-2" />
                <p>Aucun log de mise a jour disponible</p>
                <p className="text-sm mt-1">Les logs apparaitront ici apres une tentative de mise a jour</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

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
                      {item.success ? (
                        <CheckCircle size={20} className="text-green-600" />
                      ) : (
                        <AlertCircle size={20} className="text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.version_before} → {item.version_after}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(item.started_at).toLocaleString('fr-FR')}
                        </p>
                        {item.duration_seconds && (
                          <p className="text-xs text-gray-500 mt-1">
                            Durée: {Math.floor(item.duration_seconds / 60)}m {Math.floor(item.duration_seconds % 60)}s
                          </p>
                        )}
                        {item.error_message && (
                          <p className="text-xs text-red-600 mt-1">{item.error_message}</p>
                        )}
                        {item.summary?.errors?.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.summary.errors.map((err, i) => (
                              <p key={i} className="text-xs text-red-600">&#x274C; {err}</p>
                            ))}
                          </div>
                        )}
                        {item.summary?.warnings?.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.summary.warnings.map((warn, i) => (
                              <p key={i} className="text-xs text-orange-600">&#x26A0; {warn}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {item.success && item.backup_path && item.version_after !== currentVersion && (
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

      {/* Historique des versions Git (Rollback) */}
      <Card className="border-purple-200">
        <CardHeader 
          className="cursor-pointer hover:bg-purple-50"
          onClick={() => setExpandedGitHistory(!expandedGitHistory)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <GitBranch size={20} />
              Historique des versions (Git)
              {gitHistory.length > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  ({gitHistory.length} commits)
                </span>
              )}
            </CardTitle>
            {expandedGitHistory ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
        </CardHeader>
        {expandedGitHistory && (
          <CardContent>
            {gitHistory.length === 0 ? (
              <div className="text-center py-6">
                <History size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">Aucun historique Git disponible</p>
                <p className="text-sm text-gray-400 mt-1">
                  Le dépôt Git n&apos;est pas configuré ou accessible sur ce serveur
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-4">
                  Sélectionnez une version précédente pour y revenir. Un backup sera créé automatiquement.
                </p>
                {gitHistory.map((commit, index) => (
                  <div
                    key={commit.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      commit.is_current 
                        ? 'bg-purple-50 border-purple-300' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        commit.is_current ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'
                      }`}>
                        {commit.is_current ? (
                          <CheckCircle size={16} />
                        ) : (
                          <span className="text-xs font-mono">{index + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-200 px-2 py-0.5 rounded font-mono">
                            {commit.short_id}
                          </code>
                          {commit.is_current && (
                            <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                              VERSION ACTUELLE
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate mt-1" title={commit.message}>
                          {commit.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(commit.date).toLocaleString('fr-FR')} • {commit.author}
                        </p>
                      </div>
                    </div>
                    {!commit.is_current && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-3 flex-shrink-0 border-purple-300 text-purple-700 hover:bg-purple-100"
                        onClick={() => handleGitRollback(commit.id, commit.message)}
                        disabled={rollingBack || updating}
                      >
                        <RotateCcw size={14} className="mr-1" />
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
