import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { Sparkles, Wrench, Bug, Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../../services/api';

const typeOptions = [
  { value: 'feature', label: 'Nouveau', icon: Sparkles, color: 'text-emerald-600' },
  { value: 'improvement', label: 'Amélioration', icon: Wrench, color: 'text-blue-600' },
  { value: 'fix', label: 'Correction', icon: Bug, color: 'text-amber-600' },
];

const typeBadgeClasses = {
  feature: 'bg-emerald-100 text-emerald-700',
  improvement: 'bg-blue-100 text-blue-700',
  fix: 'bg-amber-100 text-amber-700',
};

const ChangelogAdmin = () => {
  const { toast } = useToast();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyEntry = { type: 'feature', title: '', description: '' };
  const [formData, setFormData] = useState({
    version: '',
    date: new Date().toISOString().split('T')[0],
    entries: [{ ...emptyEntry }]
  });

  const loadReleases = useCallback(async () => {
    try {
      const res = await api.get('/releases');
      setReleases(res.data.releases || []);
    } catch (err) {
      console.error('Erreur chargement changelog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReleases(); }, [loadReleases]);

  const openCreateDialog = () => {
    setEditingRelease(null);
    setFormData({
      version: '',
      date: new Date().toISOString().split('T')[0],
      entries: [{ ...emptyEntry }]
    });
    setDialogOpen(true);
  };

  const openEditDialog = (release) => {
    setEditingRelease(release);
    setFormData({
      version: release.version,
      date: release.date,
      entries: release.entries.map(e => ({ ...e }))
    });
    setDialogOpen(true);
  };

  const addEntry = () => {
    setFormData(prev => ({ ...prev, entries: [...prev.entries, { ...emptyEntry }] }));
  };

  const removeEntry = (idx) => {
    if (formData.entries.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== idx)
    }));
  };

  const updateEntry = (idx, field, value) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.map((e, i) => i === idx ? { ...e, [field]: value } : e)
    }));
  };

  const handleSave = async () => {
    if (!formData.version.trim()) {
      toast({ title: 'Erreur', description: 'Le numéro de version est requis', variant: 'destructive' });
      return;
    }
    const validEntries = formData.entries.filter(e => e.title.trim());
    if (validEntries.length === 0) {
      toast({ title: 'Erreur', description: 'Au moins une entrée avec un titre est requise', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = { ...formData, entries: validEntries };
      if (editingRelease) {
        await api.put(`/releases/${editingRelease.id}`, payload);
        toast({ title: 'Version modifiée', description: `v${formData.version} mise à jour` });
      } else {
        await api.post('/releases', payload);
        toast({ title: 'Version ajoutée', description: `v${formData.version} créée` });
      }
      setDialogOpen(false);
      loadReleases();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erreur lors de la sauvegarde';
      toast({ title: 'Erreur', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (release) => {
    if (!window.confirm(`Supprimer la version ${release.version} ?`)) return;
    try {
      await api.delete(`/releases/${release.id}`);
      toast({ title: 'Supprimé', description: `v${release.version} supprimée` });
      loadReleases();
    } catch (err) {
      toast({ title: 'Erreur', description: 'Erreur lors de la suppression', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">Chargement...</CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="changelog-admin">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles size={20} className="text-blue-600" />
              Changelog — Quoi de neuf ?
            </CardTitle>
            <Button onClick={openCreateDialog} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="changelog-add-btn">
              <Plus size={16} className="mr-1" /> Nouvelle version
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {releases.length === 0 ? (
            <p className="text-center text-gray-500 py-6">Aucune version dans le changelog</p>
          ) : (
            <div className="space-y-4">
              {releases.map((release) => (
                <div key={release.id} className="border rounded-lg p-4 hover:border-blue-200 transition-colors" data-testid={`changelog-admin-release-${release.version}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900">v{release.version}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(release.date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-xs text-gray-400">{release.entries?.length || 0} entrée(s)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(release)} data-testid={`changelog-edit-${release.version}`}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(release)} className="text-red-500 hover:text-red-700" data-testid={`changelog-delete-${release.version}`}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(release.entries || []).map((entry, i) => (
                      <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${typeBadgeClasses[entry.type] || typeBadgeClasses.feature}`}>
                        {entry.title}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de création/édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="changelog-form-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingRelease ? `Modifier v${editingRelease.version}` : 'Nouvelle version'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Numéro de version</Label>
                <Input
                  value={formData.version}
                  onChange={e => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="ex: 1.8.0"
                  data-testid="changelog-version-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  data-testid="changelog-date-input"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Entrées</Label>
                <Button variant="outline" size="sm" onClick={addEntry} data-testid="changelog-add-entry-btn">
                  <Plus size={14} className="mr-1" /> Ajouter
                </Button>
              </div>

              {formData.entries.map((entry, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-gray-50" data-testid={`changelog-entry-form-${idx}`}>
                  <div className="flex items-center gap-2">
                    <Select value={entry.type} onValueChange={v => updateEntry(idx, 'type', v)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-1">
                              <opt.icon size={14} className={opt.color} />
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={entry.title}
                      onChange={e => updateEntry(idx, 'title', e.target.value)}
                      placeholder="Titre"
                      className="flex-1"
                    />
                    {formData.entries.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeEntry(idx)} className="text-gray-400 hover:text-red-500">
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={entry.description}
                    onChange={e => updateEntry(idx, 'description', e.target.value)}
                    placeholder="Description (optionnelle)"
                    rows={2}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="changelog-save-btn">
              {saving ? 'Enregistrement...' : (editingRelease ? 'Modifier' : 'Créer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChangelogAdmin;
