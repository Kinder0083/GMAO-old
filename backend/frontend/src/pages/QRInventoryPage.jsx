import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Package, Plus, Minus, History, Wrench, AlertTriangle, ShoppingCart,
  ChevronRight, QrCode, Lock, ArrowLeft, MapPin, Tag, Building2,
  CheckCircle2, AlertCircle, TrendingDown
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const fetchPublic = async (url) => {
  const res = await fetch(`${API_URL}/api/qr-inventory/public${url}`);
  let text;
  try {
    text = await res.clone().text();
  } catch {
    text = await res.text();
  }
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Not found'); }
  if (!res.ok) throw new Error(data.detail || 'Not found');
  return data;
};

const fetchAuth = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/qr-inventory${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  let text;
  try {
    text = await res.clone().text();
  } catch {
    text = await res.text();
  }
  let data;
  try { data = JSON.parse(text); } catch { data = { detail: text || 'Erreur serveur' }; }
  if (!res.ok) throw new Error(data.detail || 'Erreur');
  return data;
};

const statusConfig = {
  ok: { label: 'En stock', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  bas: { label: 'Stock bas', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  rupture: { label: 'Rupture', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const QRInventoryPage = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Panels
  const [activePanel, setActivePanel] = useState(null);
  const [panelData, setPanelData] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);

  // Mouvement de stock
  const [movementType, setMovementType] = useState(null); // 'ajout' | 'retrait'
  const [movementQty, setMovementQty] = useState('');
  const [movementMotif, setMovementMotif] = useState('');
  const [movementLoading, setMovementLoading] = useState(false);
  const [movementResult, setMovementResult] = useState(null);

  // Demande réappro
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockComment, setRestockComment] = useState('');
  const [restockLoading, setRestockLoading] = useState(false);
  const [restockResult, setRestockResult] = useState(null);

  useEffect(() => { loadItem(); }, [itemId]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const data = await fetchPublic(`/item/${itemId}`);
      setItem(data);
    } catch {
      setError("Article introuvable");
    } finally {
      setLoading(false);
    }
  };

  const togglePanel = async (panelId, url) => {
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

  const openMovement = (type) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate(`/login?redirect=/qr-inventory/${itemId}`);
      return;
    }
    setMovementType(type);
    setMovementQty('');
    setMovementMotif('');
    setMovementResult(null);
    setActivePanel(null);
  };

  const submitMovement = async () => {
    const qty = parseInt(movementQty);
    if (!qty || qty <= 0) return;
    setMovementLoading(true);
    setMovementResult(null);
    try {
      const result = await fetchAuth(`/item/${itemId}/movement`, {
        method: 'POST',
        body: JSON.stringify({ type: movementType, quantity: qty, motif: movementMotif })
      });
      setMovementResult(result);
      setItem(prev => ({ ...prev, quantite: result.quantity_after, stock_status: result.stock_status }));
      setMovementQty('');
      setMovementMotif('');
    } catch (err) {
      setMovementResult({ success: false, message: err.message });
    } finally {
      setMovementLoading(false);
    }
  };

  const submitRestock = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate(`/login?redirect=/qr-inventory/${itemId}`);
      return;
    }
    setRestockLoading(true);
    setRestockResult(null);
    try {
      const result = await fetchAuth(`/item/${itemId}/request-restock`, {
        method: 'POST',
        body: JSON.stringify({ comment: restockComment })
      });
      setRestockResult(result);
      setRestockComment('');
    } catch (err) {
      setRestockResult({ success: false, message: err.message });
    } finally {
      setRestockLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <QrCode size={48} className="text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Article introuvable</h1>
          <p className="text-gray-500">Ce QR code ne correspond a aucun article d'inventaire.</p>
        </div>
      </div>
    );
  }

  const status = statusConfig[item.stock_status] || statusConfig.ok;
  const StatusIcon = status.icon;

  const actions = [
    { id: 'ajout', label: 'Ajout de stock', icon: Plus, color: 'text-emerald-600', bg: 'bg-emerald-100', auth: true, handler: () => openMovement('ajout') },
    { id: 'retrait', label: 'Retrait de stock', icon: Minus, color: 'text-red-600', bg: 'bg-red-100', auth: true, handler: () => openMovement('retrait') },
    { id: 'movements', label: 'Historique des mouvements', icon: History, color: 'text-blue-600', bg: 'bg-blue-100', auth: false, handler: () => togglePanel('movements', `/item/${itemId}/movements`) },
    { id: 'equipments', label: 'Equipements associes', icon: Wrench, color: 'text-purple-600', bg: 'bg-purple-100', auth: false, handler: () => togglePanel('equipments', `/item/${itemId}/equipments`) },
    { id: 'restock', label: 'Signaler un besoin', icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-100', auth: true, handler: () => { setRestockOpen(!restockOpen); setActivePanel(null); setMovementType(null); setRestockResult(null); } },
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="qr-inventory-page">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Package size={16} />
            <span>FSAO Iris — Fiche article</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Article Card */}
        <div className="bg-white rounded-xl shadow-sm border p-5" data-testid="qr-item-info">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Package size={28} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{item.nom}</h1>
              {item.reference && <p className="text-sm text-gray-500">Ref: {item.reference}</p>}
              {item.categorie && <p className="text-xs text-gray-400 mt-0.5">{item.categorie}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
              <StatusIcon size={13} />
              {status.label}
            </span>
            {item.service_name && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Building2 size={13} />
                {item.service_name}
              </span>
            )}
            {item.emplacement && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin size={13} />
                {item.emplacement}
              </span>
            )}
            {item.fournisseur && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Tag size={13} />
                {item.fournisseur}
              </span>
            )}
          </div>
        </div>

        {/* Stock Gauge */}
        <div className="bg-white rounded-xl shadow-sm border p-5" data-testid="qr-stock-gauge">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Stock actuel</span>
            <span className={`text-2xl font-bold ${item.stock_status === 'rupture' ? 'text-red-600' : item.stock_status === 'bas' ? 'text-amber-600' : 'text-emerald-600'}`}>
              {item.quantite}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${item.stock_status === 'rupture' ? 'bg-red-500' : item.stock_status === 'bas' ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, item.quantiteMin > 0 ? (item.quantite / (item.quantiteMin * 3)) * 100 : item.quantite > 0 ? 100 : 0)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>0</span>
            <span className="flex items-center gap-1">
              <TrendingDown size={10} />
              Seuil min: {item.quantiteMin}
            </span>
          </div>
          {item.prixUnitaire > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Valeur en stock: {(item.quantite * item.prixUnitaire).toFixed(2)} € ({item.prixUnitaire.toFixed(2)} €/unité)
            </p>
          )}
        </div>

        {/* Movement Form (inline) */}
        {movementType && (
          <div className={`rounded-xl shadow-sm border p-5 ${movementType === 'ajout' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`} data-testid="qr-movement-form">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${movementType === 'ajout' ? 'text-emerald-800' : 'text-red-800'}`}>
                {movementType === 'ajout' ? 'Ajout de stock' : 'Retrait de stock'}
              </h3>
              <button onClick={() => { setMovementType(null); setMovementResult(null); }} className="text-gray-400 hover:text-gray-600 text-sm">
                Fermer
              </button>
            </div>

            <div className="space-y-3">
              {/* Quick buttons */}
              <div className="flex gap-2 flex-wrap">
                {[1, 5, 10, 25, 50].map(n => (
                  <button
                    key={n}
                    onClick={() => setMovementQty(String(n))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      movementQty === String(n)
                        ? movementType === 'ajout' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                    data-testid={`quick-qty-${n}`}
                  >
                    {movementType === 'ajout' ? '+' : '-'}{n}
                  </button>
                ))}
              </div>

              {/* Custom quantity */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Quantite personnalisee</label>
                <input
                  type="number"
                  min="1"
                  value={movementQty}
                  onChange={e => setMovementQty(e.target.value)}
                  placeholder="Saisir une quantite..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="custom-qty-input"
                />
              </div>

              {/* Motif */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Motif (optionnel)</label>
                <input
                  type="text"
                  value={movementMotif}
                  onChange={e => setMovementMotif(e.target.value)}
                  placeholder={movementType === 'ajout' ? "Ex: Reception commande #123" : "Ex: Utilise pour OT #456"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="motif-input"
                />
              </div>

              {/* Submit */}
              <button
                onClick={submitMovement}
                disabled={!movementQty || parseInt(movementQty) <= 0 || movementLoading}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  movementType === 'ajout' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
                data-testid="submit-movement-btn"
              >
                {movementLoading ? 'En cours...' : `Confirmer ${movementType === 'ajout' ? "l'ajout" : 'le retrait'} de ${movementQty || '0'} unite(s)`}
              </button>

              {/* Result */}
              {movementResult && (
                <div className={`rounded-lg p-3 text-sm ${movementResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`} data-testid="movement-result">
                  {movementResult.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      <span>{movementResult.message} — Stock: {movementResult.quantity_before} → <strong>{movementResult.quantity_after}</strong></span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} />
                      <span>{movementResult.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Restock Form */}
        {restockOpen && (
          <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-5" data-testid="qr-restock-form">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-orange-800">Signaler un besoin</h3>
              <button onClick={() => { setRestockOpen(false); setRestockResult(null); }} className="text-gray-400 hover:text-gray-600 text-sm">
                Fermer
              </button>
            </div>
            <div className="space-y-3">
              <textarea
                value={restockComment}
                onChange={e => setRestockComment(e.target.value)}
                placeholder="Commentaire (optionnel)..."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                data-testid="restock-comment"
              />
              <button
                onClick={submitRestock}
                disabled={restockLoading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                data-testid="submit-restock-btn"
              >
                {restockLoading ? 'En cours...' : 'Envoyer la demande'}
              </button>
              {restockResult && (
                <div className={`rounded-lg p-3 text-sm ${restockResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`} data-testid="restock-result">
                  <div className="flex items-center gap-2">
                    {restockResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{restockResult.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2" data-testid="qr-actions-list">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">Actions rapides</h2>
          {actions.map(action => {
            const Icon = action.icon;
            const isActive = (action.id === 'movements' || action.id === 'equipments') && activePanel === action.id;
            const isMovementActive = (action.id === 'ajout' && movementType === 'ajout') || (action.id === 'retrait' && movementType === 'retrait');
            const isRestockActive = action.id === 'restock' && restockOpen;

            return (
              <div key={action.id}>
                <button
                  onClick={action.handler}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    isActive || isMovementActive || isRestockActive
                      ? `bg-white border-gray-300 shadow-sm`
                      : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid={`qr-action-${action.id}`}
                >
                  <div className={`p-2 rounded-lg ${action.bg}`}>
                    <Icon size={18} className={action.color} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-700">{action.label}</span>
                  {action.auth && <Lock size={14} className="text-gray-300" />}
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
                        {activePanel === 'movements' && <MovementsPanel data={panelData} />}
                        {activePanel === 'equipments' && <EquipmentsPanel data={panelData} />}
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
          Propulse par FSAO Iris
        </p>
      </div>
    </div>
  );
};

// ========= Sub-panels =========

const MovementsPanel = ({ data }) => {
  if (!data || data.length === 0) return <p className="text-sm text-gray-500 text-center">Aucun mouvement enregistre</p>;
  const typeStyles = {
    ajout: 'text-emerald-600',
    retrait: 'text-red-600',
    demande_reappro: 'text-orange-600',
  };
  const typeLabels = {
    ajout: '+',
    retrait: '-',
    demande_reappro: 'Demande',
  };
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto" data-testid="movements-list">
      {data.map((m, i) => (
        <div key={m.id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${typeStyles[m.type] || 'text-gray-600'}`}>
                {typeLabels[m.type] || m.type}{m.quantity > 0 && m.type !== 'demande_reappro' ? m.quantity : ''}
              </span>
              <span className="text-xs text-gray-500">{m.quantity_before} → {m.quantity_after}</span>
            </div>
            {m.motif && <p className="text-xs text-gray-400 truncate">{m.motif}</p>}
            <p className="text-xs text-gray-300">
              {m.user_name} — {m.created_at ? new Date(m.created_at).toLocaleString('fr-FR') : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const EquipmentsPanel = ({ data }) => {
  if (!data || data.length === 0) return <p className="text-sm text-gray-500 text-center">Aucun equipement associe</p>;
  const statusColors = {
    EN_SERVICE: 'bg-emerald-100 text-emerald-700',
    HORS_SERVICE: 'bg-red-100 text-red-700',
    EN_MAINTENANCE: 'bg-amber-100 text-amber-700',
  };
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto" data-testid="equipments-list">
      {data.map((eq, i) => (
        <div key={eq.id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800 truncate">{eq.nom}</p>
            <p className="text-xs text-gray-400">
              {[eq.marque, eq.modele].filter(Boolean).join(' — ')}
            </p>
          </div>
          {eq.statut && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[eq.statut] || 'bg-gray-100'}`}>
              {eq.statut}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default QRInventoryPage;
