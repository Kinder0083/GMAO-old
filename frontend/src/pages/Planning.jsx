import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, UserCheck, UserX, Users } from 'lucide-react';
import { usersAPI } from '../services/api';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { getBackendURL } from '../utils/config';

const Planning = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [expandedServices, setExpandedServices] = useState({});

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      const newUsers = response.data.filter(u => u.email !== 'buenogy@gmail.com');
      
      if (JSON.stringify(newUsers) !== JSON.stringify(users)) {
        setUsers(newUsers);
        // Initialiser tous les services comme dépliés
        const services = [...new Set(newUsers.map(u => u.service || 'Sans service'))];
        const initialExpanded = {};
        services.forEach(s => {
          if (expandedServices[s] === undefined) {
            initialExpanded[s] = true;
          } else {
            initialExpanded[s] = expandedServices[s];
          }
        });
        setExpandedServices(prev => ({ ...initialExpanded, ...prev }));
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs',
        variant: 'destructive'
      });
    }
  };

  const loadAvailabilities = async () => {
    try {
      if (initialLoad) {
        setLoading(true);
      }
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const backend_url = getBackendURL();
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${backend_url}/api/availabilities`, {
        params: {
          start_date: startOfMonth.toISOString(),
          end_date: endOfMonth.toISOString()
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const newAvailabilities = response.data;
      if (JSON.stringify(newAvailabilities) !== JSON.stringify(availabilities)) {
        setAvailabilities(newAvailabilities);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
    } finally {
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    loadUsers();
    loadAvailabilities();
  }, [currentDate]);
  
  useAutoRefresh(() => {
    loadUsers();
    loadAvailabilities();
  }, [currentDate]);

  const toggleAvailability = async (userId, date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const existing = availabilities.find(
        a => a.user_id === userId && a.date.split('T')[0] === dateStr
      );

      const backend_url = getBackendURL();
      const token = localStorage.getItem('token');

      if (existing) {
        await axios.put(
          `${backend_url}/api/availabilities/${existing.id}`,
          { disponible: !existing.disponible },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${backend_url}/api/availabilities`,
          {
            user_id: userId,
            date: date.toISOString(),
            disponible: false
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      loadAvailabilities();
      toast({
        title: 'Succès',
        description: 'Disponibilité mise à jour'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la disponibilité',
        variant: 'destructive'
      });
    }
  };

  const isAvailable = (userId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    const avail = availabilities.find(
      a => a.user_id === userId && a.date.split('T')[0] === dateStr
    );
    return avail ? avail.disponible : true;
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
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
    // Trier les services alphabétiquement, mais mettre "Sans service" à la fin
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

  // Calculer les stats par service
  const getServiceStats = (serviceUsers) => {
    const available = serviceUsers.filter(u => isAvailable(u.id, new Date())).length;
    return { total: serviceUsers.length, available, unavailable: serviceUsers.length - available };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" data-testid="planning-title">Planning du Personnel</h1>
          <p className="text-gray-600 text-sm">Gérez la disponibilité de votre équipe</p>
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
                  <p className="text-xl font-bold text-green-700">
                    {users.filter(u => isAvailable(u.id, new Date())).length}
                  </p>
                </div>
                <UserCheck size={24} className="text-green-600" />
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Indisponibles</p>
                  <p className="text-xl font-bold text-red-700">
                    {users.filter(u => !isAvailable(u.id, new Date())).length}
                  </p>
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
            <div className="border rounded-lg overflow-hidden" data-testid="planning-grid">
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
                const stats = getServiceStats(serviceUsers);
                const isExpanded = expandedServices[service] !== false;
                
                return (
                  <div key={service} data-testid={`service-section-${service}`}>
                    {/* En-tête du service (cliquable) */}
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
                          ({stats.available}/{stats.total})
                        </span>
                      </div>
                      <div className="flex items-center px-2 text-xs text-gray-500">
                        <span className="text-green-600 mr-3">✓ {stats.available}</span>
                        <span className="text-red-600">✗ {stats.unavailable}</span>
                      </div>
                    </div>

                    {/* Lignes des utilisateurs du service */}
                    {isExpanded && serviceUsers.map(user => (
                      <div 
                        key={user.id} 
                        className="grid border-b last:border-b-0"
                        style={{ gridTemplateColumns: '180px repeat(' + days.length + ', 1fr)' }}
                        data-testid={`user-row-${user.id}`}
                      >
                        <div className="p-2 bg-white border-r sticky left-0 z-10">
                          <div className="font-medium text-sm truncate">{user.prenom} {user.nom}</div>
                        </div>
                        {days.map((day, index) => {
                          const available = isAvailable(user.id, day);
                          const isToday = day.toISOString().split('T')[0] === today;
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          return (
                            <div
                              key={index}
                              className={`flex items-center justify-center border-r last:border-r-0 cursor-pointer hover:opacity-80 transition-opacity ${
                                isToday ? 'bg-blue-50' : isWeekend ? 'bg-gray-50' : 'bg-white'
                              }`}
                              onClick={() => toggleAvailability(user.id, day)}
                              data-testid={`availability-cell-${user.id}-${day.getDate()}`}
                            >
                              {available ? (
                                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                  <span className="text-white text-[10px]">✓</span>
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                                  <span className="text-white text-[10px]">✗</span>
                                </div>
                              )}
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

          <div className="mt-3 text-sm text-gray-600 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-white text-[10px]">✓</span>
              </div>
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-white text-[10px]">✗</span>
              </div>
              <span>Indisponible</span>
            </div>
            <span className="text-gray-500">• Cliquez sur une cellule pour changer la disponibilité</span>
            <span className="text-gray-500">• Cliquez sur un service pour le plier/déplier</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Planning;
