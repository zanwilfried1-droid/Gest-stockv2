import React, { useState, useMemo, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Receipt,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  ArrowRight,
  Sparkles,
  Percent,
  CalendarCheck
} from 'lucide-react';
import { Product, CartItem, PaymentMethodType, Sale } from '../types/gestock';
import { useGestock } from '../context/GestockContext';
import { sound } from '../services/sound';
import { ReceiptModal } from './ReceiptModal';
import { DailyRegisterReportModal } from './DailyRegisterReportModal';

export const CashierView: React.FC = () => {
  const {
    products,
    categories,
    sales,
    expenses,
    settings,
    createSale,
    formatPrice,
  } = useGestock();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [isTaxIncluded, setIsTaxIncluded] = useState<boolean>(settings.enableTax);

  // Payment checkout drawer / modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('especes');
  const [amountReceived, setAmountReceived] = useState<number | ''>('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Active receipt after sale
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Daily report modal
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);

  // Today's metrics for the cashier
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = useMemo(
    () => sales.filter(s => s.status === 'completed' && s.timestamp.startsWith(todayStr)),
    [sales, todayStr]
  );
  const todayExpenses = useMemo(
    () => expenses.filter(e => e.date.startsWith(todayStr)),
    [expenses, todayStr]
  );
  const todayRevenue = useMemo(
    () => todaySales.reduce((acc, s) => acc + s.totalAmount, 0),
    [todaySales]
  );
  const todayExpenseTotal = useMemo(
    () => todayExpenses.reduce((acc, e) => acc + e.amount, 0),
    [todayExpenses]
  );

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.code.toLowerCase().includes(q) ||
        (product.description && product.description.toLowerCase().includes(q));
      return matchCategory && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    if (!isTaxIncluded || settings.taxRatePercent <= 0) return 0;
    return Math.round((subtotal - globalDiscount) * (settings.taxRatePercent / 100));
  }, [subtotal, globalDiscount, isTaxIncluded, settings.taxRatePercent]);

  const totalToPay = useMemo(() => {
    return Math.max(0, subtotal - globalDiscount + taxAmount);
  }, [subtotal, globalDiscount, taxAmount]);

  const changeToReturn = useMemo(() => {
    const received = typeof amountReceived === 'number' ? amountReceived : 0;
    return Math.max(0, received - totalToPay);
  }, [amountReceived, totalToPay]);

  // Add product to cart
  const addToCart = (product: Product) => {
    if (product.stockQty <= 0 && !settings.allowNegativeStock) {
      sound.playWarning();
      return;
    }

    sound.playScanBeep();
    setCart(prevCart => {
      const existing = prevCart.find(i => i.product.id === product.id);
      if (existing) {
        return prevCart.map(i => {
          if (i.product.id === product.id) {
            const nextQty = i.quantity + 1;
            const price = i.unitPrice * (1 - i.discountPercent / 100);
            return {
              ...i,
              quantity: nextQty,
              totalPrice: Math.round(nextQty * price),
            };
          }
          return i;
        });
      } else {
        return [
          ...prevCart,
          {
            product,
            quantity: 1,
            unitPrice: product.sellPrice,
            discountPercent: 0,
            totalPrice: product.sellPrice,
          },
        ];
      }
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    sound.playTap();
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.product.id === productId) {
          const price = item.unitPrice * (1 - item.discountPercent / 100);
          return {
            ...item,
            quantity: newQty,
            totalPrice: Math.round(newQty * price),
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    sound.playTap();
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    sound.playTap();
    setCart([]);
    setGlobalDiscount(0);
    setCustomerName('');
  };

  // Barcode input handler: automatically match barcode if scanner presses enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = searchQuery.trim();
      const match = products.find(p => p.code.toLowerCase() === query.toLowerCase());
      if (match) {
        addToCart(match);
        setSearchQuery('');
      }
    }
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setAmountReceived(totalToPay); // Default to exact amount
    setIsCheckoutOpen(true);
    sound.playTap();
  };

  // Validate sale
  const handleConfirmSale = () => {
    if (cart.length === 0) return;
    const receivedNum = typeof amountReceived === 'number' ? amountReceived : totalToPay;

    if (paymentMethod === 'especes' && receivedNum < totalToPay) {
      sound.playWarning();
      return;
    }

    const sale = createSale({
      items: cart.map(i => ({
        productId: i.product.id,
        productName: i.product.name,
        productCode: i.product.code,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        buyPrice: i.product.buyPrice,
        discountPercent: i.discountPercent,
        totalPrice: i.totalPrice,
      })),
      subtotal,
      discountTotal: globalDiscount,
      taxTotal: taxAmount,
      totalAmount: totalToPay,
      paymentMethod,
      amountReceived: receivedNum,
      changeGiven: Math.max(0, receivedNum - totalToPay),
      customerName: customerName.trim() || undefined,
      notes: paymentNotes.trim() || undefined,
    });

    // Confetti celebration
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
      });
    } catch {
      // Ignore
    }

    // Reset cart and show receipt
    setCart([]);
    setGlobalDiscount(0);
    setCustomerName('');
    setPaymentNotes('');
    setIsCheckoutOpen(false);
    setCompletedSale(sale);
    setIsReceiptOpen(true);
  };

  // Preset cash tender amounts
  const isCfa = settings.currency.toUpperCase().includes('FCFA') || settings.currency.toUpperCase().includes('CFA');
  const cashPresets = isCfa
    ? [500, 1000, 2000, 5000, 10000, 20000, 50000]
    : [5, 10, 20, 50, 100, 200];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Cashier Top Live Metric Ribbon */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              Caisse Active • Vendeur
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-500">Ventes du jour:</span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded-full">
                {todaySales.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-500">Recette Caisse:</span>
              <span className="font-extrabold text-emerald-400">
                {formatPrice(todayRevenue)}
              </span>
            </div>

            {todayExpenseTotal > 0 && (
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-slate-500">Dépenses du jour:</span>
                <span className="font-bold text-rose-400">
                  -{formatPrice(todayExpenseTotal)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDailyReportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/80 transition shadow-sm"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Clôture de Caisse (Rapport Z)</span>
          </button>
        </div>
      </div>

      {/* Main Cashier Workspace: Catalog on Left, Cart on Right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: Catalog & Fast Search */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden border-r border-slate-800/80">
          {/* Search bar + Barcode scan input */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Rechercher article par nom ou scanner code-barres (Entrée)..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-slate-400 text-sm shadow-inner transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                // Pick a random product with barcode to simulate scan
                if (products.length > 0) {
                  const rand = products[Math.floor(Math.random() * products.length)];
                  addToCart(rand);
                }
              }}
              title="Tester un scan de code-barres rapide"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            >
              <Barcode className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Scan Test</span>
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>🔥</span>
              <span>Tous ({products.length})</span>
            </button>
            {categories.map(cat => {
              const count = products.filter(p => p.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>{cat.icon || '🏷️'}</span>
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                <AlertTriangle className="w-10 h-10 mb-2 opacity-40 text-amber-500" />
                <p className="text-sm font-semibold">Aucun article ne correspond à cette recherche.</p>
                <p className="text-xs text-slate-600 mt-1">Vérifiez l'orthographe ou changez de catégorie.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 pb-4">
                {filteredProducts.map(product => {
                  const isOutOfStock = product.stockQty <= 0;
                  const isLowStock = !isOutOfStock && product.stockQty <= product.minStockAlert;
                  const inCartItem = cart.find(c => c.product.id === product.id);

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={isOutOfStock && !settings.allowNegativeStock}
                      onClick={() => addToCart(product)}
                      className={`relative flex flex-col justify-between p-3 rounded-2xl text-left border transition-all select-none active:scale-[0.98] group ${
                        isOutOfStock
                          ? 'bg-slate-900/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                          : inCartItem
                          ? 'bg-slate-900 border-blue-500/80 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/40'
                          : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 shadow-sm'
                      }`}
                    >
                      {/* Top bar with emoji and in-cart count badge */}
                      <div className="flex items-start justify-between w-full mb-1">
                        <span className="text-2xl p-1.5 rounded-xl bg-slate-800/80 group-hover:scale-110 transition">
                          {product.emoji || '📦'}
                        </span>

                        {inCartItem && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-extrabold text-xs shadow">
                            {inCartItem.quantity} dans le panier
                          </span>
                        )}
                      </div>

                      {/* Product Name & Code */}
                      <div className="my-1.5 w-full">
                        <h4 className="font-bold text-sm text-white line-clamp-2 leading-tight group-hover:text-blue-400 transition">
                          {product.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                          {product.code}
                        </span>
                      </div>

                      {/* Bottom: Price & Stock Status Badge */}
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between w-full">
                        <div className="font-extrabold text-sm text-emerald-400">
                          {formatPrice(product.sellPrice)}
                        </div>

                        {/* Stock indicator badge */}
                        <div>
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                              Rupture
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                              {product.stockQty} restant(s)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-medium">
                              Stock: {product.stockQty}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Cart (Caisse / Panier) */}
        <div className="w-full lg:w-96 xl:w-[420px] bg-slate-900 flex flex-col h-full border-t lg:border-t-0 border-slate-800">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Ticket de Vente</h3>
                <p className="text-xs text-slate-400">
                  {cart.reduce((a, b) => a + b.quantity, 0)} article(s)
                </p>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                title="Vider le panier"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Optional Customer Name Input */}
          <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-950/40">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Nom du client (optionnel)..."
                className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {cart.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-slate-500 text-center px-4">
                <ShoppingCart className="w-12 h-12 mb-3 text-slate-700" />
                <p className="font-bold text-slate-400 text-sm">Le panier est vide</p>
                <p className="text-xs text-slate-600 mt-1">
                  Touchez un article ou scannez un code-barres pour commencer la vente.
                </p>
              </div>
            ) : (
              cart.map(item => (
                <div
                  key={item.product.id}
                  className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm text-white truncate">{item.product.name}</h5>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{formatPrice(item.unitPrice)}</span>
                      {item.discountPercent > 0 && (
                        <span className="text-emerald-400 font-bold">-{item.discountPercent}%</span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-900 px-1.5 py-1 rounded-lg border border-slate-700/70">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center active:scale-95 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-extrabold text-sm text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center active:scale-95 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-[70px]">
                    <span className="font-extrabold text-sm text-emerald-400 block">
                      {formatPrice(item.totalPrice)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-[11px] text-slate-500 hover:text-rose-400 transition"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Total */}
          <div className="p-4 bg-slate-900/95 border-t border-slate-800 space-y-3 shadow-2xl">
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Sous-total HT :</span>
                <span className="font-bold text-slate-200">{formatPrice(subtotal)}</span>
              </div>

              {/* Discount toggle/input */}
              <div className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-1 text-slate-400">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  Remise globale :
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={globalDiscount || ''}
                    onChange={e => setGlobalDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-20 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-right text-xs font-bold text-amber-300"
                  />
                  <span className="text-[11px] text-slate-500">{settings.currency}</span>
                </div>
              </div>

              {settings.enableTax && (
                <div className="flex items-center justify-between py-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-400">
                    <input
                      type="checkbox"
                      checked={isTaxIncluded}
                      onChange={e => setIsTaxIncluded(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 bg-slate-800 border-slate-700"
                    />
                    TVA ({settings.taxRatePercent}%)
                  </label>
                  <span className="font-bold text-slate-200">{formatPrice(taxAmount)}</span>
                </div>
              )}
            </div>

            {/* Total To Pay in Huge Bold */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400 block">
                  Net à Payer
                </span>
                <span className="text-[10px] text-slate-500">Toutes taxes comprises</span>
              </div>
              <div className="text-2xl font-black text-emerald-400 tracking-tight">
                {formatPrice(totalToPay)}
              </div>
            </div>

            {/* Big Checkout Action Button */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleOpenCheckout}
              className={`w-full py-3.5 rounded-xl font-extrabold text-base flex items-center justify-center gap-2 shadow-xl transition-all duration-150 active:scale-[0.98] ${
                cart.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
              }`}
            >
              <span>Encaisser la Vente</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* CHECKOUT & PAYMENT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Encaissement & Règlement</h3>
                  <p className="text-xs text-slate-400">
                    Montant total à percevoir : <span className="font-bold text-emerald-400">{formatPrice(totalToPay)}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Moyen de Paiement du Client
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('especes')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition font-bold text-xs ${
                    paymentMethod === 'especes'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span>💵 Espèces (Cash)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('mobile_money')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition font-bold text-xs ${
                    paymentMethod === 'mobile_money'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span>📱 Mobile Money</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('carte')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition font-bold text-xs ${
                    paymentMethod === 'carte'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>💳 Carte Bancaire</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('virement')}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                    paymentMethod === 'virement'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                >
                  🏦 Virement Bancaire
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cheque')}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                    paymentMethod === 'cheque'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                >
                  📝 Chèque
                </button>
              </div>
            </div>

            {/* Cash Tender Calculation (if Espèces or general) */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Montant Reçu du Client :
                </label>
                <button
                  type="button"
                  onClick={() => setAmountReceived(totalToPay)}
                  className="text-xs font-bold text-blue-400 hover:underline"
                >
                  Montant Exact ({formatPrice(totalToPay)})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={amountReceived}
                  onChange={e =>
                    setAmountReceived(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 font-black text-xl text-white focus:outline-none focus:border-blue-500"
                />
                <span className="font-bold text-slate-400">{settings.currency}</span>
              </div>

              {/* Fast Cash Preset buttons */}
              {paymentMethod === 'especes' && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cashPresets.map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountReceived(val)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                    >
                      {val.toLocaleString('fr-FR')} {settings.currency}
                    </button>
                  ))}
                </div>
              )}

              {/* Change To Return indicator */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Monnaie à Rendre :
                </span>
                <span
                  className={`text-lg font-black ${
                    changeToReturn > 0
                      ? 'text-amber-400 animate-pulse'
                      : typeof amountReceived === 'number' && amountReceived < totalToPay
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {typeof amountReceived === 'number' && amountReceived < totalToPay
                    ? `Incomplet (${formatPrice(totalToPay - amountReceived)} restant)`
                    : formatPrice(changeToReturn)}
                </span>
              </div>
            </div>

            {/* Note or reference */}
            <div>
              <input
                type="text"
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                placeholder="Référence transaction ou note (ex: Ref Wave #8291)..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmSale}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-extrabold text-sm text-white shadow-lg shadow-emerald-600/30 transition"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirmer & Imprimer Reçu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED SALE RECEIPT MODAL */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={completedSale}
        settings={settings}
        formatPrice={formatPrice}
      />

      {/* DAILY REGISTER REPORT MODAL */}
      <DailyRegisterReportModal
        isOpen={isDailyReportOpen}
        onClose={() => setIsDailyReportOpen(false)}
        sales={sales}
        expenses={expenses}
        settings={settings}
        formatPrice={formatPrice}
      />
    </div>
  );
};
