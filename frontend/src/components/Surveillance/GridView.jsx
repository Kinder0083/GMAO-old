import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Edit, Trash2, CheckCircle, Paperclip } from 'lucide-react';
import CompleteSurveillanceDialog from './CompleteSurveillanceDialog';
import RecurrenceIndicator from './RecurrenceIndicator';

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

function GridView({ items, loading, onEdit, onDelete, onRefresh, currentYear, onNavigateToYear, trends }) {
  const [completeDialog, setCompleteDialog] = useState({ open: false, item: null });

  if (loading) return <div className="text-center p-4">Chargement...</div>;

  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'AUTRE';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <>
      {Object.keys(groupedItems).length === 0 ? (
        <div className="text-center py-8 text-gray-500">Aucun contrôle trouvé</div>
      ) : (
        Object.keys(groupedItems).sort().map((category) => (
          <div key={category} className="mb-6">
            <h3 className="text-lg font-semibold mb-3">{category} ({groupedItems[category].length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {groupedItems[category].map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm flex items-center gap-1">
                        {item.classe_type}
                        <RecurrenceIndicator item={item} currentYear={currentYear} onNavigateToYear={onNavigateToYear} trend={trends?.[item.groupe_controle_id]} />
                      </CardTitle>
                      <Badge className={getStatusColor(item.status)}>{getStatusLabel(item.status)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1 mb-3">
                      <p><strong>Bâtiment:</strong> {item.batiment}</p>
                      <p><strong>Périodicité:</strong> {item.periodicite}</p>
                      <p><strong>Responsable:</strong> {item.responsable}</p>
                      {item.prochain_controle && (
                        <p className="text-blue-600"><strong>Prochain:</strong> {new Date(item.prochain_controle).toLocaleDateString('fr-FR')}</p>
                      )}
                      {item.piece_jointe_url && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Paperclip className="h-3 w-3" />
                          <span className="text-xs">Fichier joint</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <div className="flex gap-1">
                        {item.status !== 'REALISE' && (
                          <Button size="sm" variant="ghost" onClick={() => setCompleteDialog({ open: true, item })}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
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
    </>
  );
}

export default GridView;
