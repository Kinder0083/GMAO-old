import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Edit, Trash2, CheckCircle, Bot } from 'lucide-react';
import CompleteSurveillanceDialog from './CompleteSurveillanceDialog';
import RecurrenceIndicator from './RecurrenceIndicator';
import ManualMatchDialog from './ManualMatchDialog';

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

function ListView({ items, loading, onEdit, onDelete, onRefresh, currentYear, onNavigateToYear, trends }) {
  const [completeDialog, setCompleteDialog] = useState({ open: false, item: null });
  const [matchDialog, setMatchDialog] = useState({ open: false, item: null });

  if (loading) return <div className="text-center p-4">Chargement...</div>;

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Catégorie</TableHead>
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
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">Aucun contrôle trouvé</TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      {item.classe_type}
                      <RecurrenceIndicator item={item} currentYear={currentYear} onNavigateToYear={onNavigateToYear} trend={trends?.[item.groupe_controle_id]} />
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                  <TableCell>{item.batiment}</TableCell>
                  <TableCell>{item.periodicite}</TableCell>
                  <TableCell>{item.responsable}</TableCell>
                  <TableCell>
                    {(() => {
                      const dateStr = item.status === 'REALISE' && item.derniere_visite
                        ? item.derniere_visite
                        : item.prochain_controle;
                      return dateStr ? new Date(dateStr).toLocaleDateString('fr-FR') : '-';
                    })()}
                  </TableCell>
                  <TableCell data-testid={`ecart-${item.id}`}>
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
                      {item.status !== 'REALISE' && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setMatchDialog({ open: true, item })} title="Correspondance IA" data-testid={`robot-btn-${item.id}`}>
                            <Bot className="h-4 w-4 text-violet-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setCompleteDialog({ open: true, item })}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </>
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
              ))
            )}
          </TableBody>
        </Table>
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
    </>
  );
}

export default ListView;
