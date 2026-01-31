import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  RefreshCw, 
  Save, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { useConfirmDialog } from '../../components/ui/confirm-dialog';
import { formatErrorMessage } from '../../utils/errorFormatter';

const TailscaleSettings = () => {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [tailscaleIP, setTailscaleIP] = useState('');
  const [loadingTailscale, setLoadingTailscale] = useState(true);
  const [savingTailscale, setSavingTailscale] = useState(false);
  const [restoringTailscale, setRestoringTailscale] = useState(false);
  const [tailscaleStatus, setTailscaleStatus] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTailscaleConfig();
  }, []);

  const loadTailscaleConfig = async () => {
    try {
      setLoadingTailscale(true);
      const response = await api.get('/tailscale/config');
      setTailscaleIP(response.data.tailscale_ip || '');
      setTailscaleStatus(response.data.status);
    } catch (error) {
      console.error('Erreur chargement config Tailscale:', error);
    } finally {
      setLoadingTailscale(false);
    }
  };

  const handleSaveTailscaleConfig = () => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(tailscaleIP)) {
      toast({
        title: 'IP invalide',
        description: 'Veuillez entrer une adresse IP valide (ex: 100.105.2.113)',
        variant: 'destructive'
      });
      return;
    }

    const parts = tailscaleIP.split('.');
    if (parts.some(part => parseInt(part) > 255)) {
      toast({
        title: 'IP invalide',
        description: 'Chaque partie de l\'IP doit être entre 0 et 255',
        variant: 'destructive'
      });
      return;
    }

    confirm({
      title: 'Modifier l\'adresse IP Tailscale',
      description: `Êtes-vous sûr de vouloir changer l'IP en ${tailscaleIP} ?\n\n⚠️ Cette action va :\n\n- Modifier le fichier .env du frontend\n- Recompiler l'application (1-2 minutes)\n- Redémarrer les services\n\nVous devrez peut-être rafraîchir votre navigateur après.`,
      confirmText: 'Confirmer et Appliquer',
      cancelText: 'Annuler',
      variant: 'default',
      onConfirm: async () => {
        try {
          setSavingTailscale(true);
          const response = await api.post('/tailscale/configure', {
            tailscale_ip: tailscaleIP
          });
          
          if (response.data.success) {
            toast({
              title: '⏳ Configuration en cours...',
              description: `L'IP Tailscale est en cours de configuration (${tailscaleIP}). Le système va se recharger dans 30 secondes. ATTENDEZ au moins 2 minutes avant de tester !`,
              duration: 30000,
            });
            
            setTimeout(() => {
              window.location.href = `http://${tailscaleIP}`;
            }, 30000);
          } else {
            toast({
              title: 'Erreur',
              description: response.data.message || 'La configuration a échoué',
              variant: 'destructive'
            });
          }
        } catch (error) {
          toast({
            title: 'Erreur',
            description: formatErrorMessage(error, 'Impossible de modifier la configuration Tailscale'),
            variant: 'destructive'
          });
        } finally {
          setSavingTailscale(false);
        }
      }
    });
  };

  const handleRestoreTailscaleConfig = () => {
    confirm({
      title: 'Restaurer la configuration précédente',
      description: 'Êtes-vous sûr de vouloir restaurer la configuration IP précédente ?\n\n⚠️ Cette action va :\n\n- Restaurer l\'ancien fichier .env\n- Recompiler l\'application (1-2 minutes)\n- Redémarrer les services\n\nUtilisez cette fonction si vous rencontrez des problèmes après un changement d\'IP.',
      confirmText: 'Restaurer',
      cancelText: 'Annuler',
      variant: 'default',
      onConfirm: async () => {
        try {
          setRestoringTailscale(true);
          const response = await api.post('/tailscale/restore');
          
          if (response.data.success) {
            toast({
              title: 'Configuration restaurée',
              description: 'La configuration précédente a été restaurée. Rechargement de la page dans 3 secondes...',
            });
            
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          } else {
            toast({
              title: 'Erreur',
              description: response.data.message || 'La restauration a échoué',
              variant: 'destructive'
            });
          }
        } catch (error) {
          toast({
            title: 'Erreur',
            description: formatErrorMessage(error, 'Impossible de restaurer la configuration'),
            variant: 'destructive'
          });
        } finally {
          setRestoringTailscale(false);
        }
      }
    });
  };

  return (
    <>
      <ConfirmDialog />
      
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Configuration Tailscale (IP)</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Modifier l'adresse IP Tailscale pour l'accès à distance (Proxmox uniquement)
          </p>
        </div>

        <div className="p-6">
          {loadingTailscale ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Chargement de la configuration...</p>
            </div>
          ) : (
            <div className="max-w-2xl">
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <Globe className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">À propos de cette fonctionnalité :</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Cette fonction remplace le script SSH "configure-tailscale.sh"</li>
                      <li>Modifie automatiquement l'URL du backend pour Tailscale</li>
                      <li>L'application sera recompilée (1-2 minutes)</li>
                      <li><strong>Fonctionne uniquement sur le serveur Proxmox</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Status actuel */}
              {tailscaleStatus && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Configuration actuelle</p>
                      <p className="text-sm text-green-700 mt-1">
                        IP Tailscale : <span className="font-mono font-semibold">{tailscaleStatus.current_ip || 'Non configuré'}</span>
                      </p>
                      {tailscaleStatus.backend_url && (
                        <p className="text-xs text-green-600 mt-1">
                          URL Backend : {tailscaleStatus.backend_url}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Formulaire */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresse IP Tailscale <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tailscaleIP}
                    onChange={(e) => setTailscaleIP(e.target.value)}
                    placeholder="Ex: 100.105.2.113"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format : XXX.XXX.XXX.XXX (chaque partie entre 0 et 255)
                  </p>
                </div>

                {/* Avertissement */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-semibold mb-1">⚠️ Attention :</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Cette modification recompilera le frontend (1-2 minutes)</li>
                        <li>Les services backend et nginx seront redémarrés</li>
                        <li>Vous devrez rafraîchir votre navigateur après (F5)</li>
                        <li>Assurez-vous que l'IP est correcte avant de confirmer</li>
                        <li><strong>ATTENDEZ 2 minutes complètes avant de tester</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Guide de dépannage */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-1">🆘 Si vous voyez "Bad Gateway" après le changement :</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li><strong>Attendez 2 minutes complètes</strong> - Le backend met du temps à démarrer</li>
                        <li>Rafraîchissez votre navigateur (Ctrl+F5 ou Cmd+Shift+R)</li>
                        <li>Utilisez le bouton <span className="font-semibold">"Restaurer l'ancienne IP"</span></li>
                        <li>Si le problème persiste, connectez-vous en SSH et exécutez :
                          <code className="block bg-red-100 p-2 mt-1 rounded text-xs">
                            cd /opt/gmao-iris/frontend && cp .env.backup .env && yarn build && systemctl restart nginx
                          </code>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Boutons */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleRestoreTailscaleConfig}
                    disabled={restoringTailscale || savingTailscale}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {restoringTailscale ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>Restauration...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-5 w-5" />
                        <span>Restaurer l'ancienne IP</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleSaveTailscaleConfig}
                    disabled={savingTailscale || restoringTailscale || !tailscaleIP}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {savingTailscale ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>Configuration en cours (1-2 min)...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>Appliquer la nouvelle IP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TailscaleSettings;
