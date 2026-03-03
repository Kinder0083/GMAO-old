import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { QrCode, Plus, Pencil, Trash2, GripVertical, Save } from 'lucide-react';
import api from '../../services/api';

const iconOptions = [
  'ClipboardList', 'History', 'BarChart3', 'PlusCircle', 'AlertTriangle',
  'Calendar', 'MapPin', 'Wrench', 'Activity', 'CheckCircle2', 'Clock', 'AlertCircle'
];

const QRActionsAdmin = () => {
  const { toast } = useToast();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({ id: '', label: '', icon: 'ClipboardList', type: 'link', enabled: true, requires_auth: false });

  const loadActions = useCallback(async () => {
    try {
      const res = await api.get('/qr/actions');
      setActions(res.data || []);
    } catch (err) {
      console.error('Erreur chargement actions QR:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadActions(); }, [loadActions]);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await api.put('/qr/actions', { actions });
      toast({ title: 'Sauvegardé', description: 'Configuration des actions QR mise à jour' });
    } catch (err) {
      toast({ title: 'Erreur', description: err.response?.data?.detail || 'Erreur de sauvegarde', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openAddDialog = () => {
    setEditingIndex(null);
    setFormData({ id: '', label: '', icon: 'ClipboardList', type: 'link', enabled: true, requires_auth: false });
    setDialogOpen(true);
  };

  const openEditDialog = (index) => {
    setEditingIndex(index);
    setFormData({ ...actions[index] });
    setDialogOpen(true);
  };

  const handleSaveAction = () => {
    if (!formData.label.trim()) {
      toast({ title: 'Erreur', description: 'Le libellé est requis', variant: 'destructive' });
      return;
    }
    const newActions = [...actions];
    const action = {
      ...formData,
      id: formData.id || formData.label.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      order: editingIndex !== null ? actions[editingIndex].order : actions.length + 1
    };

    if (editingIndex !== null) {
      newActions[editingIndex] = action;
    } else {
      newActions.push(action);
    }
    setActions(newActions);
    setDialogOpen(false);
  };

  const handleDelete = (index) => {
    setActions(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleEnabled = (index) => {
    setActions(prev => prev.map((a, i) => i === index ? { ...a, enabled: !a.enabled } : a));
  };

  if (loading) return <Card><CardContent className="py-8 text-center text-gray-500">Chargement...</CardContent></Card>;

  return (
    <>
      <Card data-testid="qr-actions-admin">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <QrCode size={20} className="text-blue-600" />
              Actions QR Code — Équipements
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openAddDialog} data-testid="qr-add-action-btn">
                <Plus size={16} className="mr-1" /> Ajouter
              </Button>
              <Button size="sm" onClick={handleSaveAll} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="qr-save-actions-btn">
                <Save size={16} className="mr-1" /> {saving ? 'Enregistrement...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">Configurez les actions affichées sur la page QR des équipements</p>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-center text-gray-500 py-6">Aucune action configurée</p>
          ) : (
            <div className="space-y-2">
              {actions.map((action, idx) => (
                <div key={action.id || idx} className={`flex items-center gap-3 p-3 rounded-lg border ${action.enabled ? 'bg-white' : 'bg-gray-50 opacity-60'}`} data-testid={`qr-action-item-${action.id}`}>
                  <GripVertical size={16} className="text-gray-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{action.label}</span>
                      {action.requires_auth && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Auth requise</span>
                      )}
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{action.type}</span>
                    </div>
                  </div>
                  <Switch checked={action.enabled} onCheckedChange={() => handleToggleEnabled(idx)} />
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(idx)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(idx)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="qr-action-form-dialog">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? 'Modifier l\'action' : 'Nouvelle action'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Libellé</Label>
              <Input value={formData.label} onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))} placeholder="ex: Voir les KPI" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icône</Label>
                <Select value={formData.icon} onValueChange={v => setFormData(prev => ({ ...prev, icon: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(icon => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Lien (lecture seule)</SelectItem>
                    <SelectItem value="action">Action (écriture)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Authentification requise</Label>
              <Switch checked={formData.requires_auth} onCheckedChange={v => setFormData(prev => ({ ...prev, requires_auth: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveAction} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="qr-action-save-btn">
              {editingIndex !== null ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QRActionsAdmin;
