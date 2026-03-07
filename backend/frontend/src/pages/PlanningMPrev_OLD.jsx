import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Wrench, Plus } from 'lucide-react';
import { equipmentsAPI, demandesArretAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import DemandeArretDialog from '../components/PlanningMPrev/DemandeArretDialog';

const PlanningMPrev = () => {
  const { toast } = useToast();
  const [equipments, setEquipments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [planningEntries, setPlanningEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadEquipments = async () => {
    try {
      const response = await equipmentsAPI.getAll();
      setEquipments(response.data || []);
    } catch (error) {
      console.error('Erreur chargement équipements:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les équipements',
        variant: 'destructive'
      });
    }
  };

  const loadPlanningEntries = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const startDate = new Date(year, 0, 1).toISOString().split('T')[0]; // 1er janvier
      const endDate = new Date(year, 11, 31).toISOString().split('T')[0]; // 31 décembre
      
      const entries = await demandesArretAPI.getPlanningEquipements({
        date_debut: startDate,
        date_fin: endDate
      });
      
      setPlanningEntries(entries);
    } catch (error) {
      console.error('Erreur chargement planning:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipments();
    loadPlanningEntries();
  }, [currentDate]);

  // Rafraîchissement automatique toutes les 30 secondes
  useAutoRefresh(() => {
    loadEquipments();
    loadPlanningEntries();
  }, [currentDate]);

  const getMonthsInYear = () => {
    const year = currentDate.getFullYear();
    const months = [];
    
    for (let m = 0; m < 12; m++) {
      months.push({
        month: m,
        year: year,
        name: monthNames[m],
        daysInMonth: new Date(year, m + 1, 0).getDate()
      });
    }
    
    return months;
  };

  // Obtenir le statut de l'équipement pour une demi-journée spécifique
  const getEquipmentStatusForHalfDay = (equipmentId, date, isAM) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Chercher une entrée de planning pour cette date et cet équipement
    const entry = planningEntries.find(e => {
      if (e.equipement_id !== equipmentId) return false;
      
      const entryStart = new Date(e.date_debut);
      const entryEnd = new Date(e.date_fin);
      const currentDate = new Date(dateStr);
      
      // Vérifier si la date est dans la plage
      if (currentDate < entryStart || currentDate > entryEnd) return false;
      
      // Vérifier la demi-journée
      if (currentDate.toISOString().split('T')[0] === e.date_debut) {
        // Premier jour
        if (e.periode_debut === 'APRES_MIDI' && isAM) return false;
      }
      
      if (currentDate.toISOString().split('T')[0] === e.date_fin) {
        // Dernier jour
        if (e.periode_fin === 'MATIN' && !isAM) return false;
      }
      
      return true;
    });

    if (entry) {
      return entry.statut || 'EN_MAINTENANCE';
    }

    // Utiliser le statut de l'équipement
    const equipment = equipments.find(e => e.id === equipmentId);
    return equipment?.status || 'OPERATIONAL';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPERATIONAL':
        return '#10b981'; // Vert
      case 'EN_MAINTENANCE':
        return '#f59e0b'; // Orange
      case 'HORS_SERVICE':
        return '#ef4444'; // Rouge
      default:
        return '#9ca3af'; // Gris
    }
  };

  const goToPreviousYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1));
  };

  const goToNextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1));
  };

  const goToCurrentYear = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const months = getMonthsInYear();
  const today = new Date().toISOString().split('T')[0];

  if (loading && equipments.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Chargement du planning...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planning Maintenance Préventive
            </CardTitle>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Demande d'Arrêt
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Navigation année */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" onClick={goToPreviousYear}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">
                Année {currentDate.getFullYear()}
              </h2>
              <Button variant="ghost" size="sm" onClick={goToCurrentYear}>
                Année actuelle
              </Button>
            </div>
            <Button variant="outline" onClick={goToNextYear}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Légende */}
          <div className="flex items-center gap-6 mb-4 p-3 bg-gray-50 rounded">
            <span className="text-sm font-semibold">Légende :</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Opérationnel</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm">En Maintenance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Hors Service</span>
            </div>
            <span className="text-xs text-gray-500 ml-4">• Triangle gauche = Matin (8h-12h) • Triangle droit = Après-midi (13h-17h)</span>
          </div>

          {/* Table planning - Vue annuelle par mois */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-100 sticky left-0 z-10 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Équipement
                    </div>
                  </th>
                  {months.map((monthData, index) => {
                    const isCurrentMonth = monthData.month === new Date().getMonth() && monthData.year === new Date().getFullYear();
                    return (
                      <th
                        key={index}
                        className={`border p-2 text-xs ${
                          isCurrentMonth ? 'bg-blue-100 font-bold' : 'bg-gray-100'
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-semibold">{monthData.name}</div>
                          <div className="text-[10px] text-gray-600">{monthData.year}</div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {equipments.length === 0 ? (
                  <tr>
                    <td colSpan={months.length + 1} className="text-center p-8 text-gray-500">
                      Aucun équipement enregistré
                    </td>
                  </tr>
                ) : (
                  equipments.map(equipment => (
                    <tr key={equipment.id}>
                      <td className="border p-2 font-medium sticky left-0 bg-white z-10">
                        <div>
                          <div className="font-semibold text-sm">{equipment.name || equipment.nom}</div>
                          {(equipment.category || equipment.categorie) && (
                            <div className="text-xs text-gray-500">{equipment.category || equipment.categorie}</div>
                          )}
                        </div>
                      </td>
                      {months.map((monthData, monthIndex) => {
                        // Pour chaque mois, on affiche un résumé visuel
                        // On va afficher une moyenne des statuts du mois
                        const daysInMonth = monthData.daysInMonth;
                        let operationalDays = 0;
                        let maintenanceDays = 0;
                        let outOfServiceDays = 0;
                        
                        // Compter les jours selon leur statut
                        for (let d = 1; d <= daysInMonth; d++) {
                          const date = new Date(monthData.year, monthData.month, d);
                          const statusAM = getEquipmentStatusForHalfDay(equipment.id, date, true);
                          const statusPM = getEquipmentStatusForHalfDay(equipment.id, date, false);
                          
                          if (statusAM === 'OPERATIONAL' && statusPM === 'OPERATIONAL') {
                            operationalDays++;
                          } else if (statusAM === 'EN_MAINTENANCE' || statusPM === 'EN_MAINTENANCE') {
                            maintenanceDays++;
                          } else if (statusAM === 'HORS_SERVICE' || statusPM === 'HORS_SERVICE') {
                            outOfServiceDays++;
                          } else {
                            operationalDays++;
                          }
                        }
                        
                        // Déterminer la couleur dominante
                        let dominantColor = getStatusColor('OPERATIONAL');
                        if (maintenanceDays > operationalDays && maintenanceDays > outOfServiceDays) {
                          dominantColor = getStatusColor('EN_MAINTENANCE');
                        } else if (outOfServiceDays > operationalDays && outOfServiceDays > maintenanceDays) {
                          dominantColor = getStatusColor('HORS_SERVICE');
                        }
                        
                        const isCurrentMonth = monthData.month === new Date().getMonth() && monthData.year === new Date().getFullYear();
                        
                        return (
                          <td
                            key={monthIndex}
                            className={`border p-1 relative ${
                              isCurrentMonth ? 'bg-blue-50' : ''
                            }`}
                            style={{ height: '60px', minWidth: '80px' }}
                          >
                            <div 
                              className="w-full h-full rounded flex flex-col items-center justify-center"
                              style={{ backgroundColor: dominantColor, opacity: 0.8 }}
                            >
                              {maintenanceDays > 0 && (
                                <div className="text-xs text-white font-semibold">
                                  {maintenanceDays}j
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {equipments.filter(e => e.status === 'OPERATIONAL').length}
                </div>
                <div className="text-sm text-gray-600">Équipements opérationnels</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {equipments.filter(e => e.status === 'EN_MAINTENANCE').length}
                </div>
                <div className="text-sm text-gray-600">En maintenance</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {equipments.filter(e => e.status === 'HORS_SERVICE').length}
                </div>
                <div className="text-sm text-gray-600">Hors service</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Demande d'Arrêt */}
      <DemandeArretDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          loadPlanningEntries();
          toast({
            title: 'Succès',
            description: 'Demande d\'arrêt envoyée avec succès'
          });
        }}
      />
    </div>
  );
};

export default PlanningMPrev;
