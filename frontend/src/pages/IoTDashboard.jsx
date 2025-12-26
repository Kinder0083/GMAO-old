import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Thermometer,
  Zap,
  Droplet,
  Gauge as GaugeIcon,
  RefreshCw
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import { useSensors } from '../hooks/useSensors';

const IoTDashboard = () => {
  const [sensorReadings, setSensorReadings] = useState({});
  const [statistics, setStatistics] = useState({});
  const [groupsByType, setGroupsByType] = useState([]);
  const [groupsByLocation, setGroupsByLocation] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24); // heures
  const [activeTab, setActiveTab] = useState('overview'); // overview, groups-type, groups-location

  // Utiliser le hook temps réel pour les capteurs
  const { sensors: realtimeSensors, loading: loadingSensors, refresh: refreshSensors } = useSensors();

  // Charger les données détaillées quand les capteurs changent ou au premier chargement
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Utiliser les capteurs temps réel s'ils sont disponibles, sinon charger
      const sensorsToUse = realtimeSensors && realtimeSensors.length > 0 
        ? realtimeSensors 
        : (await api.sensors.getAll()).data;
      
      // Charger les groupes
      const [groupsTypeResponse, groupsLocationResponse] = await Promise.all([
        api.sensors.getGroupsByType(),
        api.sensors.getGroupsByLocation()
      ]);
      
      setGroupsByType(groupsTypeResponse.data.groups || []);
      setGroupsByLocation(groupsLocationResponse.data.groups || []);

      if (sensorsToUse.length > 0) {
        // Charger les relevés et statistiques pour chaque capteur
        const readingsPromises = sensorsToUse.map(sensor =>
          api.sensors.getReadings(sensor.id, 100, timeRange).catch(() => ({ data: [] }))
        );
        const statsPromises = sensorsToUse.map(sensor =>
          api.sensors.getStatistics(sensor.id, timeRange).catch(() => ({ data: {} }))
        );

        const readingsResults = await Promise.all(readingsPromises);
        const statsResults = await Promise.all(statsPromises);

        // Organiser les données par sensor_id
        const readingsMap = {};
        const statsMap = {};
        
        sensorsToUse.forEach((sensor, index) => {
          readingsMap[sensor.id] = readingsResults[index].data;
          statsMap[sensor.id] = statsResults[index].data;
        });

        setSensorReadings(readingsMap);
        setStatistics(statsMap);
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [realtimeSensors, timeRange]);

  // Charger au montage et quand timeRange change
  useEffect(() => {
    if (!loadingSensors) {
      loadDashboardData();
    }
  }, [loadingSensors, timeRange]);

  // Récupérer les capteurs depuis le hook temps réel ou l'état local
  const sensors = realtimeSensors || [];

  const getKPICards = () => {
    const activeSensors = sensors.filter(s => s.actif).length;
    const alertCount = sensors.filter(s => {
      if (!s.alert_enabled || s.current_value === null) return false;
      return (s.min_threshold && s.current_value < s.min_threshold) ||
             (s.max_threshold && s.current_value > s.max_threshold);
    }).length;

    const avgTemperature = sensors
      .filter(s => s.type === 'TEMPERATURE' && s.current_value !== null)
      .reduce((sum, s, _, arr) => sum + s.current_value / arr.length, 0);

    const totalPower = sensors
      .filter(s => s.type === 'POWER' && s.current_value !== null)
      .reduce((sum, s) => sum + s.current_value, 0);

    return [
      {
        title: 'Capteurs Actifs',
        value: activeSensors,
        icon: Activity,
        color: 'bg-blue-500',
        trend: null
      },
      {
        title: 'Alertes Actives',
        value: alertCount,
        icon: AlertTriangle,
        color: alertCount > 0 ? 'bg-red-500' : 'bg-green-500',
        trend: null
      },
      {
        title: 'Température Moyenne',
        value: avgTemperature ? `${avgTemperature.toFixed(1)}°C` : '--',
        icon: Thermometer,
        color: 'bg-orange-500',
        trend: null
      },
      {
        title: 'Puissance Totale',
        value: totalPower ? `${totalPower.toFixed(0)} W` : '--',
        icon: Zap,
        color: 'bg-yellow-500',
        trend: null
      }
    ];
  };

  const formatChartData = (readings) => {
    if (!readings || readings.length === 0) return [];
    
    return readings.map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      value: r.value,
      timestamp: r.timestamp
    })).reverse();
  };

  const getGaugeColor = (sensor) => {
    if (!sensor.alert_enabled || sensor.current_value === null) return '#10b981';
    
    if (sensor.min_threshold && sensor.current_value < sensor.min_threshold) return '#f59e0b';
    if (sensor.max_threshold && sensor.current_value > sensor.max_threshold) return '#ef4444';
    
    return '#10b981';
  };

  const GaugeWidget = ({ sensor }) => {
    const value = sensor.current_value || 0;
    const max = sensor.max_threshold || 100;
    const percentage = Math.min((value / max) * 100, 100);
    const color = getGaugeColor(sensor);

    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="relative w-40 h-40">
          <svg className="transform -rotate-90 w-40 h-40">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="#e5e7eb"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke={color}
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 70}`}
              strokeDashoffset={`${2 * Math.PI * 70 * (1 - percentage / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color }}>
              {value.toFixed(1)}
            </span>
            <span className="text-sm text-gray-600">{sensor.unite}</span>
          </div>
        </div>
        <p className="text-sm font-medium mt-4 text-center">{sensor.nom}</p>
        {sensor.last_update && (
          <p className="text-xs text-gray-500">
            {new Date(sensor.last_update).toLocaleTimeString()}
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-12 w-12 animate-spin text-purple-600" />
        </div>
      </div>
    );
  }

  const kpiCards = getKPICards();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="text-purple-600" size={32} />
            Dashboard IoT
          </h1>
          <p className="text-gray-600 mt-1">
            Surveillance en temps réel de vos capteurs et compteurs
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value={1}>Dernière heure</option>
            <option value={6}>6 heures</option>
            <option value={24}>24 heures</option>
            <option value={168}>7 jours</option>
          </select>
          
          <Button
            variant="outline"
            onClick={loadDashboardData}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-purple-600'
          }`}
        >
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab('groups-type')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'groups-type'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-purple-600'
          }`}
        >
          Groupes par Type
        </button>
        <button
          onClick={() => setActiveTab('groups-location')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'groups-location'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:text-purple-600'
          }`}
        >
          Groupes par Localisation
        </button>
      </div>

      {/* KPI Cards - Only in Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {kpiCards.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <Card key={index} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{kpi.title}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${kpi.color}`}>
                    <Icon className="text-white" size={24} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Gauges Section */}
          {sensors.filter(s => ['TEMPERATURE', 'HUMIDITY', 'PRESSURE', 'POWER'].includes(s.type)).length > 0 && (
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Valeurs Actuelles</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sensors
                  .filter(s => ['TEMPERATURE', 'HUMIDITY', 'PRESSURE', 'POWER'].includes(s.type))
                  .slice(0, 4)
                  .map(sensor => (
                    <GaugeWidget key={sensor.id} sensor={sensor} />
                  ))}
              </div>
            </Card>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sensors.slice(0, 6).map(sensor => {
              const chartData = formatChartData(sensorReadings[sensor.id]);
              const stats = statistics[sensor.id];

              if (chartData.length === 0) return null;

              return (
                <Card key={sensor.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{sensor.nom}</h3>
                      <p className="text-sm text-gray-600">{sensor.unite}</p>
                    </div>
                    {stats && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Moyenne</p>
                        <p className="text-lg font-semibold">
                          {stats.avg?.toFixed(1)} {sensor.unite}
                        </p>
                      </div>
                    )}
                  </div>

                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id={`gradient-${sensor.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#9ca3af"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#9ca3af"
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#8b5cf6" 
                        fillOpacity={1}
                        fill={`url(#gradient-${sensor.id})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  {stats && (
                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Min</p>
                        <p className="text-sm font-semibold">{stats.min?.toFixed(1)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Max</p>
                        <p className="text-sm font-semibold">{stats.max?.toFixed(1)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Actuel</p>
                        <p className="text-sm font-semibold">{stats.current?.toFixed(1)}</p>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Groups by Type Tab */}
      {activeTab === 'groups-type' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Statistiques par Type de Capteur</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupsByType.map(group => (
                <Card key={group.type} className="p-4 bg-gradient-to-br from-purple-50 to-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{group.type_label}</h3>
                    <span className="text-2xl font-bold text-purple-600">{group.count}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Moyenne:</span>
                      <span className="font-semibold">{group.avg_value?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Min:</span>
                      <span className="font-semibold text-blue-600">{group.min_value?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Max:</span>
                      <span className="font-semibold text-red-600">{group.max_value?.toFixed(1) || 'N/A'}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Comparison Chart */}
          {groupsByType.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Comparaison des Moyennes par Type</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={groupsByType.filter(g => g.avg_value !== null)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="type_label" 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="avg_value" fill="#8b5cf6" name="Moyenne" />
                  <Bar dataKey="min_value" fill="#3b82f6" name="Min" />
                  <Bar dataKey="max_value" fill="#ef4444" name="Max" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Sensor Details by Type */}
          {groupsByType.map(group => (
            <Card key={`details-${group.type}`} className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {group.type_label} - Détails des Capteurs ({group.count})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Nom</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Valeur Actuelle</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Unité</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Emplacement</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Dernière MAJ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {group.sensors.map(sensor => (
                      <tr key={sensor.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{sensor.nom}</td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          {sensor.current_value?.toFixed(2) || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">{sensor.unite}</td>
                        <td className="px-4 py-3 text-sm">
                          {sensor.emplacement?.nom || 'Non défini'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {sensor.last_update 
                            ? new Date(sensor.last_update).toLocaleString('fr-FR')
                            : 'Jamais'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Groups by Location Tab */}
      {activeTab === 'groups-location' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Statistiques par Localisation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupsByLocation.map(group => (
                <Card key={group.location_id} className="p-4 bg-gradient-to-br from-green-50 to-teal-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{group.location_name}</h3>
                    <span className="text-2xl font-bold text-green-600">{group.count}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Moyenne:</span>
                      <span className="font-semibold">{group.avg_value?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Alertes actives:</span>
                      <span className={`font-semibold ${group.alerts_active > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {group.alerts_active}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Location Comparison Chart */}
          {groupsByLocation.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Répartition des Capteurs par Localisation</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={groupsByLocation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="location_name" 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" fill="#10b981" name="Nombre de capteurs" />
                  <Bar dataKey="alerts_active" fill="#ef4444" name="Alertes actives" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Sensor Details by Location */}
          {groupsByLocation.map(group => (
            <Card key={`details-${group.location_id}`} className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {group.location_name} - Détails des Capteurs ({group.count})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Nom</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Valeur</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Unité</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Alerte</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Dernière MAJ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {group.sensors.map(sensor => (
                      <tr key={sensor.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{sensor.nom}</td>
                        <td className="px-4 py-3 text-sm">{sensor.type}</td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          {sensor.current_value?.toFixed(2) || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">{sensor.unite}</td>
                        <td className="px-4 py-3">
                          {sensor.alert_enabled ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Activée
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              Désactivée
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {sensor.last_update 
                            ? new Date(sensor.last_update).toLocaleString('fr-FR')
                            : 'Jamais'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* No sensors message */}
      {sensors.length === 0 && (
        <Card className="p-12 text-center">
          <Activity size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">Aucun capteur configuré</p>
          <Button onClick={() => window.location.href = '/sensors'}>
            Créer un capteur
          </Button>
        </Card>
      )}
    </div>
  );
};

export default IoTDashboard;
