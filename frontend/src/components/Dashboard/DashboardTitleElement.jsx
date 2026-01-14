import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { GripVertical, Pencil, Trash2, X, Check } from 'lucide-react';

const DashboardTitleElement = ({ 
  element, 
  isEditMode, 
  onUpdate, 
  onDelete,
  dragHandleProps 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editConfig, setEditConfig] = useState({
    text: element.text,
    fontSize: element.fontSize,
    color: element.color,
    alignment: element.alignment
  });

  const fontSizes = [
    { value: 'text-sm', label: 'Petit' },
    { value: 'text-base', label: 'Normal' },
    { value: 'text-lg', label: 'Moyen' },
    { value: 'text-xl', label: 'Grand' },
    { value: 'text-2xl', label: 'Très grand' },
    { value: 'text-3xl', label: 'Énorme' }
  ];

  const alignments = [
    { value: 'left', label: 'Gauche' },
    { value: 'center', label: 'Centre' },
    { value: 'right', label: 'Droite' }
  ];

  const handleSave = () => {
    onUpdate(element.id, editConfig);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditConfig({
      text: element.text,
      fontSize: element.fontSize,
      color: element.color,
      alignment: element.alignment
    });
    setIsEditing(false);
  };

  const getAlignmentClass = () => {
    switch (element.alignment) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  if (isEditing && isEditMode) {
    return (
      <div className="relative p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
        <div className="space-y-3">
          <Input
            value={editConfig.text}
            onChange={(e) => setEditConfig(prev => ({ ...prev, text: e.target.value }))}
            placeholder="Texte du titre"
            className="font-semibold"
          />
          
          <div className="flex gap-2">
            <Select
              value={editConfig.fontSize}
              onValueChange={(value) => setEditConfig(prev => ({ ...prev, fontSize: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontSizes.map(size => (
                  <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={editConfig.alignment}
              onValueChange={(value) => setEditConfig(prev => ({ ...prev, alignment: value }))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {alignments.map(align => (
                  <SelectItem key={align.value} value={align.value}>{align.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              type="color"
              value={editConfig.color}
              onChange={(e) => setEditConfig(prev => ({ ...prev, color: e.target.value }))}
              className="w-10 h-10 rounded border cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" />
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1" />
              Valider
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative group ${isEditMode ? 'border-2 border-dashed border-gray-300 rounded-lg p-2 hover:border-blue-400 transition-colors' : ''}`}
    >
      {isEditMode && (
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-white shadow-sm"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
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

      <h2 
        className={`${element.fontSize} font-semibold ${getAlignmentClass()} py-2`}
        style={{ color: element.color }}
      >
        {element.text}
      </h2>
    </div>
  );
};

export default DashboardTitleElement;
