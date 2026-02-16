import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, Search, FileSignature, Building2, AlertTriangle, Calendar, 
  Euro, Trash2, Edit, Eye, Upload, Download, Paperclip, X, 
  FileText, Sparkles, Loader2, Bell, ChevronDown, ChevronUp
} from 'lucide-react';
import { contractsAPI, vendorsAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { useConfirmDialog } from '../components/ui/confirm-dialog';

const TYPE_LABELS = {
  maintenance: 'Maintenance',
  service: 'Service',
  location: 'Location',
  prestation: 'Prestation',
  autre: 'Autre'
};

const TYPE_COLORS = {
  maintenance: 'bg-blue-100 text-blue-800',
  service: 'bg-purple-100 text-purple-800',
  location: 'bg-amber-100 text-amber-800',
  prestation: 'bg-green-100 text-green-800',
  autre: 'bg-gray-100 text-gray-800'
};

const STATUT_LABELS = {
  actif: 'Actif',
  expire: 'Expiré',
  resilie: 'Résilié',
  en_renouvellement: 'En renouvellement'
};

const STATUT_COLORS = {
  actif: 'bg-green-100 text-green-800',
  expire: 'bg-red-100 text-red-800',
  resilie: 'bg-gray-100 text-gray-800',
  en_renouvellement: 'bg-amber-100 text-amber-800'
};

const PERIODICITE_LABELS = {
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  annuel: 'Annuel'
};

const emptyForm = {
  numero_contrat: '', titre: '', type_contrat: 'maintenance', statut: 'actif',
  date_etablissement: '', date_debut: '', date_fin: '',
  montant_total: '', periodicite_paiement: 'mensuel', montant_periode: '', mode_paiement: '',
  fournisseur_id: '', fournisseur_nom: '', fournisseur_adresse: '', fournisseur_telephone: '',
  fournisseur_email: '', fournisseur_site_web: '',
  contact_nom: '', contact_telephone: '', contact_email: '',
  signataire_interne_id: '', signataire_interne_nom: '', commande_interne: '',
  alerte_echeance_jours: 30, alerte_resiliation_jours: '', alerte_paiement: false,
  notes: ''
};

export default function Contracts() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatut !== 'all') params.statut = filterStatut;
      if (filterType !== 'all') params.type_contrat = filterType;
      if (search) params.search = search;

      const [contractsData, statsData, alertsData, vendorsData] = await Promise.all([
        contractsAPI.getContracts(params),
        contractsAPI.getStats(),
        contractsAPI.getAlerts(),
        vendorsAPI ? vendorsAPI.getAll().then(res => res.data || []).catch(() => []) : Promise.resolve([])
      ]);
      setContracts(contractsData);
      setStats(statsData);
      setAlerts(alertsData);
      setVendors(vendorsData);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors du chargement des contrats', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filterStatut, filterType, search, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleVendorSelect = (vendorId) => {
    if (vendorId === 'none') {
      setFormData(prev => ({ ...prev, fournisseur_id: '', fournisseur_nom: '', fournisseur_adresse: '', fournisseur_telephone: '', fournisseur_email: '' }));
      return;
    }
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      setFormData(prev => ({
        ...prev,
        fournisseur_id: vendor.id,
        fournisseur_nom: vendor.nom,
        fournisseur_adresse: vendor.adresse || '',
        fournisseur_telephone: vendor.telephone || '',
        fournisseur_email: vendor.email || '',
        contact_nom: vendor.contact || ''
      }));
    }
  };

  const handleCreate = () => {
    setSelectedContract(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const handleEdit = (contract) => {
    setSelectedContract(contract);
    setFormData({
      ...emptyForm,
      ...Object.fromEntries(Object.entries(contract).filter(([_, v]) => v !== null && v !== undefined).map(([k, v]) => [k, v]))
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.numero_contrat || !formData.titre) {
      toast({ title: 'Erreur', description: 'Le numéro et le titre sont requis', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        montant_total: formData.montant_total ? parseFloat(formData.montant_total) : null,
        montant_periode: formData.montant_periode ? parseFloat(formData.montant_periode) : null,
        alerte_echeance_jours: parseInt(formData.alerte_echeance_jours) || 30,
        alerte_resiliation_jours: formData.alerte_resiliation_jours ? parseInt(formData.alerte_resiliation_jours) : null,
      };

      if (selectedContract) {
        await contractsAPI.updateContract(selectedContract.id, payload);
        toast({ title: 'Succès', description: 'Contrat mis à jour' });
      } else {
        await contractsAPI.createContract(payload);
        toast({ title: 'Succès', description: 'Contrat créé' });
      }
      setShowForm(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Erreur', description: error.response?.data?.detail || 'Erreur lors de la sauvegarde', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (contract) => {
    confirm({
      title: 'Supprimer le contrat',
      description: `Êtes-vous sûr de vouloir supprimer "${contract.titre}" ?`,
      confirmText: 'Supprimer',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await contractsAPI.deleteContract(contract.id);
          toast({ title: 'Succès', description: 'Contrat supprimé' });
          fetchData();
        } catch (error) {
          toast({ title: 'Erreur', description: 'Erreur lors de la suppression', variant: 'destructive' });
        }
      }
    });
  };

  const handleViewDetail = async (contract) => {
    try {
      const detail = await contractsAPI.getContract(contract.id);
      setSelectedContract(detail);
      setShowDetail(true);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors du chargement du détail', variant: 'destructive' });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedContract) return;
    setUploading(true);
    try {
      await contractsAPI.uploadFile(selectedContract.id, file);
      const updated = await contractsAPI.getContract(selectedContract.id);
      setSelectedContract(updated);
      toast({ title: 'Succès', description: 'Fichier ajouté' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors de l\'upload', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileDownload = async (fileId, filename) => {
    try {
      const response = await contractsAPI.downloadFile(selectedContract.id, fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors du téléchargement', variant: 'destructive' });
    }
  };

  const handleFileDelete = async (fileId) => {
    try {
      await contractsAPI.deleteFile(selectedContract.id, fileId);
      const updated = await contractsAPI.getContract(selectedContract.id);
      setSelectedContract(updated);
      toast({ title: 'Succès', description: 'Fichier supprimé' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors de la suppression', variant: 'destructive' });
    }
  };

  const handleAIExtract = async (file) => {
    setExtracting(true);
    try {
      const result = await contractsAPI.extractWithAI(file);
      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(result.data).filter(([_, v]) => v !== null && v !== undefined).map(([k, v]) => [k, String(v)])
          )
        }));
        toast({ title: 'Extraction réussie', description: 'Les informations ont été pré-remplies. Vérifiez et complétez si nécessaire.' });
      } else {
        toast({ title: 'Erreur', description: result.error || 'Extraction échouée', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors de l\'extraction IA', variant: 'destructive' });
    } finally {
      setExtracting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
    } catch { return dateStr; }
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const getDaysRemaining = (dateFinStr) => {
    if (!dateFinStr) return null;
    const now = new Date();
    const end = new Date(dateFinStr);
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-6 space-y-6" data-testid="contracts-page">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSignature className="w-8 h-8 text-blue-600" />
            Contrats
          </h1>
          <p className="text-gray-500 mt-1">Gestion des contrats fournisseurs</p>
        </div>
        <div className="flex gap-2">
          {alerts.length > 0 && (
            <Button variant="outline" onClick={() => setShowAlerts(true)} className="relative" data-testid="alerts-btn">
              <Bell className="w-4 h-4 mr-2" />
              Alertes
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {alerts.length}
              </span>
            </Button>
          )}
          <Button onClick={handleCreate} data-testid="create-contract-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau contrat
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.actifs}</p>
            <p className="text-sm text-gray-500">Actifs</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.expires}</p>
            <p className="text-sm text-gray-500">Expirés</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.expirant_bientot}</p>
            <p className="text-sm text-gray-500">Expirant bientôt</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.cout_mensuel)}</p>
            <p className="text-sm text-gray-500">Coût mensuel</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.cout_annuel)}</p>
            <p className="text-sm text-gray-500">Coût annuel</p>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full" data-testid="search-input" />
            </div>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="w-[180px]" data-testid="filter-statut"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]" data-testid="filter-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileSignature className="w-16 h-16 mb-4" />
              <p>Aucun contrat trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Contrat</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Montant/période</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map(c => {
                  const days = getDaysRemaining(c.date_fin);
                  return (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-gray-50" data-testid={`contract-row-${c.id}`}>
                      <TableCell className="font-mono text-sm" onClick={() => handleViewDetail(c)}>{c.numero_contrat}</TableCell>
                      <TableCell className="font-medium" onClick={() => handleViewDetail(c)}>{c.titre}</TableCell>
                      <TableCell onClick={() => handleViewDetail(c)}>
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          {c.fournisseur_nom || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={TYPE_COLORS[c.type_contrat] || 'bg-gray-100'}>{TYPE_LABELS[c.type_contrat] || c.type_contrat}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUT_COLORS[c.statut] || 'bg-gray-100'}>{STATUT_LABELS[c.statut] || c.statut}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{formatDate(c.date_fin)}</span>
                          {days !== null && c.statut === 'actif' && (
                            <span className={`text-xs ml-1 ${days <= 0 ? 'text-red-600 font-bold' : days <= 30 ? 'text-amber-600' : 'text-gray-400'}`}>
                              ({days <= 0 ? 'expiré' : `${days}j`})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.montant_periode ? `${formatCurrency(c.montant_periode)} / ${PERIODICITE_LABELS[c.periodicite_paiement] || c.periodicite_paiement}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleViewDetail(c)} data-testid={`view-${c.id}`}><Eye className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(c)} data-testid={`edit-${c.id}`}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(c)} data-testid={`delete-${c.id}`}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE/EDIT FORM DIALOG */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="contract-form-dialog">
          <DialogHeader>
            <DialogTitle>{selectedContract ? 'Modifier le contrat' : 'Nouveau contrat'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            {/* AI Extraction */}
            {!selectedContract && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-800">Extraction IA</span>
                </div>
                <p className="text-sm text-purple-600 mb-3">Importez un contrat (PDF/image) pour pré-remplir automatiquement les champs</p>
                <div className="flex gap-2">
                  <Input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" data-testid="ai-extract-input"
                    onChange={(e) => e.target.files[0] && handleAIExtract(e.target.files[0])} disabled={extracting} />
                  {extracting && <Loader2 className="w-5 h-5 animate-spin text-purple-600" />}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Infos de base */}
              <div className="space-y-3 md:col-span-2">
                <h3 className="font-semibold text-gray-700 border-b pb-1">Informations générales</h3>
              </div>
              <div>
                <Label>N° Contrat *</Label>
                <Input value={formData.numero_contrat} onChange={e => setFormData(p => ({...p, numero_contrat: e.target.value}))} required data-testid="input-numero" />
              </div>
              <div>
                <Label>Titre / Objet *</Label>
                <Input value={formData.titre} onChange={e => setFormData(p => ({...p, titre: e.target.value}))} required data-testid="input-titre" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={formData.type_contrat} onValueChange={v => setFormData(p => ({...p, type_contrat: v}))}>
                  <SelectTrigger data-testid="input-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={formData.statut} onValueChange={v => setFormData(p => ({...p, statut: v}))}>
                  <SelectTrigger data-testid="input-statut"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="space-y-3 md:col-span-2">
                <h3 className="font-semibold text-gray-700 border-b pb-1">Dates</h3>
              </div>
              <div>
                <Label>Date d'établissement</Label>
                <Input type="date" value={formData.date_etablissement} onChange={e => setFormData(p => ({...p, date_etablissement: e.target.value}))} data-testid="input-date-etab" />
              </div>
              <div>
                <Label>Date de début</Label>
                <Input type="date" value={formData.date_debut} onChange={e => setFormData(p => ({...p, date_debut: e.target.value}))} data-testid="input-date-debut" />
              </div>
              <div>
                <Label>Date de fin</Label>
                <Input type="date" value={formData.date_fin} onChange={e => setFormData(p => ({...p, date_fin: e.target.value}))} data-testid="input-date-fin" />
              </div>

              {/* Finances */}
              <div className="space-y-3 md:col-span-2">
                <h3 className="font-semibold text-gray-700 border-b pb-1">Informations financières</h3>
              </div>
              <div>
                <Label>Montant total (EUR)</Label>
                <Input type="number" step="0.01" value={formData.montant_total} onChange={e => setFormData(p => ({...p, montant_total: e.target.value}))} data-testid="input-montant-total" />
              </div>
              <div>
                <Label>Périodicité</Label>
                <Select value={formData.periodicite_paiement} onValueChange={v => setFormData(p => ({...p, periodicite_paiement: v}))}>
                  <SelectTrigger data-testid="input-periodicite"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERIODICITE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Montant par période (EUR)</Label>
                <Input type="number" step="0.01" value={formData.montant_periode} onChange={e => setFormData(p => ({...p, montant_periode: e.target.value}))} data-testid="input-montant-periode" />
              </div>
              <div>
                <Label>Mode de paiement</Label>
                <Input value={formData.mode_paiement} onChange={e => setFormData(p => ({...p, mode_paiement: e.target.value}))} placeholder="Virement, prélèvement..." data-testid="input-mode-paiement" />
              </div>

              {/* Fournisseur */}
              <div className="space-y-3 md:col-span-2">
                <h3 className="font-semibold text-gray-700 border-b pb-1">Fournisseur</h3>
              </div>
              <div className="md:col-span-2">
                <Label>Sélectionner un fournisseur existant</Label>
                <Select value={formData.fournisseur_id || 'none'} onValueChange={handleVendorSelect}>
                  <SelectTrigger data-testid="input-vendor-select"><SelectValue placeholder="Saisie manuelle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Saisie manuelle --</SelectItem>
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nom de la société</Label>
                <Input value={formData.fournisseur_nom} onChange={e => setFormData(p => ({...p, fournisseur_nom: e.target.value}))} data-testid="input-fournisseur-nom" />
              </div>
              <div>
                <Label>Adresse</Label>
                <Input value={formData.fournisseur_adresse} onChange={e => setFormData(p => ({...p, fournisseur_adresse: e.target.value}))} />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={formData.fournisseur_telephone} onChange={e => setFormData(p => ({...p, fournisseur_telephone: e.target.value}))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.fournisseur_email} onChange={e => setFormData(p => ({...p, fournisseur_email: e.target.value}))} />
              </div>
              <div>
                <Label>Site web</Label>
                <Input value={formData.fournisseur_site_web} onChange={e => setFormData(p => ({...p, fournisseur_site_web: e.target.value}))} placeholder="https://..." />
              </div>

              {/* Contact */}
              <div className="space-y-3 md:col-span-2">
                <h3 className="font-semibold text-gray-700 border-b pb-1">Personne de contact (fournisseur)</h3>
              </div>
              <div>
                <Label>Nom</Label>
                <Input value={formData.contact_nom} onChange={e => setFormData(p => ({...p, contact_nom: e.target.value}))} data-testid="input-contact-nom" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={formData.contact_telephone} onChange={e => setFormData(p => ({...p, contact_telephone: e.target.value}))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.contact_email} onChange={e => setFormData(p => ({...p, contact_email: e.target.value}))} />
              </div>

              {/* Signataire interne */}
              <div className="space-y-3 md:col-span-2">
                <h3 className="font-semibold text-gray-700 border-b pb-1">Signataire interne</h3>
              </div>
              <div>
                <Label>Nom</Label>
                <Input value={formData.signataire_interne_nom} onChange={e => setFormData(p => ({...p, signataire_interne_nom: e.target.value}))} data-testid="input-signataire" />
              </div>
              <div>
                <Label>Commande interne</Label>
                <Input value={formData.commande_interne} onChange={e => setFormData(p => ({...p, commande_interne: e.target.value}))} placeholder="N° de commande interne" data-testid="input-commande-interne" />
              </div>

              {/* Alertes */}
              <div className="space-y-3 md:col-span-2">
                <h3 className="font-semibold text-gray-700 border-b pb-1">Alertes</h3>
              </div>
              <div>
                <Label>Alerte d'échéance (jours avant fin)</Label>
                <Input type="number" value={formData.alerte_echeance_jours} onChange={e => setFormData(p => ({...p, alerte_echeance_jours: e.target.value}))} data-testid="input-alerte-echeance" />
              </div>
              <div>
                <Label>Alerte résiliation (jours de préavis)</Label>
                <Input type="number" value={formData.alerte_resiliation_jours} onChange={e => setFormData(p => ({...p, alerte_resiliation_jours: e.target.value}))} 
                  placeholder="Ex: 90 pour 3 mois" data-testid="input-alerte-resiliation" />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))} rows={3} data-testid="input-notes" />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button type="submit" disabled={saving} data-testid="submit-contract-btn">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedContract ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DETAIL DIALOG */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="contract-detail-dialog">
          {selectedContract && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSignature className="w-5 h-5" />
                  {selectedContract.titre}
                  <Badge className={STATUT_COLORS[selectedContract.statut]}>{STATUT_LABELS[selectedContract.statut]}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* General */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">N° Contrat:</span> <strong>{selectedContract.numero_contrat}</strong></div>
                  <div><span className="text-gray-500">Type:</span> <Badge className={TYPE_COLORS[selectedContract.type_contrat]}>{TYPE_LABELS[selectedContract.type_contrat]}</Badge></div>
                  <div><span className="text-gray-500">Établi le:</span> {formatDate(selectedContract.date_etablissement)}</div>
                  <div><span className="text-gray-500">Début:</span> {formatDate(selectedContract.date_debut)}</div>
                  <div><span className="text-gray-500">Fin:</span> {formatDate(selectedContract.date_fin)}</div>
                  {selectedContract.date_fin && (
                    <div><span className="text-gray-500">Jours restants:</span> <strong>{getDaysRemaining(selectedContract.date_fin)}j</strong></div>
                  )}
                  {selectedContract.signataire_interne_nom && (
                    <div><span className="text-gray-500">Signataire:</span> <strong>{selectedContract.signataire_interne_nom}</strong></div>
                  )}
                  {selectedContract.commande_interne && (
                    <div><span className="text-gray-500">Commande interne:</span> <strong>{selectedContract.commande_interne}</strong></div>
                  )}
                </div>

                {/* Financial */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-1"><Euro className="w-4 h-4" /> Finances</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Montant total: <strong>{formatCurrency(selectedContract.montant_total)}</strong></div>
                    <div>Par période: <strong>{formatCurrency(selectedContract.montant_periode)} / {PERIODICITE_LABELS[selectedContract.periodicite_paiement]}</strong></div>
                    <div>Mode de paiement: {selectedContract.mode_paiement || '-'}</div>
                  </div>
                </div>

                {/* Vendor */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-1"><Building2 className="w-4 h-4" /> Fournisseur</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Société: <strong>{selectedContract.fournisseur_nom || '-'}</strong></div>
                    <div>Adresse: {selectedContract.fournisseur_adresse || '-'}</div>
                    <div>Tél: {selectedContract.fournisseur_telephone || '-'}</div>
                    <div>Email: {selectedContract.fournisseur_email || '-'}</div>
                    {selectedContract.fournisseur_site_web && <div>Web: <a href={selectedContract.fournisseur_site_web} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{selectedContract.fournisseur_site_web}</a></div>}
                  </div>
                  {selectedContract.contact_nom && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm"><strong>Contact:</strong> {selectedContract.contact_nom} {selectedContract.contact_telephone && `| ${selectedContract.contact_telephone}`} {selectedContract.contact_email && `| ${selectedContract.contact_email}`}</p>
                    </div>
                  )}
                </div>

                {/* Alerts config */}
                <div className="bg-amber-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-1"><Bell className="w-4 h-4" /> Alertes configurées</h4>
                  <div className="text-sm space-y-1">
                    <p>Alerte d'échéance: <strong>{selectedContract.alerte_echeance_jours || 30} jours</strong> avant la fin</p>
                    {selectedContract.alerte_resiliation_jours && (
                      <p>Alerte de résiliation: <strong>{selectedContract.alerte_resiliation_jours} jours</strong> de préavis</p>
                    )}
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1"><Paperclip className="w-4 h-4" /> Pièces jointes</h4>
                  {selectedContract.pieces_jointes?.length > 0 ? (
                    <div className="space-y-2">
                      {selectedContract.pieces_jointes.map(pj => (
                        <div key={pj.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{pj.filename}</span>
                            <span className="text-xs text-gray-400">({(pj.size / 1024).toFixed(0)} Ko)</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleFileDownload(pj.id, pj.filename)}><Download className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleFileDelete(pj.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Aucune pièce jointe</p>
                  )}
                  <div className="mt-2">
                    <Label htmlFor="file-upload" className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Ajouter un fichier
                    </Label>
                    <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </div>
                </div>

                {/* Notes */}
                {selectedContract.notes && (
                  <div>
                    <h4 className="font-semibold mb-1">Notes</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedContract.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowDetail(false); handleEdit(selectedContract); }}>
                  <Edit className="w-4 h-4 mr-2" /> Modifier
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ALERTS DIALOG */}
      <Dialog open={showAlerts} onOpenChange={setShowAlerts}>
        <DialogContent className="max-w-2xl" data-testid="alerts-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Alertes contrats ({alerts.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {alerts.map(alert => (
              <div key={alert.id} className={`p-3 rounded-lg border ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                alert.severity === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{alert.titre}</p>
                    <p className="text-sm text-gray-600">{alert.fournisseur}</p>
                  </div>
                  <Badge className={
                    alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }>
                    {alert.type === 'echeance' ? 'Échéance' : 'Résiliation'}
                  </Badge>
                </div>
                <p className="text-sm mt-1">{alert.message}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
