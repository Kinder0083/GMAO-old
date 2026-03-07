import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { useToast } from '../hooks/use-toast';
import {
  Users, ArrowLeft, Search, Mail, Phone, Building2,
  UserCheck, UserX, Clock, Briefcase, AlertCircle, Loader2,
  BarChart3, Wrench, ClipboardList
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import api from '../services/api';

const ServiceTeamView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [managerStatus, setManagerStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [team, setTeam] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Vérifier le statut de responsable
      const statusRes = await api.get('/service-manager/status');
      setManagerStatus(statusRes.data);
      
      if (!statusRes.data.is_service_manager) {
        toast({
          title: 'Accès refusé',
          description: 'Vous n\'êtes pas responsable de service',
          variant: 'destructive'
        });
        navigate('/service-dashboard');
        return;
      }
      
      // Charger les stats et l'équipe en parallèle
      const [statsRes, teamRes] = await Promise.all([
        api.get('/service-manager/stats'),
        api.get('/service-manager/team')
      ]);
      
      setStats(statsRes.data);
      setTeam(teamRes.data.team_members || []);
      
    } catch (error) {
      console.error('Erreur chargement:', error);
      if (error.response?.status === 403) {
        toast({
          title: 'Accès refusé',
          description: 'Vous n\'êtes pas responsable de service',
          variant: 'destructive'
        });
        navigate('/service-dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtrer l'équipe par recherche
  const filteredTeam = team.filter(member => {
    const search = searchTerm.toLowerCase();
    return (
      member.prenom?.toLowerCase().includes(search) ||
      member.nom?.toLowerCase().includes(search) ||
      member.email?.toLowerCase().includes(search) ||
      member.role?.toLowerCase().includes(search)
    );
  });

  // Statut utilisateur
  const getUserStatus = (member) => {
    // Simplification : on considère les utilisateurs actifs
    // Dans une vraie implémentation, on vérifierait la dernière activité
    if (member.is_active === false) {
      return { label: 'Inactif', color: 'bg-gray-100 text-gray-600' };
    }
    return { label: 'Actif', color: 'bg-green-100 text-green-700' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="service-team-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/service-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Mon Équipe
            </h1>
            <p className="text-gray-500">
              Service : <strong>{managerStatus?.service_filter || 'Tous les services'}</strong>
              {' • '}{team.length} membre{team.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">OT en cours</p>
                  <p className="text-2xl font-bold">{stats.work_orders?.en_cours || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">OT en attente</p>
                  <p className="text-2xl font-bold">{stats.work_orders?.en_attente || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Wrench className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Équip. en panne</p>
                  <p className="text-2xl font-bold">{stats.equipments?.en_panne || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Taux complétion</p>
                  <p className="text-2xl font-bold">{stats.work_orders?.taux_completion || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste de l'équipe */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membres de l'équipe
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTeam.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? 'Aucun résultat pour cette recherche' : 'Aucun membre dans votre équipe'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeam.map((member) => {
                  const status = getUserStatus(member);
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.prenom} {member.nom}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4" />
                          {member.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.role || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {member.service || 'Non assigné'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info services gérés */}
      {managerStatus?.managed_services?.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle className="h-4 w-4" />
              Vous gérez {managerStatus.managed_services.length} services : 
              {' '}<strong>{managerStatus.managed_services.join(', ')}</strong>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceTeamView;
