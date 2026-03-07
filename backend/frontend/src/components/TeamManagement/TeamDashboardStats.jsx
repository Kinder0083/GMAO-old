import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  PieChart, TrendingUp, Clock, Users, CheckCircle2,
  Calendar, Timer, RefreshCw
} from 'lucide-react';
import api from '../../services/api';

const TeamDashboardStats = () => {
  const [dashboard, setDashboard] = useState(null);
  const [overtime, setOvertime] = useState(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    loadOvertime();
  }, [period]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/team/dashboard', { params: { period } });
      setDashboard(response.data);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOvertime = async () => {
    try {
      const response = await api.get('/team/overtime');
      setOvertime(response.data);
    } catch (error) {
      console.error('Erreur chargement heures sup:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  const kpis = dashboard?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        <Button 
          variant={period === 'day' ? 'default' : 'outline'}
          onClick={() => setPeriod('day')}
          size="sm"
        >
          Aujourd'hui
        </Button>
        <Button 
          variant={period === 'week' ? 'default' : 'outline'}
          onClick={() => setPeriod('week')}
          size="sm"
        >
          Cette semaine
        </Button>
        <Button 
          variant={period === 'month' ? 'default' : 'outline'}
          onClick={() => setPeriod('month')}
          size="sm"
        >
          Ce mois
        </Button>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Effectif</p>
                <p className="text-2xl font-bold">{kpis.total_members || 0}</p>
                <p className="text-xs text-gray-400">membres dans l'équipe</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Taux de présence</p>
                <p className="text-2xl font-bold text-green-600">{kpis.presence_rate || 0}%</p>
                <p className="text-xs text-gray-400">moyenne sur la période</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Heures travaillées</p>
                <p className="text-2xl font-bold">{kpis.total_worked_hours || 0}h</p>
                <p className="text-xs text-gray-400">total équipe</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Timer className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Heures supplémentaires</p>
                <p className="text-2xl font-bold text-orange-600">{kpis.total_overtime_hours || 0}h</p>
                <p className="text-xs text-gray-400">cumulées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">OT terminés</p>
                <p className="text-2xl font-bold">{kpis.completed_work_orders || 0}</p>
                <p className="text-xs text-gray-400">sur la période</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Jours d'absence</p>
                <p className="text-2xl font-bold text-red-600">{kpis.absence_days || 0}</p>
                <p className="text-xs text-gray-400">total équipe</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overtime Details */}
      {overtime && overtime.members?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-orange-600" />
              Détail des heures supplémentaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overtime.members.filter(m => m.total_overtime > 0).slice(0, 10).map(member => (
                <div key={member.member_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{member.member_name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {member.days_worked} jours travaillés
                    </span>
                    <Badge className="bg-orange-500">
                      +{member.total_overtime.toFixed(1)}h
                    </Badge>
                  </div>
                </div>
              ))}
              
              {overtime.members.filter(m => m.total_overtime > 0).length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  Aucune heure supplémentaire ce mois
                </p>
              )}
            </div>
            
            {overtime.summary && (
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-gray-600">Total équipe:</span>
                <span className="text-xl font-bold text-orange-600">
                  +{overtime.summary.total_overtime_hours}h
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Period Info */}
      <Card className="bg-gray-50">
        <CardContent className="py-4">
          <p className="text-sm text-gray-500">
            Période: {dashboard?.start_date} au {dashboard?.end_date}
            {dashboard?.service && ` • Service: ${dashboard.service}`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamDashboardStats;
