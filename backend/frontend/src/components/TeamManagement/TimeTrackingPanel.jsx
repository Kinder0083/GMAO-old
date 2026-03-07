import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { 
  Clock, LogIn, LogOut, CheckSquare, User, Calendar,
  Edit, RefreshCw, Download, AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import ManualTimeEntryDialog from './ManualTimeEntryDialog';
import AbsenceDeclarationDialog from './AbsenceDeclarationDialog';

const TimeTrackingPanel = ({ members, presence, workRhythms, onRefresh }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState({});
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showAbsence, setShowAbsence] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handleClockIn = async (memberId) => {
    setLoading(prev => ({ ...prev, [memberId]: 'in' }));
    try {
      const response = await api.post('/time-tracking/clock-in', null, {
        params: { member_id: memberId }
      });
      toast({
        title: 'Arrivée pointée',
        description: response.data.message
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de pointer l\'arrivée',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, [memberId]: null }));
    }
  };

  const handleClockOut = async (memberId) => {
    setLoading(prev => ({ ...prev, [memberId]: 'out' }));
    try {
      const response = await api.post('/time-tracking/clock-out', null, {
        params: { member_id: memberId }
      });
      toast({
        title: 'Départ pointé',
        description: response.data.message
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de pointer le départ',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, [memberId]: null }));
    }
  };

  const handlePresentAtPost = async (memberId) => {
    setLoading(prev => ({ ...prev, [memberId]: 'post' }));
    try {
      const response = await api.post('/time-tracking/present-at-post', null, {
        params: { member_id: memberId }
      });
      toast({
        title: 'Présence enregistrée',
        description: response.data.message
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible d\'enregistrer la présence',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, [memberId]: null }));
    }
  };

  const handleAllPresentAtPost = async () => {
    const notStartedMembers = presence?.members?.filter(
      m => m.presence_status === 'not_started'
    ).map(m => m.member.id) || [];

    if (notStartedMembers.length === 0) {
      toast({
        title: 'Information',
        description: 'Tous les membres sont déjà pointés ou absents'
      });
      return;
    }

    setLoading(prev => ({ ...prev, 'bulk': true }));
    try {
      const response = await api.post('/time-tracking/present-at-post-bulk', {
        member_ids: notStartedMembers
      });
      toast({
        title: 'Présences enregistrées',
        description: `${response.data.processed} membre(s) marqué(s) présent(s)`
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer les présences',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, 'bulk': false }));
    }
  };

  const openManualEntry = (member) => {
    setSelectedMember(member);
    setShowManualEntry(true);
  };

  const openAbsenceDialog = (member) => {
    setSelectedMember(member);
    setShowAbsence(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return 'bg-green-500';
      case 'working': return 'bg-blue-500';
      case 'absent': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'complete': return 'Journée complète';
      case 'working': return 'En cours';
      case 'absent': return 'Absent';
      default: return 'Non pointé';
    }
  };

  const getRhythmInfo = (member) => {
    const config = member.work_rhythm_config || {};
    return `${config.default_start || '08:00'} - ${config.default_end || '17:00'}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with date and actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Pointage du jour
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1 capitalize">{today}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
              <Button 
                onClick={handleAllPresentAtPost}
                disabled={loading['bulk']}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Tous présents à poste
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Members list with time tracking */}
      <div className="space-y-3">
        {presence?.members?.map(({ member, time_entry, absence, presence_status }) => (
          <Card key={member.id} className={`${
            presence_status === 'absent' ? 'opacity-60' : ''
          }`}>
            <CardContent className="py-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Member info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    member.type === 'temporary' ? 'bg-amber-100' : 'bg-indigo-100'
                  }`}>
                    <User className={`h-5 w-5 ${
                      member.type === 'temporary' ? 'text-amber-600' : 'text-indigo-600'
                    }`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {member.prenom} {member.nom}
                      </h3>
                      {member.type === 'temporary' && (
                        <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200">
                          Intérimaire
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {getRhythmInfo(member)} • Pause: {member.work_rhythm_config?.break_duration_minutes || 60}min
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-4">
                  <Badge className={`${getStatusColor(presence_status)}`}>
                    {getStatusLabel(presence_status)}
                  </Badge>
                  
                  {time_entry && (
                    <div className="text-sm">
                      {time_entry.clock_in && (
                        <span className="text-green-600 font-medium">
                          {time_entry.clock_in}
                        </span>
                      )}
                      {time_entry.clock_in && time_entry.clock_out && ' → '}
                      {time_entry.clock_out && (
                        <span className="text-red-600 font-medium">
                          {time_entry.clock_out}
                        </span>
                      )}
                      {time_entry.worked_hours > 0 && (
                        <span className="text-gray-500 ml-2">
                          ({time_entry.worked_hours}h)
                        </span>
                      )}
                    </div>
                  )}

                  {absence && (
                    <div className="text-sm text-orange-600">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      {absence.absence_type}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {presence_status !== 'absent' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClockIn(member.id)}
                        disabled={loading[member.id] === 'in' || time_entry?.clock_in}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <LogIn className="h-4 w-4 mr-1" />
                        Arrivée
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClockOut(member.id)}
                        disabled={loading[member.id] === 'out' || time_entry?.clock_out || !time_entry?.clock_in}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4 mr-1" />
                        Départ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePresentAtPost(member.id)}
                        disabled={loading[member.id] === 'post'}
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <CheckSquare className="h-4 w-4 mr-1" />
                        Présent
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openManualEntry(member)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="bg-gray-50">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-500">Total:</span>{' '}
              <span className="font-medium">{presence?.summary?.total || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Présents:</span>{' '}
              <span className="font-medium text-green-600">{presence?.summary?.present || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Absents:</span>{' '}
              <span className="font-medium text-orange-600">{presence?.summary?.absent || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Non pointés:</span>{' '}
              <span className="font-medium text-gray-600">{presence?.summary?.not_started || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Entry Dialog */}
      {showManualEntry && (
        <ManualTimeEntryDialog
          open={showManualEntry}
          onClose={() => setShowManualEntry(false)}
          member={selectedMember}
          onSave={() => {
            setShowManualEntry(false);
            onRefresh();
          }}
        />
      )}

      {/* Absence Dialog */}
      {showAbsence && (
        <AbsenceDeclarationDialog
          open={showAbsence}
          onClose={() => setShowAbsence(false)}
          member={selectedMember}
          onSave={() => {
            setShowAbsence(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

export default TimeTrackingPanel;
