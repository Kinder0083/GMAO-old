import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const StatusChangeDialog = ({ open, onOpenChange, currentStatus, onStatusChange, onSkip, workOrderId }) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'OUVERT');

  const statuses = [
    { value: 'OUVERT', label: 'Ouvert' },
    { value: 'EN_COURS', label: 'En cours' },
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'TERMINE', label: 'Terminé' }
  ];

  const handleConfirm = () => {
    if (selectedStatus !== currentStatus) {
      onStatusChange(selectedStatus);
    } else {
      onSkip();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Changer le statut de l'amélioration</DialogTitle>
          <DialogDescription>
            Souhaitez-vous mettre à jour le statut de cet amélioration avant de fermer ?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">Nouveau statut</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedStatus === currentStatus && (
            <p className="text-sm text-gray-500">
              Le statut actuel est déjà "{statuses.find(s => s.value === currentStatus)?.label}".
            </p>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
          >
            Ne rien changer
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={selectedStatus === currentStatus}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Mettre à jour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatusChangeDialog;
