import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Wrench, Plus } from 'lucide-react';
import { equipmentsAPI, demandesArretAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import DemandeArretDialog from '../components/PlanningMPrev/DemandeArretDialog';

// Couleurs pour les 7 statuts d'équipement
const STATUS_COLORS = {
  OPERATIONNEL: '#22c55e',      // Vert
  EN_FONCTIONNEMENT: '#3b82f6', // Bleu
  A_LARRET: '#f59e0b',          // Orange/Jaune
  EN_MAINTENANCE: '#f97316',    // Orange
  HORS_SERVICE: '#ef4444',      // Rouge
  EN_CT: '#8b5cf6',             // Violet
  ALERTE_S_EQUIP: '#ec4899',    // Rose
};

const STATUS_LABELS = {
  OPERATIONNEL: 'Opérationnel',
  EN_FONCTIONNEMENT: 'En fonctionnement',
  A_LARRET: 'À l\'arrêt',
  EN_MAINTENANCE: 'En maintenance',
  HORS_SERVICE: 'Hors service',
  EN_CT: 'En CT',
  ALERTE_S_EQUIP: 'Alerte S.Équip',
};

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

  // Obtenir les entrées de maintenance pour un équipement et un jour donné
  const getMaintenanceEntriesForDay = (equipmentId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    return planningEntries.filter(e => {
      if (e.equipement_id !== equipmentId) return false;
      
      const entryStart = new Date(e.date_debut);
      const entryEnd = new Date(e.date_fin);
      const currentDate = new Date(dateStr);
      
      // Normaliser les dates pour la comparaison (ignorer l'heure)
      entryStart.setHours(0, 0, 0, 0);
      entryEnd.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);
      
      return currentDate >= entryStart && currentDate <= entryEnd;
    });
  };

  // Calculer la position verticale et hauteur d'un bloc (0h en haut, 24h en bas)
  // Arrondi à l'heure inférieure
  const getMaintenanceBlockStyle = (entry, day) => {
    const dayStr = day.toISOString().split('T')[0];
    const entryStartDate = entry.date_debut;
    const entryEndDate = entry.date_fin;
    
    // Heures par défaut si non spécifiées
    let startHour = 0;
    let endHour = 24;
    
    // Si c'est le premier jour de l'arrêt
    if (dayStr === entryStartDate) {
      if (entry.heure_debut) {
        const [h] = entry.heure_debut.split(':').map(Number);
        startHour = h; // Arrondi à l'heure inférieure (pas de minutes)
      } else if (entry.periode_debut === 'APRES_MIDI') {
        startHour = 12;
      }
    }
    
    // Si c'est le dernier jour de l'arrêt
    if (dayStr === entryEndDate) {
      if (entry.heure_fin) {
        const [h] = entry.heure_fin.split(':').map(Number);
        endHour = h; // Arrondi à l'heure inférieure
      } else if (entry.periode_fin === 'MATIN') {
        endHour = 12;
      }
    }
    
    // Calculer top et height en pourcentage (24h = 100%)
    const top = (startHour / 24) * 100;
    const height = ((endHour - startHour) / 24) * 100;
    
    return { top: `${top}%`, height: `${height}%` };
  };

  // Obtenir la couleur selon le statut de l'équipement ou de l'entrée
  const getStatusColor = (equipment, entry) => {
    // Si l'entrée a un statut spécifique, l'utiliser
    if (entry && entry.statut) {
      return STATUS_COLORS[entry.statut] || STATUS_COLORS.EN_MAINTENANCE;
    }
    // Sinon utiliser le statut actuel de l'équipement
    return STATUS_COLORS[equipment?.statut] || STATUS_COLORS.OPERATIONNEL;
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

  const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  const today = new Date().toISOString().split('T')[0];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculer les statistiques annuelles
  const annualStats = useMemo(() => {
    let totalOperational = 0;
    let totalMaintenance = 0;
    let totalOutOfService = 0;
    let totalHours = 0;
    
    equipments.forEach(equipment => {
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, m, day);
          const entries = getMaintenanceEntriesForDay(equipment.id, date);
          
          // Calculer les heures de maintenance pour ce jour
          let maintenanceHours = 0;
          let outOfServiceHours = 0;
          
          entries.forEach(entry => {
            const style = getMaintenanceBlockStyle(entry, date);
            const heightPercent = parseFloat(style.height) / 100;
            const hours = heightPercent * 24;
            
            if (entry.statut === 'HORS_SERVICE') {
              outOfServiceHours += hours;
            } else {
              maintenanceHours += hours;
            }
          });
          
          maintenanceHours = Math.min(maintenanceHours, 24);
          outOfServiceHours = Math.min(outOfServiceHours, 24 - maintenanceHours);
          const operationalHours = 24 - maintenanceHours - outOfServiceHours;
          
          totalOperational += operationalHours;
          totalMaintenance += maintenanceHours;
          totalOutOfService += outOfServiceHours;
          totalHours += 24;
        }
      }
    });
    
    const operationalPercent = totalHours > 0 ? Math.round((totalOperational / totalHours) * 100) : 100;
    const maintenancePercent = totalHours > 0 ? Math.round((totalMaintenance / totalHours) * 100) : 0;
    const outOfServicePercent = totalHours > 0 ? Math.round((totalOutOfService / totalHours) * 100) : 0;
    
    return {
      operational: Math.round(totalOperational),
      maintenance: Math.round(totalMaintenance),
      outOfService: Math.round(totalOutOfService),
      total: totalHours,
      operationalPercent,
      maintenancePercent,
      outOfServicePercent
    };
  }, [equipments, planningEntries, year]);

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
                  {annualStats.operational}h
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
                  {annualStats.maintenance}h
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
                  {annualStats.outOfService}h
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
          Statistiques annuelles {year} pour <strong>{equipments.length} équipement(s)</strong> (weekends inclus)
        </span>
      </div>

      {/* Navigation mensuelle et Planning */}
      <Card>
        <CardContent className="pt-6">
          {/* Navigation par mois */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4">
              <h2 className={`text-xl font-bold ${isCurrentMonth ? 'text-blue-600' : ''}`}>
                {monthNames[month]} {year}
              </h2>
              <Button variant="ghost" size="sm" onClick={goToCurrentMonth}>
                Mois actuel
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Légende des statuts */}
          <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 rounded">
            <span className="text-sm font-semibold">Légende :</span>
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs">{STATUS_LABELS[status]}</span>
              </div>
            ))}
          </div>

          {/* Grille du planning - Style similaire à Planning.jsx */}
          <div className="border rounded-lg overflow-hidden select-none" data-testid="planning-mprev-grid">
            {/* En-tête des jours */}
            <div 
              className="grid bg-gray-100 border-b" 
              style={{ gridTemplateColumns: `180px repeat(${days.length}, 1fr)` }}
            >
              <div className="p-2 font-semibold text-sm text-gray-700 border-r flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Équipement
              </div>
              {days.map((day, index) => {
                const isToday = day.toISOString().split('T')[0] === today;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={index}
                    className={`p-1 text-center border-r last:border-r-0 ${
                      isToday ? 'bg-blue-200 border-2 border-blue-500' : isWeekend ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className={`text-[10px] ${isWeekend ? 'text-blue-600' : 'text-gray-500'}`}>
                      {dayNames[day.getDay()]}
                    </div>
                    <div className={`text-xs font-semibold ${isToday ? 'text-blue-600' : ''}`}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Corps - Équipements */}
            {equipments.map((equipment) => (
              <div 
                key={equipment.id} 
                className="grid border-b last:border-b-0"
                style={{ gridTemplateColumns: `180px repeat(${days.length}, 1fr)` }}
              >
                {/* Nom de l'équipement */}
                <div className="p-2 bg-white border-r font-medium flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[equipment.statut] || STATUS_COLORS.OPERATIONNEL }}
                  />
                  <span className="truncate text-sm" title={equipment.nom}>
                    {equipment.nom}
                  </span>
                </div>
                
                {/* Cellules des jours */}
                {days.map((day, dayIndex) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const maintenanceEntries = getMaintenanceEntriesForDay(equipment.id, day);
                  const baseColor = STATUS_COLORS[equipment.statut] || STATUS_COLORS.OPERATIONNEL;
                  
                  return (
                    <div 
                      key={dayIndex} 
                      className={`border-r last:border-r-0 ${isWeekend ? 'bg-blue-50/30' : ''}`}
                    >
                      {/* Cellule 24h verticale (0h en haut, 24h en bas) */}
                      <div 
                        className="relative h-10 w-full"
                        style={{ backgroundColor: baseColor }}
                      >
                        {/* Trait horizontal à 12h (50%) */}
                        <div 
                          className="absolute left-0 right-0 h-px opacity-30"
                          style={{ top: '50%', backgroundColor: '#000' }}
                        />
                        
                        {/* Blocs de maintenance superposés */}
                        {maintenanceEntries.map((entry, idx) => {
                          const style = getMaintenanceBlockStyle(entry, day);
                          const entryColor = STATUS_COLORS[entry.statut] || STATUS_COLORS.EN_MAINTENANCE;
                          return (
                            <div
                              key={idx}
                              className="absolute left-0 right-0 cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                top: style.top,
                                height: style.height,
                                backgroundColor: entryColor,
                              }}
                              title={`${entry.motif || 'Maintenance'}\nStatut: ${STATUS_LABELS[entry.statut] || 'En maintenance'}\n${entry.heure_debut || '00:00'} - ${entry.heure_fin || '24:00'}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
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
