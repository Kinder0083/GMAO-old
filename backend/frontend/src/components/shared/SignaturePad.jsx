import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Eraser, Check, KeyRound } from 'lucide-react';

export function SignaturePad({ open, onClose, onConfirm, title = "Signature", showPin = true }) {
  const sigRef = useRef(null);
  const [mode, setMode] = useState('draw'); // draw | pin
  const [pin, setPin] = useState('');

  const handleClear = () => {
    if (sigRef.current) sigRef.current.clear();
  };

  const handleConfirm = () => {
    let signatureData = null;
    if (mode === 'draw' && sigRef.current && !sigRef.current.isEmpty()) {
      signatureData = sigRef.current.toDataURL('image/png');
    }
    onConfirm({
      signature: signatureData,
      pin: mode === 'pin' ? pin : null,
      mode
    });
    setPin('');
    if (sigRef.current) sigRef.current.clear();
  };

  const isValid = mode === 'draw'
    ? (sigRef.current ? !sigRef.current?.isEmpty() : false)
    : pin.length >= 4;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" data-testid="signature-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {showPin && (
          <div className="flex gap-2 mb-4">
            <Button
              variant={mode === 'draw' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('draw')}
              data-testid="sig-mode-draw"
            >
              <Eraser className="w-4 h-4 mr-1" /> Signature
            </Button>
            <Button
              variant={mode === 'pin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('pin')}
              data-testid="sig-mode-pin"
            >
              <KeyRound className="w-4 h-4 mr-1" /> Code PIN
            </Button>
          </div>
        )}

        {mode === 'draw' ? (
          <div className="space-y-2">
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{
                  width: 440,
                  height: 200,
                  className: 'w-full rounded-lg',
                  'data-testid': 'signature-canvas'
                }}
                penColor="black"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear} data-testid="sig-clear-btn">
              <Eraser className="w-4 h-4 mr-1" /> Effacer
            </Button>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <Label>Code PIN (min. 4 caractères)</Label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Entrez votre code PIN"
              maxLength={8}
              data-testid="sig-pin-input"
            />
            <p className="text-xs text-gray-500">
              Configurez votre PIN dans votre profil ou depuis la page Consignations.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleConfirm} data-testid="sig-confirm-btn">
            <Check className="w-4 h-4 mr-1" /> Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
