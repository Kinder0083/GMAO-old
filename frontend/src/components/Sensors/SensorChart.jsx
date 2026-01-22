/**
 * SensorChart - Composant de graphique avancé pour les capteurs IoT
 * 
 * Caractéristiques:
 * - Courbe spline lisse (monotone)
 * - Axe Y adaptatif avec marge de 15%
 * - Axe X dynamique (jusqu'à 8 heures)
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
  // Formater et valider les données pour le graphique
  const formattedData = useMemo(() => {
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
      return [];
    }
    
    // S'assurer que chaque point a une valeur numérique valide
    return chartData
      .filter(d => d && d.value !== null && d.value !== undefined)
      .map(d => ({
        time: d.time || '',
        value: typeof d.value === 'number' ? d.value : parseFloat(d.value),
        timestamp: d.timestamp
      }))
      .filter(d => !isNaN(d.value));
  }, [chartData]);

  // Calculer le domaine Y basé sur les données OU les stats
  const yDomain = useMemo(() => {
    let minVal = null;
    let maxVal = null;
    
    // D'abord essayer d'utiliser les stats si disponibles
    if (stats?.min != null && stats?.max != null) {
      minVal = Number(stats.min);
      maxVal = Number(stats.max);
    }
    
    // Sinon utiliser les données du graphique
    if ((minVal === null || maxVal === null) && formattedData.length > 0) {
      const values = formattedData.map(d => d.value);
      minVal = Math.min(...values);
      maxVal = Math.max(...values);
    }
    
    // Si toujours pas de valeurs, utiliser auto
    if (minVal === null || maxVal === null || isNaN(minVal) || isNaN(maxVal)) {
      return ['auto', 'auto'];
    }
    
    // Inclure les seuils dans le calcul si définis
    if (sensor?.min_threshold != null && !isNaN(Number(sensor.min_threshold))) {
      minVal = Math.min(minVal, Number(sensor.min_threshold));
    }
    if (sensor?.max_threshold != null && !isNaN(Number(sensor.max_threshold))) {
      maxVal = Math.max(maxVal, Number(sensor.max_threshold));
    }
    
    // Ajouter 15% de marge
    const range = maxVal - minVal;
    if (range === 0) {
      // Si min = max, créer une marge autour de la valeur
      return [minVal - 1, maxVal + 1];
    }
    
    const margin = range * 0.15;
    return [
      Math.floor((minVal - margin) * 100) / 100,
      Math.ceil((maxVal + margin) * 100) / 100
    ];
  }, [formattedData, stats, sensor?.min_threshold, sensor?.max_threshold]);

  // Valeur actuelle
  const currentValue = sensor?.current_value;
  const hasCurrentValue = currentValue !== null && currentValue !== undefined && !isNaN(Number(currentValue));

  // Couleur de la courbe
  const lineColor = '#8b5cf6'; // Violet

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0]?.value;
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-sm font-semibold text-gray-800">
            {value != null ? `${Number(value).toFixed(2)} ${sensor?.unite || ''}` : '--'}
          </p>
        </div>
      );
    }
    return null;
  };

  // Pas de données à afficher
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
          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
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
          
          {/* Axe Y - Valeur */}
          <YAxis 
            domain={yDomain}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
            width={65}
            tickFormatter={(val) => {
              if (typeof val !== 'number' || isNaN(val)) return '';
              if (Math.abs(val) >= 1000) return val.toFixed(0);
              if (Math.abs(val) >= 100) return val.toFixed(1);
              return val.toFixed(2);
            }}
            allowDataOverflow={false}
          />
          
          {/* Seuil minimum - Pointillés rouges */}
          {sensor?.min_threshold != null && !isNaN(Number(sensor.min_threshold)) && (
            <ReferenceLine 
              y={Number(sensor.min_threshold)} 
              stroke="#ef4444" 
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{ 
                value: `Min: ${sensor.min_threshold}`, 
                position: 'insideTopLeft',
                fill: '#ef4444',
                fontSize: 10,
                fontWeight: 500
              }}
            />
          )}
          
          {/* Seuil maximum - Pointillés rouges */}
          {sensor?.max_threshold != null && !isNaN(Number(sensor.max_threshold)) && (
            <ReferenceLine 
              y={Number(sensor.max_threshold)} 
              stroke="#ef4444" 
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{ 
                value: `Max: ${sensor.max_threshold}`, 
                position: 'insideBottomLeft',
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
                value: `${Number(currentValue).toFixed(1)}`, 
                position: 'right',
                fill: '#6b7280',
                fontSize: 9
              }}
            />
          )}
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Courbe spline lisse */}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: lineColor, stroke: '#fff', strokeWidth: 2 }}
            connectNulls={true}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SensorChart;
