import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Plus, Download, Upload, Bell, Settings, X, FileText, Search, Loader2, Calendar, RefreshCw } from 'lucide-react';
import { surveillanceAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { useConfirmDialog } from '../components/ui/confirm-dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import ListView from '../components/Surveillance/ListView';
import ListViewGrouped from '../components/Surveillance/ListViewGrouped';
import GridView from '../components/Surveillance/GridView';
import CalendarView from '../components/Surveillance/CalendarView';
import SurveillanceItemForm from '../components/Surveillance/SurveillanceItemForm';
import SurveillanceAIExtract from '../components/Surveillance/SurveillanceAIExtract';
import CategoryOrderDialog from '../components/Surveillance/CategoryOrderDialog';

function SurveillancePlan() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const location = useLocation();
  
  // Année sélectionnée
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Données
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredItems, setFilteredItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [openAIExtract, setOpenAIExtract] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryOrderChanged, setCategoryOrderChanged] = useState(false);
  const [showOverdueFilter, setShowOverdueFilter] = useState(false);
  const [migrating, setMigrating] = useState(false);
  
  // Recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  const [filters, setFilters] = useState({
    category: '',
    responsable: '',
    status: ''
  });

  // Charger les années disponibles au montage
  useEffect(() => {
    loadAvailableYears();
  }, []);

  // Charger les données quand l'année change
  useEffect(() => {
    if (selectedYear) {
      loadItems();
      loadStatsAndAlerts();
    }
  }, [selectedYear]);

  const loadAvailableYears = async () => {
    try {
      const data = await surveillanceAPI.getAvailableYears();
      setAvailableYears(data.years || []);
      // Si pas d'année encore sélectionnée, prendre l'année courante
      if (!selectedYear) {
        setSelectedYear(data.current_year || new Date().getFullYear());
      }
    } catch (error) {
      console.error('Erreur chargement années:', error);
      // Fallback: année courante
      const current = new Date().getFullYear();
      setAvailableYears([current - 1, current, current + 1]);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await surveillanceAPI.getItems({ annee: selectedYear });
      setItems(data || []);
    } catch (error) {
      console.error('Erreur chargement items:', error);
      toast({ title: 'Erreur', description: 'Erreur de chargement des contrôles', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadStatsAndAlerts = async () => {
    try {
      // Vérifier et mettre à jour automatiquement les statuts selon les échéances
      await surveillanceAPI.checkDueDates().catch(err => {
        console.warn('Erreur vérification échéances (non bloquant):', err);
      });
      
      const [statsData, alertsData] = await Promise.all([
        surveillanceAPI.getStats(),
        surveillanceAPI.getAlerts()
      ]);
      setStats(statsData);
      setAlerts(alertsData.alerts || []);
    } catch (error) {
      console.error('Erreur chargement stats/alertes:', error);
    }
  };

  const loadData = async () => {
    await loadItems();
    await loadStatsAndAlerts();
  };

  // Détecter si on vient du badge "contrôles en retard"
  useEffect(() => {
    if (location.state?.showOverdueOnly) {
      setShowOverdueFilter(true);
      // Afficher un message explicatif
      toast({
        title: 'Filtre activé',
        description: 'Affichage des contrôles en retard uniquement',
      });
    }
  }, [location.state]);

  useEffect(() => {
    if (items) {
      applyFilters();
      extractCategories();
    }
  }, [items, filters, showOverdueFilter]);

  const applyFilters = () => {
    if (!items) return;
    let filtered = [...items];
    
    // Filtre spécial : contrôles en retard
    if (showOverdueFilter) {
      const today = new Date();
      filtered = filtered.filter(item => {
        if (!item.prochain_controle) return false;
        const nextControlDate = new Date(item.prochain_controle);
        // Calculer la date de début de période d'alerte
        const alertDays = item.duree_rappel_echeance || 30;
        const alertDate = new Date(nextControlDate);
        alertDate.setDate(alertDate.getDate() - alertDays);
        // En retard = date actuelle >= date d'alerte
        return today >= alertDate;
      });
    }
    
    // Filtres classiques
    if (filters.category) filtered = filtered.filter(item => item.category === filters.category);
    if (filters.responsable) filtered = filtered.filter(item => item.responsable === filters.responsable);
    if (filters.status) filtered = filtered.filter(item => item.status === filters.status);
    
    setFilteredItems(filtered);
  };

  const extractCategories = () => {
    if (!items) return;
    // Extraire toutes les catégories uniques des items
    const uniqueCategories = [...new Set(items.map(item => item.category))].filter(Boolean).sort();
    setCategories(uniqueCategories);
  };

  const handleCategoryOrderChanged = (newOrder) => {
    setCategoryOrderChanged(!categoryOrderChanged);
  };

  const handleCreate = () => {
    setSelectedItem(null);
    setOpenForm(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setOpenForm(true);
  };

  const handleDelete = async (itemId) => {
    confirm({
      title: 'Supprimer l\'item',
      description: 'Êtes-vous sûr de vouloir supprimer cet item ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await surveillanceAPI.deleteItem(itemId);
          toast({ title: 'Succès', description: 'Item supprimé' });
          loadData();
        } catch (error) {
          toast({ title: 'Erreur', description: 'Erreur lors de la suppression', variant: 'destructive' });
        }
      }
    });
  };

  const handleFormClose = (shouldRefresh) => {
    setOpenForm(false);
    setSelectedItem(null);
    if (shouldRefresh) loadData();
  };

  const handleExportTemplate = async () => {
    try {
      const response = await fetch('/api/surveillance/export/template', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_plan_surveillance.csv';
      a.click();
      toast({ title: 'Succès', description: 'Template téléchargé' });
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur téléchargement', variant: 'destructive' });
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await surveillanceAPI.importData(formData);
      toast({ title: 'Succès', description: `${result.imported_count} items importés` });
      loadData();
    } catch (error) {
      toast({ title: 'Erreur', description: "Erreur lors de l'import", variant: 'destructive' });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await surveillanceAPI.searchItems(searchQuery);
      setSearchResults(data.results || []);
      if (data.results?.length === 0) {
        toast({ title: 'Aucun résultat', description: `Aucun contrôle trouvé pour "${searchQuery}"`, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Erreur', description: 'Erreur lors de la recherche', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const highlightText = (text, query) => {
    if (!text || !query) return text || '';
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Plan de Surveillance</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setShowSearch(!showSearch)} data-testid="toggle-search-btn">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setOpenAIExtract(true)} data-testid="ai-extract-btn">
            <FileText className="mr-2 h-4 w-4" /> Analyse IA
          </Button>
          <Button variant="outline" onClick={handleExportTemplate}>
            <Download className="mr-2 h-4 w-4" /> Template
          </Button>
          <Button variant="outline" asChild>
            <label>
              <Upload className="mr-2 h-4 w-4" /> Importer
              <input type="file" hidden accept=".csv,.xlsx,.xls" onChange={handleImport} />
            </label>
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau
          </Button>
        </div>
      </div>

      {/* Barre de recherche */}
      {showSearch && (
        <div className="mb-4 flex gap-2" data-testid="search-bar">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un contrôle (type, catégorie, bâtiment, exécutant, n° rapport...)"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
              data-testid="search-input"
            />
          </div>
          <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()} data-testid="search-submit-btn">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
          {searchResults.length > 0 && (
            <Button variant="outline" onClick={clearSearch} data-testid="clear-search-btn">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Résultats de recherche */}
      {searchResults.length > 0 && (
        <Card className="mb-4 border-blue-200" data-testid="search-results">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">
                {searchResults.length} résultat(s) pour "{searchQuery}"
              </h3>
              <Button variant="ghost" size="sm" onClick={clearSearch}>
                <X className="h-4 w-4 mr-1" /> Fermer
              </Button>
            </div>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {searchResults.map((result, index) => (
                  <div
                    key={result.id}
                    className="p-3 rounded-lg border hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer bg-white"
                    onClick={() => { handleEdit(items.find(i => i.id === result.id) || result); clearSearch(); }}
                    data-testid={`search-result-${index}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{result.category}</Badge>
                          <span
                            className="font-medium text-sm"
                            dangerouslySetInnerHTML={{ __html: highlightText(result.classe_type, searchQuery) }}
                          />
                          {result.resultat_controle && (
                            <Badge className={`text-xs ${
                              result.resultat_controle === 'Conforme' ? 'bg-emerald-100 text-emerald-700' :
                              result.resultat_controle === 'Non conforme' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{result.resultat_controle}</Badge>
                          )}
                        </div>
                        <p
                          className="text-xs text-gray-600"
                          dangerouslySetInnerHTML={{ __html: highlightText(result.excerpt, searchQuery) }}
                        />
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {result.batiment && <span>Bât: {result.batiment}</span>}
                          {result.executant && <span>Exéc: {result.executant}</span>}
                          {result.periodicite && <span>Péri: {result.periodicite}</span>}
                          {result.prochain_controle && <span>Prochain: {result.prochain_controle}</span>}
                          <span className="ml-auto text-blue-500">
                            Score: {result.relevance_score?.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {alerts.length > 0 && (
        <Alert className="mb-4 border-orange-500">
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <strong>{alerts.length} contrôle(s) à échéance proche</strong>
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id}>• {alert.classe_type} - {alert.batiment} (J-{alert.days_until})</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {stats && (
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <Badge variant="default">Total: {stats.global.total}</Badge>
          <Badge variant="default" className="bg-green-500">Réalisés: {stats.global.realises}</Badge>
          <Badge variant="default" className="bg-blue-500">Planifiés: {stats.global.planifies}</Badge>
          <Badge variant="default" className="bg-orange-500">À planifier: {stats.global.a_planifier}</Badge>
          <Badge variant="secondary">Taux: {stats.global.pourcentage_realisation}%</Badge>
          
          {/* Badge filtre en retard actif */}
          {showOverdueFilter && (
            <Badge variant="destructive" className="bg-red-600 flex items-center gap-2">
              🚨 Affichage : Contrôles en retard uniquement ({filteredItems.length})
              <button 
                onClick={() => setShowOverdueFilter(false)}
                className="ml-1 hover:bg-red-700 rounded-full p-0.5"
                title="Désactiver le filtre"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <Select value={filters.category || "all"} onValueChange={(val) => setFilters(prev => ({ ...prev, category: val === "all" ? "" : val }))}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="MMRI">MMRI</SelectItem>
            <SelectItem value="INCENDIE">Incendie</SelectItem>
            <SelectItem value="SECURITE_ENVIRONNEMENT">Sécurité/Env.</SelectItem>
            <SelectItem value="ELECTRIQUE">Électrique</SelectItem>
            <SelectItem value="MANUTENTION">Manutention</SelectItem>
            <SelectItem value="EXTRACTION">Extraction</SelectItem>
            <SelectItem value="AUTRE">Autre</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.responsable || "all"} onValueChange={(val) => setFilters(prev => ({ ...prev, responsable: val === "all" ? "" : val }))}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="MAINT">MAINT</SelectItem>
            <SelectItem value="PROD">PROD</SelectItem>
            <SelectItem value="QHSE">QHSE</SelectItem>
            <SelectItem value="EXTERNE">EXTERNE</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status || "all"} onValueChange={(val) => setFilters(prev => ({ ...prev, status: val === "all" ? "" : val }))}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="PLANIFIER">À planifier</SelectItem>
            <SelectItem value="PLANIFIE">Planifié</SelectItem>
            <SelectItem value="REALISE">Réalisé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="list">Liste</TabsTrigger>
            <TabsTrigger value="grid">Grille</TabsTrigger>
            <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          </TabsList>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setOpenCategoryDialog(true)}
            disabled={categories.length === 0}
          >
            <Settings className="h-4 w-4 mr-2" />
            Ordre des catégories
          </Button>
        </div>
        <TabsContent value="list">
          <ListViewGrouped 
            items={filteredItems} 
            loading={loading} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            onRefresh={loadData}
            key={categoryOrderChanged}
          />
        </TabsContent>
        <TabsContent value="grid">
          <GridView items={filteredItems} loading={loading} onEdit={handleEdit} onDelete={handleDelete} onRefresh={loadData} />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarView items={filteredItems} loading={loading} onEdit={handleEdit} onRefresh={loadData} />
        </TabsContent>
      </Tabs>

      {openForm && (
        <SurveillanceItemForm open={openForm} item={selectedItem} onClose={handleFormClose} />
      )}

      {openAIExtract && (
        <SurveillanceAIExtract 
          open={openAIExtract} 
          onClose={(shouldRefresh) => {
            setOpenAIExtract(false);
            if (shouldRefresh) loadData();
          }} 
        />
      )}

      {openCategoryDialog && (
        <CategoryOrderDialog
          open={openCategoryDialog}
          onClose={(shouldRefresh) => {
            setOpenCategoryDialog(false);
            if (shouldRefresh) {
              handleCategoryOrderChanged();
            }
          }}
          categories={categories}
          onOrderChanged={handleCategoryOrderChanged}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog />
    </div>
  );
}

export default SurveillancePlan;
