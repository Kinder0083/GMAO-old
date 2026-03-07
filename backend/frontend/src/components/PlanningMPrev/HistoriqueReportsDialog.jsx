import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { demandesArretAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { 
  CalendarClock, 
  CheckCircle2, 
  Clock, 
  XCircle,
  BarChart3,
  TrendingUp,
  Calendar,
  Wrench,
  ArrowRight
} from 'lucide-react';

const HistoriqueReportsDialog = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await demandesArretAPI.getReportsHistory();
      setReports(data.reports || []);
      setStats(data.statistiques || null);
    } catch (error) {
      console.error('Erreur chargement historique reports:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger l\'historique des reports',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (statut) => {
    const badges = {
      'EN_ATTENTE': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, label: 'En attente' },
      'ACCEPTE': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'Accepté' },
      'REFUSE': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Refusé' }
    };
    return badges[statut] || badges['EN_ATTENTE'];
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Historique des Reports
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {/* Statistiques */}
            {stats && (
              <div className="space-y-4 flex-shrink-0">
                {/* Première ligne de stats */}
                <div className="grid grid-cols-4 gap-3">
                  <Card className="bg-purple-50">
                    <CardContent className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <BarChart3 className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="text-xl font-bold text-purple-700">{stats.reports_vs_total}</div>
                      <div className="text-xs text-purple-600">Reports / Total demandes</div>
                      <div className="text-xs text-gray-500">({stats.pourcentage_reports}%)</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50">
                    <CardContent className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-xl font-bold text-blue-700">{stats.duree_moyenne_report_jours}</div>
                      <div className="text-xs text-blue-600">Jours de report (moy.)</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-xl font-bold text-green-700">{stats.taux_acceptation}%</div>
                      <div className="text-xs text-green-600">Taux d'acceptation</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-50">
                    <CardContent className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="text-xl font-bold text-gray-700">{stats.delai_moyen_reponse_heures}h</div>
                      <div className="text-xs text-gray-600">Délai réponse (moy.)</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Deuxième ligne: détail des statuts et équipements */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Répartition des reports</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          <span>Acceptés: {stats.reports_acceptes}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                          <span>En attente: {stats.reports_en_attente}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span>
                          <span>Refusés: {stats.reports_refuses}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Équipements les plus reportés</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {stats.top_equipements_reportes && stats.top_equipements_reportes.length > 0 ? (
                          stats.top_equipements_reportes.map(([nom, count], idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {nom}: {count}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">Aucune donnée</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Liste des reports */}
            <div 
              className="flex-1 min-h-0 border rounded-md bg-gray-50/50 mt-4" 
              style={{
                maxHeight: '300px', 
                minHeight: '200px',
                overflowY: 'scroll',
                scrollbarWidth: 'auto',
                scrollbarColor: '#94a3b8 #e2e8f0'
              }}
            >
              <div className="p-2 space-y-3">
                {reports.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarClock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucun report dans l'historique</p>
                  </div>
                ) : (
                  reports.map((report) => {
                    const statusBadge = getStatusBadge(report.statut);
                    const StatusIcon = statusBadge.icon;
                    
                    return (
                      <Card key={report.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={`${statusBadge.bg} ${statusBadge.text}`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusBadge.label}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              Demandé le {formatDateTime(report.created_at)}
                            </span>
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <p><strong>Équipements:</strong> {report.equipement_noms?.join(', ')}</p>
                            <p><strong>Demandé par:</strong> {report.demandeur_report_nom}</p>
                            
                            <div className="flex items-center gap-2 mt-2 p-2 bg-purple-50 rounded">
                              <div className="text-center">
                                <div className="text-xs text-gray-500">Dates originales</div>
                                <div className="font-medium">{formatDate(report.date_debut_originale)} - {formatDate(report.date_fin_originale)}</div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-purple-500" />
                              <div className="text-center">
                                <div className="text-xs text-gray-500">Nouvelles dates</div>
                                <div className="font-medium text-purple-700">{formatDate(report.nouvelle_date_debut)} - {formatDate(report.nouvelle_date_fin)}</div>
                              </div>
                            </div>
                            
                            <p className="mt-2"><strong>Raison:</strong> {report.raison}</p>
                            
                            {report.statut === 'ACCEPTE' && report.accepte_par_nom && (
                              <p className="text-green-600 text-xs mt-1">
                                ✓ Accepté par {report.accepte_par_nom} le {formatDateTime(report.date_acceptation)}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        <div className="pt-3 border-t flex justify-end flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HistoriqueReportsDialog;
