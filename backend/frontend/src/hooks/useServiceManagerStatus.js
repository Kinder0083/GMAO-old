import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Hook pour récupérer le statut de responsable de service de l'utilisateur connecté.
 * Permet de savoir si les données sont filtrées par service.
 */
export const useServiceManagerStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/service-manager/status');
        setStatus(response.data);
      } catch (err) {
        // Si erreur 401/403, l'utilisateur n'est pas connecté ou pas autorisé
        if (err.response?.status !== 401 && err.response?.status !== 403) {
          console.error('Erreur lors de la récupération du statut de manager:', err);
        }
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return {
    isServiceManager: status?.is_service_manager || false,
    managedServices: status?.managed_services || [],
    serviceFilter: status?.service_filter,
    userService: status?.user_service,
    userRole: status?.user_role,
    isFiltered: !!status?.service_filter,
    loading,
    error
  };
};

export default useServiceManagerStatus;
