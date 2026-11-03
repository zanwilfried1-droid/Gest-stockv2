import React, { useState } from 'react';
import { Printer, X, Check, Copy } from 'lucide-react';
import { Sale, AppSettings } from '../types/gestock';
import { getBarcodeSvgPaths } from '../utils/barcode';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  settings: AppSettings;
  formatPrice: (val: number) => string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  settings,
  formatPrice,
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(settings.receiptPaperSize);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const lines = [
      settings.storeName.toUpperCase(),
      settings.storeTagline,
      `Tél: ${settings.storePhone}`,
      `Adresse: ${settings.storeAddress}`,
      '--------------------------------',
      `Reçu: ${sale.receiptNumber}`,
      `Date: ${new Date(sale.timestamp).toLocaleString('fr-FR')}`,
      `Caissier: ${sale.cashierName}`,
      '--------------------------------',
      ...sale.items.map(
        i => `${i.productName} x${i.quantity} = ${formatPrice(i.totalPrice)}`
      ),
      '--------------------------------',
      `TOTAL: ${formatPrice(sale.totalAmount)}`,
      `Paiement: ${sale.paymentMethod.toUpperCase()}`,
      `Reçu: ${formatPrice(sale.amountReceived)}`,
      `Monnaie: ${formatPrice(sale.changeGiven)}`,
      '--------------------------------',
      settings.receiptFooterMsg,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render barcode for the receipt number
  const barcodeData = getBarcodeSvgPaths(sale.receiptNumber, 36, 1.4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg my-8 flex flex-col gap-4">
        {/* Controls bar (hidden in print) */}
        <div className="no-print bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Format Ticket :</span>
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                paperWidth === '80mm'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              80 mm (Standard)
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                paperWidth === '58mm'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              58 mm (Étroit)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              title="Copier texte du ticket"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow transition"
            >
              <Printer className="w-4 h-4" />
              Imprimer le Reçu
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div className="flex justify-center">
          <div
            className={`bg-white text-slate-900 shadow-2xl p-6 font-mono select-none rounded-sm border border-slate-200 receipt-print-area ${
              paperWidth === '58mm' ? 'receipt-print-area-58mm max-w-[58mm] text-[10px] p-3' : 'max-w-[80mm] text-[12px]'
            }`}
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <h2 className="font-extrabold text-base tracking-wider uppercase text-black">
                {settings.storeName}
              </h2>
              {settings.storeTagline && (
                <p className="text-[11px] text-slate-600 italic mt-0.5">{settings.storeTagline}</p>
              )}
              {settings.storeAddress && (
                <p className="text-[10px] text-slate-700 mt-1">{settings.storeAddress}</p>
              )}
              {settings.storePhone && (
                <p className="text-[10px] text-slate-700">Tél: {settings.storePhone}</p>
              )}
              {settings.storeTaxNumber && (
                <p className="text-[9px] text-slate-500">N° RCCM/NIF: {settings.storeTaxNumber}</p>
              )}
            </div>

            {/* Receipt metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
              <div className="flex justify-between font-bold">
                <span>N° Ticket :</span>
                <span>{sale.receiptNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Date :</span>
                <span>{new Date(sale.timestamp).toLocaleString('fr-FR')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Caissier :</span>
                <span>{sale.cashierName}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between text-slate-600">
                  <span>Client :</span>
                  <span>{sale.customerName}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-2 border-b border-dashed border-slate-400">
              <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500 pb-1">
                <span className="w-1/2">Désignation</span>
                <span className="w-1/4 text-center">Qté</span>
                <span className="w-1/4 text-right">Total</span>
              </div>
              <div className="divide-y divide-slate-100">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="py-1 text-[11px]">
                    <div className="font-semibold text-slate-900">{item.productName}</div>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>
                        {item.quantity} x {formatPrice(item.unitPrice)}
                        {item.discountPercent > 0 ? ` (-${item.discountPercent}%)` : ''}
                      </span>
                      <span className="font-bold text-slate-900">{formatPrice(item.totalPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial summary */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Sous-total HT :</span>
                <span>{formatPrice(sale.subtotal)}</span>
              </div>

              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Remise accordée :</span>
                  <span>-{formatPrice(sale.discountTotal)}</span>
                </div>
              )}

              {sale.taxTotal > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>TVA / Taxes :</span>
                  <span>+{formatPrice(sale.taxTotal)}</span>
                </div>
              )}

              <div className="flex justify-between items-center font-extrabold text-sm pt-1.5 border-t border-slate-300 text-black">
                <span>TOTAL PAYÉ :</span>
                <span>{formatPrice(sale.totalAmount)}</span>
              </div>
            </div>

            {/* Payment & Change */}
            <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
              <div className="flex justify-between text-slate-700">
                <span>Mode de paiement :</span>
                <span className="font-bold uppercase">{sale.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Montant reçu :</span>
                <span>{formatPrice(sale.amountReceived)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Monnaie rendue :</span>
                <span>{formatPrice(sale.changeGiven)}</span>
              </div>
            </div>

            {/* Barcode & Footer */}
            <div className="pt-3 text-center space-y-2">
              <div className="flex justify-center">
                <svg
                  width={barcodeData.totalWidth}
                  height={barcodeData.height}
                  viewBox={`0 0 ${barcodeData.totalWidth} ${barcodeData.height}`}
                  className="max-w-full"
                >
                  {barcodeData.bars.map((bar, i) => (
                    <rect
                      key={i}
                      x={bar.x}
                      y={0}
                      width={bar.width}
                      height={barcodeData.height}
                      fill="black"
                    />
                  ))}
                </svg>
              </div>
              <p className="text-[10px] tracking-widest font-mono text-slate-700">{sale.receiptNumber}</p>

              {settings.receiptFooterMsg && (
                <p className="text-[10px] text-slate-600 italic pt-1 leading-snug">
                  {settings.receiptFooterMsg}
                </p>
              )}
              <p className="text-[9px] text-slate-400 pt-1">
                GESTOCKv2 • Solution Caisse 100% Hors-Ligne
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="no-print flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition"
          >
            Fermer le ticket
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white shadow-lg shadow-blue-600/30 transition"
          >
            <Printer className="w-4 h-4" />
            Lancer l'impression
          </button>
        </div>
      </div>
    </div>
  );
};
