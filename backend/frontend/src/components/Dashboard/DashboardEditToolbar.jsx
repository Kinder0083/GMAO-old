import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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
import {
  Type,
  Minus,
  Save,
  X,
  RotateCcw,
  GripVertical
} from 'lucide-react';

const DashboardEditToolbar = ({ 
  onAddTitle, 
  onAddSeparator, 
  onSave, 
  onCancel, 
  onReset,
  hasChanges 
}) => {
  const [titleConfig, setTitleConfig] = useState({
    text: '',
    fontSize: 'text-xl',
    color: '#1f2937',
    alignment: 'left'
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

  const handleAddTitle = () => {
    if (titleConfig.text.trim()) {
      onAddTitle({
        ...titleConfig,
        id: `title-${Date.now()}`,
        type: 'title'
      });
      setTitleConfig({ text: '', fontSize: 'text-xl', color: '#1f2937', alignment: 'left' });
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-3 flex items-center gap-3">
        {/* Indicateur mode édition */}
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-lg">
          <GripVertical className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">Mode Édition</span>
        </div>

        <div className="h-8 w-px bg-gray-300" />

        {/* Ajouter un titre */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Titre
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" side="top">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Ajouter un titre de section</h4>
              
              <div className="space-y-2">
                <Label htmlFor="title-text">Texte</Label>
                <Input
                  id="title-text"
                  placeholder="Ex: Mes statistiques"
                  value={titleConfig.text}
                  onChange={(e) => setTitleConfig(prev => ({ ...prev, text: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Taille</Label>
                  <Select
                    value={titleConfig.fontSize}
                    onValueChange={(value) => setTitleConfig(prev => ({ ...prev, fontSize: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontSizes.map(size => (
                        <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Alignement</Label>
                  <Select
                    value={titleConfig.alignment}
                    onValueChange={(value) => setTitleConfig(prev => ({ ...prev, alignment: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {alignments.map(align => (
                        <SelectItem key={align.value} value={align.value}>{align.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Couleur</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={titleConfig.color}
                    onChange={(e) => setTitleConfig(prev => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={titleConfig.color}
                    onChange={(e) => setTitleConfig(prev => ({ ...prev, color: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Prévisualisation */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Aperçu :</p>
                <p 
                  className={`${titleConfig.fontSize} font-semibold`}
                  style={{ 
                    color: titleConfig.color,
                    textAlign: titleConfig.alignment 
                  }}
                >
                  {titleConfig.text || 'Votre titre ici...'}
                </p>
              </div>

              <Button 
                onClick={handleAddTitle} 
                className="w-full"
                disabled={!titleConfig.text.trim()}
              >
                Ajouter le titre
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Ajouter un séparateur */}
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
          onClick={() => onAddSeparator({ id: `separator-${Date.now()}`, type: 'separator' })}
        >
          <Minus className="h-4 w-4" />
          Séparateur
        </Button>

        <div className="h-8 w-px bg-gray-300" />

        {/* Réinitialiser */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 text-gray-600"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser
        </Button>

        <div className="h-8 w-px bg-gray-300" />

        {/* Annuler */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
          Annuler
        </Button>

        {/* Sauvegarder */}
        <Button 
          size="sm" 
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          onClick={onSave}
          disabled={!hasChanges}
        >
          <Save className="h-4 w-4" />
          Sauvegarder
        </Button>
      </div>
    </div>
  );
};

export default DashboardEditToolbar;
