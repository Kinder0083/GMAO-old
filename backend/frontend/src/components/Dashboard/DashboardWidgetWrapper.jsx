import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { GripVertical, Trash2, Maximize2, Minimize2 } from 'lucide-react';

const DashboardWidgetWrapper = ({ 
  children, 
  widget,
  isEditMode, 
  onRemove,
  onResize,
  size = 'normal', // 'small', 'normal', 'large', 'full'
  dragHandleProps 
}) => {
  const sizeClasses = {
    small: 'col-span-1',
    normal: 'col-span-1 md:col-span-1',
    large: 'col-span-1 md:col-span-2',
    full: 'col-span-1 md:col-span-2 lg:col-span-4'
  };

  const nextSize = {
    small: 'normal',
    normal: 'large',
    large: 'full',
    full: 'small'
  };

  if (!isEditMode) {
    return (
      <div className={sizeClasses[size]}>
        {children}
      </div>
    );
  }

  return (
    <div 
      className={`relative group ${sizeClasses[size]}`}
    >
      {/* Overlay en mode édition */}
      <div className="absolute inset-0 border-2 border-dashed border-transparent group-hover:border-blue-400 rounded-lg transition-colors pointer-events-none z-10" />
      
      {/* Contrôles */}
      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-white shadow-sm"
          onClick={() => onResize(widget.id, nextSize[size])}
          title={`Taille: ${size} → ${nextSize[size]}`}
        >
          {size === 'full' || size === 'large' ? (
            <Minimize2 className="h-3 w-3" />
          ) : (
            <Maximize2 className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-white shadow-sm text-red-600 hover:bg-red-50"
          onClick={() => onRemove(widget.id)}
          title="Masquer ce widget"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Poignée de déplacement */}
      <div 
        {...dragHandleProps}
        className="absolute -left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <div className="bg-white rounded shadow-sm p-1 border">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Contenu du widget */}
      {children}
    </div>
  );
};

export default DashboardWidgetWrapper;
