import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, UserCheck, UserX, Users, Wifi, WifiOff } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';
import { usePlanning } from '../hooks/usePlanning';
import { getBackendURL } from '../utils/config';

// Composant pour une cellule régime Journée (case pleine)
const JourneeCell = ({ value, onClick, isToday, isWeekend }) => {
  const bgColor = value === true ? 'bg-green-500' : value === false ? 'bg-red-500' : 'bg-white';
  const borderColor = value === null ? 'border-gray-300' : 'border-transparent';
  
  return (
    <div
      className={`w-7 h-7 rounded cursor-pointer hover:opacity-80 transition-opacity ${bgColor} border ${borderColor}`}
      onClick={onClick}
      title={value === true ? 'Disponible' : value === false ? 'Indisponible' : 'Non défini'}
    />
  );
};

// Composant pour une cellule régime 2*8 (2 parties horizontales)
const DeuxHuitCell = ({ valueMatin, valueAprem, onClickMatin, onClickAprem, isToday, isWeekend }) => {
  const bgMatin = valueMatin === true ? 'bg-green-500' : valueMatin === false ? 'bg-red-500' : 'bg-white';
  const bgAprem = valueAprem === true ? 'bg-green-500' : valueAprem === false ? 'bg-red-500' : 'bg-white';
  const borderMatin = valueMatin === null ? 'border-gray-300' : 'border-transparent';
  const borderAprem = valueAprem === null ? 'border-gray-300' : 'border-transparent';
  
  return (
    <div className="w-7 h-7 flex flex-col gap-[1px]">
      <div
        className={`flex-1 rounded-t cursor-pointer hover:opacity-80 transition-opacity ${bgMatin} border-t border-l border-r ${borderMatin}`}
        onClick={onClickMatin}
        title={`Matin: ${valueMatin === true ? 'Disponible' : valueMatin === false ? 'Indisponible' : 'Non défini'}`}
      />
      <div
        className={`flex-1 rounded-b cursor-pointer hover:opacity-80 transition-opacity ${bgAprem} border-b border-l border-r ${borderAprem}`}
        onClick={onClickAprem}
        title={`Après-midi: ${valueAprem === true ? 'Disponible' : valueAprem === false ? 'Indisponible' : 'Non défini'}`}
      />
    </div>
  );
};

// Composant pour une cellule régime 3*8 (3 secteurs à 120°)
const TroisHuitCell = ({ valueMatin, valueAprem, valueNuit, onClickMatin, onClickAprem, onClickNuit }) => {
  const colorMatin = valueMatin === true ? '#22c55e' : valueMatin === false ? '#ef4444' : '#ffffff';
  const colorAprem = valueAprem === true ? '#22c55e' : valueAprem === false ? '#ef4444' : '#ffffff';
  const colorNuit = valueNuit === true ? '#22c55e' : valueNuit === false ? '#ef4444' : '#ffffff';
  const strokeMatin = valueMatin === null ? '#d1d5db' : 'transparent';
  const strokeAprem = valueAprem === null ? '#d1d5db' : 'transparent';
  const strokeNuit = valueNuit === null ? '#d1d5db' : 'transparent';
  
  // Calcul des points pour les 3 secteurs à 120°
  // Centre: 14, 14 - Rayon: 13 (pour SVG 28x28)
  const cx = 14, cy = 14, r = 13;
  
  const getPoint = (angle) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  };
  
  // Points pour les secteurs
  const p1 = getPoint(-120); // Point entre Matin et Nuit (haut gauche)
  const p2 = getPoint(0);    // Point entre Matin et Aprem (haut droite)
  const p3 = getPoint(120);  // Point entre Aprem et Nuit (bas)
  
  // Paths pour les secteurs
  const pathMatin = `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y} Z`;
  const pathAprem = `M ${cx} ${cy} L ${p2.x} ${p2.y} A ${r} ${r} 0 0 1 ${p3.x} ${p3.y} Z`;
  const pathNuit = `M ${cx} ${cy} L ${p3.x} ${p3.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y} Z`;
  
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="cursor-pointer">
      <path
        d={pathMatin}
        fill={colorMatin}
        stroke={strokeMatin}
        strokeWidth="1"
        onClick={onClickMatin}
        className="hover:opacity-80 transition-opacity"
      >
        <title>Matin: {valueMatin === true ? 'Disponible' : valueMatin === false ? 'Indisponible' : 'Non défini'}</title>
      </path>
      <path
        d={pathAprem}
        fill={colorAprem}
        stroke={strokeAprem}
        strokeWidth="1"
        onClick={onClickAprem}
        className="hover:opacity-80 transition-opacity"
      >
        <title>Après-midi: {valueAprem === true ? 'Disponible' : valueAprem === false ? 'Indisponible' : 'Non défini'}</title>
      </path>
      <path
        d={pathNuit}
        fill={colorNuit}
        stroke={strokeNuit}
        strokeWidth="1"
        onClick={onClickNuit}
        className="hover:opacity-80 transition-opacity"
      >
        <title>Nuit: {valueNuit === true ? 'Disponible' : valueNuit === false ? 'Indisponible' : 'Non défini'}</title>
      </path>
    </svg>
  );
};

const Planning = () => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedServices, setExpandedServices] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState(null);
  const dragRef = useRef({ userId: null, startDay: null, startAvail: null });

  // Hook WebSocket pour les données temps réel
  const { 
    users, 
    availabilities, 
    loading, 
    wsConnected,
    refreshAvailabilities 
  } = usePlanning(currentDate);

  const backend_url = getBackendURL();
  const token = localStorage.getItem('token');

  // Fonction pour obtenir la disponibilité d'un utilisateur pour une date
  const getAvailability = useCallback((userId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    return availabilities.find(
      a => a.user_id === userId && a.date.split('T')[0] === dateStr
    );
  }, [availabilities]);

  // Fonction pour basculer la valeur en cycle : Blanc → Vert → Rouge → Blanc
  const cycleValue = (currentValue) => {
    // Blanc (null/undefined) → Vert (true)
    if (currentValue === null || currentValue === undefined) return true;
    // Vert (true) → Rouge (false)
    if (currentValue === true) return false;
    // Rouge (false) → Blanc (null)
    return null;
  };

  // Fonction pour mettre à jour/créer une disponibilité
  const updateAvailability = async (userId, date, field, value, skipRefresh = false) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const existing = getAvailability(userId, date);

      if (existing) {
        await axios.put(
          `${backend_url}/api/availabilities/${existing.id}`,
          { [field]: value },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        const newAvail = {
          user_id: userId,
          date: date.toISOString(),
          [field]: value
        };
        await axios.post(
          `${backend_url}/api/availabilities`,
          newAvail,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Ne pas rafraîchir pendant le drag pour éviter les conflits
      if (!skipRefresh) {
        refreshAvailabilities();
      }
    } catch (error) {
      console.error('Erreur mise à jour disponibilité:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la disponibilité',
        variant: 'destructive'
      });
    }
  };

  // Gestionnaire de clic pour régime Journée
  const handleJourneeClick = async (userId, date, e) => {
    e.stopPropagation();
    const avail = getAvailability(userId, date);
    const currentValue = avail?.disponible;
    const newValue = cycleValue(currentValue);
    await updateAvailability(userId, date, 'disponible', newValue);
  };

  // Gestionnaires de clic pour régime 2*8
  const handleDeuxHuitClickMatin = async (userId, date, e) => {
    e.stopPropagation();
    const avail = getAvailability(userId, date);
    const currentValue = avail?.disponible_matin;
    const newValue = cycleValue(currentValue);
    await updateAvailability(userId, date, 'disponible_matin', newValue);
  };

  const handleDeuxHuitClickAprem = async (userId, date, e) => {
    e.stopPropagation();
    const avail = getAvailability(userId, date);
    const currentValue = avail?.disponible_aprem;
    const newValue = cycleValue(currentValue);
    await updateAvailability(userId, date, 'disponible_aprem', newValue);
  };

  // Gestionnaires de clic pour régime 3*8
  const handleTroisHuitClickMatin = async (userId, date, e) => {
    e.stopPropagation();
    const avail = getAvailability(userId, date);
    const currentValue = avail?.disponible_matin;
    const newValue = cycleValue(currentValue);
    await updateAvailability(userId, date, 'disponible_matin', newValue);
  };

  const handleTroisHuitClickAprem = async (userId, date, e) => {
    e.stopPropagation();
    const avail = getAvailability(userId, date);
    const currentValue = avail?.disponible_aprem;
    const newValue = cycleValue(currentValue);
    await updateAvailability(userId, date, 'disponible_aprem', newValue);
  };

  const handleTroisHuitClickNuit = async (userId, date, e) => {
    e.stopPropagation();
    const avail = getAvailability(userId, date);
    const currentValue = avail?.disponible_nuit;
    const newValue = cycleValue(currentValue);
    await updateAvailability(userId, date, 'disponible_nuit', newValue);
  };

  // Drag to copy - début
  const handleDragStart = (userId, dayIndex, user) => {
    const avail = getAvailability(userId, days[dayIndex]);
    setIsDragging(true);
    setDragStartCell({ userId, dayIndex });
    dragRef.current = {
      userId,
      startDay: dayIndex,
      regime: user.regime || 'Journée',
      startAvail: avail ? { ...avail } : null
    };
  };

  // Drag to copy - pendant
  const handleDragEnter = async (userId, dayIndex) => {
    if (!isDragging || !dragRef.current.userId) return;
    if (dragRef.current.userId !== userId) return;
    if (dayIndex <= dragRef.current.startDay) return;

    // Copier la disponibilité de la cellule source vers la cellule cible
    const sourceAvail = dragRef.current.startAvail;
    const targetDate = days[dayIndex];
    const regime = dragRef.current.regime;

    try {
      // skipRefresh = true pour éviter les conflits pendant le drag
      if (regime === 'Journée') {
        await updateAvailability(userId, targetDate, 'disponible', sourceAvail?.disponible ?? null, true);
      } else if (regime === '2*8') {
        if (sourceAvail?.disponible_matin !== undefined) {
          await updateAvailability(userId, targetDate, 'disponible_matin', sourceAvail.disponible_matin, true);
        }
        if (sourceAvail?.disponible_aprem !== undefined) {
          await updateAvailability(userId, targetDate, 'disponible_aprem', sourceAvail.disponible_aprem, true);
        }
      } else if (regime === '3*8') {
        if (sourceAvail?.disponible_matin !== undefined) {
          await updateAvailability(userId, targetDate, 'disponible_matin', sourceAvail.disponible_matin, true);
        }
        if (sourceAvail?.disponible_aprem !== undefined) {
          await updateAvailability(userId, targetDate, 'disponible_aprem', sourceAvail.disponible_aprem, true);
        }
        if (sourceAvail?.disponible_nuit !== undefined) {
          await updateAvailability(userId, targetDate, 'disponible_nuit', sourceAvail.disponible_nuit, true);
        }
      }
    } catch (error) {
      console.error('Erreur copie:', error);
    }
  };

  // Drag to copy - fin
  const handleDragEnd = () => {
    // Rafraîchir les données une seule fois à la fin du drag
    if (isDragging) {
      refreshAvailabilities();
    }
    setIsDragging(false);
    setDragStartCell(null);
    dragRef.current = { userId: null, startDay: null, startAvail: null };
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const daysArray = [];

    for (let d = 1; d <= lastDay.getDate(); d++) {
      daysArray.push(new Date(year, month, d));
    }

    return daysArray;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const toggleService = (service) => {
    setExpandedServices(prev => ({
      ...prev,
      [service]: !prev[service]
    }));
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  const days = getDaysInMonth();
  const today = new Date().toISOString().split('T')[0];

  // Grouper les utilisateurs par service
  const usersByService = useMemo(() => {
    const grouped = {};
    users.forEach(user => {
      const service = user.service || 'Sans service';
      if (!grouped[service]) {
        grouped[service] = [];
      }
      grouped[service].push(user);
    });
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'Sans service') return 1;
      if (b === 'Sans service') return -1;
      return a.localeCompare(b);
    });
    const sortedGrouped = {};
    sortedKeys.forEach(key => {
      sortedGrouped[key] = grouped[key];
    });
    return sortedGrouped;
  }, [users]);

  // Calculer les stats globales
  const getGlobalStats = () => {
    let available = 0;
    let unavailable = 0;
    
    users.forEach(user => {
      const avail = getAvailability(user.id, new Date());
      const regime = user.regime || 'Journée';
      
      if (regime === 'Journée') {
        if (avail?.disponible === true) available++;
        else if (avail?.disponible === false) unavailable++;
      } else if (regime === '2*8') {
        // Compter comme disponible si au moins une partie est disponible
        if (avail?.disponible_matin === true || avail?.disponible_aprem === true) available++;
        else if (avail?.disponible_matin === false && avail?.disponible_aprem === false) unavailable++;
      } else if (regime === '3*8') {
        if (avail?.disponible_matin === true || avail?.disponible_aprem === true || avail?.disponible_nuit === true) available++;
        else if (avail?.disponible_matin === false && avail?.disponible_aprem === false && avail?.disponible_nuit === false) unavailable++;
      }
    });
    
    return { available, unavailable };
  };

  const stats = getGlobalStats();

  // Rendu d'une cellule selon le régime
  const renderCell = (user, day, dayIndex) => {
    const regime = user.regime || 'Journée';
    const avail = getAvailability(user.id, day);
    const isToday = day.toISOString().split('T')[0] === today;
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

    if (regime === 'Journée') {
      return (
        <JourneeCell
          value={avail?.disponible ?? null}
          onClick={(e) => handleJourneeClick(user.id, day, e)}
          isToday={isToday}
          isWeekend={isWeekend}
        />
      );
    } else if (regime === '2*8') {
      return (
        <DeuxHuitCell
          valueMatin={avail?.disponible_matin ?? null}
          valueAprem={avail?.disponible_aprem ?? null}
          onClickMatin={(e) => handleDeuxHuitClickMatin(user.id, day, e)}
          onClickAprem={(e) => handleDeuxHuitClickAprem(user.id, day, e)}
          isToday={isToday}
          isWeekend={isWeekend}
        />
      );
    } else if (regime === '3*8') {
      return (
        <TroisHuitCell
          valueMatin={avail?.disponible_matin ?? null}
          valueAprem={avail?.disponible_aprem ?? null}
          valueNuit={avail?.disponible_nuit ?? null}
          onClickMatin={(e) => handleTroisHuitClickMatin(user.id, day, e)}
          onClickAprem={(e) => handleTroisHuitClickAprem(user.id, day, e)}
          onClickNuit={(e) => handleTroisHuitClickNuit(user.id, day, e)}
        />
      );
    }
  };

  // Obtenir le badge du régime
  const getRegimeBadge = (regime) => {
    if (regime === '2*8') return <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded">2×8</span>;
    if (regime === '3*8') return <span className="text-[9px] bg-orange-100 text-orange-700 px-1 rounded">3×8</span>;
    return null;
  };

  return (
    <div className="space-y-4" onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" data-testid="planning-title">Planning du Personnel</h1>
          <p className="text-gray-600 text-sm flex items-center gap-2">
            Gérez la disponibilité de votre équipe
            {wsConnected ? (
              <span className="flex items-center gap-1 text-green-600 text-xs">
                <Wifi size={12} />
                Temps réel
              </span>
            ) : (
              <span className="flex items-center gap-1 text-orange-500 text-xs">
                <WifiOff size={12} />
                Hors ligne
              </span>
            )}
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={goToToday} data-testid="today-btn">
          <Calendar size={18} className="mr-2" />
          Aujourd'hui
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          {/* Navigation du mois */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth} data-testid="prev-month-btn">
              <ChevronLeft size={18} />
            </Button>
            <h2 className="text-xl font-bold text-gray-900" data-testid="current-month">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button variant="outline" size="sm" onClick={goToNextMonth} data-testid="next-month-btn">
              <ChevronRight size={18} />
            </Button>
          </div>

          {/* Stats globales */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Personnel total</p>
                  <p className="text-xl font-bold text-blue-700">{users.length}</p>
                </div>
                <Users size={24} className="text-blue-600" />
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Disponibles aujourd'hui</p>
                  <p className="text-xl font-bold text-green-700">{stats.available}</p>
                </div>
                <UserCheck size={24} className="text-green-600" />
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Indisponibles</p>
                  <p className="text-xl font-bold text-red-700">{stats.unavailable}</p>
                </div>
                <UserX size={24} className="text-red-600" />
              </div>
            </div>
          </div>

          {/* Grille du calendrier */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden select-none" data-testid="planning-grid">
              {/* En-tête des jours */}
              <div className="grid bg-gray-100 border-b" style={{ gridTemplateColumns: '180px repeat(' + days.length + ', 1fr)' }}>
                <div className="p-2 font-semibold text-sm text-gray-700 border-r sticky left-0 bg-gray-100 z-10">
                  Personnel
                </div>
                {days.map((day, index) => {
                  const isToday = day.toISOString().split('T')[0] === today;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={index}
                      className={`p-1 text-center border-r last:border-r-0 ${
                        isToday ? 'bg-blue-200' : isWeekend ? 'bg-gray-200' : ''
                      }`}
                    >
                      <div className="text-[10px] text-gray-500">{dayNames[day.getDay()]}</div>
                      <div className="text-xs font-semibold">{day.getDate()}</div>
                    </div>
                  );
                })}
              </div>

              {/* Corps - Services et utilisateurs */}
              {Object.entries(usersByService).map(([service, serviceUsers]) => {
                const isExpanded = expandedServices[service] === true;
                
                return (
                  <div key={service} data-testid={`service-section-${service}`}>
                    {/* En-tête du service */}
                    <div 
                      className="grid bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                      style={{ gridTemplateColumns: '180px 1fr' }}
                      onClick={() => toggleService(service)}
                      data-testid={`service-header-${service}`}
                    >
                      <div className="p-2 flex items-center gap-2 border-r sticky left-0 bg-gray-50 z-10">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        <span className="font-semibold text-sm text-gray-800 truncate">{service}</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          ({serviceUsers.length})
                        </span>
                      </div>
                      <div className="flex items-center px-2 text-xs text-gray-500">
                        Cliquez pour {isExpanded ? 'replier' : 'déplier'}
                      </div>
                    </div>

                    {/* Lignes des utilisateurs */}
                    {isExpanded && serviceUsers.map(user => (
                      <div 
                        key={user.id} 
                        className="grid border-b last:border-b-0"
                        style={{ gridTemplateColumns: '180px repeat(' + days.length + ', 1fr)' }}
                        data-testid={`user-row-${user.id}`}
                      >
                        <div className="p-2 bg-white border-r sticky left-0 z-10 flex items-center gap-1">
                          <div className="font-medium text-sm truncate flex-1">{user.prenom} {user.nom}</div>
                          {getRegimeBadge(user.regime)}
                        </div>
                        {days.map((day, dayIndex) => {
                          const isToday = day.toISOString().split('T')[0] === today;
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          const isDragTarget = isDragging && dragStartCell?.userId === user.id && dayIndex > dragStartCell.dayIndex;
                          
                          return (
                            <div
                              key={dayIndex}
                              className={`flex items-center justify-center border-r last:border-r-0 p-1 ${
                                isToday ? 'bg-blue-50' : isWeekend ? 'bg-gray-50' : 'bg-white'
                              } ${isDragTarget ? 'bg-yellow-50' : ''}`}
                              onMouseDown={() => handleDragStart(user.id, dayIndex, user)}
                              onMouseEnter={() => handleDragEnter(user.id, dayIndex)}
                              data-testid={`availability-cell-${user.id}-${day.getDate()}`}
                            >
                              {renderCell(user, day, dayIndex)}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Légende */}
          <div className="mt-3 text-sm text-gray-600 space-y-2">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-green-500" />
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-red-500" />
                <span>Indisponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-white border border-gray-300" />
                <span>Non défini</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>• <strong>Clic</strong> : Basculer la disponibilité (Non défini → Disponible → Indisponible → Non défini)</p>
              <p>• <strong>Glisser vers la droite</strong> : Copier la cellule sur les jours suivants</p>
              <p>• <strong>Régimes</strong> : Journée (case pleine), 2×8 (2 parties), 3×8 (3 secteurs)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Planning;
