import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { GripVertical, ArrowUp, ArrowDown, Save, RotateCcw } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import api from '../../services/api';

// Icônes par catégorie (mappings par défaut)
const CATEGORY_ICONS = {
  'INCENDIE': '🔥',
  'ELECTRIQUE': '⚡',
  'MMRI': '⚙️',
  'HVAC': '🌡️',
  'SECURITE': '🛡️',
  'ASCENSEUR': '🛗',
  'PLOMBERIE': '🚰',
  'STRUCTURE': '🏗️',
  'GAZ': '💨',
  'EAU': '💧',
  'default': '📋'
};

function CategoryOrderDialog({ open, onClose, categories, onOrderChanged }) {
  const { toast } = useToast();
  const [orderedCategories, setOrderedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (open && categories) {
      loadSavedOrder();
    }
  }, [open, categories]);

  const loadSavedOrder = async () => {
    try {
      // Charger l'ordre sauvegardé depuis les préférences utilisateur
      const response = await api.get('/user-preferences/surveillance_category_order');
      const savedOrder = response.data?.value;

      if (savedOrder && Array.isArray(savedOrder)) {
        // Filtrer pour ne garder que les catégories qui existent encore
        const validSavedCategories = savedOrder.filter(cat => categories.includes(cat));
        
        // Ajouter les nouvelles catégories qui n'étaient pas dans l'ordre sauvegardé
        const newCategories = categories.filter(cat => !validSavedCategories.includes(cat));
        
        setOrderedCategories([...validSavedCategories, ...newCategories]);
      } else {
        // Ordre alphabétique par défaut
        setOrderedCategories([...categories].sort());
      }
    } catch (error) {
      console.error('Erreur chargement ordre:', error);
      // En cas d'erreur, utiliser l'ordre alphabétique
      setOrderedCategories([...categories].sort());
    }
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newOrder = [...orderedCategories];
    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    setOrderedCategories(newOrder);
    setIsDirty(true);
  };

  const moveDown = (index) => {
    if (index === orderedCategories.length - 1) return;
    const newOrder = [...orderedCategories];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setOrderedCategories(newOrder);
    setIsDirty(true);
  };

  const resetToDefault = () => {
    setOrderedCategories([...categories].sort());
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Sauvegarder l'ordre dans les préférences utilisateur
      await api.post('/user-preferences', {
        key: 'surveillance_category_order',
        value: orderedCategories
      });

      toast({
        title: 'Succès',
        description: 'Ordre des catégories sauvegardé'
      });

      setIsDirty(false);
      
      // Informer le parent du changement
      if (onOrderChanged) {
        onOrderChanged(orderedCategories);
      }
      
      onClose(true);
    } catch (error) {
      console.error('Erreur sauvegarde ordre:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la sauvegarde',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    return CATEGORY_ICONS[category] || CATEGORY_ICONS['default'];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⚙️ Ordre des catégories
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Organisez l'ordre d'affichage des catégories dans la vue liste
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {orderedCategories.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Aucune catégorie disponible
            </div>
          ) : (
            <div className="space-y-2">
              {orderedCategories.map((category, index) => (
                <div
                  key={category}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
                >
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-2xl">{getCategoryIcon(category)}</span>
                    <Badge variant="outline" className="text-sm">
                      {category}
                    </Badge>
                    <span className="text-xs text-gray-400">Position {index + 1}</span>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      title="Monter"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveDown(index)}
                      disabled={index === orderedCategories.length - 1}
                      title="Descendre"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={resetToDefault}
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser (A-Z)
          </Button>
          <Button
            variant="outline"
            onClick={() => onClose(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !isDirty}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CategoryOrderDialog;
export { CATEGORY_ICONS };
