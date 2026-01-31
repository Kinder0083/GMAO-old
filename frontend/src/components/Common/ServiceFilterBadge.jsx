import React from 'react';
import { Badge } from '../ui/badge';
import { Building2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useServiceManagerStatus } from '../../hooks/useServiceManagerStatus';

/**
 * Composant qui affiche un badge si les données sont filtrées par service.
 * À utiliser dans les pages qui appliquent le filtrage automatique (OT, Équipements, etc.)
 */
const ServiceFilterBadge = ({ className = '' }) => {
  const { isFiltered, serviceFilter, loading } = useServiceManagerStatus();

  if (loading || !isFiltered) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={`bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 cursor-help ${className}`}
          >
            <Building2 className="h-3 w-3 mr-1" />
            Service : {serviceFilter}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Filtrage par service actif</p>
          <p className="text-xs text-gray-300">
            Les données affichées sont limitées au service "{serviceFilter}"
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ServiceFilterBadge;
