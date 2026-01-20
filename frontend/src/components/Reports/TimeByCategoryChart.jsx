import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BarChart3 } from 'lucide-react';
import { reportsAPI } from '../../services/api';
import { useToast } from '../../hooks/use-toast';

const TimeByCategoryChart = () => {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState('');
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState({
    CHANGEMENT_FORMAT: true,
    TRAVAUX_PREVENTIFS: true,
    TRAVAUX_CURATIF: true,
    TRAVAUX_DIVERS: true,
    FORMATION: true,
    REGLAGE: true
  });

  // Générer les options de mois (24 mois en arrière et 12 mois en avant)
  const generateMonthOptions = () => {
    const months = [];
    const now = new Date();
    
    // 24 mois en arrière
    for (let i = 24; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
      });
    }
    
    // 12 mois en avant
    for (let i = 1; i <= 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
      });
    }
    
    return months;
  };

  const monthOptions = generateMonthOptions();

  // Initialiser avec le mois actuel
  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
  }, []);

  // Charger les données quand le mois change
  useEffect(() => {
    if (selectedMonth) {
      loadChartData();
    }
  }, [selectedMonth]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const response = await reportsAPI.getTimeByCategory(selectedMonth);
      setChartData(response.data);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const categoryColors = {
    CHANGEMENT_FORMAT: '#3b82f6',
    TRAVAUX_PREVENTIFS: '#10b981',
    TRAVAUX_CURATIF: '#ef4444',
    TRAVAUX_DIVERS: '#f59e0b',
    FORMATION: '#8b5cf6',
    REGLAGE: '#06b6d4'
  };

  const categoryLabels = {
    CHANGEMENT_FORMAT: 'Changement de Format',
    TRAVAUX_PREVENTIFS: 'Travaux Préventifs',
    TRAVAUX_CURATIF: 'Travaux Curatif',
    TRAVAUX_DIVERS: 'Travaux Divers',
    FORMATION: 'Formation',
    REGLAGE: 'Réglage'
  };

  const formatMonthLabel = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  };

  const formatTime = (hours) => {
    if (!hours || hours === 0) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  };

  // Toggle visibility of a category
  const toggleCategory = (category) => {
    setVisibleCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Calculer la hauteur maximale pour l'échelle - arrondi à un nombre entier propre
  const getMaxValue = () => {
    if (!chartData || !chartData.months) return 10;
    let max = 0;
    chartData.months.forEach(month => {
      // Ne compter que les catégories visibles
      const total = Object.entries(month.categories)
        .filter(([cat]) => visibleCategories[cat])
        .reduce((sum, [_, val]) => sum + val, 0);
      if (total > max) max = total;
    });
    
    // Arrondir au prochain entier pour une échelle propre
    // Ex: 3.0 -> 4, 3.5 -> 4, 4.2 -> 5
    if (max === 0) return 10;
    return Math.ceil(max);
  };

  const maxValue = getMaxValue();
  
  // Générer les graduations de l'échelle Y (ex: 0, 1, 2, 3, 4 pour maxValue=4)
  const getYAxisLabels = () => {
    const labels = [];
    const step = maxValue <= 5 ? 1 : Math.ceil(maxValue / 5);
    for (let i = maxValue; i >= 0; i -= step) {
      labels.push(i);
    }
    // S'assurer que 0 est inclus
    if (labels[labels.length - 1] !== 0) {
      labels.push(0);
    }
    return labels;
  };
  
  const yAxisLabels = getYAxisLabels();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Evolution horaire des maintenances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Chargement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Evolution horaire des maintenances
          </CardTitle>
          <div className="w-64">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Temps total passé par catégorie sur 12 mois glissants
        </p>
      </CardHeader>
      <CardContent>
        {/* Légende interactive */}
        <div className="flex flex-wrap gap-4 mb-6 justify-center">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggleCategory(key)}
              className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              style={{ opacity: visibleCategories[key] ? 1 : 0.4 }}
            >
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: categoryColors[key] }}
              />
              <span className="text-sm text-gray-700 font-medium">{label}</span>
              {!visibleCategories[key] && (
                <span className="text-xs text-gray-400">(masqué)</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 text-center mb-4">
          💡 Cliquez sur une catégorie pour l'afficher ou la masquer
        </p>

        {/* Graphique avec échelle Y intégrée */}
        <div className="relative bg-gray-50 rounded-lg p-4 pt-12">
          {/* Espace réservé pour les tooltips en haut */}
          <div className="flex">
            {/* Échelle Y - alignée exactement avec la zone des barres */}
            <div className="flex flex-col justify-between pr-3 text-xs text-gray-500" style={{ height: '256px' }}>
              {yAxisLabels.map((val, idx) => (
                <span key={idx} className="text-right min-w-[40px]">
                  {formatTime(val)}
                </span>
              ))}
            </div>
            
            {/* Zone des barres avec lignes de grille */}
            <div className="flex-1 relative overflow-visible">
              {/* Lignes de grille horizontales */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ height: '256px' }}>
                {yAxisLabels.map((_, idx) => (
                  <div key={idx} className="border-t border-gray-200 w-full" />
                ))}
              </div>
              
              {/* Barres du graphique */}
              {chartData && chartData.months && (
                <div className="flex items-end justify-start gap-4 overflow-x-auto overflow-y-visible" style={{ height: '256px' }}>
                  {chartData.months.map((monthData, index) => {
                    // Calculer le total uniquement pour les catégories visibles
                    const totalTime = Object.entries(monthData.categories)
                      .filter(([cat]) => visibleCategories[cat])
                      .reduce((sum, [_, val]) => sum + val, 0);
                    
                    return (
                      <div key={index} className="flex flex-col items-center min-w-[120px]">
                        {/* Groupe de barres côte à côte */}
                        <div className="flex items-end justify-center gap-1 w-full" style={{ height: '256px' }}>
                          {/* Ordre fixe des catégories pour cohérence visuelle */}
                          {['CHANGEMENT_FORMAT', 'TRAVAUX_PREVENTIFS', 'TRAVAUX_CURATIF', 'TRAVAUX_DIVERS', 'FORMATION', 'REGLAGE']
                            .filter(category => visibleCategories[category]) // Filtrer les catégories masquées
                            .map((category) => {
                              const time = monthData.categories[category] || 0;
                              // Calcul précis : hauteur proportionnelle à la valeur
                              const heightPercent = maxValue > 0 ? (time / maxValue) * 100 : 0;
                              
                              // Calculer le pourcentage par rapport au total des catégories visibles
                              const percentOfMonth = totalTime > 0 ? ((time / totalTime) * 100).toFixed(1) : 0;
                              
                              return (
                                <div
                                  key={category}
                                  className="relative group cursor-pointer hover:opacity-80 transition-opacity w-3"
                                  style={{
                                    height: `${heightPercent}%`,
                                    backgroundColor: categoryColors[category],
                                    minHeight: time > 0 ? '4px' : '0px'
                                  }}
                                >
                                  {/* Tooltip */}
                                  {time > 0 && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                      <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                        <div className="font-semibold">{categoryLabels[category]}</div>
                                        <div>{formatTime(time)} ({percentOfMonth}%)</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Labels des mois et totaux - en dessous du graphique */}
          {chartData && chartData.months && (
            <div className="flex justify-start gap-4 mt-2 ml-[52px] overflow-x-auto">
              {chartData.months.map((monthData, index) => {
                const totalTime = Object.entries(monthData.categories)
                  .filter(([cat]) => visibleCategories[cat])
                  .reduce((sum, [_, val]) => sum + val, 0);
                
                return (
                  <div key={index} className="flex flex-col items-center min-w-[120px]">
                    <div className="text-xs text-gray-600 text-center">
                      {formatMonthLabel(monthData.month)}
                    </div>
                    {totalTime > 0 && (
                      <div className="text-xs font-semibold text-gray-700 mt-1">
                        {formatTime(totalTime)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeByCategoryChart;