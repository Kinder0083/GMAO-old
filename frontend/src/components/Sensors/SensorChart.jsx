/**
 * SensorChart - Composant de graphique avancé pour les capteurs IoT
 * 
 * Caractéristiques:
 * - Courbe spline lisse (monotone)
 * - Axe Y adaptatif avec marge de 15%
 * - Axe X dynamique (jusqu'à 8 heures)
 * - Lignes de référence verticales toutes les 30 minutes
 * - Seuils min/max en pointillés rouges
 * - Valeur actuelle en ligne grise continue
 */
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const SensorChart = ({ 
  sensor, 
  chartData, 
  stats,
  height = 220 
}) => {
  // Formater les données pour le graphique
  const formattedData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    
    // S'assurer que les valeurs sont des nombres valides
    return chartData.map(d => ({
      ...d,
      value: d.value !== null && d.value !== undefined ? Number(d.value) : null
    })).filter(d => d.value !== null && !isNaN(d.value));
  }, [chartData]);

  // Calculer les domaines des axes Y
  const yDomain = useMemo(() => {
    // Utiliser les stats si disponibles
    if (stats?.min != null && stats?.max != null) {
      const minVal = Number(stats.min);
      const maxVal = Number(stats.max);
      const range = maxVal - minVal || 1;
      const margin = range * 0.15;
      
      return [
        Math.floor((minVal - margin) * 10) / 10,
        Math.ceil((maxVal + margin) * 10) / 10
      ];
    }
    
    // Sinon calculer depuis les données
    if (!formattedData || formattedData.length === 0) {
      return ['auto', 'auto'];
    }
    
    const values = formattedData.map(d => d.value).filter(v => v !== null && !isNaN(v));
    if (values.length === 0) return ['auto', 'auto'];
    
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    
    // Inclure les seuils dans le calcul si définis
    if (sensor?.min_threshold != null) {
      minVal = Math.min(minVal, Number(sensor.min_threshold));
    }
    if (sensor?.max_threshold != null) {
      maxVal = Math.max(maxVal, Number(sensor.max_threshold));
    }
    
    // Ajouter 15% de marge
    const range = maxVal - minVal || 1;
    const margin = range * 0.15;
    
    return [
      Math.floor((minVal - margin) * 10) / 10,
      Math.ceil((maxVal + margin) * 10) / 10
    ];
  }, [formattedData, stats, sensor?.min_threshold, sensor?.max_threshold]);

  // Valeur actuelle pour la ligne de référence horizontale
  const currentValue = sensor?.current_value;
  const hasCurrentValue = currentValue !== null && currentValue !== undefined && !isNaN(Number(currentValue));

  // Couleur de la courbe
  const lineColor = '#8b5cf6'; // Violet

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-white/95 px-3 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-sm font-semibold text-gray-800">
            {value != null ? `${Number(value).toFixed(2)} ${sensor?.unite || ''}` : '--'}
          </p>
        </div>
      );
    }
    return null;
  };

  // Debug: Afficher les données dans la console
  console.log('SensorChart data:', {
    sensor: sensor?.nom,
    dataLength: formattedData.length,
    yDomain,
    currentValue,
    stats,
    sampleData: formattedData.slice(0, 3)
  });

  if (!formattedData || formattedData.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-lg"
        style={{ height }}
      >
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={formattedData} 
          margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
        >
          {/* Grille de fond */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e5e7eb" 
            vertical={true}
            horizontal={true}
          />
          
          {/* Axe X - Temps */}
          <XAxis 
            dataKey="time"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          
          {/* Axe Y - Valeur avec largeur suffisante pour les grandes valeurs */}
          <YAxis 
            domain={yDomain}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
            width={60}
            tickFormatter={(val) => {
              if (val >= 1000) return val.toFixed(0);
              if (val >= 100) return val.toFixed(1);
              return val.toFixed(2);
            }}
            allowDataOverflow={false}
          />
          
          {/* Seuil minimum - Pointillés rouges */}
          {sensor?.min_threshold != null && (
            <ReferenceLine 
              y={Number(sensor.min_threshold)} 
              stroke="#ef4444" 
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{ 
                value: `Min: ${sensor.min_threshold}`, 
                position: 'left',
                fill: '#ef4444',
                fontSize: 10,
                fontWeight: 500
              }}
            />
          )}
          
          {/* Seuil maximum - Pointillés rouges */}
          {sensor?.max_threshold != null && (
            <ReferenceLine 
              y={Number(sensor.max_threshold)} 
              stroke="#ef4444" 
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{ 
                value: `Max: ${sensor.max_threshold}`, 
                position: 'left',
                fill: '#ef4444',
                fontSize: 10,
                fontWeight: 500
              }}
            />
          )}
          
          {/* Valeur actuelle - Ligne grise continue */}
          {hasCurrentValue && (
            <ReferenceLine 
              y={Number(currentValue)} 
              stroke="#9ca3af" 
              strokeWidth={1}
              label={{ 
                value: `Actuel: ${Number(currentValue).toFixed(1)}`, 
                position: 'right',
                fill: '#6b7280',
                fontSize: 9
              }}
            />
          )}
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Courbe spline lisse - IMPORTANT: isAnimationActive pour éviter les problèmes de rendu */}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: lineColor, stroke: '#fff', strokeWidth: 2 }}
            connectNulls={true}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SensorChart;
