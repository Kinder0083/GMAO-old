import React from 'react';
import { SelectItem } from '../components/ui/select';

export const modules = [
  { value: 'all', label: 'Toutes les données', group: '' },
  // --- Opérations ---
  { value: 'intervention-requests', label: 'Demandes d\'intervention', group: 'Opérations' },
  { value: 'work-orders', label: 'Ordres de travail', group: 'Opérations' },
  { value: 'work-order-templates', label: 'Templates OT', group: 'Opérations' },
  { value: 'improvement-requests', label: 'Demandes d\'amélioration', group: 'Opérations' },
  { value: 'improvements', label: 'Améliorations', group: 'Opérations' },
  { value: 'demandes-arret', label: 'Demandes d\'arrêt', group: 'Opérations' },
  { value: 'consignes', label: 'Consignes', group: 'Opérations' },
  // --- Équipements & Maintenance ---
  { value: 'equipments', label: 'Équipements', group: 'Équipements' },
  { value: 'meters', label: 'Compteurs', group: 'Équipements' },
  { value: 'meter-readings', label: 'Relevés de compteurs', group: 'Équipements' },
  { value: 'preventive-maintenance', label: 'Maintenance Préventive', group: 'Équipements' },
  { value: 'preventive-checklists', label: 'Checklists Préventives', group: 'Équipements' },
  { value: 'preventive-checklist-templates', label: 'Templates Checklists', group: 'Équipements' },
  { value: 'preventive-checklist-executions', label: 'Exécutions Checklists', group: 'Équipements' },
  { value: 'planning-equipement', label: 'Planning Équipement', group: 'Équipements' },
  // --- M.E.S. ---
  { value: 'mes-machines', label: 'M.E.S. - Machines', group: 'M.E.S.' },
  { value: 'mes-product-references', label: 'M.E.S. - Références Produit', group: 'M.E.S.' },
  { value: 'mes-rejects', label: 'M.E.S. - Rejets', group: 'M.E.S.' },
  { value: 'mes-reject-reasons', label: 'M.E.S. - Motifs de Rejet', group: 'M.E.S.' },
  { value: 'mes-cadence-history', label: 'M.E.S. - Historique Cadence', group: 'M.E.S.' },
  { value: 'mes-alerts', label: 'M.E.S. - Alertes', group: 'M.E.S.' },
  { value: 'mes-scheduled-reports', label: 'M.E.S. - Rapports Programmés', group: 'M.E.S.' },
  { value: 'mes-pulses', label: 'M.E.S. - Pulses', group: 'M.E.S.' },
  // --- QHSE / Surveillance ---
  { value: 'surveillance-items', label: 'Plan de Surveillance (Items)', group: 'QHSE' },
  { value: 'surveillance-plan', label: 'Plan de Surveillance', group: 'QHSE' },
  { value: 'surveillance-controls', label: 'Contrôles Surveillance', group: 'QHSE' },
  { value: 'presqu-accident-items', label: 'Presqu\'accident (Items)', group: 'QHSE' },
  { value: 'presqu-accident', label: 'Presqu\'accident (Rapports)', group: 'QHSE' },
  // --- IoT / MQTT ---
  { value: 'sensors', label: 'Capteurs IoT/MQTT', group: 'IoT' },
  { value: 'mqtt-logs', label: 'Logs MQTT', group: 'IoT' },
  { value: 'mqtt-config', label: 'Configuration MQTT', group: 'IoT' },
  { value: 'mqtt-subscriptions', label: 'Abonnements MQTT', group: 'IoT' },
  // --- Caméras ---
  { value: 'cameras', label: 'Caméras', group: 'Caméras' },
  { value: 'camera-settings', label: 'Paramètres Caméras', group: 'Caméras' },
  { value: 'camera-alerts', label: 'Alertes Caméras', group: 'Caméras' },
  // --- Documentations ---
  { value: 'documentations', label: 'Pôles de Service', group: 'Documents' },
  { value: 'documents', label: 'Documents', group: 'Documents' },
  { value: 'bons-travail', label: 'Bons de Travail', group: 'Documents' },
  { value: 'doc-folders', label: 'Dossiers', group: 'Documents' },
  // --- Rapports ---
  { value: 'reports-historique', label: 'Historique Rapports', group: 'Rapports' },
  { value: 'weekly-report-history', label: 'Rapports Hebdo.', group: 'Rapports' },
  { value: 'weekly-report-settings', label: 'Config Rapports Hebdo.', group: 'Rapports' },
  { value: 'weekly-report-templates', label: 'Templates Rapports', group: 'Rapports' },
  // --- Ressources ---
  { value: 'users', label: 'Utilisateurs', group: 'Ressources' },
  { value: 'roles', label: 'Rôles', group: 'Ressources' },
  { value: 'team-members', label: 'Membres d\'équipe', group: 'Ressources' },
  { value: 'absences', label: 'Absences', group: 'Ressources' },
  { value: 'work-rhythms', label: 'Rythmes de travail', group: 'Ressources' },
  // --- Stock & Achats ---
  { value: 'inventory', label: 'Inventaire', group: 'Stock' },
  { value: 'locations', label: 'Zones', group: 'Stock' },
  { value: 'vendors', label: 'Fournisseurs', group: 'Stock' },
  { value: 'purchase-history', label: 'Historique Achat', group: 'Stock' },
  { value: 'purchase-requests', label: 'Demandes d\'Achat', group: 'Stock' },
  { value: 'contracts', label: 'Contrats', group: 'Stock' },
  // --- Communication ---
  { value: 'chat-messages', label: 'Messages Chat Live', group: 'Communication' },
  { value: 'whiteboards', label: 'Tableaux blancs', group: 'Communication' },
  { value: 'whiteboard-objects', label: 'Objets Tableaux blancs', group: 'Communication' },
  { value: 'notifications', label: 'Notifications', group: 'Communication' },
  // --- Configuration ---
  { value: 'custom-forms', label: 'Formulaires personnalisés', group: 'Configuration' },
  { value: 'form-templates', label: 'Modèles de formulaires', group: 'Configuration' },
  { value: 'global-settings', label: 'Paramètres globaux', group: 'Configuration' },
  { value: 'user-preferences', label: 'Préférences utilisateur', group: 'Configuration' },
  { value: 'service-dashboard-configs', label: 'Config Dashboard Service', group: 'Configuration' },
  { value: 'audit-logs', label: 'Journal d\'audit', group: 'Configuration' },
];

const groupedModules = modules.reduce((acc, mod) => {
  const group = mod.group || '';
  if (!acc[group]) acc[group] = [];
  acc[group].push(mod);
  return acc;
}, {});

export const renderModuleOptions = () => (
  <>
    {Object.entries(groupedModules).map(([group, mods]) => (
      <React.Fragment key={group}>
        {group && (
          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
            {group}
          </div>
        )}
        {mods.map(mod => (
          <SelectItem key={mod.value} value={mod.value}>
            {mod.label}
          </SelectItem>
        ))}
      </React.Fragment>
    ))}
  </>
);
