import React from 'react';
import { Shield } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const LOTO_STATUS_CONFIG = {
  CONSIGNE:     { color: 'text-red-600',    bg: 'bg-red-100',    label: 'Consigne - Equipement verrouille' },
  INTERVENTION: { color: 'text-red-600',    bg: 'bg-red-100',    label: 'Intervention en cours - Equipement verrouille' },
  DEMANDE:      { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Demande de consignation en attente' },
  DECONSIGNE:   { color: 'text-green-600',  bg: 'bg-green-100',  label: 'Deconsigne - Equipement remis en service' },
};

export function LOTOBadge({ lotoInfo, size = 'sm' }) {
  if (!lotoInfo) return null;

  const cfg = LOTO_STATUS_CONFIG[lotoInfo.status] || LOTO_STATUS_CONFIG.DEMANDE;
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} cursor-help`} data-testid={`loto-badge-${lotoInfo.status?.toLowerCase()}`}>
            <Shield className={iconSize} />
            {size !== 'sm' && <span className="text-xs font-semibold">{lotoInfo.numero}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg max-w-xs">
          <p className="font-medium text-sm">{cfg.label}</p>
          <p className="text-xs text-gray-300 mt-1">LOTO {lotoInfo.numero}</p>
          {lotoInfo.equipement_nom && <p className="text-xs text-gray-400">{lotoInfo.equipement_nom}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
