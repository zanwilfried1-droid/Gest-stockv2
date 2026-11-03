import React, { useState } from 'react';
import {
  Store,
  Shield,
  ShieldCheck,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Lock,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { useGestock } from '../context/GestockContext';
import { PinModal } from './PinModal';
import { sound } from '../services/sound';

export const Navbar: React.FC = () => {
  const {
    settings,
    currentRole,
    isSupervisorUnlocked,
    isOnline,
    setCurrentRole,
    unlockSupervisorWithPin,
    lockSupervisor,
    updateSettings,
  } = useGestock();

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const handleSwitchToSupervisor = () => {
    if (isSupervisorUnlocked) {
      setCurrentRole('superviseur');
      sound.playTap();
    } else {
      setIsPinModalOpen(true);
    }
  };

  const handleSwitchToGerant = () => {
    setCurrentRole('gerant');
    sound.playTap();
  };

  const toggleSound = () => {
    const next = !settings.soundEnabled;
    updateSettings({ soundEnabled: next });
    sound.setEnabled(next);
    if (next) sound.playScanBeep();
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between select-none">
        {/* Brand & Offline status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black text-lg tracking-tighter">
              G2
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-sm tracking-wide text-white uppercase">
                  GESTOCK<span className="text-blue-500 font-extrabold">v2</span>
                </h1>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-500/15 text-blue-300 font-bold border border-blue-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px] sm:max-w-none">
                {settings.storeName}
              </p>
            </div>
          </div>

          {/* 100% Hors-Ligne Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>100% Hors-Ligne (Sans Internet)</span>
          </div>
        </div>

        {/* Dual Interface Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={handleSwitchToGerant}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              currentRole === 'gerant'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Interface Gérant</span>
          </button>

          <button
            type="button"
            onClick={handleSwitchToSupervisor}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              currentRole === 'superviseur'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            {isSupervisorUnlocked ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Interface Superviseur</span>
          </button>
        </div>

        {/* Quick controls: Sound toggle & Session lock */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleSound}
            title={settings.soundEnabled ? 'Sons de caisse activés' : 'Sons coupés'}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {isSupervisorUnlocked && currentRole === 'superviseur' && (
            <button
              type="button"
              onClick={lockSupervisor}
              title="Verrouiller la session superviseur"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700/80 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Verrouiller</span>
            </button>
          )}
        </div>
      </header>

      {/* PIN Security Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={() => {
          // Unlocked handled by verifyPin
        }}
        verifyPin={unlockSupervisorWithPin}
      />
    </>
  );
};
