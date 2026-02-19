import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Edit, Trash2, CheckCircle, Eye, ChevronRight, Bot } from 'lucide-react';
import CompleteSurveillanceDialog from './CompleteSurveillanceDialogNew';
import HistoryDialog from './HistoryDialog';
import RecurrenceIndicator from './RecurrenceIndicator';
import ManualMatchDialog from './ManualMatchDialog';
import { CATEGORY_ICONS } from './CategoryOrderDialog';
import api from '../../services/api';

const getStatusColor = (status) => {
  switch (status) {
    case 'REALISE': return 'bg-green-500';
    case 'PLANIFIE': return 'bg-blue-500';
    case 'PLANIFIER': return 'bg-orange-500';
    default: return 'bg-gray-500';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'REALISE': return 'Réalisé';
    case 'PLANIFIE': return 'Planifié';
    case 'PLANIFIER': return 'À planifier';
    default: return status;
  }
};

const getCategoryIcon = (category) => {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS['default'];
};

function ListViewGrouped({ items, loading, onEdit, onDelete, onRefresh, currentYear, onNavigateToYear, trends }) {
  const [completeDialog, setCompleteDialog] = useState({ open: false, item: null });
  const [historyDialog, setHistoryDialog] = useState({ open: false, control: null });
  const [matchDialog, setMatchDialog] = useState({ open: false, item: null });
  const [groupedItems, setGroupedItems] = useState({});
  const [categoryOrder, setCategoryOrder] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  useEffect(() => {
    loadCategoryOrder();
  }, []);

  useEffect(() => {
    if (items && items.length > 0) {
      groupItemsByCategory();
    }
  }, [items, categoryOrder]);

  const loadCategoryOrder = async () => {
    try {
      const response = await api.get('/user-preferences/surveillance_category_order');
      const savedOrder = response.data?.value;

      if (savedOrder && Array.isArray(savedOrder)) {
        setCategoryOrder(savedOrder);
      }
    } catch (error) {
      console.error('Erreur chargement ordre catégories:', error);
    }
  };

  const groupItemsByCategory = () => {
    // Extraire toutes les catégories uniques
    const categories = [...new Set(items.map(item => item.category))].filter(Boolean);
    
    // Appliquer l'ordre sauvegardé si disponible
    let orderedCategories = [];
    if (categoryOrder.length > 0) {
      // Utiliser l'ordre sauvegardé, puis ajouter les nouvelles catégories à la fin
      orderedCategories = [
        ...categoryOrder.filter(cat => categories.includes(cat)),
        ...categories.filter(cat => !categoryOrder.includes(cat)).sort()
      ];
    } else {
      // Ordre alphabétique par défaut
      orderedCategories = categories.sort();
    }

    // Grouper les items par catégorie
    const grouped = {};
    orderedCategories.forEach(category => {
      grouped[category] = items.filter(item => item.category === category);
    });

    setGroupedItems(grouped);
  };

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const calculateCategoryPercentage = (categoryItems) => {
    if (categoryItems.length === 0) return 0;
    const realises = categoryItems.filter(item => item.status === 'REALISE');
    return Math.round((realises.length / categoryItems.length) * 100);
  };

  if (loading) return <div className="text-center p-4">Chargement...</div>;

  if (items.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-gray-500">
        Aucun contrôle trouvé
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category} className="rounded-lg border bg-white overflow-hidden">
            {/* En-tête de catégorie cliquable */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full bg-gradient-to-r from-blue-50 to-blue-100 border-b px-4 py-3 flex items-center gap-3 hover:from-blue-100 hover:to-blue-150 transition-colors cursor-pointer"
            >
              {/* Chevron */}
              <ChevronRight 
                className={`h-5 w-5 text-gray-600 transition-transform ${expandedCategories.has(category) ? 'rotate-90' : ''}`}
              />
              
              <span className="text-3xl">{getCategoryIcon(category)}</span>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-lg text-gray-800">{category}</h3>
                <p className="text-sm text-gray-600">
                  {categoryItems.length} contrôle{categoryItems.length > 1 ? 's' : ''}
                </p>
              </div>
              
              {/* Pourcentage de réalisation */}
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {calculateCategoryPercentage(categoryItems)}%
                </div>
                <div className="text-xs text-gray-500">à jour</div>
              </div>
            </button>

            {/* Tableau des items de la catégorie - Affiché seulement si catégorie dépliée */}
            {expandedCategories.has(category) && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Bâtiment</TableHead>
                  <TableHead>Périodicité</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Date du contrôle</TableHead>
                  <TableHead>Écart</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        {item.classe_type}
                        <RecurrenceIndicator item={item} currentYear={currentYear} onNavigateToYear={onNavigateToYear} trend={trends?.[item.groupe_controle_id]} />
                      </div>
                    </TableCell>
                    <TableCell>{item.batiment}</TableCell>
                    <TableCell>{item.periodicite}</TableCell>
                    <TableCell>{item.responsable}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => setHistoryDialog({ open: true, control: item })}
                        className="text-blue-600 hover:underline cursor-pointer"
                        title="Voir l'historique"
                      >
                        {(() => {
                          const dateStr = item.status === 'REALISE' && item.derniere_visite
                            ? item.derniere_visite
                            : item.prochain_controle;
                          return dateStr ? new Date(dateStr).toLocaleDateString('fr-FR') : '-';
                        })()}
                      </button>
                    </TableCell>
                    <TableCell data-testid={`ecart-grouped-${item.id}`}>
                      {item.ecart_jours != null ? (
                        <Badge className={
                          item.ecart_jours <= 0 ? 'bg-emerald-600 text-white' :
                          item.ecart_jours <= 7 ? 'bg-amber-500 text-white' :
                          'bg-red-500 text-white'
                        }>
                          {item.ecart_jours > 0 ? '+' : ''}{item.ecart_jours}j
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.status)}>{getStatusLabel(item.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {item.status === 'REALISE' ? (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setHistoryDialog({ open: true, control: item })}
                            title="Voir l'historique"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setCompleteDialog({ open: true, item })}
                            title="Marquer comme réalisé"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </div>
        ))}
      </div>
      
      {completeDialog.open && (
        <CompleteSurveillanceDialog
          open={completeDialog.open}
          item={completeDialog.item}
          onClose={(refresh) => {
            setCompleteDialog({ open: false, item: null });
            if (refresh && onRefresh) onRefresh();
          }}
        />
      )}

      {historyDialog.open && (
        <HistoryDialog
          open={historyDialog.open}
          control={historyDialog.control}
          onClose={() => setHistoryDialog({ open: false, control: null })}
        />
      )}
    </>
  );
}

export default ListViewGrouped;
