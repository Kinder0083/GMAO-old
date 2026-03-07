import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  BarChart3, User, Briefcase, Clock, AlertTriangle, TrendingUp
} from 'lucide-react';
import api from '../../services/api';

const WorkloadOverview = ({ members }) => {
  const [workload, setWorkload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkload();
  }, []);

  const loadWorkload = async () => {
    try {
      const response = await api.get('/team/workload');
      setWorkload(response.data);
    } catch (error) {
      console.error('Erreur chargement charge:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLoadColor = (percentage) => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 80) return 'bg-orange-500';
    if (percentage < 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getLoadLabel = (percentage) => {
    if (percentage > 100) return 'Surchargé';
    if (percentage > 80) return 'Charge élevée';
    if (percentage < 30) return 'Sous-chargé';
    return 'Normal';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-pulse">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Charge moyenne</p>
                <p className="text-xl font-bold">{workload?.summary?.average_load || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">En surcharge</p>
                <p className="text-xl font-bold text-red-600">{workload?.summary?.overloaded || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sous-chargés</p>
                <p className="text-xl font-bold text-yellow-600">{workload?.summary?.underloaded || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Workload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Charge de travail par membre
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {workload?.members?.map(({ member, assigned_work_orders, estimated_hours, weekly_capacity, load_percentage, work_orders }) => (
            <div key={member.id} className="p-4 border rounded-lg">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Member Info */}
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    member.type === 'temporary' ? 'bg-amber-100' : 'bg-indigo-100'
                  }`}>
                    <User className={`h-5 w-5 ${
                      member.type === 'temporary' ? 'text-amber-600' : 'text-indigo-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{member.prenom} {member.nom}</h3>
                    <p className="text-sm text-gray-500">{member.poste || 'Non défini'}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">
                      {estimated_hours}h / {weekly_capacity}h
                    </span>
                    <Badge className={`${getLoadColor(load_percentage)}`}>
                      {load_percentage}% - {getLoadLabel(load_percentage)}
                    </Badge>
                  </div>
                  <Progress 
                    value={Math.min(load_percentage, 100)} 
                    className="h-3"
                  />
                </div>

                {/* Work Orders Count */}
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {assigned_work_orders} OT assigné{assigned_work_orders > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Work Orders List */}
              {work_orders?.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2">OT en cours:</p>
                  <div className="flex flex-wrap gap-2">
                    {work_orders.slice(0, 5).map(wo => (
                      <Badge key={wo.id} variant="outline" className="text-xs">
                        #{wo.numero} - {wo.titre?.substring(0, 30)}...
                        {wo.temps_estime > 0 && ` (${wo.temps_estime}h)`}
                      </Badge>
                    ))}
                    {work_orders.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{work_orders.length - 5} autres
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {(!workload?.members || workload.members.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              Aucune donnée de charge disponible
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkloadOverview;
