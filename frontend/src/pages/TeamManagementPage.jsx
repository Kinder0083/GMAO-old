import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { 
  Users, Clock, BarChart3, PieChart, Plus, RefreshCw,
  UserPlus, Calendar, Timer, TrendingUp
} from 'lucide-react';
import api from '../services/api';

// Import des composants
import TeamMembersList from '../components/TeamManagement/TeamMembersList';
import TimeTrackingPanel from '../components/TeamManagement/TimeTrackingPanel';
import WorkloadOverview from '../components/TeamManagement/WorkloadOverview';
import TeamDashboardStats from '../components/TeamManagement/TeamDashboardStats';
import AddTemporaryMemberDialog from '../components/TeamManagement/AddTemporaryMemberDialog';

const TeamManagementPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('team');
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [workRhythms, setWorkRhythms] = useState([]);
  const [presence, setPresence] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, rhythmsRes, presenceRes] = await Promise.all([
        api.get('/team/members'),
        api.get('/team/work-rhythms'),
        api.get('/team/presence')
      ]);
      
      setMembers(membersRes.data || []);
      setWorkRhythms(rhythmsRes.data || []);
      setPresence(presenceRes.data || null);
    } catch (error) {
      console.error('Erreur chargement données équipe:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données de l\'équipe',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (memberData) => {
    try {
      await api.post('/team/members', memberData);
      toast({
        title: 'Succès',
        description: 'Membre ajouté à l\'équipe'
      });
      setShowAddMember(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible d\'ajouter le membre',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Supprimer ce membre de l\'équipe ?')) return;
    
    try {
      await api.delete(`/team/members/${memberId}`);
      toast({
        title: 'Succès',
        description: 'Membre supprimé'
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de supprimer le membre',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const permanentMembers = members.filter(m => m.type === 'user');
  const temporaryMembers = members.filter(m => m.type === 'temporary');

  return (
    <div className="space-y-6" data-testid="team-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-indigo-600" />
            Gestion d'équipe
          </h1>
          <p className="text-gray-600 mt-1">
            Gérez votre équipe, le pointage et la charge de travail
          </p>
        </div>
        <Button 
          onClick={() => setShowAddMember(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
          data-testid="add-member-btn"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Ajouter un intérimaire
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Membres</p>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-gray-400">
                  {permanentMembers.length} permanents, {temporaryMembers.length} intérimaires
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Présents</p>
                <p className="text-2xl font-bold text-green-600">
                  {presence?.summary?.present || 0}
                </p>
                <p className="text-xs text-gray-400">sur {presence?.summary?.total || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Absents</p>
                <p className="text-2xl font-bold text-orange-600">
                  {presence?.summary?.absent || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Non pointés</p>
                <p className="text-2xl font-bold text-gray-600">
                  {presence?.summary?.not_started || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Timer className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Mon équipe</span>
          </TabsTrigger>
          <TabsTrigger value="timetracking" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Pointage</span>
          </TabsTrigger>
          <TabsTrigger value="workload" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Charge</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
        </TabsList>

        {/* Team Tab */}
        <TabsContent value="team">
          <TeamMembersList 
            members={members}
            workRhythms={workRhythms}
            onRefresh={loadData}
            onDelete={handleDeleteMember}
          />
        </TabsContent>

        {/* Time Tracking Tab */}
        <TabsContent value="timetracking">
          <TimeTrackingPanel 
            members={members}
            presence={presence}
            workRhythms={workRhythms}
            onRefresh={loadData}
          />
        </TabsContent>

        {/* Workload Tab */}
        <TabsContent value="workload">
          <WorkloadOverview members={members} />
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <TeamDashboardStats />
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      {showAddMember && (
        <AddTemporaryMemberDialog
          open={showAddMember}
          onClose={() => setShowAddMember(false)}
          onSave={handleAddMember}
          workRhythms={workRhythms}
        />
      )}
    </div>
  );
};

export default TeamManagementPage;
