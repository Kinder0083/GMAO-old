import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour gérer les permissions de l'utilisateur connecté
 */
export const usePermissions = () => {
  const [permissions, setPermissions] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Récupérer les informations de l'utilisateur depuis localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setPermissions(user.permissions || {});
        setUserRole(user.role);
      } catch (error) {
        console.error('Erreur lors de la lecture des permissions:', error);
      }
    }
  }, []);

  /**
   * Vérifie si l'utilisateur a une permission spécifique
   * @param {string} module - Nom du module (ex: 'workOrders', 'assets')
   * @param {string} permissionType - Type de permission ('view', 'edit', 'delete')
   * @returns {boolean} true si l'utilisateur a la permission
   */
  const hasPermission = (module, permissionType) => {
    // Les admins ont toujours toutes les permissions
    if (userRole === 'ADMIN') {
      return true;
    }

    if (!permissions || !permissions[module]) {
      return false;
    }

    return permissions[module][permissionType] === true;
  };

  /**
   * Vérifie si l'utilisateur peut voir un module
   */
  const canView = (module) => hasPermission(module, 'view');

  /**
   * Vérifie si l'utilisateur peut modifier un module
   */
  const canEdit = (module) => hasPermission(module, 'edit');

  /**
   * Vérifie si l'utilisateur peut supprimer dans un module
   */
  const canDelete = (module) => hasPermission(module, 'delete');

  /**
   * Vérifie si l'utilisateur est admin
   */
  const isAdmin = () => userRole === 'ADMIN';

  return {
    permissions,
    userRole,
    hasPermission,
    canView,
    canEdit,
    canDelete,
    isAdmin
  };
};
