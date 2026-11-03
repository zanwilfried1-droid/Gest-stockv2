import React, { useState } from 'react';
import { Printer, X, Tag } from 'lucide-react';
import { Product, AppSettings } from '../types/gestock';
import { getBarcodeSvgPaths } from '../utils/barcode';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  settings: AppSettings;
  formatPrice: (val: number) => string;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  onClose,
  product,
  settings,
  formatPrice,
}) => {
  const [labelCount, setLabelCount] = useState<number>(12);
  const [includePrice, setIncludePrice] = useState<boolean>(true);
  const [includeStoreName, setIncludeStoreName] = useState<boolean>(true);

  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  const barcodeSvg = getBarcodeSvgPaths(product.code, 34, 1.3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 flex flex-col gap-6">
        {/* Modal Header */}
        <div className="no-print flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Impression Étiquettes & Codes-Barres</h3>
              <p className="text-xs text-slate-400">
                Génération de planches d’étiquettes prêtes pour imprimante thermique ou papier A4
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

        {/* Options */}
        <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nombre d'étiquettes :
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLabelCount(prev => Math.max(1, prev - 4))}
                className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold flex items-center justify-center"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="100"
                value={labelCount}
                onChange={e => setLabelCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-bold text-white text-sm"
              />
              <button
                type="button"
                onClick={() => setLabelCount(prev => prev + 4)}
                className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includePrice}
                onChange={e => setIncludePrice(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
              />
              Afficher le Prix ({formatPrice(product.sellPrice)})
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeStoreName}
                onChange={e => setIncludeStoreName(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
              />
              Afficher le Nom du Commerce
            </label>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white shadow-lg shadow-blue-600/30 transition"
            >
              <Printer className="w-5 h-5" />
              Imprimer ({labelCount} étiquettes)
            </button>
          </div>
        </div>

        {/* Labels Preview / Print Area */}
        <div className="max-h-[460px] overflow-y-auto p-4 bg-slate-950/60 rounded-xl border border-slate-800">
          <p className="no-print text-xs font-medium text-slate-400 mb-3 text-center">
            Aperçu de la planche d'impression (Mise en page optimisée pour imprimante rouleau & feuilles A4)
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 barcode-sheet-print">
            {Array.from({ length: labelCount }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white text-black p-2.5 rounded border border-slate-300 shadow-sm flex flex-col items-center justify-between text-center min-h-[110px]"
              >
                {includeStoreName && (
                  <div className="text-[9px] font-bold tracking-wider text-slate-700 uppercase line-clamp-1">
                    {settings.storeName}
                  </div>
                )}
                <div className="font-bold text-[11px] leading-tight text-slate-950 line-clamp-1 my-0.5">
                  {product.name}
                </div>

                {/* Barcode SVG */}
                <div className="my-1 flex justify-center w-full overflow-hidden">
                  <svg
                    width={barcodeSvg.totalWidth}
                    height={barcodeSvg.height}
                    viewBox={`0 0 ${barcodeSvg.totalWidth} ${barcodeSvg.height}`}
                    className="max-h-8"
                  >
                    {barcodeSvg.bars.map((bar, i) => (
                      <rect
                        key={i}
                        x={bar.x}
                        y={0}
                        width={bar.width}
                        height={barcodeSvg.height}
                        fill="black"
                      />
                    ))}
                  </svg>
                </div>

                <div className="text-[10px] font-mono tracking-widest text-slate-800">
                  {product.code}
                </div>

                {includePrice && (
                  <div className="mt-1 font-extrabold text-[12px] text-black">
                    {formatPrice(product.sellPrice)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
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
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition"
          >
            <Printer className="w-4 h-4" />
            Lancer l'impression
          </button>
        </div>
      </div>
    </div>
  );
};
