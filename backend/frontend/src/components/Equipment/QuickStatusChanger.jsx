import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { equipmentsAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import MaintenanceEndConfirmDialog from './MaintenanceEndConfirmDialog';

const QuickStatusChanger = ({ equipment, onStatusChange }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // État pour le dialogue de confirmation de fin de maintenance
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    maintenanceInfo: null,
    newStatus: null
  });

  const handleStatusChange = async (newStatus) => {
    try {
      setLoading(true);
      const response = await equipmentsAPI.updateStatus(equipment.id, newStatus, false);
      
      // Vérifier si une confirmation est nécessaire (maintenance en cours)
      if (response.data.requires_confirmation) {
        setConfirmDialog({
          open: true,
          maintenanceInfo: response.data.maintenance_info,
          newStatus: newStatus
        });
        setLoading(false);
        return;
      }
      
      toast({
        title: 'Succès',
        description: 'Statut mis à jour'
      });

      if (onStatusChange) {
        onStatusChange(equipment.id, newStatus);
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Confirmation de fin anticipée de maintenance
  const handleConfirmMaintenanceEnd = async () => {
    try {
      setLoading(true);
      await equipmentsAPI.updateStatus(equipment.id, confirmDialog.newStatus, true);
      
      toast({
        title: 'Succès',
        description: 'Maintenance terminée et statut mis à jour'
      });

      setConfirmDialog({ open: false, maintenanceInfo: null, newStatus: null });

      if (onStatusChange) {
        onStatusChange(equipment.id, confirmDialog.newStatus);
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de terminer la maintenance',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'OPERATIONNEL': 'bg-green-100 text-green-700 hover:bg-green-200',
      'EN_FONCTIONNEMENT': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
      'A_LARRET': 'bg-gray-100 text-gray-700 hover:bg-gray-200',
      'EN_MAINTENANCE': 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
      'EN_CT': 'bg-purple-100 text-purple-700 hover:bg-purple-200',
      'HORS_SERVICE': 'bg-red-100 text-red-700 hover:bg-red-200',
      'DEGRADE': 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      'ALERTE_S_EQUIP': 'bg-pink-100 text-pink-700 hover:bg-pink-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'OPERATIONNEL': 'Opérationnel',
      'EN_FONCTIONNEMENT': 'En Fonctionnement',
      'A_LARRET': 'A l\'arrêt',
      'EN_MAINTENANCE': 'En maintenance',
      'EN_CT': 'En C.T',
      'HORS_SERVICE': 'Hors service',
      'DEGRADE': 'Dégradé',
      'ALERTE_S_EQUIP': 'Alerte S.Équip'
    };
    return labels[status] || status;
  };

  // Ne pas désactiver - laisser le backend gérer les validations
  const isDisabled = loading;

  return (
    <>
      <Select
        value={equipment.statut}
        onValueChange={handleStatusChange}
        disabled={isDisabled}
      >
        <SelectTrigger 
          className={`px-3 py-1 rounded-full text-xs font-medium border-0 ${getStatusColor(equipment.statut)}`}
        >
          <SelectValue>
            {getStatusLabel(equipment.statut)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="OPERATIONNEL">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-600"></span>
              Opérationnel
            </span>
          </SelectItem>
          <SelectItem value="EN_FONCTIONNEMENT">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              En Fonctionnement
            </span>
          </SelectItem>
          <SelectItem value="A_LARRET">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-600"></span>
              A l&apos;arrêt
            </span>
          </SelectItem>
          <SelectItem value="EN_MAINTENANCE">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-600"></span>
              En maintenance
            </span>
          </SelectItem>
          <SelectItem value="EN_CT">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span>
              En C.T
            </span>
          </SelectItem>
          <SelectItem value="HORS_SERVICE">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              Hors service
            </span>
          </SelectItem>
          <SelectItem value="DEGRADE">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Dégradé
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Dialog de confirmation de fin de maintenance */}
      <MaintenanceEndConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, maintenanceInfo: null, newStatus: null })}
        onConfirm={handleConfirmMaintenanceEnd}
        maintenanceInfo={confirmDialog.maintenanceInfo}
        newStatus={confirmDialog.newStatus}
        loading={loading}
      />
    </>
  );
};

export default QuickStatusChanger;
