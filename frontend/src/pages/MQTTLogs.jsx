import React, { useState, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  BarChart3
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import api from '../services/api';

const MQTTLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    topic: '',
    sensor_id: '',
    success_only: null,
    hours: 24,
    limit: 100
  });
  
  const { toast } = useToast();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    loadData();
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes, topicsRes] = await Promise.all([
        api.mqtt.getLogs(filters),
        api.mqtt.getLogsStats(filters.hours),
        api.mqtt.getLogsTopics(filters.hours)
      ]);
      
      setLogs(logsRes.data.logs || []);
      setStats(statsRes.data);
      setTopics(topicsRes.data.topics || []);
    } catch (error) {
      console.error('Erreur chargement logs MQTT:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les logs MQTT',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer tous les logs MQTT ?')) {
      return;
    }

    try {
      await api.mqtt.clearLogs();
      toast({
        title: 'Succès',
        description: 'Logs MQTT supprimés'
      });
      await loadData();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer les logs',
        variant: 'destructive'
      });
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('fr-FR');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="text-purple-600" size={32} />
            Logs MQTT
          </h1>
          <p className="text-gray-600 mt-1">
            Monitoring et débogage des messages MQTT en temps réel
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
          </button>
          
          {isAdmin && (
            <Button
              onClick={handleClearLogs}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-2" size={18} />
              Vider les logs
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold">{stats.total_messages}</p>
              </div>
              <BarChart3 className="text-purple-600" size={24} />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Succès</p>
                <p className="text-2xl font-bold text-green-600">{stats.success_count}</p>
              </div>
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Erreurs</p>
                <p className="text-2xl font-bold text-red-600">{stats.error_count}</p>
              </div>
              <XCircle className="text-red-600" size={24} />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux de Succès</p>
                <p className="text-2xl font-bold">{stats.success_rate}%</p>
              </div>
              <Activity className="text-blue-600" size={24} />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Filtrer par topic..."
              value={filters.topic}
              onChange={(e) => setFilters({...filters, topic: e.target.value})}
              className="pl-10"
            />
          </div>
          
          <select
            value={filters.hours}
            onChange={(e) => setFilters({...filters, hours: parseInt(e.target.value)})}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="1">Dernière heure</option>
            <option value="6">6 heures</option>
            <option value="24">24 heures</option>
            <option value="168">7 jours</option>
          </select>
          
          <select
            value={filters.success_only === null ? 'all' : filters.success_only.toString()}
            onChange={(e) => {
              const val = e.target.value;
              setFilters({
                ...filters,
                success_only: val === 'all' ? null : val === 'true'
              });
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Tous les messages</option>
            <option value="true">Succès uniquement</option>
            <option value="false">Erreurs uniquement</option>
          </select>
          
          <select
            value={filters.limit}
            onChange={(e) => setFilters({...filters, limit: parseInt(e.target.value)})}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="50">50 logs</option>
            <option value="100">100 logs</option>
            <option value="500">500 logs</option>
            <option value="1000">1000 logs</option>
          </select>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capteur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payload</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Erreur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" />
                    <p className="text-gray-600">Chargement des logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-600">
                    Aucun log trouvé pour les filtres sélectionnés
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <CheckCircle className="text-green-600" size={18} />
                      ) : (
                        <XCircle className="text-red-600" size={18} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-purple-600">
                      {log.topic}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.sensor_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 max-w-xs truncate">
                      {log.payload}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600">
                      {log.error_message || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default MQTTLogs;
