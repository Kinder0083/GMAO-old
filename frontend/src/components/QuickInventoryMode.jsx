import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera, X, SwitchCamera, Check, SkipForward, RotateCcw,
  Package, ClipboardList, AlertTriangle, CheckCircle2, Minus, Plus,
  ArrowRight, Trash2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const QR_REGION_ID = 'quick-inv-scanner';

// Fetch with auth token
const fetchAuth = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { detail: text }; }
  if (!res.ok) throw new Error(data.detail || 'Erreur');
  return data;
};

const fetchPublic = async (url) => {
  const res = await fetch(`${API_URL}/api${url}`);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Erreur serveur'); }
  if (!res.ok) throw new Error(data.detail || 'Erreur');
  return data;
};

const QuickInventoryMode = ({ open, onClose }) => {
  // Scanner state
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [activeCameraIdx, setActiveCameraIdx] = useState(0);
  const scannerRef = useRef(null);

  // Current item being counted
  const [currentItem, setCurrentItem] = useState(null);
  const [loadingItem, setLoadingItem] = useState(false);
  const [countedQty, setCountedQty] = useState('');
  const [saving, setSaving] = useState(false);

  // Session state
  const [phase, setPhase] = useState('scanning'); // 'scanning' | 'counting' | 'summary'
  const [countedItems, setCountedItems] = useState([]);
  const [lastError, setLastError] = useState(null);

  // Start/stop lifecycle
  useEffect(() => {
    if (open) {
      setPhase('scanning');
      setCountedItems([]);
      setCurrentItem(null);
      setLastError(null);
      startScanner();
    }
    return () => stopScanner();
  }, [open]);

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2) await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {}
    setScanning(false);
  };

  const startScanner = async () => {
    setScannerError(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setScannerError("Aucune camera detectee.");
        return;
      }
      setCameras(devices);
      let idx = 0;
      const back = devices.findIndex(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('arriere') ||
        d.label.toLowerCase().includes('environment')
      );
      if (back >= 0) idx = back;
      setActiveCameraIdx(idx);
      await initScanner(devices[idx].id);
    } catch {
      setScannerError("Impossible d'acceder a la camera.");
    }
  };

  const initScanner = async (cameraId) => {
    await stopScanner();
    await new Promise(r => setTimeout(r, 250));
    const el = document.getElementById(QR_REGION_ID);
    if (!el) return;

    const scanner = new Html5Qrcode(QR_REGION_ID);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        cameraId,
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
        (decodedText) => handleScan(decodedText),
        () => {}
      );
      setScanning(true);
    } catch (e) {
      setScannerError("Erreur scanner: " + e.message);
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    const next = (activeCameraIdx + 1) % cameras.length;
    setActiveCameraIdx(next);
    await initScanner(cameras[next].id);
  };

  // Extract item ID from scanned QR content
  const extractItemId = (text) => {
    let path = text;
    try { path = new URL(text).pathname; } catch {}
    const m = path.match(/\/qr-inventory\/([a-f0-9]{24})/i);
    if (m) return m[1];
    if (/^[a-f0-9]{24}$/i.test(text.trim())) return text.trim();
    return null;
  };

  // Handle a scan result
  const handleScan = useCallback(async (decodedText) => {
    const itemId = extractItemId(decodedText);
    if (!itemId) {
      setLastError("QR code non reconnu (pas un article IRIS)");
      return;
    }

    // Check if already counted in this session
    const alreadyCounted = countedItems.find(c => c.id === itemId);
    if (alreadyCounted) {
      setLastError(`"${alreadyCounted.nom}" deja compte dans cette session`);
      return;
    }

    // Pause scanner & fetch item
    await stopScanner();
    setPhase('counting');
    setLoadingItem(true);
    setLastError(null);

    try {
      const data = await fetchPublic(`/qr-inventory/public/item/${itemId}`);
      setCurrentItem(data);
      setCountedQty(String(data.quantite));
    } catch {
      setLastError("Article introuvable");
      setPhase('scanning');
      startScanner();
    } finally {
      setLoadingItem(false);
    }
  }, [countedItems]);

  // Confirm the count for current item
  const confirmCount = async () => {
    if (!currentItem) return;
    const counted = parseInt(countedQty, 10);
    if (isNaN(counted) || counted < 0) {
      setLastError("Saisissez une quantite valide (>= 0)");
      return;
    }

    const diff = counted - currentItem.quantite;
    if (diff === 0) {
      // No change - just record it
      setCountedItems(prev => [...prev, {
        id: currentItem.id,
        nom: currentItem.nom,
        reference: currentItem.reference,
        before: currentItem.quantite,
        counted,
        diff: 0,
        status: 'ok'
      }]);
      goToNextItem();
      return;
    }

    setSaving(true);
    setLastError(null);

    try {
      const movementType = diff > 0 ? 'ajout' : 'retrait';
      const absQty = Math.abs(diff);
      await fetchAuth(`/qr-inventory/item/${currentItem.id}/movement`, {
        method: 'POST',
        body: JSON.stringify({
          type: movementType,
          quantity: absQty,
          motif: `Comptage physique (inventaire rapide)`
        })
      });

      setCountedItems(prev => [...prev, {
        id: currentItem.id,
        nom: currentItem.nom,
        reference: currentItem.reference,
        before: currentItem.quantite,
        counted,
        diff,
        status: 'adjusted'
      }]);
      goToNextItem();
    } catch (e) {
      setLastError(e.message || "Erreur lors de l'ajustement");
    } finally {
      setSaving(false);
    }
  };

  // Skip current item without adjusting
  const skipItem = () => {
    if (currentItem) {
      setCountedItems(prev => [...prev, {
        id: currentItem.id,
        nom: currentItem.nom,
        reference: currentItem.reference,
        before: currentItem.quantite,
        counted: null,
        diff: null,
        status: 'skipped'
      }]);
    }
    goToNextItem();
  };

  // Move to next item (restart scanner)
  const goToNextItem = () => {
    setCurrentItem(null);
    setCountedQty('');
    setLastError(null);
    setPhase('scanning');
    setTimeout(() => startScanner(), 300);
  };

  // Remove an item from the counted list
  const removeFromCounted = (itemId) => {
    setCountedItems(prev => prev.filter(c => c.id !== itemId));
  };

  // Finish session and show summary
  const finishSession = async () => {
    await stopScanner();
    setPhase('summary');
  };

  if (!open) return null;

  const adjustedCount = countedItems.filter(c => c.status === 'adjusted').length;
  const okCount = countedItems.filter(c => c.status === 'ok').length;
  const skippedCount = countedItems.filter(c => c.status === 'skipped').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col" data-testid="quick-inventory-overlay">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <ClipboardList size={20} className="text-blue-400" />
          <h2 className="text-white font-semibold text-base">Inventaire Rapide</h2>
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
            {countedItems.length} article{countedItems.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {cameras.length > 1 && phase === 'scanning' && (
            <button onClick={switchCamera} className="text-slate-400 hover:text-white p-1.5" data-testid="quick-inv-switch-camera">
              <SwitchCamera size={18} />
            </button>
          )}
          {phase !== 'summary' && countedItems.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={finishSession}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              data-testid="quick-inv-finish-btn"
            >
              <Check size={14} className="mr-1" /> Terminer
            </Button>
          )}
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="text-slate-400 hover:text-red-400 p-1.5"
            data-testid="quick-inv-close-btn"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Scanner / Item Form */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto">

          {/* Scanning Phase */}
          {phase === 'scanning' && (
            <div className="w-full max-w-sm">
              {scannerError ? (
                <div className="text-center py-8">
                  <Camera size={48} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-red-400 text-sm mb-3">{scannerError}</p>
                  <Button variant="outline" size="sm" onClick={startScanner} data-testid="quick-inv-retry-btn">
                    <RotateCcw size={14} className="mr-1" /> Reessayer
                  </Button>
                </div>
              ) : (
                <>
                  <div
                    id={QR_REGION_ID}
                    className="w-full rounded-xl overflow-hidden bg-black"
                    style={{ minHeight: 280 }}
                    data-testid="quick-inv-scanner-viewfinder"
                  />
                  {!scanning && (
                    <p className="text-center text-slate-500 text-sm mt-3">Demarrage camera...</p>
                  )}
                  {scanning && (
                    <p className="text-center text-slate-400 text-sm mt-3">
                      Scannez le QR code d'un article
                    </p>
                  )}
                </>
              )}

              {lastError && (
                <div className="mt-3 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 text-red-300 text-xs text-center" data-testid="quick-inv-error">
                  {lastError}
                </div>
              )}
            </div>
          )}

          {/* Counting Phase */}
          {phase === 'counting' && (
            <div className="w-full max-w-sm" data-testid="quick-inv-count-form">
              {loadingItem ? (
                <div className="text-center py-12 text-slate-400">Chargement de l'article...</div>
              ) : currentItem ? (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  {/* Item Header */}
                  <div className="px-5 py-4 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/20 p-2 rounded-lg">
                        <Package size={20} className="text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold truncate" data-testid="quick-inv-item-name">{currentItem.nom}</h3>
                        {currentItem.reference && (
                          <p className="text-slate-400 text-xs">{currentItem.reference}</p>
                        )}
                      </div>
                    </div>
                    {currentItem.service_name && (
                      <p className="text-slate-500 text-xs mt-2">Service: {currentItem.service_name}</p>
                    )}
                  </div>

                  {/* Current Stock */}
                  <div className="px-5 py-3 bg-slate-800/50 border-b border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">Stock systeme</span>
                      <span className="text-white font-bold text-lg" data-testid="quick-inv-system-qty">{currentItem.quantite}</span>
                    </div>
                  </div>

                  {/* Counted Quantity Input */}
                  <div className="px-5 py-4">
                    <label className="text-slate-300 text-sm font-medium block mb-2">Quantite comptee</label>
                    <div className="flex items-center gap-2">
                      <button
                        className="bg-slate-700 hover:bg-slate-600 text-white w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                        onClick={() => setCountedQty(prev => String(Math.max(0, (parseInt(prev) || 0) - 1)))}
                        data-testid="quick-inv-qty-minus"
                      >
                        <Minus size={18} />
                      </button>
                      <Input
                        type="number"
                        min="0"
                        value={countedQty}
                        onChange={(e) => setCountedQty(e.target.value)}
                        className="text-center text-xl font-bold bg-slate-700 border-slate-600 text-white h-10"
                        data-testid="quick-inv-qty-input"
                        autoFocus
                      />
                      <button
                        className="bg-slate-700 hover:bg-slate-600 text-white w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                        onClick={() => setCountedQty(prev => String((parseInt(prev) || 0) + 1))}
                        data-testid="quick-inv-qty-plus"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    {/* Diff indicator */}
                    {countedQty !== '' && !isNaN(parseInt(countedQty)) && (
                      <div className="mt-3">
                        {(() => {
                          const diff = parseInt(countedQty) - currentItem.quantite;
                          if (diff === 0) return (
                            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-900/20 rounded-lg px-3 py-2">
                              <CheckCircle2 size={16} /> Quantite conforme
                            </div>
                          );
                          return (
                            <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${diff > 0 ? 'text-blue-400 bg-blue-900/20' : 'text-amber-400 bg-amber-900/20'}`}>
                              <AlertTriangle size={16} />
                              Ecart: {diff > 0 ? '+' : ''}{diff} (
                              {diff > 0 ? `ajout de ${diff}` : `retrait de ${Math.abs(diff)}`})
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {lastError && (
                      <p className="text-red-400 text-xs mt-2">{lastError}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-5 py-3 border-t border-slate-700 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={skipItem}
                      className="text-slate-400 hover:text-white flex-1"
                      data-testid="quick-inv-skip-btn"
                    >
                      <SkipForward size={14} className="mr-1" /> Passer
                    </Button>
                    <Button
                      size="sm"
                      onClick={confirmCount}
                      disabled={saving || countedQty === '' || isNaN(parseInt(countedQty))}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-[2]"
                      data-testid="quick-inv-confirm-btn"
                    >
                      {saving ? 'Enregistrement...' : (
                        <>
                          <Check size={14} className="mr-1" />
                          {parseInt(countedQty) === currentItem.quantite ? 'Conforme' : 'Ajuster & Suivant'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Summary Phase */}
          {phase === 'summary' && (
            <div className="w-full max-w-lg" data-testid="quick-inv-summary">
              <div className="text-center mb-6">
                <div className="bg-emerald-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-white text-xl font-bold">Inventaire termine</h3>
                <p className="text-slate-400 text-sm mt-1">
                  {countedItems.length} article{countedItems.length !== 1 ? 's' : ''} traite{countedItems.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-emerald-900/30 border border-emerald-800 rounded-lg p-3 text-center">
                  <p className="text-emerald-400 text-2xl font-bold">{okCount}</p>
                  <p className="text-emerald-300/70 text-xs">Conformes</p>
                </div>
                <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-3 text-center">
                  <p className="text-blue-400 text-2xl font-bold">{adjustedCount}</p>
                  <p className="text-blue-300/70 text-xs">Ajustes</p>
                </div>
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-center">
                  <p className="text-slate-300 text-2xl font-bold">{skippedCount}</p>
                  <p className="text-slate-400 text-xs">Passes</p>
                </div>
              </div>

              {/* Detailed list */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden max-h-[320px] overflow-y-auto">
                {countedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-slate-700' : ''}`}
                    data-testid={`quick-inv-result-${item.id}`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      item.status === 'ok' ? 'bg-emerald-400' :
                      item.status === 'adjusted' ? 'bg-blue-400' :
                      'bg-slate-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.nom}</p>
                      <p className="text-slate-500 text-xs">{item.reference || '-'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {item.status === 'skipped' ? (
                        <span className="text-slate-500 text-xs">Passe</span>
                      ) : (
                        <>
                          <span className="text-white text-sm font-medium">{item.before} <ArrowRight size={12} className="inline text-slate-500" /> {item.counted}</span>
                          {item.diff !== 0 && (
                            <p className={`text-xs ${item.diff > 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                              {item.diff > 0 ? '+' : ''}{item.diff}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {countedItems.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-6">Aucun article compte</p>
                )}
              </div>

              {/* Close button */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => { setPhase('scanning'); setCountedItems([]); setTimeout(() => startScanner(), 300); }}
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                  data-testid="quick-inv-restart-btn"
                >
                  <RotateCcw size={14} className="mr-2" /> Nouvelle session
                </Button>
                <Button
                  onClick={() => { stopScanner(); onClose(); }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="quick-inv-done-btn"
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: counted items (visible on desktop when scanning/counting) */}
        {phase !== 'summary' && countedItems.length > 0 && (
          <div className="hidden md:flex flex-col w-72 bg-slate-800 border-l border-slate-700 shrink-0">
            <div className="px-4 py-3 border-b border-slate-700">
              <h4 className="text-slate-300 text-sm font-medium">Articles comptes ({countedItems.length})</h4>
            </div>
            <div className="flex-1 overflow-y-auto" data-testid="quick-inv-sidebar-list">
              {countedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm ${idx > 0 ? 'border-t border-slate-700/50' : ''}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.status === 'ok' ? 'bg-emerald-400' :
                    item.status === 'adjusted' ? 'bg-blue-400' :
                    'bg-slate-500'
                  }`} />
                  <span className="text-white truncate flex-1">{item.nom}</span>
                  {item.diff !== null && item.diff !== 0 ? (
                    <span className={`text-xs shrink-0 ${item.diff > 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                      {item.diff > 0 ? '+' : ''}{item.diff}
                    </span>
                  ) : item.status === 'ok' ? (
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  ) : (
                    <span className="text-slate-500 text-xs shrink-0">-</span>
                  )}
                  <button
                    className="text-slate-600 hover:text-red-400 shrink-0"
                    onClick={() => removeFromCounted(item.id)}
                    title="Retirer de la liste"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickInventoryMode;
