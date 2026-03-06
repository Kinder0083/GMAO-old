import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useToast } from '../hooks/use-toast';
import { SignaturePad } from '../components/shared/SignaturePad';
import {
  Lock, Unlock, Plus, Search, Shield, AlertTriangle, CheckCircle,
  XCircle, Clock, User, Zap, Droplets, Wind, Flame, FlaskConical,
  Cog, Trash2, Edit, Eye, KeyRound, LockKeyhole
} from 'lucide-react';
import api from '../services/api';

const API = process.env.REACT_APP_BACKEND_URL || '';

const ENERGY_TYPES = [
  { id: 'electrique', label: 'Electrique', icon: Zap, color: 'bg-yellow-100 text-yellow-800' },
  { id: 'hydraulique', label: 'Hydraulique', icon: Droplets, color: 'bg-blue-100 text-blue-800' },
  { id: 'pneumatique', label: 'Pneumatique', icon: Wind, color: 'bg-cyan-100 text-cyan-800' },
  { id: 'thermique', label: 'Thermique', icon: Flame, color: 'bg-red-100 text-red-800' },
  { id: 'chimique', label: 'Chimique', icon: FlaskConical, color: 'bg-purple-100 text-purple-800' },
  { id: 'mecanique', label: 'Mecanique', icon: Cog, color: 'bg-gray-100 text-gray-800' },
];

const STATUS_CONFIG = {
  DEMANDE: { label: 'Demande', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
  CONSIGNE: { label: 'Consigne', color: 'bg-red-100 text-red-800 border-red-300', icon: Lock },
  INTERVENTION: { label: 'Intervention', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: Cog },
  DECONSIGNE: { label: 'Deconsigne', color: 'bg-green-100 text-green-800 border-green-300', icon: Unlock },
  ANNULE: { label: 'Annule', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: XCircle },
};

const ISOLATION_TYPES = ['Disjoncteur', 'Vanne', 'Interrupteur', 'Sectionneur', 'Robinet', 'Bouchon', 'Autre'];

function getToken() { return localStorage.getItem('token'); }
function authHeaders() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

async function apiFetch(url, opts = {}) {
  const res = await fetch(`${API}${url}`, { ...opts, headers: { ...authHeaders(), ...opts.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur ${res.status}`);
  }
  return res.json();
}

// ===== Main Page =====
export default function ConsignationsLOTO() {
  const { toast } = useToast();
  const location = window.location;
  const [consignations, setConsignations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('active');

  // Appliquer le filtre depuis la navigation (header LOTO icon)
  // Utilise un key unique pour re-appliquer le filtre a chaque navigation
  useEffect(() => {
    try {
      const navState = window.history.state?.usr;
      if (navState?.filterStatus) {
        const status = navState.filterStatus;
        if (status === 'ACTIVE') {
          // Filtre spécial : CONSIGNE + INTERVENTION
          setFilterStatus('ACTIVE');
          setTab('active');
        } else if (status === 'DECONSIGNE') {
          setFilterStatus('DECONSIGNE');
          setTab('completed');
        } else {
          setFilterStatus(status);
          setTab('all');
        }
        // Nettoyer le state pour eviter de re-appliquer le filtre a chaque re-render
        window.history.replaceState({ ...window.history.state, usr: {} }, '');
      }
    } catch (e) { /* ignore */ }
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [data, s] = await Promise.all([
        apiFetch('/api/loto/'),
        apiFetch('/api/loto/stats')
      ]);
      setConsignations(data);
      setStats(s);
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = consignations.filter(c => {
    if (tab === 'active' && ['DECONSIGNE', 'ANNULE'].includes(c.status)) return false;
    if (tab === 'completed' && !['DECONSIGNE', 'ANNULE'].includes(c.status)) return false;
    // Filtre 'ACTIVE' = CONSIGNE + INTERVENTION
    if (filterStatus === 'ACTIVE' && !['CONSIGNE', 'INTERVENTION'].includes(c.status)) return false;
    if (filterStatus !== 'all' && filterStatus !== 'ACTIVE' && c.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.numero?.toLowerCase().includes(s) ||
        c.equipement_nom?.toLowerCase().includes(s) ||
        c.motif?.toLowerCase().includes(s);
    }
    return true;
  });

  if (selectedId) {
    return <LOTODetail id={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
  }

  return (
    <div className="space-y-6" data-testid="loto-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-600" /> Consignations LOTO
          </h1>
          <p className="text-sm text-gray-500 mt-1">Lockout/Tagout - Securite des interventions</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="loto-create-btn">
          <Plus className="w-4 h-4 mr-1" /> Nouvelle consignation
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="loto-stats">
          {[
            { label: 'Demandes', val: stats.demande, color: 'text-amber-600' },
            { label: 'Consignes', val: stats.consigne, color: 'text-red-600' },
            { label: 'Interventions', val: stats.intervention, color: 'text-orange-600' },
            { label: 'Deconsignes', val: stats.deconsigne, color: 'text-green-600' },
            { label: 'Total actives', val: stats.active, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="active">En cours</TabsTrigger>
            <TabsTrigger value="completed">Terminees</TabsTrigger>
            <TabsTrigger value="all">Toutes</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="loto-search"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="ACTIVE">Consignes actives</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Lock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            Aucune consignation trouvee
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">N</th>
                <th className="text-left p-3 font-medium">Equipement</th>
                <th className="text-left p-3 font-medium">Energies</th>
                <th className="text-left p-3 font-medium">Statut</th>
                <th className="text-left p-3 font-medium">Lie a</th>
                <th className="text-left p-3 font-medium">Cadenas</th>
                <th className="text-left p-3 font-medium">Demandeur</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(c => {
                const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.DEMANDE;
                const Icon = cfg.icon;
                const cadenasActifs = (c.cadenas || []).filter(p => !p.retire_at).length;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedId(c.id)} data-testid={`loto-row-${c.id}`}>
                    <td className="p-3 font-mono font-medium">{c.numero}</td>
                    <td className="p-3">{c.equipement_nom}</td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {(c.energy_types || []).map(e => {
                          const et = ENERGY_TYPES.find(t => t.id === e);
                          return et ? (
                            <span key={e} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${et.color}`}>
                              <et.icon className="w-3 h-3" />{et.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={`${cfg.color} border`}>
                        <Icon className="w-3 h-3 mr-1" />{cfg.label}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {c.linked_type && c.linked_numero ? (
                        <span>{c.linked_type === 'work_order' ? 'OT' : c.linked_type === 'preventive_maintenance' ? 'MP' : 'AM'} #{c.linked_numero}</span>
                      ) : '-'}
                    </td>
                    <td className="p-3">
                      {cadenasActifs > 0 ? (
                        <span className="flex items-center gap-1 text-red-600 font-medium">
                          <LockKeyhole className="w-4 h-4" />{cadenasActifs}
                        </span>
                      ) : <span className="text-gray-400">0</span>}
                    </td>
                    <td className="p-3 text-xs">{c.demandeur_nom}</td>
                    <td className="p-3 text-xs text-gray-500">{new Date(c.date_demande).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setSelectedId(c.id); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Dialog */}
      {showCreate && <LOTOCreateDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

// ===== Create Dialog =====
function LOTOCreateDialog({ open, onClose, onCreated }) {
  const { toast } = useToast();
  const [equipments, setEquipments] = useState([]);
  const [users, setUsers] = useState([]);
  const [linkedItems, setLinkedItems] = useState([]);
  const [loadingLinked, setLoadingLinked] = useState(false);
  const [form, setForm] = useState({
    equipement_id: '', equipement_nom: '', emplacement: '',
    linked_type: '', linked_id: '', linked_numero: '',
    energy_types: [], motif: '', notes: '',
    responsable_id: '', responsable_nom: '',
    duree_prevue_heures: '',
    isolation_points: [],
    intervenants: []
  });
  const [newPoint, setNewPoint] = useState({ name: '', type: 'Disjoncteur', location: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [eqRes, usersRes] = await Promise.all([
          fetch(`${API}/api/equipments`, { headers: authHeaders() }).then(r => r.json()),
          fetch(`${API}/api/users`, { headers: authHeaders() }).then(r => r.json())
        ]);
        setEquipments(Array.isArray(eqRes) ? eqRes : []);
        setUsers(Array.isArray(usersRes) ? usersRes : []);
      } catch (e) { console.error(e); }
    };
    loadData();
  }, []);

  // Charger les entités liées quand le type change
  useEffect(() => {
    if (!form.linked_type || form.linked_type === 'none') {
      setLinkedItems([]);
      return;
    }
    const loadLinked = async () => {
      setLoadingLinked(true);
      try {
        let url = '';
        if (form.linked_type === 'work_order') url = '/api/work-orders';
        else if (form.linked_type === 'preventive_maintenance') url = '/api/preventive-maintenance';
        else if (form.linked_type === 'improvement') url = '/api/improvement-requests';
        if (!url) return;
        const res = await fetch(`${API}${url}`, { headers: authHeaders() });
        let data = await res.json();
        if (!Array.isArray(data)) data = data.items || data.data || [];
        // Filtrer par statut ouvert/en attente/en cours
        const activeStatuses = ['EN_ATTENTE', 'EN_COURS', 'OUVERTE', 'OUVERT', 'PLANIFIEE', 'SOUMISE', 'VALIDEE', 'APPROUVEE', 'active', 'planned'];
        const filtered = data.filter(item => {
          const s = (item.statut || item.status || '').toUpperCase();
          return activeStatuses.some(st => s.includes(st)) || !s || s === '';
        });
        setLinkedItems(filtered);
      } catch (e) { console.error(e); }
      finally { setLoadingLinked(false); }
    };
    loadLinked();
  }, [form.linked_type]);

  const handleLinkedSelect = (itemId) => {
    const item = linkedItems.find(i => i.id === itemId);
    if (!item) return;
    const numero = item.numero || item.id?.slice(0, 8) || '';
    let eqId = '', eqNom = '', motif = '', duree = '';
    if (form.linked_type === 'work_order') {
      eqId = item.equipement?.id || item.equipement_id || '';
      eqNom = item.equipement?.nom || item.equipement_nom || '';
      motif = item.titre || item.description || '';
      duree = item.tempsEstime || item.duree_prevue || '';
    } else if (form.linked_type === 'preventive_maintenance') {
      eqId = item.equipement_id || '';
      eqNom = item.equipement_nom || '';
      motif = item.nom || item.description || '';
      duree = item.duree_estimee || '';
    } else if (form.linked_type === 'improvement') {
      eqId = item.equipement_id || '';
      eqNom = item.equipement_nom || '';
      motif = item.titre || item.objet || item.description || '';
    }
    setForm(f => ({
      ...f,
      linked_id: itemId,
      linked_numero: String(numero),
      equipement_id: eqId || f.equipement_id,
      equipement_nom: eqNom || f.equipement_nom,
      motif: motif || f.motif,
      duree_prevue_heures: duree ? String(duree) : f.duree_prevue_heures
    }));
  };

  const getLinkedLabel = (item) => {
    if (form.linked_type === 'work_order') return `#${item.numero || '?'} - ${item.titre || 'Sans titre'}`;
    if (form.linked_type === 'preventive_maintenance') return `${item.nom || item.description || item.id?.slice(0,8)}`;
    if (form.linked_type === 'improvement') return `${item.titre || item.objet || item.id?.slice(0,8)}`;
    return item.id;
  };

  const toggleEnergy = (id) => {
    setForm(f => ({
      ...f,
      energy_types: f.energy_types.includes(id)
        ? f.energy_types.filter(e => e !== id)
        : [...f.energy_types, id]
    }));
  };

  const addPoint = () => {
    if (!newPoint.name) return;
    setForm(f => ({ ...f, isolation_points: [...f.isolation_points, { ...newPoint, verified: false }] }));
    setNewPoint({ name: '', type: 'Disjoncteur', location: '' });
  };

  const removePoint = (idx) => {
    setForm(f => ({ ...f, isolation_points: f.isolation_points.filter((_, i) => i !== idx) }));
  };

  const toggleIntervenant = (user) => {
    setForm(f => {
      const exists = f.intervenants.find(i => i.id === user.id);
      return {
        ...f,
        intervenants: exists
          ? f.intervenants.filter(i => i.id !== user.id)
          : [...f.intervenants, { id: user.id, nom: user.name || user.email }]
      };
    });
  };

  const handleEquipChange = (eqId) => {
    const eq = equipments.find(e => e.id === eqId);
    setForm(f => ({
      ...f,
      equipement_id: eqId,
      equipement_nom: eq?.nom || '',
      emplacement: eq?.emplacement?.nom || eq?.localisation || ''
    }));
  };

  const handleSubmit = async () => {
    if (!form.equipement_id || !form.responsable_id || form.energy_types.length === 0) {
      toast({ title: 'Champs requis', description: 'Equipement, responsable et type(s) d\'energie sont obligatoires', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      const resp = await apiFetch('/api/loto/', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          duree_prevue_heures: form.duree_prevue_heures ? parseFloat(form.duree_prevue_heures) : null,
          linked_type: form.linked_type || null,
          linked_id: form.linked_id || null,
          linked_numero: form.linked_numero || null
        })
      });
      toast({ title: 'Consignation creee', description: `${resp.numero} - ${resp.equipement_nom}` });
      onCreated();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="loto-create-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" /> Nouvelle consignation LOTO
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Equipment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Equipement *</Label>
              <Select value={form.equipement_id} onValueChange={handleEquipChange}>
                <SelectTrigger data-testid="loto-eq-select"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {equipments.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsable consignation *</Label>
              <Select value={form.responsable_id} onValueChange={v => {
                const u = users.find(u => u.id === v);
                setForm(f => ({ ...f, responsable_id: v, responsable_nom: u?.name || u?.email || '' }));
              }}>
                <SelectTrigger data-testid="loto-resp-select"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Link to WO/PM/Improvement */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lie a (optionnel)</Label>
              <Select value={form.linked_type} onValueChange={v => setForm(f => ({ ...f, linked_type: v, linked_id: '', linked_numero: '' }))}>
                <SelectTrigger><SelectValue placeholder="Aucun lien" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun lien</SelectItem>
                  <SelectItem value="work_order">Ordre de travail</SelectItem>
                  <SelectItem value="preventive_maintenance">Maintenance prev.</SelectItem>
                  <SelectItem value="improvement">Amelioration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{form.linked_type === 'work_order' ? 'Ordre de travail' : form.linked_type === 'preventive_maintenance' ? 'Maintenance prev.' : form.linked_type === 'improvement' ? 'Amelioration' : 'Numero'}</Label>
              {form.linked_type && form.linked_type !== 'none' ? (
                <Select value={form.linked_id} onValueChange={handleLinkedSelect}>
                  <SelectTrigger data-testid="loto-linked-select">
                    <SelectValue placeholder={loadingLinked ? 'Chargement...' : 'Selectionner...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {linkedItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>{getLinkedLabel(item)}</SelectItem>
                    ))}
                    {linkedItems.length === 0 && !loadingLinked && (
                      <div className="px-3 py-2 text-sm text-gray-500">Aucun element ouvert/en cours</div>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input disabled placeholder="Selectionnez un type" />
              )}
            </div>
          </div>

          {/* Energy types */}
          <div>
            <Label>Types d'energie a isoler *</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ENERGY_TYPES.map(et => (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => toggleEnergy(et.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all
                    ${form.energy_types.includes(et.id) ? et.color + ' border-current font-medium' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                  data-testid={`energy-${et.id}`}
                >
                  <et.icon className="w-4 h-4" /> {et.label}
                </button>
              ))}
            </div>
          </div>

          {/* Isolation Points */}
          <div>
            <Label>Points d'isolation</Label>
            <div className="flex gap-2 mt-2">
              <Input placeholder="Nom du point" value={newPoint.name} onChange={e => setNewPoint(p => ({ ...p, name: e.target.value }))} className="flex-1" />
              <Select value={newPoint.type} onValueChange={v => setNewPoint(p => ({ ...p, type: v }))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ISOLATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Localisation" value={newPoint.location} onChange={e => setNewPoint(p => ({ ...p, location: e.target.value }))} className="w-36" />
              <Button type="button" size="sm" onClick={addPoint} data-testid="add-point-btn"><Plus className="w-4 h-4" /></Button>
            </div>
            {form.isolation_points.length > 0 && (
              <div className="mt-2 space-y-1">
                {form.isolation_points.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-1.5 text-sm">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="outline" className="text-xs">{p.type}</Badge>
                    {p.location && <span className="text-gray-500">{p.location}</span>}
                    <button onClick={() => removePoint(i)} className="ml-auto text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Intervenants */}
          <div>
            <Label>Intervenants autorises</Label>
            <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
              {users.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleIntervenant(u)}
                  className={`px-2.5 py-1 rounded-full border text-xs transition-all ${
                    form.intervenants.find(i => i.id === u.id)
                      ? 'bg-blue-100 text-blue-800 border-blue-300 font-medium'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <User className="w-3 h-3 inline mr-1" />{u.name || u.email}
                </button>
              ))}
            </div>
          </div>

          {/* Motif & Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Motif</Label>
              <Input value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))} placeholder="Raison de la consignation" />
            </div>
            <div>
              <Label>Duree prevue (heures)</Label>
              <Input type="number" value={form.duree_prevue_heures} onChange={e => setForm(f => ({ ...f, duree_prevue_heures: e.target.value }))} placeholder="Ex: 4" />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <textarea className="w-full border rounded-lg p-2 text-sm min-h-[60px]" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Instructions supplementaires..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting} data-testid="loto-submit-btn">
            {submitting ? 'Creation...' : 'Creer la consignation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Detail View =====
function LOTODetail({ id, onBack }) {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignature, setShowSignature] = useState(null); // { action: 'consigner' | 'deconsigner' | ... }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const doc = await apiFetch(`/api/loto/${id}`);
      setData(doc);
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [id, toast]);

  useEffect(() => { load(); }, [load]);

  const executeAction = async (action, sigResult) => {
    try {
      const body = {
        action,
        notes: '',
        signature: sigResult?.signature ? {
          data: sigResult.signature,
          pin_validated: !!sigResult.pin
        } : null,
        pin: sigResult?.pin || null
      };
      await apiFetch(`/api/loto/${id}/workflow`, { method: 'POST', body: JSON.stringify(body) });
      toast({ title: 'Action effectuee', description: `${action} reussi` });
      setShowSignature(null);
      load();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const handleCadenas = async (action, sig) => {
    try {
      await apiFetch(`/api/loto/${id}/cadenas`, {
        method: 'POST',
        body: JSON.stringify({ action, signature: sig || null })
      });
      toast({ title: action === 'poser' ? 'Cadenas pose' : 'Cadenas retire' });
      load();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  const verifyPoint = async (idx, verified) => {
    try {
      await apiFetch(`/api/loto/${id}/verify-point`, {
        method: 'POST',
        body: JSON.stringify({ point_index: idx, verified })
      });
      load();
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    }
  };

  if (loading || !data) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

  const cfg = STATUS_CONFIG[data.status] || STATUS_CONFIG.DEMANDE;
  const StatusIcon = cfg.icon;
  const cadenasActifs = (data.cadenas || []).filter(c => !c.retire_at);
  const allPointsVerified = (data.isolation_points || []).every(p => p.verified);

  return (
    <div className="space-y-6" data-testid="loto-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-1 block">&larr; Retour</button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-red-600" /> {data.numero}
          </h1>
          <p className="text-gray-500">{data.equipement_nom} {data.emplacement ? `- ${data.emplacement}` : ''}</p>
        </div>
        <Badge className={`${cfg.color} border text-base px-3 py-1`}>
          <StatusIcon className="w-4 h-4 mr-1" /> {cfg.label}
        </Badge>
      </div>

      {/* Workflow Steps */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold mb-3">Progression</h3>
        <div className="flex items-center gap-2">
          {['DEMANDE', 'CONSIGNE', 'INTERVENTION', 'DECONSIGNE'].map((step, i) => {
            const stepCfg = STATUS_CONFIG[step];
            const StepIcon = stepCfg.icon;
            const isActive = data.status === step;
            const isPast = ['DEMANDE', 'CONSIGNE', 'INTERVENTION', 'DECONSIGNE'].indexOf(data.status) > i;
            return (
              <React.Fragment key={step}>
                {i > 0 && <div className={`flex-1 h-1 rounded ${isPast || isActive ? 'bg-green-400' : 'bg-gray-200'}`} />}
                <div className={`flex flex-col items-center ${isActive ? 'scale-110' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isPast ? 'bg-green-100 border-green-400 text-green-700' :
                    isActive ? `${stepCfg.color} border-current` :
                    'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    {isPast ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs mt-1 text-center">{stepCfg.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info Panel */}
        <div className="space-y-4">
          {/* Energy Types */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Energies a isoler</h3>
            <div className="flex flex-wrap gap-2">
              {(data.energy_types || []).map(e => {
                const et = ENERGY_TYPES.find(t => t.id === e);
                return et ? (
                  <span key={e} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${et.color}`}>
                    <et.icon className="w-4 h-4" />{et.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>

          {/* Isolation Points */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Points d'isolation ({(data.isolation_points || []).filter(p => p.verified).length}/{(data.isolation_points || []).length} verifies)</h3>
            <div className="space-y-2">
              {(data.isolation_points || []).map((p, i) => (
                <div key={i} className={`flex items-center gap-3 p-2 rounded ${p.verified ? 'bg-green-50' : 'bg-gray-50'}`}>
                  {data.status === 'DEMANDE' ? (
                    <button
                      onClick={() => verifyPoint(i, !p.verified)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${p.verified ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}
                      data-testid={`verify-point-${i}`}
                    >
                      {p.verified && <CheckCircle className="w-3 h-3" />}
                    </button>
                  ) : (
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${p.verified ? 'text-green-500' : 'text-gray-300'}`}>
                      {p.verified ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>
                  )}
                  <span className="font-medium text-sm">{p.name}</span>
                  <Badge variant="outline" className="text-xs">{p.type}</Badge>
                  {p.location && <span className="text-xs text-gray-500">{p.location}</span>}
                </div>
              ))}
              {(data.isolation_points || []).length === 0 && (
                <p className="text-sm text-gray-500">Aucun point d'isolation defini</p>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="bg-white rounded-lg border p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Demandeur</span><span className="font-medium">{data.demandeur_nom}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Responsable</span><span className="font-medium">{data.responsable_nom}</span></div>
            {data.linked_numero && <div className="flex justify-between"><span className="text-gray-500">Lie a</span><span className="font-medium">{data.linked_type === 'work_order' ? 'OT' : data.linked_type === 'preventive_maintenance' ? 'MP' : 'AM'} #{data.linked_numero}</span></div>}
            {data.motif && <div className="flex justify-between"><span className="text-gray-500">Motif</span><span>{data.motif}</span></div>}
            {data.duree_prevue_heures && <div className="flex justify-between"><span className="text-gray-500">Duree prevue</span><span>{data.duree_prevue_heures}h</span></div>}
            {data.notes && <div><span className="text-gray-500 block">Notes:</span><span>{data.notes}</span></div>}
          </div>
        </div>

        {/* Actions & Cadenas Panel */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Actions</h3>
            <div className="space-y-2">
              {data.status === 'DEMANDE' && (
                <Button className="w-full bg-red-600 hover:bg-red-700" disabled={!allPointsVerified}
                  onClick={() => setShowSignature({ action: 'consigner' })} data-testid="loto-action-consigner">
                  <Lock className="w-4 h-4 mr-2" /> Consigner l'equipement
                  {!allPointsVerified && <span className="ml-2 text-xs opacity-75">(verifier tous les points)</span>}
                </Button>
              )}
              {data.status === 'CONSIGNE' && (
                <Button className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={() => executeAction('debut_intervention', {})} data-testid="loto-action-intervention">
                  <Cog className="w-4 h-4 mr-2" /> Demarrer l'intervention
                </Button>
              )}
              {['CONSIGNE', 'INTERVENTION'].includes(data.status) && (
                <Button className="w-full bg-green-600 hover:bg-green-700" disabled={cadenasActifs.length > 0}
                  onClick={() => setShowSignature({ action: 'deconsigner' })} data-testid="loto-action-deconsigner">
                  <Unlock className="w-4 h-4 mr-2" /> Deconsigner
                  {cadenasActifs.length > 0 && <span className="ml-2 text-xs opacity-75">({cadenasActifs.length} cadenas actif(s))</span>}
                </Button>
              )}
              {!['DECONSIGNE', 'ANNULE'].includes(data.status) && (
                <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => executeAction('annuler', {})} data-testid="loto-action-annuler">
                  <XCircle className="w-4 h-4 mr-2" /> Annuler
                </Button>
              )}
            </div>
          </div>

          {/* Cadenas */}
          {['CONSIGNE', 'INTERVENTION'].includes(data.status) && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <LockKeyhole className="w-5 h-5 text-red-600" /> Cadenas ({cadenasActifs.length} actif(s))
              </h3>
              <div className="space-y-2 mb-3">
                {(data.cadenas || []).map((c, i) => (
                  <div key={i} className={`flex items-center justify-between p-2 rounded text-sm ${c.retire_at ? 'bg-gray-50 text-gray-500' : 'bg-red-50'}`}>
                    <div className="flex items-center gap-2">
                      {c.retire_at ? <Unlock className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-red-600" />}
                      <span className="font-medium">{c.owner_nom}</span>
                    </div>
                    <div className="text-xs">
                      {c.retire_at ? (
                        <span className="text-green-600">Retire le {new Date(c.retire_at).toLocaleString('fr-FR')}</span>
                      ) : (
                        <span className="text-red-600">Pose le {new Date(c.pose_at).toLocaleString('fr-FR')}</span>
                      )}
                    </div>
                  </div>
                ))}
                {(data.cadenas || []).length === 0 && (
                  <p className="text-sm text-gray-500">Aucun cadenas pose</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleCadenas('poser')} data-testid="cadenas-poser">
                  <Lock className="w-3 h-3 mr-1" /> Poser mon cadenas
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleCadenas('retirer')} data-testid="cadenas-retirer">
                  <Unlock className="w-3 h-3 mr-1" /> Retirer mon cadenas
                </Button>
              </div>
            </div>
          )}

          {/* Intervenants */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Intervenants autorises</h3>
            <div className="flex flex-wrap gap-2">
              {(data.intervenants || []).map(i => (
                <Badge key={i.id} variant="outline" className="bg-blue-50">{i.nom}</Badge>
              ))}
              {(data.intervenants || []).length === 0 && <span className="text-sm text-gray-500">Non defini</span>}
            </div>
          </div>

          {/* Signatures */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Signatures</h3>
            <div className="space-y-3">
              {data.signature_consignation ? (
                <div className="text-sm">
                  <div className="flex justify-between text-gray-500 mb-1">
                    <span>Consignation</span>
                    <span>{new Date(data.signature_consignation.timestamp).toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">{data.signature_consignation.signer_nom}</span>
                    {data.signature_consignation.pin_validated && <Badge variant="outline" className="text-xs"><KeyRound className="w-3 h-3 mr-1" />PIN</Badge>}
                  </div>
                  {data.signature_consignation.data && (
                    <img src={data.signature_consignation.data} alt="Signature" className="h-16 mt-1 border rounded" />
                  )}
                </div>
              ) : <p className="text-xs text-gray-400">Pas de signature de consignation</p>}
              {data.signature_deconsignation ? (
                <div className="text-sm border-t pt-3">
                  <div className="flex justify-between text-gray-500 mb-1">
                    <span>Deconsignation</span>
                    <span>{new Date(data.signature_deconsignation.timestamp).toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">{data.signature_deconsignation.signer_nom}</span>
                    {data.signature_deconsignation.pin_validated && <Badge variant="outline" className="text-xs"><KeyRound className="w-3 h-3 mr-1" />PIN</Badge>}
                  </div>
                  {data.signature_deconsignation.data && (
                    <img src={data.signature_deconsignation.data} alt="Signature" className="h-16 mt-1 border rounded" />
                  )}
                </div>
              ) : <p className="text-xs text-gray-400 border-t pt-3">Pas de signature de deconsignation</p>}
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Historique</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(data.historique || []).slice().reverse().map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-sm border-b last:border-0 pb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{h.action}</span>
                    <span className="text-gray-500 ml-2">{h.user_nom}</span>
                    <p className="text-xs text-gray-500">{h.details}</p>
                    <p className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Signature Dialog */}
      {showSignature && (
        <SignaturePad
          open={!!showSignature}
          onClose={() => setShowSignature(null)}
          onConfirm={(result) => executeAction(showSignature.action, result)}
          title={showSignature.action === 'consigner' ? 'Signature de consignation' : 'Signature de deconsignation'}
        />
      )}
    </div>
  );
}
