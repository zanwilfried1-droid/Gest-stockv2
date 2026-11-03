import React from 'react';
import { X, Printer, Calendar, DollarSign, ArrowDownRight, ArrowUpRight, ShoppingBag } from 'lucide-react';
import { Sale, Expense, AppSettings } from '../types/gestock';

interface DailyRegisterReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  expenses: Expense[];
  settings: AppSettings;
  formatPrice: (v: number) => string;
}

export const DailyRegisterReportModal: React.FC<DailyRegisterReportModalProps> = ({
  isOpen,
  onClose,
  sales,
  expenses,
  settings,
  formatPrice,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter(s => s.status === 'completed' && s.timestamp.startsWith(todayStr));
  const todayExpenses = expenses.filter(e => e.date.startsWith(todayStr));

  const totalRevenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalDiscounts = todaySales.reduce((acc, s) => acc + s.discountTotal, 0);
  const totalExpenseAmount = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netBalance = totalRevenue - totalExpenseAmount;

  // Breakdown by payment method
  const salesByMethod = {
    especes: todaySales.filter(s => s.paymentMethod === 'especes').reduce((a, s) => a + s.totalAmount, 0),
    mobile_money: todaySales.filter(s => s.paymentMethod === 'mobile_money').reduce((a, s) => a + s.totalAmount, 0),
    carte: todaySales.filter(s => s.paymentMethod === 'carte').reduce((a, s) => a + s.totalAmount, 0),
    virement: todaySales.filter(s => s.paymentMethod === 'virement').reduce((a, s) => a + s.totalAmount, 0),
    cheque: todaySales.filter(s => s.paymentMethod === 'cheque').reduce((a, s) => a + s.totalAmount, 0),
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl my-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 flex flex-col gap-6">
        {/* Header */}
        <div className="no-print flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Rapport Journalier de Caisse (Rapport Z)</h3>
              <p className="text-xs text-slate-400">
                Bilan des encaissements et décaissements du jour
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Paper / Sheet Area */}
        <div className="bg-white text-slate-900 p-6 rounded-xl border border-slate-200 font-mono shadow-inner">
          <div className="text-center pb-3 border-b-2 border-slate-900">
            <h2 className="font-black text-lg uppercase tracking-wider">{settings.storeName}</h2>
            <p className="text-xs text-slate-600 font-sans mt-0.5">{settings.storeAddress} • {settings.storePhone}</p>
            <p className="text-sm font-bold mt-2 bg-slate-100 py-1 rounded">
              RAPPORT DE CLÔTURE DE CAISSE DU {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="text-[11px] font-sans font-semibold text-emerald-800 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Chiffre d'Affaires du Jour
              </div>
              <div className="text-lg font-black text-emerald-900 mt-1">
                {formatPrice(totalRevenue)}
              </div>
              <div className="text-[10px] text-emerald-700 font-sans mt-0.5">
                {todaySales.length} ticket(s) encaissé(s)
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <div className="text-[11px] font-sans font-semibold text-rose-800 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" /> Dépenses & Sorties de Caisse
              </div>
              <div className="text-lg font-black text-rose-900 mt-1">
                {formatPrice(totalExpenseAmount)}
              </div>
              <div className="text-[10px] text-rose-700 font-sans mt-0.5">
                {todayExpenses.length} dépense(s) validée(s)
              </div>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="py-3 border-t border-b border-dashed border-slate-300">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Détail par Moyen de Paiement
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                <span className="font-semibold">💵 Espèces (Cash en caisse) :</span>
                <span className="font-bold">{formatPrice(salesByMethod.especes)}</span>
              </div>
              <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                <span className="font-semibold">📱 Mobile Money (Wave, Orange, etc.) :</span>
                <span className="font-bold">{formatPrice(salesByMethod.mobile_money)}</span>
              </div>
              <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                <span className="font-semibold">💳 Carte Bancaire / TPE :</span>
                <span className="font-bold">{formatPrice(salesByMethod.carte)}</span>
              </div>
              {(salesByMethod.virement > 0 || salesByMethod.cheque > 0) && (
                <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                  <span className="font-semibold">🏦 Virement & Chèques :</span>
                  <span className="font-bold">{formatPrice(salesByMethod.virement + salesByMethod.cheque)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Net Balance */}
          <div className="my-4 p-3 bg-slate-900 text-white rounded-lg flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-300 uppercase tracking-wider">Solde Net Journalier</div>
              <div className="text-[11px] text-slate-400">(Ventes encaissées - Dépenses du jour)</div>
            </div>
            <div className="text-xl font-black text-emerald-400">
              {formatPrice(netBalance)}
            </div>
          </div>

          {totalDiscounts > 0 && (
            <div className="text-xs text-slate-600 flex justify-between px-1 py-1 italic border-b border-dashed border-slate-200">
              <span>Total des remises accordées aux clients :</span>
              <span className="font-bold text-amber-700">-{formatPrice(totalDiscounts)}</span>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t border-slate-300 text-xs">
            <div className="text-center">
              <p className="font-bold text-slate-700">Visa / Signature Caissier</p>
              <div className="h-12 border-b border-slate-300 mt-2"></div>
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-700">Visa / Signature Superviseur</p>
              <div className="h-12 border-b border-slate-300 mt-2"></div>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 mt-4">
            Document généré hors-ligne par GESTOCKv2 le {new Date().toLocaleTimeString('fr-FR')}
          </div>
        </div>

        {/* Action buttons */}
        <div className="no-print flex justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white shadow-lg shadow-emerald-600/30 transition"
          >
            <Printer className="w-4 h-4" />
            Imprimer le Bilan
          </button>
        </div>
      </div>
    </div>
  );
};
