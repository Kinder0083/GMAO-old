import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  FileText, Calendar, Clock, Mail, Users, BarChart3, 
  Settings, Plus, X, Building, Loader2
} from 'lucide-react';

const ReportTemplateForm = ({ 
  open, 
  onClose, 
  onSave, 
  template, 
  services,
  isAdmin 
}) => {
  const [formTab, setFormTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    service: services[0] || '',
    is_active: true,
    schedule: {
      frequency: 'weekly',
      day_of_week: 'monday',
      day_of_month: 1,
      month_of_year: 1,
      time: '07:00',
      timezone: 'Europe/Paris'
    },
    recipients: {
      emails: [],
      include_service_managers: false
    },
    sections: {
      work_orders: {
        enabled: true,
        include_created: true,
        include_completed: true,
        include_overdue: true,
        include_in_progress: true,
        include_completion_rate: true
      },
      equipment: {
        enabled: true,
        include_broken: true,
        include_maintenance: true,
        include_availability: true,
        include_alerts: true
      },
      pending_requests: {
        enabled: true,
        include_improvements: true,
        include_purchases: true,
        include_interventions: true
      },
      team_performance: {
        enabled: true,
        include_time_spent: true,
        include_by_technician: true
      }
    },
    period: 'previous_week'
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        service: template.service || services[0] || '',
        is_active: template.is_active ?? true,
        schedule: template.schedule || formData.schedule,
        recipients: template.recipients || formData.recipients,
        sections: template.sections || formData.sections,
        period: template.period || 'previous_week'
      });
    } else {
      // Reset form for new template
      setFormData(prev => ({
        ...prev,
        name: '',
        description: '',
        service: services[0] || ''
      }));
    }
  }, [template, services]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Le nom du modèle est requis');
      return;
    }
    if (!formData.service) {
      alert('Le service est requis');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const addEmail = () => {
    if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      if (!formData.recipients.emails.includes(newEmail)) {
        setFormData(prev => ({
          ...prev,
          recipients: {
            ...prev.recipients,
            emails: [...prev.recipients.emails, newEmail]
          }
        }));
      }
      setNewEmail('');
    }
  };

  const removeEmail = (email) => {
    setFormData(prev => ({
      ...prev,
      recipients: {
        ...prev.recipients,
        emails: prev.recipients.emails.filter(e => e !== email)
      }
    }));
  };

  const updateSection = (sectionKey, field, value) => {
    setFormData(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: {
          ...prev.sections[sectionKey],
          [field]: value
        }
      }
    }));
  };

  const dayOptions = [
    { value: 'monday', label: 'Lundi' },
    { value: 'tuesday', label: 'Mardi' },
    { value: 'wednesday', label: 'Mercredi' },
    { value: 'thursday', label: 'Jeudi' },
    { value: 'friday', label: 'Vendredi' },
    { value: 'saturday', label: 'Samedi' },
    { value: 'sunday', label: 'Dimanche' }
  ];

  const monthOptions = [
    { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' }, { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' }, { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' }
  ];

  const periodOptions = [
    { value: 'previous_week', label: 'Semaine précédente' },
    { value: 'current_week', label: 'Semaine en cours' },
    { value: 'last_7_days', label: '7 derniers jours' },
    { value: 'previous_month', label: 'Mois précédent' },
    { value: 'current_month', label: 'Mois en cours' },
    { value: 'last_30_days', label: '30 derniers jours' },
    { value: 'previous_year', label: 'Année précédente' },
    { value: 'last_365_days', label: '365 derniers jours' }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {template ? 'Modifier le modèle' : 'Nouveau modèle de rapport'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={formTab} onValueChange={setFormTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Settings className="h-4 w-4 mr-1" />
              Général
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Calendar className="h-4 w-4 mr-1" />
              Planification
            </TabsTrigger>
            <TabsTrigger value="recipients">
              <Mail className="h-4 w-4 mr-1" />
              Destinataires
            </TabsTrigger>
            <TabsTrigger value="sections">
              <BarChart3 className="h-4 w-4 mr-1" />
              Sections
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-1">
            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du modèle *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Rapport hebdomadaire Maintenance"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description optionnelle du rapport..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service">Service *</Label>
                <Select
                  value={formData.service}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, service: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service} value={service}>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          {service}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Période couverte</Label>
                <Select
                  value={formData.period}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, period: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label htmlFor="is_active">Activer ce rapport</Label>
                  <p className="text-sm text-gray-500">Les rapports inactifs ne sont pas envoyés</p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Fréquence</Label>
                <Select
                  value={formData.schedule.frequency}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, frequency: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="annual">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.schedule.frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Jour d'envoi</Label>
                  <Select
                    value={formData.schedule.day_of_week}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, day_of_week: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(formData.schedule.frequency === 'monthly' || formData.schedule.frequency === 'annual') && (
                <div className="space-y-2">
                  <Label>Jour du mois</Label>
                  <Select
                    value={String(formData.schedule.day_of_month)}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, day_of_month: parseInt(value) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={String(day)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.schedule.frequency === 'annual' && (
                <div className="space-y-2">
                  <Label>Mois</Label>
                  <Select
                    value={String(formData.schedule.month_of_year)}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, month_of_year: parseInt(value) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map(opt => (
                        <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Heure d'envoi</Label>
                <Input
                  type="time"
                  value={formData.schedule.time}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, time: e.target.value }
                  }))}
                />
              </div>
            </TabsContent>

            {/* Recipients Tab */}
            <TabsContent value="recipients" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Ajouter un destinataire</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                  />
                  <Button type="button" onClick={addEmail} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Destinataires configurés</Label>
                <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border rounded-md bg-gray-50">
                  {formData.recipients.emails.length === 0 ? (
                    <span className="text-sm text-gray-400">Aucun destinataire</span>
                  ) : (
                    formData.recipients.emails.map(email => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {email}
                        <button 
                          onClick={() => removeEmail(email)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <Label>Inclure les responsables du service</Label>
                  <p className="text-sm text-gray-500">
                    Ajoute automatiquement les responsables définis pour ce service
                  </p>
                </div>
                <Switch
                  checked={formData.recipients.include_service_managers}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    recipients: { ...prev.recipients, include_service_managers: checked }
                  }))}
                />
              </div>
            </TabsContent>

            {/* Sections Tab */}
            <TabsContent value="sections" className="space-y-4 mt-4">
              {/* Work Orders Section */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <Label className="text-base font-semibold">Ordres de Travail</Label>
                  </div>
                  <Switch
                    checked={formData.sections.work_orders.enabled}
                    onCheckedChange={(checked) => updateSection('work_orders', 'enabled', checked)}
                  />
                </div>
                {formData.sections.work_orders.enabled && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    {[
                      { key: 'include_created', label: 'OT créés' },
                      { key: 'include_completed', label: 'OT terminés' },
                      { key: 'include_overdue', label: 'OT en retard' },
                      { key: 'include_in_progress', label: 'OT en cours' },
                      { key: 'include_completion_rate', label: 'Taux de réalisation' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={formData.sections.work_orders[item.key]}
                          onCheckedChange={(checked) => updateSection('work_orders', item.key, checked)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Equipment Section */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔧</span>
                    <Label className="text-base font-semibold">Équipements</Label>
                  </div>
                  <Switch
                    checked={formData.sections.equipment.enabled}
                    onCheckedChange={(checked) => updateSection('equipment', 'enabled', checked)}
                  />
                </div>
                {formData.sections.equipment.enabled && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    {[
                      { key: 'include_broken', label: 'En panne' },
                      { key: 'include_maintenance', label: 'En maintenance' },
                      { key: 'include_availability', label: 'Taux de disponibilité' },
                      { key: 'include_alerts', label: 'Alertes actives' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={formData.sections.equipment[item.key]}
                          onCheckedChange={(checked) => updateSection('equipment', item.key, checked)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Requests Section */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    <Label className="text-base font-semibold">Demandes en attente</Label>
                  </div>
                  <Switch
                    checked={formData.sections.pending_requests.enabled}
                    onCheckedChange={(checked) => updateSection('pending_requests', 'enabled', checked)}
                  />
                </div>
                {formData.sections.pending_requests.enabled && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    {[
                      { key: 'include_improvements', label: 'Améliorations' },
                      { key: 'include_purchases', label: 'Achats' },
                      { key: 'include_interventions', label: 'Interventions' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={formData.sections.pending_requests[item.key]}
                          onCheckedChange={(checked) => updateSection('pending_requests', item.key, checked)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Team Performance Section */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <Label className="text-base font-semibold">Performance équipe</Label>
                  </div>
                  <Switch
                    checked={formData.sections.team_performance.enabled}
                    onCheckedChange={(checked) => updateSection('team_performance', 'enabled', checked)}
                  />
                </div>
                {formData.sections.team_performance.enabled && (
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    {[
                      { key: 'include_time_spent', label: 'Temps passé total' },
                      { key: 'include_by_technician', label: 'Par technicien' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={formData.sections.team_performance[item.key]}
                          onCheckedChange={(checked) => updateSection('team_performance', item.key, checked)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              template ? 'Mettre à jour' : 'Créer le modèle'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportTemplateForm;
