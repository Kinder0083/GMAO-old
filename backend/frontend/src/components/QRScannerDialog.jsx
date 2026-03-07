import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, SwitchCamera, Flashlight } from 'lucide-react';
import { Button } from '../components/ui/button';

const QR_REGION_ID = 'qr-scanner-region';

const QRScannerDialog = ({ open, onClose, onScan }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [activeCameraIdx, setActiveCameraIdx] = useState(0);
  const scannerRef = useRef(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (open) {
      hasScannedRef.current = false;
      startScanner();
    }
    return () => stopScanner();
  }, [open]);

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (e) {
      // ignore
    }
    setScanning(false);
  };

  const startScanner = async () => {
    setError(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setError("Aucune camera detectee. Verifiez les permissions.");
        return;
      }
      setCameras(devices);

      // Prefer back camera
      let cameraIdx = 0;
      const backCam = devices.findIndex(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('arriere') ||
        d.label.toLowerCase().includes('environment')
      );
      if (backCam >= 0) cameraIdx = backCam;
      setActiveCameraIdx(cameraIdx);

      await initScanner(devices[cameraIdx].id);
    } catch (e) {
      setError("Impossible d'acceder a la camera. Verifiez les permissions du navigateur.");
    }
  };

  const initScanner = async (cameraId) => {
    await stopScanner();
    // Small delay to let DOM mount
    await new Promise(r => setTimeout(r, 200));

    const el = document.getElementById(QR_REGION_ID);
    if (!el) return;

    const scanner = new Html5Qrcode(QR_REGION_ID);
    scannerRef.current = scanner;

    try {
      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        () => {} // ignore errors during scanning
      );
      setScanning(true);
    } catch (e) {
      setError("Erreur lors du demarrage du scanner: " + e.message);
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    const nextIdx = (activeCameraIdx + 1) % cameras.length;
    setActiveCameraIdx(nextIdx);
    await initScanner(cameras[nextIdx].id);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" data-testid="qr-scanner-overlay">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" data-testid="qr-scanner-dialog">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-2">
            <Camera size={20} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">Scanner un QR Code</h3>
          </div>
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={switchCamera}
                data-testid="switch-camera-btn"
                className="text-gray-500 hover:text-gray-800"
              >
                <SwitchCamera size={18} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { stopScanner(); onClose(); }}
              data-testid="close-scanner-btn"
              className="text-gray-500 hover:text-red-600"
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="p-4">
          {error ? (
            <div className="text-center py-8" data-testid="scanner-error">
              <Camera size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-red-600 text-sm">{error}</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={startScanner}
                data-testid="retry-scanner-btn"
              >
                Reessayer
              </Button>
            </div>
          ) : (
            <>
              <div
                id={QR_REGION_ID}
                className="w-full rounded-lg overflow-hidden bg-black"
                style={{ minHeight: 300 }}
                data-testid="qr-scanner-viewfinder"
              />
              {!scanning && (
                <div className="text-center py-6 text-gray-500 text-sm">
                  Demarrage de la camera...
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-slate-50 text-center text-xs text-gray-500">
          Pointez la camera vers un QR code d'article ou d'equipement
        </div>
      </div>
    </div>
  );
};

export default QRScannerDialog;
