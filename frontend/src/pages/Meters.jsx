import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Search, Eye, Pencil, Trash2, TrendingUp, Activity, Grid, List, ChevronDown, ChevronRight } from 'lucide-react';
import MeterDialog from '../components/Meters/MeterDialog';
import MeterFormDialog from '../components/Meters/MeterFormDialog';
import DeleteConfirmDialog from '../components/Common/DeleteConfirmDialog';
import { metersAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { useMeters } from '../hooks/useMeters';

const Meters = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'tree'
  const [expandedTypes, setExpandedTypes] = useState(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Utiliser le hook temps réel
  const { meters, loading, refresh: loadMeters } = useMeters();

  const handleDelete = async (id) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await metersAPI.delete(itemToDelete);
      toast({
        title: 'Succès',
        description: 'Compteur supprimé'
      });
      loadMeters();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le compteur',
        variant: 'destructive'
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  // Définir les types en premier
  const types = [
    { value: 'ALL', label: 'Tous' },
    { value: 'EAU', label: 'Eau' },
    { value: 'GAZ', label: 'Gaz' },
    { value: 'ELECTRICITE', label: 'Électricité' },
    { value: 'AIR_COMPRIME', label: 'Air comprimé' },
    { value: 'VAPEUR', label: 'Vapeur' },
    { value: 'FUEL', label: 'Fuel' },
    { value: 'SOLAIRE', label: 'Solaire' },
    { value: 'AUTRE', label: 'Autre' }
  ];

  const filteredMeters = meters.filter(meter => {
    const matchesSearch = meter.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (meter.numero_serie && meter.numero_serie.includes(searchTerm));
    const matchesType = filterType === 'ALL' || meter.type === filterType;
    return matchesSearch && matchesType;
  });

  // Grouper les compteurs par type pour le mode arborescence
  const groupedMeters = React.useMemo(() => {
    const groups = {};
    types.forEach(type => {
      if (type.value !== 'ALL') {
        groups[type.value] = {
          label: type.label,
          meters: filteredMeters.filter(m => m.type === type.value)
        };
      }
    });
    return groups;
  }, [filteredMeters]);

  const toggleTypeExpansion = (type) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const getTypeBadge = (type) => {
    const badges = {
      'EAU': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Eau' },
      'GAZ': { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Gaz' },
      'ELECTRICITE': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Électricité' },
      'AIR_COMPRIME': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Air comprimé' },
      'VAPEUR': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Vapeur' },
      'FUEL': { bg: 'bg-red-100', text: 'text-red-700', label: 'Fuel' },
      'SOLAIRE': { bg: 'bg-green-100', text: 'text-green-700', label: 'Solaire' },
      'AUTRE': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Autre' }
    };
    const badge = badges[type] || badges['AUTRE'];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compteurs</h1>
          <p className="text-gray-600 mt-1">Gérez vos compteurs et relevés de consommation</p>
        </div>
        <Button 
          id="btn-nouveau-compteur"
          data-action="creer-compteur"
          className="bg-blue-600 hover:bg-blue-700 text-white" 
          onClick={() => {
            setSelectedMeter(null);
            setFormDialogOpen(true);
          }}
        >
          <Plus size={20} className="mr-2" />
          Nouveau compteur
        </Button>
      </div>

      {/* Filters and View Mode */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    placeholder="Rechercher par nom ou numéro de série..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  <Grid size={16} className="mr-2" />
                  Grille
                </Button>
                <Button
                  variant={viewMode === 'tree' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('tree')}
                  className={viewMode === 'tree' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  <List size={16} className="mr-2" />
                  Arborescence
                </Button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {types.map(type => (
                <Button
                  key={type.value}
                  variant={filterType === type.value ? 'default' : 'outline'}
                  onClick={() => setFilterType(type.value)}
                  size="sm"
                  className={filterType === type.value ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vue Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">Chargement...</p>
            </div>
          ) : filteredMeters.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">Aucun compteur trouvé</p>
            </div>
          ) : (
            filteredMeters.map((meter) => (
            <Card 
              key={meter.id} 
              className="hover:shadow-lg transition-shadow"
              data-ai-type="METER"
              data-ai-id={meter.id}
              data-ai-name={meter.nom}
              data-ai-extra={JSON.stringify({ 
                type: meter.type, 
                numero_serie: meter.numero_serie,
                emplacement: meter.emplacement?.nom 
              })}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{meter.nom}</CardTitle>
                    {meter.numero_serie && (
                      <p className="text-sm text-gray-500 mt-1">N° {meter.numero_serie}</p>
                    )}
                  </div>
                  {getTypeBadge(meter.type)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {meter.emplacement && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Activity size={16} />
                      <span>{meter.emplacement.nom}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Unité:</span>
                    <span className="font-medium text-gray-900">{meter.unite}</span>
                  </div>
                  
                  {meter.prix_unitaire && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Prix:</span>
                      <span className="font-medium text-gray-900">{meter.prix_unitaire} €/{meter.unite}</span>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMeter(meter);
                        setDialogOpen(true);
                      }}
                      className="flex-1 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Eye size={16} className="mr-1" />
                      Voir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedMeter(meter);
                        setFormDialogOpen(true);
                      }}
                      className="flex-1 hover:bg-green-50 hover:text-green-600"
                    >
                      <Pencil size={16} className="mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(meter.id)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>
      )}

      {/* Vue Arborescence */}
      {viewMode === 'tree' && (
        <div className="space-y-2">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">Chargement...</p>
              </CardContent>
            </Card>
          ) : filteredMeters.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">Aucun compteur trouvé</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedMeters).map(([typeKey, typeData]) => {
              if (typeData.meters.length === 0) return null;
              const isExpanded = expandedTypes.has(typeKey);
              
              return (
                <Card key={typeKey}>
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleTypeExpansion(typeKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        {getTypeBadge(typeKey)}
                        <span className="font-semibold text-gray-900">
                          {typeData.label} ({typeData.meters.length})
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent>
                      <div className="space-y-2">
                        {typeData.meters.map((meter) => (
                          <div 
                            key={meter.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-medium text-gray-900">{meter.nom}</p>
                                  <div className="flex gap-4 mt-1 text-sm text-gray-600">
                                    {meter.numero_serie && (
                                      <span>N° {meter.numero_serie}</span>
                                    )}
                                    {meter.emplacement && (
                                      <span className="flex items-center gap-1">
                                        <Activity size={14} />
                                        {meter.emplacement.nom}
                                      </span>
                                    )}
                                    <span>Unité: {meter.unite}</span>
                                    {meter.prix_unitaire && (
                                      <span>{meter.prix_unitaire} €/{meter.unite}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMeter(meter);
                                  setDialogOpen(true);
                                }}
                                className="hover:bg-blue-50 hover:text-blue-600"
                              >
                                <Eye size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMeter(meter);
                                  setFormDialogOpen(true);
                                }}
                                className="hover:bg-green-50 hover:text-green-600"
                              >
                                <Pencil size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(meter.id)}
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      <MeterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        meter={selectedMeter}
        onSuccess={loadMeters}
      />

      <MeterFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        meter={selectedMeter}
        onSuccess={loadMeters}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Supprimer le compteur"
        description="Êtes-vous sûr de vouloir supprimer ce compteur ? Tous les relevés associés seront conservés mais le compteur ne sera plus accessible."
      />
    </div>
  );
};

export default Meters;