import { useState, useEffect, useCallback } from 'react';
import { useSensors } from './useSensors';
import api from '../services/api';

/**
 * Hook pour gérer le Dashboard IoT avec synchronisation temps réel des capteurs
 */
export const useIoTDashboard = (timeRange = 24) => {
  const [sensorReadings, setSensorReadings] = useState({});
  const [statistics, setStatistics] = useState({});
  const [groupsByType, setGroupsByType] = useState([]);
  const [groupsByLocation, setGroupsByLocation] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Utiliser le hook temps réel pour les capteurs
  const { sensors, loading: loadingSensors, wsConnected, refresh: refreshSensors } = useSensors();

  // Charger les données détaillées quand les capteurs changent
  const loadDetails = useCallback(async () => {
    // Attendre que les capteurs soient chargés
    if (loadingSensors) return;
    
    // Si pas de capteurs, ne pas charger les détails
    if (!sensors || sensors.length === 0) {
      setGroupsByType([]);
      setGroupsByLocation([]);
      setSensorReadings({});
      setStatistics({});
      return;
    }

    try {
      setLoadingDetails(true);
      
      // Charger les groupes
      const [groupsTypeResponse, groupsLocationResponse] = await Promise.all([
        api.sensors.getGroupsByType(),
        api.sensors.getGroupsByLocation()
      ]);
      
      setGroupsByType(groupsTypeResponse.data.groups || []);
      setGroupsByLocation(groupsLocationResponse.data.groups || []);

      // Charger les relevés et statistiques pour chaque capteur
      const readingsPromises = sensors.map(sensor =>
        api.sensors.getReadings(sensor.id, 100, timeRange).catch(() => ({ data: [] }))
      );
      const statsPromises = sensors.map(sensor =>
        api.sensors.getStatistics(sensor.id, timeRange).catch(() => ({ data: {} }))
      );

      const [readingsResults, statsResults] = await Promise.all([
        Promise.all(readingsPromises),
        Promise.all(statsPromises)
      ]);

      // Organiser les données par sensor_id
      const readingsMap = {};
      const statsMap = {};
      
      sensors.forEach((sensor, index) => {
        readingsMap[sensor.id] = readingsResults[index].data;
        statsMap[sensor.id] = statsResults[index].data;
      });

      setSensorReadings(readingsMap);
      setStatistics(statsMap);
    } catch (error) {
      console.error('Erreur chargement détails dashboard:', error);
    } finally {
      setLoadingDetails(false);
    }
  }, [sensors, loadingSensors, timeRange]);

  // Recharger les détails quand les capteurs ou le timeRange changent
  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const refresh = useCallback(async () => {
    await refreshSensors();
  }, [refreshSensors]);

  return {
    sensors: sensors || [],
    sensorReadings,
    statistics,
    groupsByType,
    groupsByLocation,
    loading: loadingSensors || loadingDetails,
    wsConnected,
    refresh
  };
};

export default useIoTDashboard;
