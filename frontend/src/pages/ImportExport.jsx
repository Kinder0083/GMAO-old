import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Download, Upload, Database, CheckCircle, XCircle, AlertCircle, Save, Clock, Trash2, Play, Plus, HardDrive, Cloud, RefreshCw, Settings, Link2Off } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';
import { getBackendURL } from '../utils/config';
import { formatErrorMessage } from '../utils/errorFormatter';

const ImportExport = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('import-export');
  const [selectedModule, setSelectedModule] = useState('all');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [importMode, setImportMode] = useState('add');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Backup state
  const [schedules, setSchedules] = useState([]);
  const [backupHistory, setBackupHistory] = useState([]);
  const [driveStatus, setDriveStatus] = useState({ connected: false });
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [runningBackup, setRunningBackup] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    frequency: 'daily',
    day_of_week: 0,
    day_of_month: 1,
    hour: 2,
    minute: 0,
    destination: 'local',
    retention_count: 3,
    email_recipient: '',
    enabled: true
  });

  const backend_url = getBackendURL();
  const token = localStorage.getItem('token');
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Check if redirected from Google Drive OAuth
  useEffect(() => {
    if (searchParams.get('drive_connected') === 'true') {
      setActiveTab('backup');
      toast({ title: 'Google Drive connecté avec succès' });
    }
  }, [searchParams]);

  // Load backup data when tab switches
  const loadBackupData = useCallback(async () => {
    if (!token) return;
    setLoadingSchedules(true);
    try {
      const [schedRes, histRes, driveRes] = await Promise.all([
        axios.get(`${backend_url}/api/backup/schedules`, { headers: authHeaders }),
        axios.get(`${backend_url}/api/backup/history?limit=10`, { headers: authHeaders }),
        axios.get(`${backend_url}/api/backup/drive/status`, { headers: authHeaders })
      ]);
      setSchedules(schedRes.data);
      setBackupHistory(histRes.data);
      setDriveStatus(driveRes.data);
    } catch {
      // Silently fail
    } finally {
      setLoadingSchedules(false);
    }
  }, [backend_url, token]);

  useEffect(() => {
    if (activeTab === 'backup') loadBackupData();
  }, [activeTab, loadBackupData]);

  const modules = [
    { value: 'all', label: 'Toutes les données', group: '' },
    // --- Opérations ---
    { value: 'intervention-requests', label: 'Demandes d\'intervention', group: 'Opérations' },
    { value: 'work-orders', label: 'Ordres de travail', group: 'Opérations' },
    { value: 'work-order-templates', label: 'Templates OT', group: 'Opérations' },
    { value: 'improvement-requests', label: 'Demandes d\'amélioration', group: 'Opérations' },
    { value: 'improvements', label: 'Améliorations', group: 'Opérations' },
    { value: 'demandes-arret', label: 'Demandes d\'arrêt', group: 'Opérations' },
    { value: 'consignes', label: 'Consignes', group: 'Opérations' },
    // --- Équipements & Maintenance ---
    { value: 'equipments', label: 'Équipements', group: 'Équipements' },
    { value: 'meters', label: 'Compteurs', group: 'Équipements' },
    { value: 'meter-readings', label: 'Relevés de compteurs', group: 'Équipements' },
    { value: 'preventive-maintenance', label: 'Maintenance Préventive', group: 'Équipements' },
    { value: 'preventive-checklists', label: 'Checklists Préventives', group: 'Équipements' },
    { value: 'preventive-checklist-templates', label: 'Templates Checklists', group: 'Équipements' },
    { value: 'preventive-checklist-executions', label: 'Exécutions Checklists', group: 'Équipements' },
    { value: 'planning-equipement', label: 'Planning Équipement', group: 'Équipements' },
    // --- M.E.S. ---
    { value: 'mes-machines', label: 'M.E.S. - Machines', group: 'M.E.S.' },
    { value: 'mes-product-references', label: 'M.E.S. - Références Produit', group: 'M.E.S.' },
    { value: 'mes-rejects', label: 'M.E.S. - Rejets', group: 'M.E.S.' },
    { value: 'mes-reject-reasons', label: 'M.E.S. - Motifs de Rejet', group: 'M.E.S.' },
    { value: 'mes-cadence-history', label: 'M.E.S. - Historique Cadence', group: 'M.E.S.' },
    { value: 'mes-alerts', label: 'M.E.S. - Alertes', group: 'M.E.S.' },
    { value: 'mes-scheduled-reports', label: 'M.E.S. - Rapports Programmés', group: 'M.E.S.' },
    { value: 'mes-pulses', label: 'M.E.S. - Pulses', group: 'M.E.S.' },
    // --- QHSE / Surveillance ---
    { value: 'surveillance-items', label: 'Plan de Surveillance (Items)', group: 'QHSE' },
    { value: 'surveillance-plan', label: 'Plan de Surveillance', group: 'QHSE' },
    { value: 'surveillance-controls', label: 'Contrôles Surveillance', group: 'QHSE' },
    { value: 'presqu-accident-items', label: 'Presqu\'accident (Items)', group: 'QHSE' },
    { value: 'presqu-accident', label: 'Presqu\'accident (Rapports)', group: 'QHSE' },
    // --- IoT / MQTT ---
    { value: 'sensors', label: 'Capteurs IoT/MQTT', group: 'IoT' },
    { value: 'mqtt-logs', label: 'Logs MQTT', group: 'IoT' },
    { value: 'mqtt-config', label: 'Configuration MQTT', group: 'IoT' },
    { value: 'mqtt-subscriptions', label: 'Abonnements MQTT', group: 'IoT' },
    // --- Caméras ---
    { value: 'cameras', label: 'Caméras', group: 'Caméras' },
    { value: 'camera-settings', label: 'Paramètres Caméras', group: 'Caméras' },
    { value: 'camera-alerts', label: 'Alertes Caméras', group: 'Caméras' },
    // --- Documentations ---
    { value: 'documentations', label: 'Pôles de Service', group: 'Documents' },
    { value: 'documents', label: 'Documents', group: 'Documents' },
    { value: 'bons-travail', label: 'Bons de Travail', group: 'Documents' },
    { value: 'doc-folders', label: 'Dossiers', group: 'Documents' },
    // --- Rapports ---
    { value: 'reports-historique', label: 'Historique Rapports', group: 'Rapports' },
    { value: 'weekly-report-history', label: 'Rapports Hebdo.', group: 'Rapports' },
    { value: 'weekly-report-settings', label: 'Config Rapports Hebdo.', group: 'Rapports' },
    { value: 'weekly-report-templates', label: 'Templates Rapports', group: 'Rapports' },
    // --- Ressources ---
    { value: 'users', label: 'Utilisateurs', group: 'Ressources' },
    { value: 'roles', label: 'Rôles', group: 'Ressources' },
    { value: 'team-members', label: 'Membres d\'équipe', group: 'Ressources' },
    { value: 'absences', label: 'Absences', group: 'Ressources' },
    { value: 'work-rhythms', label: 'Rythmes de travail', group: 'Ressources' },
    // --- Stock & Achats ---
    { value: 'inventory', label: 'Inventaire', group: 'Stock' },
    { value: 'locations', label: 'Zones', group: 'Stock' },
    { value: 'vendors', label: 'Fournisseurs', group: 'Stock' },
    { value: 'purchase-history', label: 'Historique Achat', group: 'Stock' },
    { value: 'purchase-requests', label: 'Demandes d\'Achat', group: 'Stock' },
    // --- Communication ---
    { value: 'chat-messages', label: 'Messages Chat Live', group: 'Communication' },
    { value: 'whiteboards', label: 'Tableaux blancs', group: 'Communication' },
    { value: 'whiteboard-objects', label: 'Objets Tableaux blancs', group: 'Communication' },
    { value: 'notifications', label: 'Notifications', group: 'Communication' },
    // --- Configuration ---
    { value: 'custom-forms', label: 'Formulaires personnalisés', group: 'Configuration' },
    { value: 'form-templates', label: 'Modèles de formulaires', group: 'Configuration' },
    { value: 'global-settings', label: 'Paramètres globaux', group: 'Configuration' },
    { value: 'user-preferences', label: 'Préférences utilisateur', group: 'Configuration' },
    { value: 'service-dashboard-configs', label: 'Config Dashboard Service', group: 'Configuration' },
    { value: 'audit-logs', label: 'Journal d\'audit', group: 'Configuration' },
  ];

  // Grouper les modules par catégorie
  const groupedModules = modules.reduce((acc, mod) => {
    const group = mod.group || '';
    if (!acc[group]) acc[group] = [];
    acc[group].push(mod);
    return acc;
  }, {});

  const renderModuleOptions = () => (
    <>
      {Object.entries(groupedModules).map(([group, mods]) => (
        <React.Fragment key={group}>
          {group && (
            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
              {group}
            </div>
          )}
          {mods.map(mod => (
            <SelectItem key={mod.value} value={mod.value}>
              {mod.label}
            </SelectItem>
          ))}
        </React.Fragment>
      ))}
    </>
  );

  // --- Backup Management Functions ---

  const handleSaveSchedule = async () => {
    try {
      const payload = {
        ...scheduleForm,
        email_recipient: scheduleForm.email_recipient || null
      };

      if (editingSchedule) {
        await axios.put(`${backend_url}/api/backup/schedules/${editingSchedule.id}`, payload, { headers: authHeaders });
        toast({ title: 'Planification mise à jour' });
      } else {
        await axios.post(`${backend_url}/api/backup/schedules`, payload, { headers: authHeaders });
        toast({ title: 'Planification créée' });
      }

      setShowScheduleForm(false);
      setEditingSchedule(null);
      resetScheduleForm();
      loadBackupData();
    } catch (error) {
      toast({ title: 'Erreur', description: formatErrorMessage(error, 'Impossible de sauvegarder'), variant: 'destructive' });
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Supprimer cette planification ?')) return;
    try {
      await axios.delete(`${backend_url}/api/backup/schedules/${id}`, { headers: authHeaders });
      toast({ title: 'Planification supprimée' });
      loadBackupData();
    } catch (error) {
      toast({ title: 'Erreur', description: formatErrorMessage(error, 'Impossible de supprimer'), variant: 'destructive' });
    }
  };

  const handleToggleSchedule = async (schedule) => {
    try {
      await axios.put(`${backend_url}/api/backup/schedules/${schedule.id}`, { enabled: !schedule.enabled }, { headers: authHeaders });
      loadBackupData();
    } catch (error) {
      toast({ title: 'Erreur', description: formatErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleRunBackupNow = async () => {
    try {
      setRunningBackup(true);
      await axios.post(`${backend_url}/api/backup/run`, {}, { headers: authHeaders });
      toast({ title: 'Sauvegarde terminée' });
      loadBackupData();
    } catch (error) {
      toast({ title: 'Erreur', description: formatErrorMessage(error, 'Erreur de sauvegarde'), variant: 'destructive' });
    } finally {
      setRunningBackup(false);
    }
  };

  const handleConnectDrive = async () => {
    try {
      const res = await axios.get(`${backend_url}/api/backup/drive/connect`, { headers: authHeaders });
      window.location.href = res.data.authorization_url;
    } catch (error) {
      toast({ title: 'Erreur', description: formatErrorMessage(error, 'Impossible de connecter Google Drive'), variant: 'destructive' });
    }
  };

  const handleDisconnectDrive = async () => {
    if (!window.confirm('Déconnecter Google Drive ?')) return;
    try {
      await axios.delete(`${backend_url}/api/backup/drive/disconnect`, { headers: authHeaders });
      setDriveStatus({ connected: false });
      toast({ title: 'Google Drive déconnecté' });
    } catch (error) {
      toast({ title: 'Erreur', description: formatErrorMessage(error), variant: 'destructive' });
    }
  };

  const handleDownloadBackup = async (historyId) => {
    try {
      const res = await axios.get(`${backend_url}/api/backup/download/${historyId}`, {
        headers: authHeaders, responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'backup.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: 'Erreur', description: formatErrorMessage(error, 'Fichier non disponible'), variant: 'destructive' });
    }
  };

  const startEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      frequency: schedule.frequency || 'daily',
      day_of_week: schedule.day_of_week ?? 0,
      day_of_month: schedule.day_of_month ?? 1,
      hour: schedule.hour ?? 2,
      minute: schedule.minute ?? 0,
      destination: schedule.destination || 'local',
      retention_count: schedule.retention_count ?? 3,
      email_recipient: schedule.email_recipient || '',
      enabled: schedule.enabled ?? true
    });
    setShowScheduleForm(true);
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      frequency: 'daily', day_of_week: 0, day_of_month: 1,
      hour: 2, minute: 0, destination: 'local',
      retention_count: 3, email_recipient: '', enabled: true
    });
  };

  const freqLabels = { daily: 'Quotidienne', weekly: 'Hebdomadaire', monthly: 'Mensuelle' };
  const destLabels = { local: 'Local', gdrive: 'Google Drive', local_gdrive: 'Local + Google Drive' };
  const dowLabels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  const handleExport = async () => {
    try {
      setExporting(true);
      const backend_url = getBackendURL();
      const token = localStorage.getItem('token');

      const response = await axios.get(
        `${backend_url}/api/export/${selectedModule}`,
        {
          params: { format: exportFormat },
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = selectedModule === 'all' 
        ? `export_all.${exportFormat}` 
        : `${selectedModule}.${exportFormat}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Succès',
        description: 'Export réussi'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible d\'exporter les données'),
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier le format pour "all"
    if (selectedModule === 'all' && !file.name.endsWith('.xlsx')) {
      toast({
        title: 'Erreur',
        description: 'Pour importer toutes les données, utilisez un fichier Excel (.xlsx) multi-feuilles',
        variant: 'destructive'
      });
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    setImportResult(null); // Réinitialiser le résultat précédent
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      setImporting(true);
      const backend_url = getBackendURL();
      const token = localStorage.getItem('token');

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(
        `${backend_url}/api/import/${selectedModule}`,
        formData,
        {
          params: { mode: importMode },
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setImportResult(response.data.stats || response.data);
      const s = response.data.stats || response.data;
      setSelectedFile(null); // Réinitialiser le fichier sélectionné

      toast({
        title: 'Import terminé',
        description: `${s.inserted ?? 0} ajouté(s), ${s.updated ?? 0} mis à jour, ${s.skipped ?? 0} ignoré(s)`
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible d\'importer les données'),
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Import / Export</h1>
        <p className="text-gray-600 mt-1">Sauvegardez et restaurez vos données</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit" data-testid="import-export-tabs">
        <button
          onClick={() => setActiveTab('import-export')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'import-export' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          data-testid="tab-import-export"
        >
          <Download size={16} className="inline mr-2" />Import / Export
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'backup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          data-testid="tab-backup"
        >
          <Save size={16} className="inline mr-2" />Sauvegardes Automatiques
        </button>
      </div>

      {/* TAB: Import / Export */}
      {activeTab === 'import-export' && (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download size={24} className="text-blue-600" />
              Exporter les données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Module à exporter</Label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger data-testid="export-module-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {renderModuleOptions()}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (un module seulement)</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              data-testid="export-button"
              onClick={handleExport}
              disabled={exporting || (exportFormat === 'csv' && selectedModule === 'all')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Download size={20} className="mr-2" />
              {exporting ? 'Export en cours...' : 'Exporter'}
            </Button>

            {exportFormat === 'csv' && selectedModule === 'all' && (
              <p className="text-sm text-orange-600">
                Pour exporter toutes les données, utilisez le format Excel (XLSX)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload size={24} className="text-green-600" />
              Importer les données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Module à importer</Label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger data-testid="import-module-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {renderModuleOptions()}
                </SelectContent>
              </Select>
              {selectedModule === 'all' && (
                <p className="text-xs text-amber-600">
                  ⚠️ Pour importer toutes les données, utilisez un fichier Excel avec une feuille par module
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Mode d'import</Label>
              <Select value={importMode} onValueChange={setImportMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Ajouter aux données existantes</SelectItem>
                  <SelectItem value="replace">Écraser les données existantes (par ID)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-file">Fichier CSV ou Excel</Label>
              <input
                id="import-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                disabled={importing}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
              />
              {selectedFile && (
                <p className="text-sm text-green-600">
                  Fichier sélectionné : {selectedFile.name}
                </p>
              )}
            </div>

            <Button
              data-testid="import-button"
              onClick={handleImport}
              disabled={importing || !selectedFile}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Upload size={20} className="mr-2" />
              {importing ? 'Import en cours...' : 'Importer'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Résultat d'import */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Résultat de l'import</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Database size={24} className="text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">{importResult.total}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle size={24} className="text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Ajoutés</p>
                  <p className="text-2xl font-bold text-green-600">{importResult.inserted}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                <AlertCircle size={24} className="text-amber-600" />
                <div>
                  <p className="text-sm text-gray-600">Mis à jour</p>
                  <p className="text-2xl font-bold text-amber-600">{importResult.updated}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                <XCircle size={24} className="text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Ignorés</p>
                  <p className="text-2xl font-bold text-red-600">{importResult.skipped}</p>
                </div>
              </div>
            </div>

            {/* Détails par module (import "all") */}
            {importResult.modules && Object.keys(importResult.modules).length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Détails par module</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(importResult.modules).map(([moduleName, moduleStats]) => (
                    <div key={moduleName} className="border rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-2 capitalize">
                        {modules.find(m => m.value === moduleName)?.label || moduleName}
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-medium">{moduleStats.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-600">Ajoutés:</span>
                          <span className="font-medium text-green-600">{moduleStats.inserted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-amber-600">Mis à jour:</span>
                          <span className="font-medium text-amber-600">{moduleStats.updated}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Ignorés:</span>
                          <span className="font-medium text-red-600">{moduleStats.skipped}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Erreurs */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">Erreurs ({importResult.errors.length})</h3>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((error, idx) => (
                    <p key={idx} className="text-sm text-red-700">• {error}</p>
                  ))}
                  {importResult.errors.length > 10 && (
                    <p className="text-sm text-red-600 font-medium mt-2">
                      ... et {importResult.errors.length - 10} autres erreurs
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Guide d'utilisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Export :</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Sélectionnez un module ou "Toutes les données"</li>
              <li>Choisissez le format (CSV pour un module, XLSX pour plusieurs)</li>
              <li>Cliquez sur "Exporter" pour télécharger le fichier</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Import :</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Sélectionnez le module à importer</li>
              <li>Choisissez le mode : "Ajouter" (nouvelles entrées) ou "Écraser" (mise à jour par ID)</li>
              <li>Sélectionnez votre fichier CSV ou Excel</li>
              <li>L'import démarre automatiquement</li>
            </ul>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="font-semibold text-yellow-800">Important :</p>
            <p className="text-yellow-700">
              Le mode "Écraser" remplace les données existantes. Faites toujours un export avant un import en mode "Écraser".
            </p>
          </div>
        </CardContent>
      </Card>
      </>
      )}

      {/* TAB: Sauvegardes Automatiques */}
      {activeTab === 'backup' && (
      <>
        {/* Actions rapides */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleRunBackupNow}
            disabled={runningBackup}
            className="bg-emerald-600 hover:bg-emerald-700"
            data-testid="run-backup-now-btn"
          >
            {runningBackup ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Play size={16} className="mr-2" />}
            {runningBackup ? 'Sauvegarde en cours...' : 'Sauvegarder maintenant'}
          </Button>
          <Button
            onClick={() => { resetScheduleForm(); setEditingSchedule(null); setShowScheduleForm(true); }}
            variant="outline"
            data-testid="add-schedule-btn"
          >
            <Plus size={16} className="mr-2" />Nouvelle planification
          </Button>
          <Button onClick={loadBackupData} variant="ghost" size="icon" data-testid="refresh-backup-btn">
            <RefreshCw size={16} />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Google Drive Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cloud size={20} className="text-blue-500" />
                Google Drive
              </CardTitle>
            </CardHeader>
            <CardContent>
              {driveStatus.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle size={18} />
                    <span className="text-sm font-medium">Connecté</span>
                  </div>
                  <Button onClick={handleDisconnectDrive} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" data-testid="disconnect-drive-btn">
                    <Link2Off size={14} className="mr-2" />Déconnecter
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Connectez votre compte Google Drive pour sauvegarder vos données dans le cloud.</p>
                  <Button onClick={handleConnectDrive} variant="outline" data-testid="connect-drive-btn">
                    <Cloud size={16} className="mr-2" />Connecter Google Drive
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Planifications existantes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock size={20} className="text-indigo-500" />
                Planifications ({schedules.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSchedules ? (
                <p className="text-sm text-gray-400">Chargement...</p>
              ) : schedules.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune planification configurée</p>
              ) : (
                <div className="space-y-3">
                  {schedules.map(s => (
                    <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${s.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`} data-testid={`schedule-${s.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${s.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          <span className="text-sm font-medium truncate">{freqLabels[s.frequency] || s.frequency}</span>
                          <span className="text-xs text-gray-400">
                            {String(s.hour).padStart(2,'0')}:{String(s.minute).padStart(2,'0')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                          {s.destination === 'local' && <><HardDrive size={12} /> Local</>}
                          {s.destination === 'gdrive' && <><Cloud size={12} /> Google Drive</>}
                          {s.destination === 'local_gdrive' && <><HardDrive size={12} /><Cloud size={12} /> Local + Drive</>}
                          <span className="text-gray-300">|</span>
                          <span>Garder {s.retention_count} backup(s)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleToggleSchedule(s)} className="h-8 w-8" data-testid={`toggle-schedule-${s.id}`}>
                          {s.enabled ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-gray-400" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => startEditSchedule(s)} className="h-8 w-8" data-testid={`edit-schedule-${s.id}`}>
                          <Settings size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDeleteSchedule(s.id)} className="h-8 w-8 text-red-500 hover:text-red-700" data-testid={`delete-schedule-${s.id}`}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Formulaire de planification */}
        {showScheduleForm && (
          <Card className="border-indigo-200">
            <CardHeader>
              <CardTitle className="text-base">{editingSchedule ? 'Modifier la planification' : 'Nouvelle planification'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Fréquence</Label>
                  <Select value={scheduleForm.frequency} onValueChange={v => setScheduleForm(f => ({ ...f, frequency: v }))}>
                    <SelectTrigger data-testid="schedule-frequency-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Quotidienne</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="monthly">Mensuelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {scheduleForm.frequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Jour de la semaine</Label>
                    <Select value={String(scheduleForm.day_of_week)} onValueChange={v => setScheduleForm(f => ({ ...f, day_of_week: parseInt(v) }))}>
                      <SelectTrigger data-testid="schedule-dow-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {dowLabels.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {scheduleForm.frequency === 'monthly' && (
                  <div className="space-y-2">
                    <Label>Jour du mois</Label>
                    <Select value={String(scheduleForm.day_of_month)} onValueChange={v => setScheduleForm(f => ({ ...f, day_of_month: parseInt(v) }))}>
                      <SelectTrigger data-testid="schedule-dom-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Heure</Label>
                  <div className="flex gap-2">
                    <Select value={String(scheduleForm.hour)} onValueChange={v => setScheduleForm(f => ({ ...f, hour: parseInt(v) }))}>
                      <SelectTrigger data-testid="schedule-hour-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}h</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={String(scheduleForm.minute)} onValueChange={v => setScheduleForm(f => ({ ...f, minute: parseInt(v) }))}>
                      <SelectTrigger data-testid="schedule-minute-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[0, 15, 30, 45].map(m => <SelectItem key={m} value={String(m)}>{String(m).padStart(2, '0')}min</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Destination</Label>
                  <Select value={scheduleForm.destination} onValueChange={v => setScheduleForm(f => ({ ...f, destination: v }))}>
                    <SelectTrigger data-testid="schedule-destination-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local"><HardDrive size={14} className="inline mr-2" />Local</SelectItem>
                      <SelectItem value="gdrive"><Cloud size={14} className="inline mr-2" />Google Drive</SelectItem>
                      <SelectItem value="local_gdrive"><HardDrive size={14} className="inline mr-1" /><Cloud size={14} className="inline mr-2" />Local + Google Drive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sauvegardes à garder (max 5)</Label>
                  <Select value={String(scheduleForm.retention_count)} onValueChange={v => setScheduleForm(f => ({ ...f, retention_count: parseInt(v) }))}>
                    <SelectTrigger data-testid="schedule-retention-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} sauvegarde{n > 1 ? 's' : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Email de notification (optionnel)</Label>
                  <input
                    type="email"
                    value={scheduleForm.email_recipient}
                    onChange={e => setScheduleForm(f => ({ ...f, email_recipient: e.target.value }))}
                    placeholder="admin@example.com"
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                    data-testid="schedule-email-input"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleSaveSchedule} className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-schedule-btn">
                  <Save size={16} className="mr-2" />{editingSchedule ? 'Mettre à jour' : 'Créer'}
                </Button>
                <Button onClick={() => { setShowScheduleForm(false); setEditingSchedule(null); }} variant="outline" data-testid="cancel-schedule-btn">
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historique des sauvegardes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database size={20} className="text-gray-500" />
              Historique des sauvegardes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {backupHistory.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune sauvegarde effectuée</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="backup-history-table">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Statut</th>
                      <th className="pb-2 font-medium">Destination</th>
                      <th className="pb-2 font-medium">Taille</th>
                      <th className="pb-2 font-medium">Modules</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backupHistory.map(h => (
                      <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5">{h.started_at ? new Date(h.started_at).toLocaleString('fr-FR') : '-'}</td>
                        <td className="py-2.5">
                          {h.status === 'success' && <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle size={14} />Réussi</span>}
                          {h.status === 'error' && <span className="inline-flex items-center gap-1 text-red-600" title={h.error_message}><XCircle size={14} />Échec</span>}
                          {h.status === 'running' && <span className="inline-flex items-center gap-1 text-blue-600"><RefreshCw size={14} className="animate-spin" />En cours</span>}
                        </td>
                        <td className="py-2.5 text-gray-500">{destLabels[h.destination] || h.destination}</td>
                        <td className="py-2.5 text-gray-500">{h.file_size ? `${(h.file_size / 1024 / 1024).toFixed(2)} Mo` : '-'}</td>
                        <td className="py-2.5 text-gray-500">{h.module_count || '-'}</td>
                        <td className="py-2.5">
                          {h.status === 'success' && h.file_path && (
                            <Button size="sm" variant="ghost" onClick={() => handleDownloadBackup(h.id)} data-testid={`download-backup-${h.id}`}>
                              <Download size={14} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </>
      )}
    </div>
  );
};

export default ImportExport;
