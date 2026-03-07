import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Search, MapPin, Building, Pencil, Trash2 } from 'lucide-react';
import LocationFormDialog from '../components/Locations/LocationFormDialog';
import { locationsAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

const Locations = () => {
  const { toast } = useToast();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await locationsAPI.getAll();
      setLocations(response.data);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les emplacements',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet emplacement ?')) {
      try {
        await locationsAPI.delete(id);
        toast({
          title: 'Succès',
          description: 'Emplacement supprimé'
        });
        loadLocations();
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de supprimer l\'emplacement',
          variant: 'destructive'
        });
      }
    }
  };

  const filteredLocations = locations.filter(loc => {
    return loc.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
           loc.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
           loc.type.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const locationTypes = [...new Set(locations.map(loc => loc.type))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Emplacements</h1>
          <p className="text-gray-600 mt-1">Gérez vos sites et lieux de travail</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
          setSelectedLocation(null);
          setFormDialogOpen(true);
        }}>
          <Plus size={20} className="mr-2" />
          Nouvel emplacement
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <p className="text-sm font-medium text-gray-600">Total emplacements</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{locations.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <p className="text-sm font-medium text-gray-600">PRODUCTION</p>
              <p className="text-4xl font-bold text-green-600 mt-2">
                {locations.filter(loc => loc.type === 'PRODUCTION').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <p className="text-sm font-medium text-gray-600">BUREAU</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">
                {locations.filter(loc => loc.type === 'BUREAU').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <p className="text-sm font-medium text-gray-600">ATELIER</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">
                {locations.filter(loc => loc.type === 'ATELIER').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Rechercher par nom, ville ou type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">Aucun emplacement trouvé</p>
          </div>
        ) : (
          filteredLocations.map((location) => (
            <Card key={location.id} className="hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <MapPin size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{location.nom}</CardTitle>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium mt-1 inline-block">
                        {location.type}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Building size={16} className="text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-gray-900 font-medium">{location.adresse}</p>
                      <p className="text-gray-600">{location.codePostal} {location.ville}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 hover:bg-green-50 hover:text-green-600"
                      onClick={() => {
                        setSelectedLocation(location);
                        setFormDialogOpen(true);
                      }}
                    >
                      <Pencil size={16} className="mr-1" />
                      Modifier
                    </Button>
                    <Button 
                      variant="outline" 
                      className="hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(location.id)}
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

      <LocationFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        location={selectedLocation}
        onSuccess={loadLocations}
      />
    </div>
  );
};

export default Locations;