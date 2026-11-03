import React, { useState, useEffect } from 'react';
import { Lock, Delete, X, ShieldCheck } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  verifyPin: (pin: string) => boolean;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  verifyPin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && pin.length >= 4) {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        // Auto-check on 4 digits
        setTimeout(() => {
          checkPin(nextPin);
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const checkPin = (codeToTest: string) => {
    const ok = verifyPin(codeToTest);
    if (ok) {
      onSuccess();
      onClose();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPin('');
      }, 500);
    }
  };

  const handleSubmit = () => {
    checkPin(pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 transition-transform ${
          shake ? 'translate-x-[-10px] ring-2 ring-red-500' : ''
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Espace Superviseur</h3>
              <p className="text-xs text-slate-400">Accès sécurisé par code PIN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN Indicators */}
        <div className="my-6 text-center">
          <p className="text-xs font-medium text-slate-400 mb-3">
            Saisissez votre code PIN Superviseur
          </p>
          <div className="flex justify-center gap-4 my-2">
            {[0, 1, 2, 3].map(index => (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  pin.length > index
                    ? error
                      ? 'bg-rose-500 scale-125'
                      : 'bg-blue-500 scale-125 ring-4 ring-blue-500/30'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          {error ? (
            <p className="text-xs font-semibold text-rose-400 mt-2 animate-bounce">
              Code PIN incorrect ! Réessayez.
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-2">
              Code par défaut : <span className="font-mono text-slate-300 font-bold">1234</span>
            </p>
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="h-14 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-blue-600 text-xl font-bold text-white border border-slate-700/60 shadow-sm transition active:scale-95 flex items-center justify-center select-none"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPin('')}
            className="h-14 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 active:scale-95 transition flex items-center justify-center select-none"
          >
            Effacer
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-blue-600 text-xl font-bold text-white border border-slate-700/60 shadow-sm transition active:scale-95 flex items-center justify-center select-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-xl bg-slate-800/40 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 active:scale-95 transition flex items-center justify-center select-none"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-center">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Accès protégé et audité dans le journal
          </span>
        </div>
      </div>
    </div>
  );
};
