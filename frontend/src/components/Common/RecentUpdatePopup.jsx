import React, { useState, useEffect } from 'react';
import { Sparkles, X, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/config';

const RecentUpdatePopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    checkRecentUpdate();
  }, []);

  const checkRecentUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Vérifier si l'utilisateur a déjà vu ce popup
      const dismissedVersion = localStorage.getItem('dismissed_update_popup');
      
      const response = await axios.get(`${BACKEND_URL}/api/updates/recent-info`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.show_popup && response.data.version !== dismissedVersion) {
        setUpdateInfo(response.data);
        setShowPopup(true);
      }
    } catch (error) {
      console.debug('Recent update check failed:', error.message);
    }
  };

  const handleClose = () => {
    if (updateInfo?.version) {
      // Enregistrer que l'utilisateur a vu ce popup
      localStorage.setItem('dismissed_update_popup', updateInfo.version);
    }
    setShowPopup(false);
  };

  if (!showPopup || !updateInfo) return null;

  const appliedDate = updateInfo.applied_at 
    ? new Date(updateInfo.applied_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Récemment';

  return (
    <Dialog open={showPopup} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            Nouvelle mise à jour installée !
          </DialogTitle>
          <DialogDescription>
            FSAO Iris a été mis à jour le {appliedDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Version info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-lg text-blue-900 mb-1">
              {updateInfo.version_name || 'Nouvelle version'}
            </h3>
            <p className="text-sm text-blue-700">
              Version {updateInfo.version}
            </p>
          </div>

          {/* Description */}
          {updateInfo.description && (
            <div>
              <p className="text-sm text-gray-600">{updateInfo.description}</p>
            </div>
          )}

          {/* Changements */}
          {updateInfo.changes && updateInfo.changes.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Ce qui a été ajouté ou amélioré
              </h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <ul className="space-y-2">
                  {updateInfo.changes.map((change, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>{change.replace(/^[✅✓]\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Message de bienvenue */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-sm text-green-800">
              🎉 Profitez des nouvelles fonctionnalités !
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full bg-blue-600 hover:bg-blue-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            J'ai compris
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecentUpdatePopup;
