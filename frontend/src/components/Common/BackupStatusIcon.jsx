import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { getBackendURL } from '../../utils/config';
import axios from 'axios';

const BackupStatusIcon = () => {
  const [status, setStatus] = useState('none');
  const [lastBackup, setLastBackup] = useState(null);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${getBackendURL()}/api/backup/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      if (data.status === 'success' && data.timestamp) {
        const backupTime = new Date(data.timestamp);
        const now = new Date();
        const hoursDiff = (now - backupTime) / (1000 * 60 * 60);
        setStatus(hoursDiff <= 24 ? 'recent' : 'old');
        setLastBackup(backupTime);
      } else if (data.status === 'error') {
        setStatus('error');
        setLastBackup(data.timestamp ? new Date(data.timestamp) : null);
      } else {
        setStatus('none');
      }
    } catch {
      // Silently fail - user might not be admin
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const getIconColor = () => {
    switch (status) {
      case 'recent': return 'text-emerald-500';
      case 'error': return 'text-red-500';
      case 'old': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    if (!lastBackup) return 'Aucune sauvegarde effectuée';
    const formatted = lastBackup.toLocaleString('fr-FR');
    switch (status) {
      case 'recent': return `Dernière sauvegarde réussie: ${formatted}`;
      case 'error': return `Dernière sauvegarde en échec: ${formatted}`;
      default: return `Dernière sauvegarde: ${formatted}`;
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
          data-testid="backup-status-icon"
        >
          <Save size={20} className={`${getIconColor()} transition-colors`} />
          {status === 'recent' && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
          )}
          {status === 'error' && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg max-w-xs">
        <p className="font-medium mb-1">Sauvegarde automatique</p>
        <p className="text-xs text-gray-300">{getStatusText()}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default BackupStatusIcon;
