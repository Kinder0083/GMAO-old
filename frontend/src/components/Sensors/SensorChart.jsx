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
    return chartData;
  }, [chartData]);

  // Calculer les domaines des axes
  const yDomain = useMemo(() => {
    if (!formattedData || formattedData.length === 0) {
      return [0, 100];
    }
    
    const values = formattedData.map(d => d.value).filter(v => v !== null && v !== undefined);
    if (values.length === 0) return [0, 100];
    
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    
    // Inclure les seuils dans le calcul si définis
    if (sensor?.min_threshold !== null && sensor?.min_threshold !== undefined) {
      minVal = Math.min(minVal, sensor.min_threshold);
    }
    if (sensor?.max_threshold !== null && sensor?.max_threshold !== undefined) {
      maxVal = Math.max(maxVal, sensor.max_threshold);
    }
    
    // Ajouter 15% de marge
    const range = maxVal - minVal || 1;
    const margin = range * 0.15;
    
    return [
      Math.floor((minVal - margin) * 10) / 10,
      Math.ceil((maxVal + margin) * 10) / 10
    ];
  }, [formattedData, sensor?.min_threshold, sensor?.max_threshold]);

  // Générer les lignes de référence temporelles (toutes les 30 min)
  const timeReferenceLines = useMemo(() => {
    if (!formattedData || formattedData.length < 2) return [];
    
    const lines = [];
    const timestamps = formattedData.map(d => d.timestamp);
    
    // Trouver les timestamps qui correspondent à des intervalles de 30 minutes
    const interval30Min = 30 * 60 * 1000; // 30 minutes en ms
    
    if (timestamps.length > 0) {
      const firstTime = new Date(timestamps[0]).getTime();
      const lastTime = new Date(timestamps[timestamps.length - 1]).getTime();
      
      // Trouver le premier multiple de 30 minutes
      let currentTime = Math.ceil(firstTime / interval30Min) * interval30Min;
      
      while (currentTime < lastTime) {
        const timeStr = new Date(currentTime).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        // Trouver le point de données le plus proche
        const closestDataPoint = formattedData.find((d, idx) => {
          const t = new Date(d.timestamp).getTime();
          return Math.abs(t - currentTime) < interval30Min / 2;
        });
        
        if (closestDataPoint) {
          lines.push({
            time: closestDataPoint.time,
            label: timeStr
          });
        }
        
        currentTime += interval30Min;
      }
    }
    
    return lines;
  }, [formattedData]);

  // Valeur actuelle pour la ligne de référence horizontale
  const currentValue = sensor?.current_value;
  const hasCurrentValue = currentValue !== null && currentValue !== undefined && !isNaN(currentValue);

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
          margin={{ top: 15, right: 15, left: 5, bottom: 5 }}
        >
          {/* Grille de fond avec lignes verticales toutes les 30 min */}
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
            minTickGap={50}
          />
          
          {/* Axe Y - Valeur */}
          <YAxis 
            domain={yDomain}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
            width={45}
            tickFormatter={(val) => val.toFixed(1)}
          />
          
          {/* Seuil minimum - Pointillés rouges */}
          {sensor?.min_threshold != null && (
            <ReferenceLine 
              y={sensor.min_threshold} 
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
          {sensor?.max_threshold != null && (
            <ReferenceLine 
              y={sensor.max_threshold} 
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
              stroke="#6b7280" 
              strokeWidth={1}
              strokeOpacity={0.6}
              label={{ 
                value: `Actuel: ${Number(currentValue).toFixed(1)}`, 
                position: 'insideTopRight',
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
            activeDot={{ r: 4, fill: lineColor, stroke: '#fff', strokeWidth: 2 }}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SensorChart;
