import React, { useEffect, useState } from 'react';
import { X, Download, Bell, BellOff, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { usePushNotifications, useInstallPrompt } from '../../hooks/usePWA';
import { useToast } from '../../hooks/use-toast';

const PWABanner = () => {
  const { canInstall, isInstalled, install } = useInstallPrompt();
  const { permission, isSubscribed, isSupported, subscribe, testNotification } = usePushNotifications();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);

  // Auto-subscribe on login if permission already granted
  useEffect(() => {
    if (isSupported && permission === 'granted' && !isSubscribed) {
      subscribe();
    }
  }, [isSupported, permission, isSubscribed, subscribe]);

  // Show notification banner after install or if not subscribed
  useEffect(() => {
    if (isSupported && permission === 'default' && !isSubscribed) {
      const timer = setTimeout(() => setShowNotifBanner(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, isSubscribed]);

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) {
      toast({ title: 'Application installee', description: 'FSAO Iris a ete ajoutee a votre ecran d\'accueil' });
    }
  };

  const handleEnableNotifications = async () => {
    const result = await subscribe();
    setShowNotifBanner(false);
    if (result?.permissionGranted) {
      if (result?.subscribed) {
        toast({ title: 'Notifications activees', description: 'Vous recevrez les alertes en temps reel' });
        const testResult = await testNotification();
        if (testResult?.sent > 0) {
          toast({ title: 'Test envoye', description: 'Vous devriez recevoir une notification de test dans quelques secondes' });
        }
      } else {
        // Permission accordee mais abonnement push echoue (pas de HTTPS complet, etc.)
        toast({ title: 'Permission accordee', description: `Abonnement push incomplet (${result?.error || 'inconnu'}). Verifiez la console pour les details.`, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Notifications refusees', description: 'Verifiez les permissions du site dans les parametres de Brave > Parametres du site > Notifications', variant: 'destructive' });
    }
  };

  if (dismissed) return null;

  // Install banner
  if (canInstall && !isInstalled) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-4 animate-in slide-in-from-bottom-4" data-testid="pwa-install-banner">
        <div className="flex items-start gap-3">
          <div className="bg-blue-600 rounded-lg p-2 flex-shrink-0">
            <Download size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Installer FSAO Iris</p>
            <p className="text-xs text-slate-400 mt-0.5">Acces rapide depuis votre ecran d'accueil + notifications</p>
          </div>
          <button onClick={() => setDismissed(true)} className="text-slate-500 hover:text-white p-1 flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button onClick={handleInstall} size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" data-testid="pwa-install-btn">
            Installer
          </Button>
          <Button onClick={() => setDismissed(true)} size="sm" variant="ghost" className="text-slate-400 hover:text-white">
            Plus tard
          </Button>
        </div>
      </div>
    );
  }

  // Notification permission banner
  if (showNotifBanner && isSupported && permission === 'default') {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-4 animate-in slide-in-from-bottom-4" data-testid="pwa-notif-banner">
        <div className="flex items-start gap-3">
          <div className="bg-amber-600 rounded-lg p-2 flex-shrink-0">
            <Bell size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Activer les notifications</p>
            <p className="text-xs text-slate-400 mt-0.5">Recevez les alertes OT, pannes et messages en temps reel</p>
          </div>
          <button onClick={() => setShowNotifBanner(false)} className="text-slate-500 hover:text-white p-1 flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button onClick={handleEnableNotifications} size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" data-testid="pwa-enable-notif-btn">
            Activer
          </Button>
          <Button onClick={() => setShowNotifBanner(false)} size="sm" variant="ghost" className="text-slate-400 hover:text-white">
            Non merci
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default PWABanner;
