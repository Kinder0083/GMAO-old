import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardList, History, BarChart3, PlusCircle, AlertTriangle, Calendar,
  MapPin, Wrench, Activity, ChevronRight, ArrowLeft, QrCode, Lock,
  CheckCircle2, XCircle, Clock, AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const iconMap = {
  ClipboardList, History, BarChart3, PlusCircle, AlertTriangle, Calendar,
  MapPin, Wrench, Activity, QrCode, Lock, CheckCircle2, XCircle, Clock, AlertCircle
};

const statusColors = {
  EN_SERVICE: 'bg-emerald-100 text-emerald-700',
  HORS_SERVICE: 'bg-red-100 text-red-700',
  EN_MAINTENANCE: 'bg-amber-100 text-amber-700',
  EN_ATTENTE_PIECE: 'bg-blue-100 text-blue-700',
};

const statusLabels = {
  EN_SERVICE: 'En service',
  HORS_SERVICE: 'Hors service',
  EN_MAINTENANCE: 'En maintenance',
  EN_ATTENTE_PIECE: 'En attente pièce',
};

const priorityColors = {
  HAUTE: 'text-red-600',
  MOYENNE: 'text-amber-600',
  BASSE: 'text-blue-600',
  CRITIQUE: 'text-red-800 font-bold',
};

const woStatusColors = {
  OUVERT: 'bg-blue-100 text-blue-700',
  EN_COURS: 'bg-amber-100 text-amber-700',
  TERMINE: 'bg-emerald-100 text-emerald-700',
  ANNULE: 'bg-gray-100 text-gray-500',
};

const fetchPublic = async (url) => {
  const res = await fetch(`${API_URL}/api/qr/public${url}`);
  if (!res.ok) throw new Error('Not found');
  return res.json();
};

const QREquipmentPage = () => {
  const { equipmentId } = useParams();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePanel, setActivePanel] = useState(null);
  const [panelData, setPanelData] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [equipmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eq, acts] = await Promise.all([
        fetchPublic(`/equipment/${equipmentId}`),
        fetchPublic('/actions')
      ]);
      setEquipment(eq);
      setActions(acts);
    } catch {
      setError('Équipement non trouvé');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (action.requires_auth) {
      // Redirect to login then back
      const token = localStorage.getItem('token');
      if (!token) {
        navigate(`/login?redirect=/qr/${equipmentId}&action=${action.id}`);
        return;
      }
    }

    const actionHandlers = {
      'last-wo': () => loadPanel('last-wo', `/equipment/${equipmentId}/last-wo`),
      'wo-history': () => loadPanel('wo-history', `/equipment/${equipmentId}/wo-history`),
      'kpi': () => loadPanel('kpi', `/equipment/${equipmentId}/kpi`),
      'preventive-plan': () => loadPanel('preventive-plan', `/equipment/${equipmentId}/preventive`),
      'create-intervention': () => navigate(`/intervention-requests?equipment=${equipmentId}`),
      'report-breakdown': () => navigate(`/work-orders?createForEquipment=${equipmentId}`),
    };

    const handler = actionHandlers[action.id];
    if (handler) handler();
  };

  const loadPanel = async (panelId, url) => {
    if (activePanel === panelId) {
      setActivePanel(null);
      return;
    }
    setPanelLoading(true);
    setActivePanel(panelId);
    try {
      const data = await fetchPublic(url);
      setPanelData(data);
    } catch {
      setPanelData(null);
    } finally {
      setPanelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <QrCode size={48} className="text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Équipement introuvable</h1>
          <p className="text-gray-500">Ce QR code ne correspond à aucun équipement.</p>
        </div>
      </div>
    );
  }

  const IconComponent = ({ name, size = 20, className = '' }) => {
    const Icon = iconMap[name];
    return Icon ? <Icon size={size} className={className} /> : null;
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="qr-equipment-page">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <QrCode size={16} />
            <span>FSAO Iris — Fiche rapide</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Equipment Card */}
        <div className="bg-white rounded-xl shadow-sm border p-5" data-testid="qr-equipment-info">
          <div className="flex items-start gap-4">
            {equipment.photo ? (
              <img src={`${API_URL}/api${equipment.photo}`} alt={equipment.nom} className="w-16 h-16 rounded-lg object-cover border" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-blue-50 flex items-center justify-center">
                <Wrench size={28} className="text-blue-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{equipment.nom}</h1>
              {equipment.type && <p className="text-sm text-gray-500">{equipment.type}</p>}
              {(equipment.marque || equipment.modele) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {[equipment.marque, equipment.modele].filter(Boolean).join(' — ')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 pt-3 border-t">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[equipment.statut] || 'bg-gray-100 text-gray-600'}`}>
              {statusLabels[equipment.statut] || equipment.statut}
            </span>
            {equipment.emplacement && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={13} />
                {equipment.emplacement}
              </span>
            )}
            {equipment.numero_serie && (
              <span className="text-xs text-gray-400">S/N: {equipment.numero_serie}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2" data-testid="qr-actions-list">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">Actions rapides</h2>
          {actions.map((action) => {
            const isActive = activePanel === action.id;
            return (
              <div key={action.id}>
                <button
                  onClick={() => handleAction(action)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    isActive
                      ? 'bg-blue-50 border-blue-200 shadow-sm'
                      : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid={`qr-action-${action.id}`}
                >
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <IconComponent name={action.icon} size={18} className={isActive ? 'text-blue-600' : 'text-gray-600'} />
                  </div>
                  <span className={`flex-1 text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                    {action.label}
                  </span>
                  {action.requires_auth && <Lock size={14} className="text-gray-300" />}
                  <ChevronRight size={16} className={`text-gray-400 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                </button>

                {/* Inline panel */}
                {isActive && (
                  <div className="mt-2 bg-white rounded-xl border border-blue-100 overflow-hidden" data-testid={`qr-panel-${action.id}`}>
                    {panelLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                      </div>
                    ) : (
                      <div className="p-4">
                        {activePanel === 'last-wo' && <LastWOPanel data={panelData} />}
                        {activePanel === 'wo-history' && <WOHistoryPanel data={panelData} />}
                        {activePanel === 'kpi' && <KPIPanel data={panelData} />}
                        {activePanel === 'preventive-plan' && <PreventivePlanPanel data={panelData} />}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pt-4">
          Propulsé par FSAO Iris
        </p>
      </div>
    </div>
  );
};

// ========= Sub-panels =========

const LastWOPanel = ({ data }) => {
  if (!data) return <p className="text-sm text-gray-500 text-center">Aucun ordre de travail trouvé</p>;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{data.titre || 'OT sans titre'}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${woStatusColors[data.statut] || 'bg-gray-100'}`}>
          {data.statut}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {data.numero && <span>#{data.numero}</span>}
        {data.priorite && <span className={priorityColors[data.priorite]}>{data.priorite}</span>}
        {data.assignee_name && <span>Assigné à: {data.assignee_name}</span>}
      </div>
      {data.date_creation && (
        <p className="text-xs text-gray-400">
          Créé le {new Date(data.date_creation).toLocaleDateString('fr-FR')}
        </p>
      )}
    </div>
  );
};

const WOHistoryPanel = ({ data }) => {
  if (!data || data.length === 0) return <p className="text-sm text-gray-500 text-center">Aucun historique</p>;
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {data.map((wo, i) => (
        <div key={wo.id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-800 truncate">{wo.titre || 'OT sans titre'}</p>
            <p className="text-xs text-gray-400">
              {wo.numero && `#${wo.numero} — `}
              {wo.date_creation && new Date(wo.date_creation).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${woStatusColors[wo.statut] || 'bg-gray-100'}`}>
            {wo.statut}
          </span>
        </div>
      ))}
    </div>
  );
};

const KPIPanel = ({ data }) => {
  if (!data) return <p className="text-sm text-gray-500 text-center">KPI indisponibles</p>;
  const kpis = [
    { label: 'Total OT', value: data.total_work_orders, color: 'text-gray-900' },
    { label: 'OT ouverts', value: data.open_work_orders, color: 'text-amber-600' },
    { label: 'OT terminés', value: data.closed_work_orders, color: 'text-emerald-600' },
    { label: 'Temps moy. (h)', value: data.avg_resolution_time_hours, color: 'text-blue-600' },
    { label: 'Plans préventifs', value: data.total_preventive_plans, color: 'text-purple-600' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {kpis.map((kpi, i) => (
        <div key={i} className="text-center p-2 rounded-lg bg-gray-50">
          <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
          <p className="text-xs text-gray-500">{kpi.label}</p>
        </div>
      ))}
    </div>
  );
};

const PreventivePlanPanel = ({ data }) => {
  if (!data || data.length === 0) return <p className="text-sm text-gray-500 text-center">Aucun plan préventif</p>;
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {data.map((plan, i) => (
        <div key={plan.id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-800 truncate">{plan.titre || 'Plan sans titre'}</p>
            <p className="text-xs text-gray-400">
              {plan.frequence && `Fréq: ${plan.frequence}`}
              {plan.prochaine_execution && ` — Prochaine: ${new Date(plan.prochaine_execution).toLocaleDateString('fr-FR')}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QREquipmentPage;
