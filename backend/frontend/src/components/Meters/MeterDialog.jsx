import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { Plus, Trash2, TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';
import { metersAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { formatErrorMessage } from '../../utils/errorFormatter';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const MeterDialog = ({ open, onOpenChange, meter, onSuccess }) => {
  const { toast } = useToast();
  const [readings, setReadings] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [newReading, setNewReading] = useState({
    date_releve: new Date().toISOString().split('T')[0],
    valeur: '',
    notes: ''
  });

  useEffect(() => {
    if (open && meter) {
      loadReadings();
      loadStatistics();
    }
  }, [open, meter, selectedPeriod]);

  const loadReadings = async () => {
    if (!meter) return;
    try {
      setLoading(true);
      const response = await metersAPI.getReadings(meter.id);
      setReadings(response.data);
    } catch (error) {
      console.error('Erreur chargement relevés:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    if (!meter) return;
    try {
      const response = await metersAPI.getStatistics(meter.id, selectedPeriod);
      setStatistics(response.data);
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    }
  };

  const handleAddReading = async (e) => {
    e.preventDefault();
    if (!meter) return;

    try {
      await metersAPI.createReading(meter.id, {
        ...newReading,
        date_releve: new Date(newReading.date_releve).toISOString(),
        valeur: parseFloat(newReading.valeur)
      });
      
      toast({
        title: 'Succès',
        description: 'Relevé ajouté avec succès'
      });
      
      // Réinitialiser le formulaire
      setNewReading({
        date_releve: new Date().toISOString().split('T')[0],
        valeur: '',
        notes: ''
      });
      
      // Recharger les données
      loadReadings();
      loadStatistics();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: formatErrorMessage(error, 'Impossible d\'ajouter le relevé'),
        variant: 'destructive'
      });
    }
  };

  const handleDeleteReading = async (readingId) => {
    try {
      await metersAPI.deleteReading(readingId);
      toast({
        title: 'Succès',
        description: 'Relevé supprimé'
      });
      loadReadings();
      loadStatistics();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le relevé',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const periods = [
    { value: 'week', label: 'Semaine' },
    { value: 'month', label: 'Mois' },
    { value: 'quarter', label: 'Trimestre' },
    { value: 'year', label: 'Année' }
  ];

  if (!meter) return null;

  // Préparer les données pour les graphiques
  const chartData = statistics?.evolution?.map(item => ({
    date: formatDate(item.date),
    consommation: item.consommation,
    cout: item.cout
  })) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{meter.nom}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="readings" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="readings">Relevés</TabsTrigger>
            <TabsTrigger value="statistics">Statistiques</TabsTrigger>
            <TabsTrigger value="info">Informations</TabsTrigger>
          </TabsList>

          {/* Onglet Relevés */}
          <TabsContent value="readings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Nouveau relevé</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddReading} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date_releve">Date</Label>
                      <Input
                        id="date_releve"
                        type="date"
                        value={newReading.date_releve}
                        onChange={(e) => setNewReading({ ...newReading, date_releve: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valeur">Valeur ({meter.unite})</Label>
                      <Input
                        id="valeur"
                        type="number"
                        step="0.01"
                        value={newReading.valeur}
                        onChange={(e) => setNewReading({ ...newReading, valeur: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optionnel)</Label>
                      <Input
                        id="notes"
                        value={newReading.notes}
                        onChange={(e) => setNewReading({ ...newReading, notes: e.target.value })}
                        placeholder="Commentaire..."
                      />
                    </div>
                  </div>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    <Plus size={16} className="mr-2" />
                    Ajouter le relevé
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historique des relevés</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-gray-500 py-4">Chargement...</p>
                ) : readings.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">Aucun relevé enregistré</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Valeur</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Consommation</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Coût</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Notes</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readings.map((reading) => (
                          <tr key={reading.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {formatDate(reading.date_releve)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                              {reading.valeur} {meter.unite}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {reading.consommation ? (
                                <span className="text-blue-600 font-medium">
                                  +{reading.consommation.toFixed(2)} {meter.unite}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {reading.cout ? (
                                <span className="text-green-600 font-medium">
                                  {reading.cout.toFixed(2)} €
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {reading.notes || '-'}
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteReading(reading.id)}
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Statistiques */}
          <TabsContent value="statistics" className="space-y-4">
            <div className="flex gap-2 mb-4">
              {periods.map(period => (
                <Button
                  key={period.value}
                  variant={selectedPeriod === period.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period.value)}
                  className={selectedPeriod === period.value ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  {period.label}
                </Button>
              ))}
            </div>

            {statistics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Consommation totale</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {statistics.total_consommation} {meter.unite}
                          </p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-xl">
                          <Activity size={24} className="text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Coût total</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {statistics.total_cout.toFixed(2)} €
                          </p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-xl">
                          <TrendingUp size={24} className="text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Moyenne journalière</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {statistics.moyenne_journaliere} {meter.unite}
                          </p>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-xl">
                          <Calendar size={24} className="text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {chartData.length > 0 && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Évolution de la consommation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="consommation"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              name={`Consommation (${meter.unite})`}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Évolution des coûts</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="cout" fill="#10b981" name="Coût (€)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* Onglet Informations */}
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Détails du compteur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="text-base font-medium text-gray-900">{meter.type}</p>
                  </div>
                  {meter.numero_serie && (
                    <div>
                      <p className="text-sm text-gray-600">Numéro de série</p>
                      <p className="text-base font-medium text-gray-900">{meter.numero_serie}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Unité</p>
                    <p className="text-base font-medium text-gray-900">{meter.unite}</p>
                  </div>
                  {meter.emplacement && (
                    <div>
                      <p className="text-sm text-gray-600">Emplacement</p>
                      <p className="text-base font-medium text-gray-900">{meter.emplacement.nom}</p>
                    </div>
                  )}
                  {meter.prix_unitaire && (
                    <div>
                      <p className="text-sm text-gray-600">Prix unitaire</p>
                      <p className="text-base font-medium text-gray-900">
                        {meter.prix_unitaire} €/{meter.unite}
                      </p>
                    </div>
                  )}
                  {meter.abonnement_mensuel && (
                    <div>
                      <p className="text-sm text-gray-600">Abonnement mensuel</p>
                      <p className="text-base font-medium text-gray-900">
                        {meter.abonnement_mensuel} €
                      </p>
                    </div>
                  )}
                </div>
                {meter.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Notes</p>
                      <p className="text-base text-gray-900 whitespace-pre-wrap">{meter.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MeterDialog;