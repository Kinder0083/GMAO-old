import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, FileText, X } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import api from '../../services/api';

const ChangelogPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [changelog, setChangelog] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    loadChangelog();
  }, []);

  const loadChangelog = async () => {
    try {
      const response = await api.get('/changelog');
      const { entries, unseen_count } = response.data;
      
      if (entries && entries.length > 0) {
        setChangelog(entries);
        setUnseenCount(unseen_count || 0);
        
        // Afficher le popup seulement s'il y a des entrées non lues
        const dismissedKey = localStorage.getItem('changelog_dismissed');
        const latestKey = entries[0]?.version || entries[0]?.started_at || '';
        if (unseen_count > 0 && latestKey && latestKey !== dismissedKey) {
          setShowPopup(true);
        }
      }
    } catch (error) {
      console.debug('Changelog check failed:', error.message);
    }
  };

  const handleClose = async () => {
    try {
      await api.post('/changelog/mark-seen');
      if (changelog.length > 0) {
        const latestKey = changelog[0].version || changelog[0].started_at || '';
        localStorage.setItem('changelog_dismissed', latestKey);
      }
    } catch (e) {
      // Silently fail
    }
    setShowPopup(false);
    setUnseenCount(0);
  };

  if (!showPopup || changelog.length === 0) return null;

  const latestEntry = changelog[0];

  return (
    <Dialog open={showPopup} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="changelog-popup">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            Nouveautés de la mise à jour
          </DialogTitle>
          <DialogDescription>
            {latestEntry.version_name || `Version ${latestEntry.version || ''}`}
            {latestEntry.started_at ? ` - ${new Date(latestEntry.started_at).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Version info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-lg text-blue-900 mb-1">
              {latestEntry.version_name || 'Mise à jour'}
            </h3>
            <p className="text-sm text-blue-700">
              Version {latestEntry.version}
            </p>
          </div>

          {/* Changements */}
          {latestEntry.changes && latestEntry.changes.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Ce qui a changé
              </h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <ul className="space-y-2">
                  {latestEntry.changes.map((change, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">+</span>
                      <span>{change.replace(/^[+\-*]\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Versions précédentes */}
          {changelog.length > 1 && (
            <div>
              <h4 className="font-semibold mb-2 text-sm text-gray-500 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Mises à jour précédentes
              </h4>
              <div className="space-y-2">
                {changelog.slice(1, 4).map((entry, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {entry.version_name || `v${entry.version}`}
                      </span>
                      <span className="text-xs text-gray-400">
                        {entry.started_at ? new Date(entry.started_at).toLocaleDateString('fr-FR') : ''}
                      </span>
                    </div>
                    {entry.changes && entry.changes.length > 0 && (
                      <p className="text-xs text-gray-500">{entry.changes[0]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            data-testid="changelog-close-btn"
            onClick={handleClose}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            J'ai compris
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangelogPopup;
