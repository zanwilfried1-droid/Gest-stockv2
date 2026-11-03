import React from 'react';
import { GestockProvider, useGestock } from './context/GestockContext';
import { Navbar } from './components/Navbar';
import { CashierView } from './components/CashierView';
import { SupervisorView } from './components/SupervisorView';

const MainLayout: React.FC = () => {
  const { currentRole, settings } = useGestock();

  // Dynamic theme accent classes
  const themeClass = {
    blue: 'theme-blue',
    emerald: 'theme-emerald',
    indigo: 'theme-indigo',
    amber: 'theme-amber',
    rose: 'theme-rose',
    slate: 'theme-slate',
  }[settings.themeColor] || 'theme-blue';

  return (
    <div className={`h-screen flex flex-col overflow-hidden bg-slate-950 font-sans ${themeClass}`}>
      <Navbar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentRole === 'gerant' ? <CashierView /> : <SupervisorView />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <GestockProvider>
      <MainLayout />
    </GestockProvider>
  );
}
