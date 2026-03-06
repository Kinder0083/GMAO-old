import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import useOnlineStatus from '../../hooks/useOnlineStatus';

const OfflineIndicator = () => {
  const { isOnline, pendingSyncCount } = useOnlineStatus();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
            isOnline
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-red-50 text-red-600 border border-red-200 animate-pulse'
          }`}
          data-testid="offline-indicator"
        >
          {isOnline ? (
            <Wifi size={13} />
          ) : (
            <WifiOff size={13} />
          )}
          <span className="hidden sm:inline">
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </span>
          {pendingSyncCount > 0 && (
            <span className="flex items-center gap-0.5 ml-0.5 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px]" data-testid="pending-sync-count">
              <RefreshCw size={10} />
              {pendingSyncCount}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg max-w-xs">
        {isOnline ? (
          <div>
            <p className="font-medium text-emerald-400">Connecte</p>
            <p className="text-xs text-gray-300 mt-1">Toutes les donnees sont synchronisees</p>
          </div>
        ) : (
          <div>
            <p className="font-medium text-red-400">Hors ligne</p>
            <p className="text-xs text-gray-300 mt-1">Les donnees en cache sont disponibles en lecture</p>
            {pendingSyncCount > 0 && (
              <p className="text-xs text-amber-400 mt-1">
                {pendingSyncCount} modification{pendingSyncCount > 1 ? 's' : ''} en attente de synchronisation
              </p>
            )}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export default OfflineIndicator;
