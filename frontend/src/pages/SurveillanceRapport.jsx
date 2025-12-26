import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertCircle, TrendingUp, BarChart3, Table2, Grid3X3, PieChart, RefreshCw } from 'lucide-react';
import { surveillanceAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { useSurveillanceRapport } from '../hooks/useSurveillanceRapport';

const SurveillanceRapport = () => {
  const { toast } = useToast();
  const [displayMode, setDisplayMode] = useState(() => {
    // Récupérer le mode d'affichage sauvegardé ou utiliser 'cards' par défaut
    return localStorage.getItem('surveillance_rapport_display_mode') || 'cards';
  });

  // Utiliser le hook temps réel
  const { stats, loading, refresh: loadStats } = useSurveillanceRapport();

  // Sauvegarder le mode d'affichage choisi
  useEffect(() => {
    localStorage.setItem('surveillance_rapport_display_mode', displayMode);
  }, [displayMode]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Chargement des statistiques...</p>
      </div>
    );
  }

  // Préparer les données pour les graphiques
  const categoryChartData = Object.entries(stats.by_category).map(([key, value]) => ({
    id: key,
    label: key.replace(/_/g, ' '),
    value: value.pourcentage,
    count: value.realises,
    total: value.total
  }));

  const batimentChartData = Object.entries(stats.by_batiment).map(([key, value]) => ({
    id: key,
    label: key,
    value: value.pourcentage,
    Réalisé: value.realises,
    Total: value.total
  }));

  const periodiciteChartData = Object.entries(stats.by_periodicite).map(([key, value]) => ({
    id: key,
    label: key,
    value: value.pourcentage,
    Réalisé: value.realises,
    Total: value.total
  }));

  return (
    <div className="space-y-6 p-6">
      {/* Header avec sélecteur de mode */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapport - Plan de Surveillance</h1>
          <p className="text-gray-600 mt-1">Statistiques et indicateurs de performance</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">Mode d'affichage :</span>
          <Select value={displayMode} onValueChange={setDisplayMode}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cards">
                <div className="flex items-center gap-2">
                  <Grid3X3 size={16} />
                  <span>Cartes</span>
                </div>
              </SelectItem>
              <SelectItem value="table">
                <div className="flex items-center gap-2">
                  <Table2 size={16} />
                  <span>Tableau</span>
                </div>
              </SelectItem>
              <SelectItem value="charts">
                <div className="flex items-center gap-2">
                  <PieChart size={16} />
                  <span>Graphiques</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistiques globales - toujours affichées */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux de réalisation global</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.global.pourcentage_realisation}%</p>
                <p className="text-xs text-gray-500 mt-1">{stats.global.realises} / {stats.global.total}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <TrendingUp size={24} className="text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Contrôles en retard</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.global.en_retard}</p>
                <p className="text-xs text-gray-500 mt-1">À traiter en priorité</p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <AlertCircle size={24} className="text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Contrôles à temps</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.global.a_temps}</p>
                <p className="text-xs text-gray-500 mt-1">Dans les délais</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <BarChart3 size={24} className="text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Anomalies détectées</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.anomalies}</p>
                <p className="text-xs text-gray-500 mt-1">Ce mois</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-xl">
                <AlertCircle size={24} className="text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affichage conditionnel selon le mode choisi */}
      {displayMode === 'cards' && <CardsDisplay stats={stats} />}
      {displayMode === 'table' && <TableDisplay stats={stats} />}
      {displayMode === 'charts' && <ChartsDisplay stats={stats} categoryChartData={categoryChartData} batimentChartData={batimentChartData} periodiciteChartData={periodiciteChartData} />}
    </div>
  );
};

// Composant pour l'affichage en cartes
const CardsDisplay = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Par catégorie */}
      <Card>
        <CardHeader>
          <CardTitle>Taux de réalisation par catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.by_category).map(([key, value]) => (
              <Card key={key} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-gray-600 mb-2">{key.replace(/_/g, ' ')}</p>
                  <p className="text-2xl font-bold text-gray-900">{value.pourcentage}%</p>
                  <p className="text-xs text-gray-500 mt-1">{value.realises} / {value.total} contrôles</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${value.pourcentage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Par bâtiment */}
      <Card>
        <CardHeader>
          <CardTitle>Taux de réalisation par bâtiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.by_batiment).map(([key, value]) => (
              <Card key={key} className="border-l-4 border-l-purple-500">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-gray-600 mb-2">{key}</p>
                  <p className="text-2xl font-bold text-gray-900">{value.pourcentage}%</p>
                  <p className="text-xs text-gray-500 mt-1">{value.realises} / {value.total} contrôles</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${value.pourcentage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Par périodicité */}
      <Card>
        <CardHeader>
          <CardTitle>Taux de réalisation par périodicité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.by_periodicite).map(([key, value]) => (
              <Card key={key} className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-gray-600 mb-2">{key}</p>
                  <p className="text-2xl font-bold text-gray-900">{value.pourcentage}%</p>
                  <p className="text-xs text-gray-500 mt-1">{value.realises} / {value.total} contrôles</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${value.pourcentage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Composant pour l'affichage en tableau
const TableDisplay = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Tableau par catégorie */}
      <Card>
        <CardHeader>
          <CardTitle>Détails par catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Catégorie</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Réalisés</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Taux</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Progression</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.by_category).map(([key, value]) => (
                  <tr key={key} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{key.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{value.total}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{value.realises}</td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 text-center">{value.pourcentage}%</td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${value.pourcentage}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tableau par bâtiment */}
      <Card>
        <CardHeader>
          <CardTitle>Détails par bâtiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Bâtiment</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Réalisés</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Taux</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Progression</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.by_batiment).map(([key, value]) => (
                  <tr key={key} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{key}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{value.total}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{value.realises}</td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 text-center">{value.pourcentage}%</td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${value.pourcentage}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tableau par périodicité */}
      <Card>
        <CardHeader>
          <CardTitle>Détails par périodicité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Périodicité</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Réalisés</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Taux</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Progression</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.by_periodicite).map(([key, value]) => (
                  <tr key={key} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{key}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{value.total}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-center">{value.realises}</td>
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 text-center">{value.pourcentage}%</td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${value.pourcentage}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Composant pour l'affichage en graphiques
const ChartsDisplay = ({ stats, categoryChartData, batimentChartData, periodiciteChartData }) => {
  return (
    <div className="space-y-6">
      {/* Graphiques par catégorie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par catégorie (Camembert)</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '400px' }}>
              <ResponsivePie
                data={categoryChartData}
                margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                activeOuterRadiusOffset={8}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsTextColor="#333333"
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                valueFormat={(value) => `${value}%`}
                legends={[
                  {
                    anchor: 'bottom',
                    direction: 'row',
                    justify: false,
                    translateX: 0,
                    translateY: 56,
                    itemsSpacing: 0,
                    itemWidth: 100,
                    itemHeight: 18,
                    itemTextColor: '#999',
                    itemDirection: 'left-to-right',
                    itemOpacity: 1,
                    symbolSize: 18,
                    symbolShape: 'circle'
                  }
                ]}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Taux de réalisation par catégorie (Barres)</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '400px' }}>
              <ResponsiveBar
                data={categoryChartData}
                keys={['value']}
                indexBy="label"
                margin={{ top: 50, right: 130, bottom: 100, left: 60 }}
                padding={0.3}
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                colors={{ scheme: 'nivo' }}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legend: 'Catégorie',
                  legendPosition: 'middle',
                  legendOffset: 80
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Taux (%)',
                  legendPosition: 'middle',
                  legendOffset: -40
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                valueFormat={(value) => `${value}%`}
                legends={[]}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques par bâtiment */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition par bâtiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: '400px' }}>
            <ResponsiveBar
              data={batimentChartData}
              keys={['value']}
              indexBy="label"
              margin={{ top: 50, right: 130, bottom: 80, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'set2' }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Bâtiment',
                legendPosition: 'middle',
                legendOffset: 60
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Taux (%)',
                legendPosition: 'middle',
                legendOffset: -40
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              valueFormat={(value) => `${value}%`}
              legends={[]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Graphiques par périodicité */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition par périodicité</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: '400px' }}>
            <ResponsiveBar
              data={periodiciteChartData}
              keys={['value']}
              indexBy="label"
              margin={{ top: 50, right: 130, bottom: 80, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'paired' }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Périodicité',
                legendPosition: 'middle',
                legendOffset: 60
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Taux (%)',
                legendPosition: 'middle',
                legendOffset: -40
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              valueFormat={(value) => `${value}%`}
              legends={[]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SurveillanceRapport;
