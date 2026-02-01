import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Play, Pause, Copy, Trash2, Edit, Send, Calendar, 
  Clock, Mail, Building, Users, BarChart3
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

const ReportTemplateCard = ({ 
  template, 
  onEdit, 
  onDuplicate, 
  onDelete, 
  onToggleActive,
  onTest,
  frequencyLabels 
}) => {
  const dayLabels = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };

  const schedule = template.schedule || {};
  const recipients = template.recipients || {};
  const sections = template.sections || {};

  // Count active sections
  const activeSections = Object.values(sections).filter(s => s?.enabled).length;

  // Format schedule info
  const getScheduleInfo = () => {
    const freq = frequencyLabels[schedule.frequency] || 'Hebdomadaire';
    const time = schedule.time || '07:00';
    
    if (schedule.frequency === 'weekly') {
      const day = dayLabels[schedule.day_of_week] || 'Lundi';
      return `${freq} - ${day} à ${time}`;
    } else if (schedule.frequency === 'monthly') {
      return `${freq} - Le ${schedule.day_of_month || 1} à ${time}`;
    } else if (schedule.frequency === 'annual') {
      const months = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      return `${freq} - ${schedule.day_of_month || 1} ${months[schedule.month_of_year || 1]} à ${time}`;
    }
    return freq;
  };

  // Count recipients
  const recipientCount = (recipients.emails?.length || 0) + (recipients.include_service_managers ? 1 : 0);

  return (
    <Card 
      className={`relative overflow-hidden transition-all ${
        template.is_active 
          ? 'border-l-4 border-l-green-500' 
          : 'border-l-4 border-l-gray-300 opacity-75'
      }`}
      data-testid={`report-template-${template.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{template.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                <Building className="h-3 w-3 mr-1" />
                {template.service}
              </Badge>
              <Badge 
                variant={template.is_active ? 'default' : 'secondary'}
                className={template.is_active ? 'bg-green-500' : ''}
              >
                {template.is_active ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleActive}>
                {template.is_active ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Désactiver
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Activer
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onTest}>
                <Send className="h-4 w-4 mr-2" />
                Envoyer un test
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {template.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
        )}
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2 text-blue-500" />
            {getScheduleInfo()}
          </div>
          
          <div className="flex items-center text-gray-600">
            <Mail className="h-4 w-4 mr-2 text-purple-500" />
            {recipientCount} destinataire{recipientCount > 1 ? 's' : ''}
            {recipients.include_service_managers && (
              <span className="ml-1 text-xs text-gray-400">(+ responsables)</span>
            )}
          </div>
          
          <div className="flex items-center text-gray-600">
            <BarChart3 className="h-4 w-4 mr-2 text-orange-500" />
            {activeSections} section{activeSections > 1 ? 's' : ''} active{activeSections > 1 ? 's' : ''}
          </div>
        </div>

        {/* Stats */}
        <div className="pt-3 border-t flex items-center justify-between text-xs text-gray-500">
          <span>
            {template.send_count || 0} envoi{(template.send_count || 0) > 1 ? 's' : ''}
          </span>
          {template.last_sent_at && (
            <span>
              Dernier: {new Date(template.last_sent_at).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportTemplateCard;
