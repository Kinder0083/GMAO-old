import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

const UpdateWarningOverlay = () => {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [warningData, setWarningData] = useState(null);
  const wsRef = useRef(null);
  const countdownRef = useRef(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }, [navigate]);

  // Écouter les messages WebSocket du chat pour l'avertissement de MAJ
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const backendUrl = process.env.REACT_APP_BACKEND_URL || window.location.origin;
    let wsUrl = backendUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');
    wsUrl = `${wsUrl}/api/ws/chat/${token}`;

    const connectWs = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'update_warning') {
            setWarningData(data);
            setCountdown(data.countdown_seconds || 30);
            setShowWarning(true);
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        // Reconnexion uniquement si pas en mode avertissement
        if (!showWarning) {
          setTimeout(connectWs, 5000);
        }
      };

      ws.onerror = () => {};
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Compte à rebours
  useEffect(() => {
    if (!showWarning) return;

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [showWarning, handleLogout]);

  if (!showWarning) return null;

  return (
    <div
      data-testid="update-warning-overlay"
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header rouge */}
        <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <RefreshCw className="h-6 w-6 text-white animate-spin" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Mise à jour en cours</h2>
            <p className="text-red-100 text-sm">
              {warningData?.admin_name && `Initiée par ${warningData.admin_name}`}
            </p>
          </div>
        </div>

        {/* Corps */}
        <div className="px-6 py-6 space-y-5">
          <p className="text-gray-700 text-center text-base">
            {warningData?.message || "Une mise à jour va être effectuée. Vous serez déconnecté automatiquement."}
          </p>

          {/* Compteur */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
            <div className="flex flex-col items-center">
              <p className="text-sm text-red-600 font-medium mb-2">Déconnexion automatique dans</p>
              <div className="text-7xl font-bold text-red-600 tabular-nums leading-none">
                {countdown}
              </div>
              <p className="text-sm text-red-500 mt-2">seconde{countdown > 1 ? 's' : ''}</p>
            </div>

            {/* Barre de progression */}
            <div className="mt-4 w-full bg-red-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-red-500 h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 30) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-sm text-amber-800">
              Vous pourrez vous reconnecter dans <strong>5 minutes</strong> environ.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            data-testid="update-warning-logout-now"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Me déconnecter maintenant
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateWarningOverlay;
