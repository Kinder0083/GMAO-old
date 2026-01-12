import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QuickStatusChanger from './QuickStatusChanger';

const EquipmentTreeNode = ({ 
  equipment, 
  level = 0, 
  onEdit, 
  onDelete, 
  onAddChild,
  onViewDetails,
  allEquipments,
  onStatusChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // Fermé par défaut
  const navigate = useNavigate();

  // Récupérer les enfants de cet équipement
  const children = allEquipments.filter(eq => eq.parent_id === equipment.id);

  const getStatusColor = (status) => {
    const colors = {
      'OPERATIONNEL': 'bg-green-100 text-green-700',
      'EN_MAINTENANCE': 'bg-yellow-100 text-yellow-700',
      'HORS_SERVICE': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'OPERATIONNEL': 'Opérationnel',
      'EN_MAINTENANCE': 'En maintenance',
      'HORS_SERVICE': 'Hors service'
    };
    return labels[status] || status;
  };

  const indentWidth = level * 40;

  return (
    <div>
      <Card className="mb-2 hover:shadow-md transition-shadow">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2" style={{ marginLeft: `${indentWidth}px` }}>
            {/* Indicateur de hiérarchie */}
            {level > 0 && (
              <div className="flex items-center">
                <div className="w-6 h-px bg-gray-300"></div>
              </div>
            )}

            {/* Bouton expand/collapse */}
            {children.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </Button>
            ) : (
              <div className="w-6"></div>
            )}

            {/* Informations de l'équipement */}
            <div className="flex-1 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{equipment.nom}</h3>
                  <QuickStatusChanger 
                    equipment={equipment}
                    onStatusChange={onStatusChange}
                  />
                </div>
                <div className="flex gap-4 mt-1 text-sm text-gray-600">
                  {equipment.categorie && <span>Catégorie: {equipment.categorie}</span>}
                  {equipment.numeroSerie && <span>N° Série: {equipment.numeroSerie}</span>}
                  {equipment.emplacement && (
                    <span>Emplacement: {equipment.emplacement.nom}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/assets/${equipment.id}`)}
                  className="hover:bg-blue-50 h-8 w-8 p-0"
                >
                  <Eye size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddChild(equipment)}
                  className="hover:bg-green-50 h-8 w-8 p-0"
                  title="Ajouter un sous-équipement"
                >
                  <Plus size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(equipment)}
                  className="hover:bg-yellow-50 h-8 w-8 p-0"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(equipment)}
                  className="hover:bg-red-50 h-8 w-8 p-0"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enfants (récursif) */}
      {isExpanded && children.length > 0 && (
        <div>
          {children.map(child => (
            <EquipmentTreeNode
              key={child.id}
              equipment={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onViewDetails={onViewDetails}
              onStatusChange={onStatusChange}
              allEquipments={allEquipments}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EquipmentTreeView = ({ equipments, onEdit, onDelete, onAddChild, onViewDetails, onStatusChange }) => {
  // Filtrer uniquement les équipements racines (sans parent)
  const rootEquipments = equipments.filter(eq => !eq.parent_id);

  if (rootEquipments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucun équipement trouvé
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rootEquipments.map(equipment => (
        <EquipmentTreeNode
          key={equipment.id}
          equipment={equipment}
          level={0}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          onViewDetails={onViewDetails}
          onStatusChange={onStatusChange}
          allEquipments={equipments}
        />
      ))}
    </div>
  );
};

export default EquipmentTreeView;
