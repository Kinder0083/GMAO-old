import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Users, User, UserMinus, Clock, Calendar, Search,
  MoreVertical, Edit, Trash2, ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const TeamMembersList = ({ members, workRhythms, onRefresh, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, user, temporary

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      `${member.prenom} ${member.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.service?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.poste?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || member.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const permanentMembers = filteredMembers.filter(m => m.type === 'user');
  const temporaryMembers = filteredMembers.filter(m => m.type === 'temporary');

  const getRhythmName = (code) => {
    const rhythm = workRhythms.find(r => r.code === code);
    return rhythm?.name || code;
  };

  const getMissionStatus = (member) => {
    if (!member.mission_end) return null;
    
    const endDate = new Date(member.mission_end);
    const today = new Date();
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { label: 'Terminée', color: 'bg-gray-500' };
    if (daysLeft <= 7) return { label: `${daysLeft}j restants`, color: 'bg-orange-500' };
    return { label: `Jusqu'au ${new Date(member.mission_end).toLocaleDateString('fr-FR')}`, color: 'bg-blue-500' };
  };

  const MemberCard = ({ member }) => {
    const missionStatus = getMissionStatus(member);
    
    return (
      <div 
        className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
          member.type === 'temporary' ? 'border-l-4 border-l-amber-500' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
              member.type === 'temporary' ? 'bg-amber-100' : 'bg-indigo-100'
            }`}>
              <User className={`h-5 w-5 ${
                member.type === 'temporary' ? 'text-amber-600' : 'text-indigo-600'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {member.prenom} {member.nom}
              </h3>
              <p className="text-sm text-gray-500">
                {member.poste || member.email || 'Poste non défini'}
              </p>
            </div>
          </div>
          
          {member.type === 'temporary' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(member.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {getRhythmName(member.work_rhythm)}
          </Badge>
          
          {member.type === 'temporary' && (
            <Badge className={`text-xs ${missionStatus?.color || 'bg-blue-500'}`}>
              <Calendar className="h-3 w-3 mr-1" />
              {missionStatus?.label || 'Mission'}
            </Badge>
          )}
          
          {member.type === 'user' && (
            <Badge variant="secondary" className="text-xs">
              Permanent
            </Badge>
          )}
          
          {member.competences?.length > 0 && (
            <Badge variant="outline" className="text-xs bg-purple-50">
              {member.competences.length} compétence(s)
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un membre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
            size="sm"
          >
            Tous ({members.length})
          </Button>
          <Button 
            variant={filterType === 'user' ? 'default' : 'outline'}
            onClick={() => setFilterType('user')}
            size="sm"
          >
            Permanents ({members.filter(m => m.type === 'user').length})
          </Button>
          <Button 
            variant={filterType === 'temporary' ? 'default' : 'outline'}
            onClick={() => setFilterType('temporary')}
            size="sm"
            className={filterType === 'temporary' ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            Intérimaires ({members.filter(m => m.type === 'temporary').length})
          </Button>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredMembers.map(member => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">Aucun membre trouvé</h3>
            <p className="text-gray-500">Modifiez vos critères de recherche</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamMembersList;
