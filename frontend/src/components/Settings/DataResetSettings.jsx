import React, { useState } from 'react';
import { Trash2, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/config';
import { useToast } from '../../hooks/use-toast';

const SECTIONS = [
  { key: 'work_orders', label: 'Ordres de travail', color: 'blue' },
  { key: 'intervention_requests', label: "Demandes d'intervention", color: 'indigo' },
  { key: 'improvement_requests', label: "Demandes d'amélioration", color: 'purple' },
  { key: 'improvements', label: 'Améliorations', color: 'violet' },
  { key: 'equipments', label: 'Équipements', color: 'emerald' },
  { key: 'inventory', label: 'Inventaire (pièces)', color: 'teal' },
  { key: 'locations', label: 'Zones / Emplacements', color: 'cyan' },
  { key: 'preventive_maintenance', label: 'Maintenance préventive', color: 'amber' },
  { key: 'vendors', label: 'Fournisseurs', color: 'orange' },
  { key: 'purchase_history', label: "Historique d'achat", color: 'rose' },
  { key: 'purchase_requests', label: "Demandes d'achat", color: 'pink' },
  { key: 'sensors', label: 'Capteurs MQTT', color: 'lime' },
  { key: 'chat_messages', label: 'Messages Chat Live', color: 'sky' },
  { key: 'surveillance_items', label: 'Plan de surveillance', color: 'yellow' },
  { key: 'users', label: 'Utilisateurs (sauf admin actuel)', color: 'red' },
];

const DataResetSettings = () => {
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(null);
  const { toast } = useToast();

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const handleReset = async (sectionKey) => {
    if (confirmText !== 'CONFIRMER') return;

    setLoading(sectionKey);
    try {
      const response = await axios.delete(
        `${BACKEND_URL}/api/admin/reset/${sectionKey}`,
        { headers }
      );
      const data = response.data;
      toast({
        title: 'Section réinitialisée',
        description: `${data.deleted_count} élément(s) supprimé(s) de "${data.section}"`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Erreur lors de la réinitialisation',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
      setConfirmTarget(null);
      setConfirmText('');
    }
  };

  const handleResetAll = async () => {
    if (confirmText !== 'CONFIRMER') return;

    setLoading('all');
    try {
      const response = await axios.delete(
        `${BACKEND_URL}/api/admin/reset-all`,
        { headers }
      );
      const data = response.data;
      const total = Object.values(data.details).reduce((sum, v) => sum + v, 0);
      toast({
        title: 'GMAO réinitialisée',
        description: `${total} élément(s) supprimé(s) au total`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Erreur lors de la réinitialisation',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
      setConfirmTarget(null);
      setConfirmText('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden" data-testid="data-reset-settings">
      {/* Header */}
      <div className="bg-red-50 border-b border-red-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <RotateCcw className="h-5 w-5 text-red-600" />
          <div>
            <h2 className="text-lg font-semibold text-red-900">Réinitialisation des données</h2>
            <p className="text-sm text-red-600">Supprimer les données par section ou réinitialiser toute la FSAO</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Attention :</strong> Ces actions sont irréversibles. Les données supprimées ne pourront pas être récupérées.
            Pensez à exporter vos données avant toute réinitialisation.
          </div>
        </div>

        {/* Sections grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              data-testid={`reset-btn-${section.key}`}
              onClick={() => { setConfirmTarget(section.key); setConfirmText(''); }}
              disabled={loading !== null}
              className="flex items-center gap-3 px-4 py-3 text-left border border-gray-200 rounded-lg
                         hover:border-red-300 hover:bg-red-50 transition-colors group disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 text-gray-400 group-hover:text-red-500 shrink-0" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-red-700">
                {section.label}
              </span>
            </button>
          ))}
        </div>

        {/* Reset ALL button */}
        <button
          data-testid="reset-btn-all"
          onClick={() => { setConfirmTarget('all'); setConfirmText(''); }}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg
                     hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
        >
          <Trash2 className="h-5 w-5" />
          Réinitialiser TOUTES les données
        </button>
      </div>

      {/* Confirmation modal */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="reset-confirm-modal">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-900">
                  {confirmTarget === 'all' ? 'Réinitialiser TOUTE la FSAO' : 'Confirmer la suppression'}
                </h3>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                {confirmTarget === 'all'
                  ? 'Vous allez supprimer TOUTES les données de la FSAO (sauf votre compte admin). Cette action est irréversible.'
                  : `Vous allez supprimer toutes les données de la section "${SECTIONS.find(s => s.key === confirmTarget)?.label}". Cette action est irréversible.`
                }
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tapez <span className="font-bold text-red-600">CONFIRMER</span> pour valider
                </label>
                <input
                  data-testid="reset-confirm-input"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="CONFIRMER"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                data-testid="reset-cancel-btn"
                onClick={() => { setConfirmTarget(null); setConfirmText(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                data-testid="reset-confirm-btn"
                onClick={() => confirmTarget === 'all' ? handleResetAll() : handleReset(confirmTarget)}
                disabled={confirmText !== 'CONFIRMER' || loading !== null}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg
                           hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataResetSettings;
