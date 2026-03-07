import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Calendar, MapPin, Wrench, FileText, User } from 'lucide-react';

const ImprovementRequestDialog = ({ open, onOpenChange, request }) => {
  if (!request) return null;

  const getPriorityBadge = (priorite) => {
    const badges = {
      'HAUTE': { variant: 'destructive', label: 'Haute' },
      'MOYENNE': { variant: 'default', label: 'Moyenne' },
      'BASSE': { variant: 'secondary', label: 'Basse' },
      'AUCUNE': { variant: 'outline', label: 'Normale' }
    };
    const badge = badges[priorite] || badges['AUCUNE'];
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{request.titre}</DialogTitle>
          <div className="flex gap-2 mt-2">
            {getPriorityBadge(request.priorite)}
            {request.work_order_id && (
              <Badge variant="success">Convertie en ordre</Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <div className="flex items-start gap-2 mb-2">
              <FileText className="text-gray-600 mt-1" size={18} />
              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="text-base text-gray-900 mt-1 whitespace-pre-wrap">{request.description}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            {request.equipement && (
              <div className="flex items-center gap-2">
                <Wrench className="text-gray-600" size={18} />
                <div>
                  <p className="text-sm text-gray-600">Équipement</p>
                  <p className="text-base font-medium text-gray-900">{request.equipement.nom}</p>
                </div>
              </div>
            )}

            {request.emplacement && (
              <div className="flex items-center gap-2">
                <MapPin className="text-gray-600" size={18} />
                <div>
                  <p className="text-sm text-gray-600">Emplacement</p>
                  <p className="text-base font-medium text-gray-900">{request.emplacement.nom}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Calendar className="text-gray-600" size={18} />
              <div>
                <p className="text-sm text-gray-600">Date Limite Désirée</p>
                <p className="text-base font-medium text-gray-900">{formatDate(request.date_limite_desiree)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="text-gray-600" size={18} />
              <div>
                <p className="text-sm text-gray-600">Créée par</p>
                <p className="text-base font-medium text-gray-900">{request.created_by_name || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="text-gray-600" size={18} />
              <div>
                <p className="text-sm text-gray-600">Date de création</p>
                <p className="text-base font-medium text-gray-900">{formatDate(request.date_creation)}</p>
              </div>
            </div>
          </div>

          {request.improvement_numero && (
            <>
              <Separator />
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-2">Ordre de travail créé</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-blue-700">Numéro d'ordre</p>
                    <p className="text-sm font-medium text-blue-900">#{request.improvement_numero}#</p>
                  </div>
                  {request.work_order_date_limite && (
                    <div>
                      <p className="text-xs text-blue-700">Date limite</p>
                      <p className="text-sm font-medium text-blue-900">{formatDate(request.work_order_date_limite)}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImprovementRequestDialog;