import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { demandesArretAPI, equipmentsAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Calendar,
  User,
  Wrench,
  Filter,
  FileText,
  Paperclip,
  Ban,
  CheckCircle,
  CalendarClock,
  History,
  BarChart3
} from 'lucide-react';
import HistoriqueReportsDialog from './HistoriqueReportsDialog';

const HistoriqueDemandesDialog = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [demandes, setDemandes] = useState([]);
  const [equipments, setEquipments] = useState([]);
  
  // État pour l'annulation
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [demandeToCancel, setDemandeToCancel] = useState(null);
  const [cancelMotif, setCancelMotif] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  // État pour le report
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [demandeToReport, setDemandeToReport] = useState(null);
  const [reportData, setReportData] = useState({
    raison: '',
    nouvelle_date_debut: '',
    nouvelle_date_fin: ''
  });
  const [reporting, setReporting] = useState(false);
  
  // État pour l'historique des reports
  const [reportsHistoryDialogOpen, setReportsHistoryDialogOpen] = useState(false);
  
  // Filtres
  const [filters, setFilters] = useState({
    statut: 'all',
    equipement_id: 'all',
    date_debut: '',
    date_fin: ''
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [demandesRes, equipmentsRes] = await Promise.all([
        demandesArretAPI.getAll(),
        equipmentsAPI.getAll()
      ]);
      
      setDemandes(demandesRes.data || demandesRes || []);
      setEquipments(equipmentsRes.data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'historique',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les demandes
  const filteredDemandes = demandes.filter(demande => {
    // Filtre par statut
    if (filters.statut !== 'all' && demande.statut !== filters.statut) {
      return false;
    }
    
    // Filtre par équipement
    if (filters.equipement_id !== 'all' && !demande.equipement_ids?.includes(filters.equipement_id)) {
      return false;
    }
    
    // Filtre par date
    if (filters.date_debut && demande.date_debut < filters.date_debut) {
      return false;
    }
    if (filters.date_fin && demande.date_fin > filters.date_fin) {
      return false;
    }
    
    return true;
  });

  // Trier par date de création (plus récent en premier)
  const sortedDemandes = [...filteredDemandes].sort((a, b) => 
    new Date(b.created_at || b.date_creation) - new Date(a.created_at || a.date_creation)
  );

  const getStatusBadge = (statut) => {
    const badges = {
      'EN_ATTENTE': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'En attente' },
      'APPROUVEE': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'Approuvée' },
      'REFUSEE': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Refusée' },
      'EXPIREE': { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertTriangle, label: 'Expirée' },
      'ANNULEE': { bg: 'bg-orange-100', text: 'text-orange-700', icon: Ban, label: 'Annulée' },
      'TERMINEE': { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle, label: 'Terminée' }
    };
    return badges[statut] || badges['EN_ATTENTE'];
  };

  // Vérifier si une demande peut être annulée
  const canCancel = (statut) => {
    return !['REFUSEE', 'TERMINEE', 'ANNULEE'].includes(statut);
  };

  // Ouvrir la boîte de dialogue d'annulation
  const openCancelDialog = (demande) => {
    setDemandeToCancel(demande);
    setCancelMotif('');
    setCancelDialogOpen(true);
  };

  // Confirmer l'annulation
  const handleConfirmCancel = async () => {
    if (!demandeToCancel || !cancelMotif.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir un motif d\'annulation',
        variant: 'destructive'
      });
      return;
    }

    setCancelling(true);
    try {
      await demandesArretAPI.cancel(demandeToCancel.id, cancelMotif.trim());
      
      toast({
        title: 'Succès',
        description: 'La demande a été annulée avec succès'
      });
      
      // Rafraîchir la liste
      await loadData();
      
      // Fermer la boîte de dialogue
      setCancelDialogOpen(false);
      setDemandeToCancel(null);
      setCancelMotif('');
    } catch (error) {
      console.error('Erreur annulation:', error);
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible d\'annuler la demande',
        variant: 'destructive'
      });
    } finally {
      setCancelling(false);
    }
  };

  const getPriorityBadge = (priorite) => {
    const badges = {
      'URGENTE': { bg: 'bg-red-100', text: 'text-red-700', label: 'Urgente' },
      'NORMALE': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Normale' },
      'BASSE': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Basse' }
    };
    return badges[priorite] || badges['NORMALE'];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stats des demandes
  const stats = {
    total: demandes.length,
    enAttente: demandes.filter(d => d.statut === 'EN_ATTENTE').length,
    approuvees: demandes.filter(d => d.statut === 'APPROUVEE').length,
    refusees: demandes.filter(d => d.statut === 'REFUSEE').length,
    annulees: demandes.filter(d => d.statut === 'ANNULEE').length
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historique des Demandes d'Arrêt
          </DialogTitle>
        </DialogHeader>

        {/* Statistiques */}
        <div className="grid grid-cols-5 gap-3 py-2 flex-shrink-0">
          <Card className="bg-gray-50">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-yellow-700">{stats.enAttente}</div>
              <div className="text-xs text-yellow-600">En attente</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{stats.approuvees}</div>
              <div className="text-xs text-green-600">Approuvées</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-red-700">{stats.refusees}</div>
              <div className="text-xs text-red-600">Refusées</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-50">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-orange-700">{stats.annulees}</div>
              <div className="text-xs text-orange-600">Annulées</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-3 flex-shrink-0">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filtres</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Statut</Label>
                <Select
                  value={filters.statut}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, statut: value }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                    <SelectItem value="APPROUVEE">Approuvée</SelectItem>
                    <SelectItem value="REFUSEE">Refusée</SelectItem>
                    <SelectItem value="EXPIREE">Expirée</SelectItem>
                    <SelectItem value="ANNULEE">Annulée</SelectItem>
                    <SelectItem value="TERMINEE">Terminée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Équipement</Label>
                <Select
                  value={filters.equipement_id}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, equipement_id: value }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les équipements</SelectItem>
                    {equipments.map(eq => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.nom || eq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Date début</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={filters.date_debut}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_debut: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Date fin</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={filters.date_fin}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_fin: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des demandes */}
        <div 
          className="flex-1 min-h-0 border rounded-md bg-gray-50/50" 
          style={{
            maxHeight: '400px', 
            minHeight: '300px',
            overflowY: 'scroll',
            scrollbarWidth: 'auto',
            scrollbarColor: '#94a3b8 #e2e8f0'
          }}
        >
          <div className="p-2 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : sortedDemandes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune demande trouvée</p>
            </div>
          ) : (
            <>
              {sortedDemandes.map((demande) => {
                const statusBadge = getStatusBadge(demande.statut);
                const priorityBadge = getPriorityBadge(demande.priorite);
                const StatusIcon = statusBadge.icon;
                
                return (
                  <Card key={demande.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={`${statusBadge.bg} ${statusBadge.text}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusBadge.label}
                          </Badge>
                          <Badge className={`${priorityBadge.bg} ${priorityBadge.text}`}>
                            {priorityBadge.label}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          Créée le {formatDateTime(demande.created_at || demande.date_creation)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>
                              <strong>Période:</strong> {formatDate(demande.date_debut)} - {formatDate(demande.date_fin)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Wrench className="h-4 w-4 text-gray-400" />
                            <span>
                              <strong>Équipements:</strong> {demande.equipement_noms?.join(', ') || '-'}
                            </span>
                          </div>
                          {demande.attachments?.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-gray-400" />
                              <span>{demande.attachments.length} pièce(s) jointe(s)</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>
                              <strong>Demandeur:</strong> {demande.demandeur_nom}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>
                              <strong>Destinataire:</strong> {demande.destinataire_nom}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {demande.commentaire && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                          <strong>Commentaire:</strong> {demande.commentaire}
                        </div>
                      )}
                      
                      {demande.commentaire_reponse && (
                        <div className={`mt-3 p-2 rounded text-sm ${
                          demande.statut === 'APPROUVEE' ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          <strong>Réponse ({formatDateTime(demande.date_reponse)}):</strong> {demande.commentaire_reponse}
                        </div>
                      )}
                      
                      {demande.date_proposee && demande.statut === 'REFUSEE' && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                          <strong>Date alternative proposée:</strong> {formatDate(demande.date_proposee)}
                        </div>
                      )}
                      
                      {/* Informations d'annulation */}
                      {demande.statut === 'ANNULEE' && demande.motif_annulation && (
                        <div className="mt-3 p-2 bg-orange-50 rounded text-sm">
                          <strong>Annulée par {demande.annule_par_nom} le {formatDateTime(demande.date_annulation)}:</strong>
                          <p className="mt-1">{demande.motif_annulation}</p>
                        </div>
                      )}
                      
                      {/* Bouton d'annulation */}
                      {canCancel(demande.statut) && (
                        <div className="mt-4 pt-3 border-t flex justify-end">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => openCancelDialog(demande)}
                            data-testid={`cancel-demande-${demande.id}`}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Annulation
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
          </div>
        </div>

        <div className="pt-3 border-t flex justify-end flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
        
        {/* Boîte de dialogue de confirmation d'annulation */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Ban className="h-5 w-5" />
                Annuler la demande
              </DialogTitle>
              <DialogDescription>
                Cette action est irréversible. La planification associée sera supprimée et un email sera envoyé au destinataire.
              </DialogDescription>
            </DialogHeader>
            
            {demandeToCancel && (
              <div className="space-y-4">
                {/* Rappel de la demande */}
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p><strong>Équipements:</strong> {demandeToCancel.equipement_noms?.join(', ')}</p>
                  <p><strong>Période:</strong> {formatDate(demandeToCancel.date_debut)} - {formatDate(demandeToCancel.date_fin)}</p>
                  <p><strong>Destinataire:</strong> {demandeToCancel.destinataire_nom}</p>
                </div>
                
                {/* Motif d'annulation */}
                <div className="space-y-2">
                  <Label htmlFor="motif">Motif de l'annulation <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="motif"
                    placeholder="Saisissez le motif de l'annulation..."
                    value={cancelMotif}
                    onChange={(e) => setCancelMotif(e.target.value)}
                    rows={3}
                    data-testid="cancel-motif-input"
                  />
                </div>
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setCancelDialogOpen(false)}
                disabled={cancelling}
              >
                Annuler
              </Button>
              <Button 
                variant="destructive"
                onClick={handleConfirmCancel}
                disabled={cancelling || !cancelMotif.trim()}
                data-testid="confirm-cancel-btn"
              >
                {cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default HistoriqueDemandesDialog;
