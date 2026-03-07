import React from 'react';
import { Button } from '../ui/button';
import { GripVertical, Trash2 } from 'lucide-react';

const DashboardSeparator = ({ 
  element, 
  isEditMode, 
  onDelete,
  dragHandleProps 
}) => {
  return (
    <div 
      className={`relative group ${isEditMode ? 'py-4' : 'py-2'}`}
    >
      {isEditMode && (
        <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-white shadow-sm text-red-600 hover:bg-red-50"
            onClick={() => onDelete(element.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      {isEditMode && (
        <div 
          {...dragHandleProps}
          className="absolute -left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="bg-white rounded shadow-sm p-1">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      )}

      <hr className={`border-gray-300 ${isEditMode ? 'border-dashed hover:border-blue-400 transition-colors' : ''}`} />
    </div>
  );
};

export default DashboardSeparator;
