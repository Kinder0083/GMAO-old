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
      const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
      const endDate = new Date(year, 11, 31).toISOString().split('T')[0];
      
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
  }, [currentDate.getFullYear()]);

  // Rafraîchissement automatique toutes les 30 secondes
  useAutoRefresh(() => {
    loadEquipments();
    loadPlanningEntries();
  }, [currentDate]);

  // Obtenir tous les jours d'un mois spécifique
  const getDaysInMonth = (year, month) => {
    const days = [];
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  // Obtenir le statut de l'équipement pour une demi-journée spécifique
  const getEquipmentStatusForHalfDay = (equipmentId, date, isAM) => {
    const dateStr = date.toISOString().split('T')[0];
    
    const entry = planningEntries.find(e => {
      if (e.equipement_id !== equipmentId) return false;
      
      const entryStart = new Date(e.date_debut);
      const entryEnd = new Date(e.date_fin);
      const currentDate = new Date(dateStr);
      
      if (currentDate < entryStart || currentDate > entryEnd) return false;
      
      // Vérifier la demi-journée pour le premier jour
      if (currentDate.toISOString().split('T')[0] === e.date_debut) {
        if (e.periode_debut === 'APRES_MIDI' && isAM) return false;
      }
      
      // Vérifier la demi-journée pour le dernier jour
      if (currentDate.toISOString().split('T')[0] === e.date_fin) {
        if (e.periode_fin === 'MATIN' && !isAM) return false;
      }
      
      return true;
    });

    if (entry) {
      return entry.statut || 'EN_MAINTENANCE';
    }

    const equipment = equipments.find(e => e.id === equipmentId);
    return equipment?.status || equipment?.statut || 'OPERATIONNEL';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPERATIONNEL':
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

  // Navigation par mois
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const today = new Date().toISOString().split('T')[0];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculer les statistiques annuelles (en excluant les weekends)
  const calculateAnnualStats = () => {
    let totalOperational = 0;
    let totalMaintenance = 0;
    let totalOutOfService = 0;
    let totalHalfDays = 0;
    
    equipments.forEach(equipment => {
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, m, day);
          const dayOfWeek = date.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;
          
          const statusAM = getEquipmentStatusForHalfDay(equipment.id, date, true);
          const statusPM = getEquipmentStatusForHalfDay(equipment.id, date, false);
          
          [statusAM, statusPM].forEach(status => {
            totalHalfDays++;
            if (status === 'OPERATIONNEL' || status === 'OPERATIONAL') {
              totalOperational++;
            } else if (status === 'EN_MAINTENANCE') {
              totalMaintenance++;
            } else if (status === 'HORS_SERVICE') {
              totalOutOfService++;
            }
          });
        }
      }
    });
    
    const operationalPercent = totalHalfDays > 0 ? Math.round((totalOperational / totalHalfDays) * 100) : 0;
    const maintenancePercent = totalHalfDays > 0 ? Math.round((totalMaintenance / totalHalfDays) * 100) : 0;
    const outOfServicePercent = totalHalfDays > 0 ? Math.round((totalOutOfService / totalHalfDays) * 100) : 0;
    
    return {
      operational: totalOperational,
      maintenance: totalMaintenance,
      outOfService: totalOutOfService,
      total: totalHalfDays,
      operationalPercent,
      maintenancePercent,
      outOfServicePercent
    };
  };

  const annualStats = calculateAnnualStats();

  // Jours du mois actuel
  const days = getDaysInMonth(year, month);
  const isCurrentMonth = month === new Date().getMonth() && year === new Date().getFullYear();

  if (loading && equipments.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Chargement du planning...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
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
      </Card>

      {/* Statistiques annuelles */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-green-700">
                  {annualStats.operationalPercent}%
                </div>
                <div className="text-sm text-green-600 font-medium mt-1">Opérationnel</div>
                <div className="text-xs text-green-500 mt-1">
                  {annualStats.operational} demi-journées
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-white text-xl">✓</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-orange-700">
                  {annualStats.maintenancePercent}%
                </div>
                <div className="text-sm text-orange-600 font-medium mt-1">En Maintenance</div>
                <div className="text-xs text-orange-500 mt-1">
                  {annualStats.maintenance} demi-journées
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-red-700">
                  {annualStats.outOfServicePercent}%
                </div>
                <div className="text-sm text-red-600 font-medium mt-1">Hors Service</div>
                <div className="text-xs text-red-500 mt-1">
                  {annualStats.outOfService} demi-journées
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-white text-xl">✕</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Info statistiques */}
      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        <span>
          Statistiques annuelles {year} : <strong>{annualStats.total} demi-journées</strong> (hors weekends) pour <strong>{equipments.length} équipement(s)</strong>
        </span>
      </div>

      {/* Navigation mensuelle et Planning */}
      <Card>
        <CardContent className="pt-6">
          {/* Navigation par mois */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <Button variant="outline" size="lg" onClick={goToPreviousMonth} className="gap-2">
              <ChevronLeft className="h-5 w-5" />
              Mois précédent
            </Button>
            <div className="flex items-center gap-4">
              <h2 className={`text-2xl font-bold ${isCurrentMonth ? 'text-blue-600' : ''}`}>
                {monthNames[month]} {year}
              </h2>
              <Button variant="ghost" size="sm" onClick={goToCurrentMonth}>
                Mois actuel
              </Button>
            </div>
            <Button variant="outline" size="lg" onClick={goToNextMonth} className="gap-2">
              Mois suivant
              <ChevronRight className="h-5 w-5" />
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

          {/* Planning du mois */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-max">
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-100 sticky left-0 z-10 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Équipement
                    </div>
                  </th>
                  {days.map((day, dayIndex) => {
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isToday = day.toISOString().split('T')[0] === today;
                    return (
                      <th 
                        key={dayIndex} 
                        className={`border p-1 text-center min-w-[40px] ${
                          isWeekend ? 'bg-gray-200 text-gray-400' : 'bg-gray-100'
                        } ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                      >
                        <div className="text-xs font-normal text-gray-500">{dayNames[day.getDay()]}</div>
                        <div className={`text-sm font-bold ${isToday ? 'text-blue-600' : ''}`}>
                          {day.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {equipments.map((equipment) => (
                  <tr key={equipment.id}>
                    <td className="border p-2 bg-white sticky left-0 z-10 font-medium">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getStatusColor(equipment.status || equipment.statut) }}
                        />
                        <span className="truncate max-w-[150px]" title={equipment.nom}>
                          {equipment.nom}
                        </span>
                      </div>
                    </td>
                    {days.map((day, dayIndex) => {
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const isToday = day.toISOString().split('T')[0] === today;
                      
                      if (isWeekend) {
                        return (
                          <td 
                            key={dayIndex} 
                            className="border p-0 bg-gray-100"
                          >
                            <div className="h-8 w-full"></div>
                          </td>
                        );
                      }
                      
                      const statusAM = getEquipmentStatusForHalfDay(equipment.id, day, true);
                      const statusPM = getEquipmentStatusForHalfDay(equipment.id, day, false);
                      
                      return (
                        <td 
                          key={dayIndex} 
                          className={`border p-0 ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
                        >
                          <div className="flex h-8 w-full">
                            {/* Triangle Matin (gauche) */}
                            <svg viewBox="0 0 20 20" className="w-1/2 h-full">
                              <polygon 
                                points="0,0 20,0 0,20" 
                                fill={getStatusColor(statusAM)}
                              />
                            </svg>
                            {/* Triangle Après-midi (droite) */}
                            <svg viewBox="0 0 20 20" className="w-1/2 h-full">
                              <polygon 
                                points="0,0 20,0 20,20" 
                                fill={getStatusColor(statusPM)}
                              />
                            </svg>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Message si pas d'équipements */}
          {equipments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun équipement trouvé</p>
              <p className="text-sm">Ajoutez des équipements pour voir le planning</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de demande d'arrêt */}
      <DemandeArretDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        equipments={equipments}
        onSuccess={() => {
          loadPlanningEntries();
          setDialogOpen(false);
        }}
      />
    </div>
  );
};

export default PlanningMPrev;
