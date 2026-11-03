import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Plus,
  Edit,
  Trash2,
  Printer,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  History,
  Settings,
  Shield,
  Download,
  Upload,
  RefreshCw,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  RotateCcw,
  Palette,
  Key,
  CheckCircle2,
  X,
  Boxes,
  Percent,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { useGestock } from '../context/GestockContext';
import { Product, Expense, Sale, Category, ExpenseCategory, AuditLog, AppThemeColor, PaymentMethodType } from '../types/gestock';
import { exportStockToCsv, exportExpensesToCsv, exportSalesToCsv } from '../utils/exports';
import { generateRandomBarcode, getBarcodeSvgPaths } from '../utils/barcode';
import { BarcodePrintModal } from './BarcodePrintModal';
import { ReceiptModal } from './ReceiptModal';

type SupervisorTab = 'dashboard' | 'stock' | 'expenses' | 'history' | 'sales' | 'settings';

export const SupervisorView: React.FC = () => {
  const {
    products,
    categories,
    sales,
    expenses,
    expenseCategories,
    auditLogs,
    settings,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    addCategory,
    deleteCategory,
    addExpense,
    updateExpense,
    deleteExpense,
    addExpenseCategory,
    deleteExpenseCategory,
    voidSale,
    updateSettings,
    changeSupervisorPin,
    exportBackupJson,
    importBackupJson,
    resetToDefaultData,
    formatPrice,
    lockSupervisor,
  } = useGestock();

  const [activeTab, setActiveTab] = useState<SupervisorTab>('dashboard');

  // Time filter for dashboard and analytics
  const [periodFilter, setPeriodFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');

  // Modals state
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const [stockAdjustType, setStockAdjustType] = useState<'add' | 'subtract'>('add');
  const [barcodePrintProduct, setBarcodePrintProduct] = useState<Product | null>(null);

  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);

  // Sales modal state
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [voidingSaleId, setVoidingSaleId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // Stock table filters
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const [stockSubTab, setStockSubTab] = useState<'catalog' | 'categories' | 'sales_by_product'>('catalog');

  // Expenses filters
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');

  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyActorFilter, setHistoryActorFilter] = useState<'all' | 'gerant' | 'superviseur'>('all');

  // Settings PIN form
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinFeedback, setPinFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // -------------------------------------------------------------
  // ANALYTICS & DASHBOARD CALCULATIONS
  // -------------------------------------------------------------
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      if (s.status !== 'completed') return false;
      if (periodFilter === 'all') return true;
      const saleDate = new Date(s.timestamp);
      const diffMs = now.getTime() - saleDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (periodFilter === 'today') return diffDays < 1;
      if (periodFilter === '7days') return diffDays <= 7;
      if (periodFilter === '30days') return diffDays <= 30;
      return true;
    });
  }, [sales, periodFilter]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      if (periodFilter === 'all') return true;
      const expDate = new Date(e.date);
      const diffMs = now.getTime() - expDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (periodFilter === 'today') return diffDays < 1;
      if (periodFilter === '7days') return diffDays <= 7;
      if (periodFilter === '30days') return diffDays <= 30;
      return true;
    });
  }, [expenses, periodFilter]);

  // Total Revenue
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  }, [filteredSales]);

  // Total COGS (Cost of goods sold)
  const totalCostOfGoodsSold = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      const saleCogs = sale.items.reduce((itemAcc, i) => itemAcc + i.buyPrice * i.quantity, 0);
      return acc + saleCogs;
    }, 0);
  }, [filteredSales]);

  // Gross Margin = Revenue - COGS
  const grossMargin = useMemo(() => {
    return totalRevenue - totalCostOfGoodsSold;
  }, [totalRevenue, totalCostOfGoodsSold]);

  // Total Expenses
  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  }, [filteredExpenses]);

  // Net Profit = Gross Margin - Expenses
  const netProfit = useMemo(() => {
    return grossMargin - totalExpenseAmount;
  }, [grossMargin, totalExpenseAmount]);

  // Total discounts given
  const totalDiscounts = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.discountTotal, 0);
  }, [filteredSales]);

  // Average Basket
  const averageBasket = useMemo(() => {
    if (filteredSales.length === 0) return 0;
    return Math.round(totalRevenue / filteredSales.length);
  }, [totalRevenue, filteredSales.length]);

  // Top Selling Products
  const topSellingProducts = useMemo(() => {
    const productSalesMap = new Map<string, { product: Product | undefined; quantity: number; revenue: number }>();
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productSalesMap.get(item.productId) || {
          product: products.find(p => p.id === item.productId),
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
        productSalesMap.set(item.productId, existing);
      });
    });
    return Array.from(productSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredSales, products]);

  // Low Stock Items for immediate reorder
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stockQty <= p.minStockAlert);
  }, [products]);

  // Total Inventory Valuation
  const totalStockBuyValue = useMemo(() => {
    return products.reduce((acc, p) => acc + p.stockQty * p.buyPrice, 0);
  }, [products]);

  const totalStockSellValue = useMemo(() => {
    return products.reduce((acc, p) => acc + p.stockQty * p.sellPrice, 0);
  }, [products]);

  // Expenses Breakdown by Category
  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach(e => {
      const current = map.get(e.categoryId) || 0;
      map.set(e.categoryId, current + e.amount);
    });
    return Array.from(map.entries()).map(([catId, amount]) => {
      const cat = expenseCategories.find(c => c.id === catId);
      return {
        catId,
        name: cat?.name || 'Autres dépenses',
        icon: cat?.icon || '💸',
        amount,
        percentage: totalExpenseAmount > 0 ? Math.round((amount / totalExpenseAmount) * 100) : 0,
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, expenseCategories, totalExpenseAmount]);

  // -------------------------------------------------------------
  // STOCK FILTERING
  // -------------------------------------------------------------
  const filteredStockProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = stockCategoryFilter === 'all' || p.categoryId === stockCategoryFilter;
      const q = stockSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));

      let matchStatus = true;
      if (stockStatusFilter === 'out') matchStatus = p.stockQty <= 0;
      else if (stockStatusFilter === 'low') matchStatus = p.stockQty > 0 && p.stockQty <= p.minStockAlert;

      return matchCat && matchQ && matchStatus;
    });
  }, [products, stockCategoryFilter, stockSearch, stockStatusFilter]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Supervisor Navigation Tabs Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tableau de Bord</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'stock'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Stock & Articles</span>
            {lowStockProducts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                {lowStockProducts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'expenses'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Dépenses</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'sales'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Journal Ventes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Traçabilité & Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Paramètres</span>
          </button>
        </div>

        {/* Lock supervisor session */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={lockSupervisor}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/30 transition"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Verrouiller</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* ========================================================= */}
        {/* TAB 1: TABLEAU DE BORD (DASHBOARD)                       */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header + Period Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>Tableau de Bord & Performance Commerciale</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualisez en temps réel vos bénéfices, vos dépenses et la rentabilité de votre commerce.
                </p>
              </div>

              {/* Period Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPeriodFilter('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    periodFilter === 'today' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Aujourd'hui
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodFilter('7days')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    periodFilter === '7days' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  7 Derniers Jours
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodFilter('30days')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    periodFilter === '30days' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  30 Jours
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    periodFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tout
                </button>
              </div>
            </div>

            {/* Top 6 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
              {/* Chiffre d'Affaires */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Chiffre d'Affaires</span>
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-black text-white">{formatPrice(totalRevenue)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {filteredSales.length} ventes enregistrées
                  </div>
                </div>
              </div>

              {/* Bénéfice Net */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Bénéfice Net</span>
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className={`text-xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatPrice(netProfit)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Marge brute - Dépenses
                  </div>
                </div>
              </div>

              {/* Dépenses Totales */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Dépenses Totales</span>
                  <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-black text-rose-400">{formatPrice(totalExpenseAmount)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {filteredExpenses.length} frais répertoriés
                  </div>
                </div>
              </div>

              {/* Marge Brute */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Marge Brute</span>
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Percent className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-black text-indigo-300">{formatPrice(grossMargin)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Taux: {totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 100) : 0}%
                  </div>
                </div>
              </div>

              {/* Panier Moyen */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Panier Moyen</span>
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-black text-amber-300">{formatPrice(averageBasket)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Par ticket client
                  </div>
                </div>
              </div>

              {/* Remises Accordées */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span>Remises Données</span>
                  <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                    <Tag className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-black text-purple-300">{formatPrice(totalDiscounts)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Réductions commerciales
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Valuation Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">Valorisation Actuelle du Stock Magasin</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {products.length} références actives • {products.reduce((a, b) => a + b.stockQty, 0)} articles physiques en stock
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs text-slate-400">Valeur d'Achat (Investie) :</div>
                  <div className="text-base font-extrabold text-slate-200">{formatPrice(totalStockBuyValue)}</div>
                </div>
                <div className="h-8 w-px bg-slate-800"></div>
                <div>
                  <div className="text-xs text-slate-400">Valeur de Vente (Potentielle) :</div>
                  <div className="text-base font-extrabold text-emerald-400">{formatPrice(totalStockSellValue)}</div>
                </div>
                <div className="h-8 w-px bg-slate-800"></div>
                <div>
                  <div className="text-xs text-slate-400">Bénéfice Prévisionnel :</div>
                  <div className="text-base font-extrabold text-indigo-400">
                    {formatPrice(totalStockSellValue - totalStockBuyValue)}
                  </div>
                </div>
              </div>
            </div>

            {/* Two-column layout: Top Selling & Low Stock Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 🏆 Top Selling Products */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <span>🏆 Meilleures Ventes</span>
                  </h3>
                  <span className="text-xs text-slate-400">Articles les plus vendus</span>
                </div>

                <div className="flex-1 mt-4 space-y-3">
                  {topSellingProducts.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-xs text-slate-500">
                      Aucune vente sur la période sélectionnée.
                    </div>
                  ) : (
                    topSellingProducts.map((item, index) => {
                      if (!item.product) return null;
                      return (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 font-black text-xs flex items-center justify-center">
                              #{index + 1}
                            </span>
                            <span className="text-xl">{item.product.emoji || '📦'}</span>
                            <div>
                              <div className="font-bold text-sm text-white line-clamp-1">
                                {item.product.name}
                              </div>
                              <div className="text-xs text-slate-400">
                                {item.quantity} vendus • Prix: {formatPrice(item.product.sellPrice)}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-extrabold text-sm text-emerald-400">
                              {formatPrice(item.revenue)}
                            </div>
                            <div className="text-[10px] text-slate-500">Recette totale</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ⚠️ Low Stock Alert Panel */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <span>⚠️ Alertes Stock Faible & Ruptures</span>
                    {lowStockProducts.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-extrabold text-xs">
                        {lowStockProducts.length}
                      </span>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('stock');
                      setStockStatusFilter('low');
                    }}
                    className="text-xs font-bold text-blue-400 hover:underline"
                  >
                    Voir tout le stock
                  </button>
                </div>

                <div className="flex-1 mt-4 space-y-3">
                  {lowStockProducts.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-xs text-slate-500">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
                      <p className="font-bold text-slate-300">Tous les stocks sont à niveau optimal !</p>
                      <p className="text-slate-500">Aucune rupture ni stock critique détecté.</p>
                    </div>
                  ) : (
                    lowStockProducts.slice(0, 5).map(prod => (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{prod.emoji || '📦'}</span>
                          <div>
                            <div className="font-bold text-sm text-white line-clamp-1">{prod.name}</div>
                            <div className="text-xs text-slate-400">
                              Seuil mini alerte: {prod.minStockAlert} {prod.unit}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                              prod.stockQty <= 0
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {prod.stockQty <= 0 ? 'RUPTURE (0)' : `${prod.stockQty} restants`}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setStockAdjustProduct(prod);
                              setStockAdjustType('add');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                          >
                            + Réappro
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Expenses Breakdown Visual */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                  <span>💸 Répartition & Analyse des Dépenses</span>
                </h3>
                <span className="text-xs font-bold text-rose-400">
                  Total : {formatPrice(totalExpenseAmount)}
                </span>
              </div>

              {expenseBreakdown.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Aucune dépense enregistrée sur cette période.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {expenseBreakdown.map(item => (
                    <div
                      key={item.catId}
                      className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{item.icon}</span>
                          <span className="font-bold text-sm text-white">{item.name}</span>
                        </div>
                        <span className="font-black text-xs text-slate-400">{item.percentage}%</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, item.percentage))}%` }}
                        />
                      </div>

                      <div className="text-right font-extrabold text-sm text-rose-300">
                        {formatPrice(item.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: GESTION DU STOCK                                   */}
        {/* ========================================================= */}
        {activeTab === 'stock' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            {/* Header + Sub-tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>📦 Gestion Complète du Stock & Catalogue</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Contrôlez les quantités, prix d'achat, marges, codes-barres et réapprovisionnements.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => exportStockToCsv(products, categories, settings.currency)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Export Excel / CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-extrabold text-white shadow-md shadow-blue-600/30 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouveau Produit</span>
                </button>
              </div>
            </div>

            {/* Stock sub-tabs: Catalogue, Catégories, Ventes par produit */}
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
              <button
                type="button"
                onClick={() => setStockSubTab('catalog')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  stockSubTab === 'catalog'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Articles en Stock ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setStockSubTab('categories')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  stockSubTab === 'categories'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Catégories de Produits ({categories.length})
              </button>
              <button
                type="button"
                onClick={() => setStockSubTab('sales_by_product')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  stockSubTab === 'sales_by_product'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📈 Espace Ventes du Stock
              </button>
            </div>

            {/* Sub-tab 1: CATALOGUE TABLE */}
            {stockSubTab === 'catalog' && (
              <div className="space-y-4">
                {/* Search & Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={stockSearch}
                      onChange={e => setStockSearch(e.target.value)}
                      placeholder="Rechercher par nom ou code-barres..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <select
                      value={stockCategoryFilter}
                      onChange={e => setStockCategoryFilter(e.target.value)}
                      className="w-full py-2 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Toutes les catégories</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.icon || '🏷️'} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={stockStatusFilter}
                      onChange={e => setStockStatusFilter(e.target.value as any)}
                      className="w-full py-2 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="all">Tous les états de stock</option>
                      <option value="low">⚠️ Stock faible (sous le seuil)</option>
                      <option value="out">🛑 En rupture de stock (0)</option>
                    </select>
                  </div>
                </div>

                {/* Products Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                          <th className="py-3 px-4">Article</th>
                          <th className="py-3 px-3">Code-barres</th>
                          <th className="py-3 px-3">Catégorie</th>
                          <th className="py-3 px-3 text-right">Prix Achat</th>
                          <th className="py-3 px-3 text-right">Prix Vente</th>
                          <th className="py-3 px-3 text-right">Marge Brute</th>
                          <th className="py-3 px-4 text-center">Stock</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {filteredStockProducts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-500">
                              Aucun article trouvé pour ces critères.
                            </td>
                          </tr>
                        ) : (
                          filteredStockProducts.map(product => {
                            const cat = categories.find(c => c.id === product.categoryId);
                            const margin = product.sellPrice - product.buyPrice;
                            const marginPercent =
                              product.sellPrice > 0 ? Math.round((margin / product.sellPrice) * 100) : 0;
                            const isOut = product.stockQty <= 0;
                            const isLow = !isOut && product.stockQty <= product.minStockAlert;

                            return (
                              <tr key={product.id} className="hover:bg-slate-800/40 transition">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-xl p-1 bg-slate-800 rounded-lg">
                                      {product.emoji || '📦'}
                                    </span>
                                    <div>
                                      <div className="font-bold text-white text-sm">{product.name}</div>
                                      <div className="text-[10px] text-slate-500">
                                        Unité: {product.unit} • Alerte seuil: {product.minStockAlert}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-3 font-mono text-slate-300">
                                  <div className="flex items-center gap-1.5">
                                    <span>{product.code}</span>
                                    <button
                                      type="button"
                                      onClick={() => setBarcodePrintProduct(product)}
                                      title="Imprimer les étiquettes et codes-barres"
                                      className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700/60">
                                    {cat?.name || 'Non classé'}
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-right font-medium text-slate-300">
                                  {formatPrice(product.buyPrice)}
                                </td>

                                <td className="py-3 px-3 text-right font-extrabold text-white">
                                  {formatPrice(product.sellPrice)}
                                </td>

                                <td className="py-3 px-3 text-right font-bold text-emerald-400">
                                  +{formatPrice(margin)}
                                  <span className="text-[10px] text-slate-500 block">
                                    ({marginPercent}%)
                                  </span>
                                </td>

                                <td className="py-3 px-4 text-center">
                                  <div className="flex flex-col items-center">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full font-extrabold text-xs ${
                                        isOut
                                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                          : isLow
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      }`}
                                    >
                                      {product.stockQty} {product.unit}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Stock +/- Buttons */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStockAdjustProduct(product);
                                        setStockAdjustType('add');
                                      }}
                                      title="Ajouter du stock (Approvisionnement)"
                                      className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 font-bold transition"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStockAdjustProduct(product);
                                        setStockAdjustType('subtract');
                                      }}
                                      title="Réduire le stock (Avarie, Perte)"
                                      className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-bold transition"
                                    >
                                      -
                                    </button>

                                    {/* Edit Product */}
                                    <button
                                      type="button"
                                      onClick={() => setEditingProduct(product)}
                                      title="Modifier le produit"
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Delete Product */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`Voulez-vous supprimer définitivement "${product.name}" ?`)) {
                                          deleteProduct(product.id);
                                        }
                                      }}
                                      title="Supprimer le produit"
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 2: CATEGORIES MANAGER */}
            {stockSubTab === 'categories' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div>
                    <h3 className="font-bold text-white text-sm">Catégories de Produits</h3>
                    <p className="text-xs text-slate-400">
                      Organisez votre boutique par rayons pour accélérer la recherche en caisse.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddCategoryModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter une Catégorie</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map(cat => {
                    const count = products.filter(p => p.categoryId === cat.id).length;
                    return (
                      <div
                        key={cat.id}
                        className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-2 rounded-xl bg-slate-800">
                            {cat.icon || '🏷️'}
                          </span>
                          <div>
                            <div className="font-bold text-sm text-white">{cat.name}</div>
                            <div className="text-xs text-slate-400">{count} produit(s) associé(s)</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (count > 0) {
                              alert(`Impossible de supprimer : cette catégorie contient ${count} produit(s).`);
                              return;
                            }
                            if (confirm(`Supprimer la catégorie "${cat.name}" ?`)) {
                              deleteCategory(cat.id);
                            }
                          }}
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-tab 3: VENTEs DU STOCK */}
            {stockSubTab === 'sales_by_product' && (
              <div className="space-y-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <h3 className="font-bold text-white text-sm">Historique des Ventes par Produit</h3>
                  <p className="text-xs text-slate-400">
                    Découvrez quels articles génèrent le plus de volume et de valeur.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                        <th className="py-3 px-4">Article</th>
                        <th className="py-3 px-3">Stock Actuel</th>
                        <th className="py-3 px-3 text-right">Quantité Vendue</th>
                        <th className="py-3 px-3 text-right">Chiffre d'Affaires Généré</th>
                        <th className="py-3 px-4 text-right">Bénéfice Réalisé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {products.map(prod => {
                        let totalQtySold = 0;
                        let totalRevenueGenerated = 0;
                        let totalCogs = 0;

                        sales.forEach(sale => {
                          if (sale.status === 'completed') {
                            sale.items.forEach(i => {
                              if (i.productId === prod.id) {
                                totalQtySold += i.quantity;
                                totalRevenueGenerated += i.totalPrice;
                                totalCogs += i.buyPrice * i.quantity;
                              }
                            });
                          }
                        });

                        const profit = totalRevenueGenerated - totalCogs;

                        return (
                          <tr key={prod.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span>{prod.emoji || '📦'}</span>
                                <span className="font-bold text-white">{prod.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-300 font-mono">
                              {prod.stockQty} {prod.unit}
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-blue-400">
                              {totalQtySold}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-white">
                              {formatPrice(totalRevenueGenerated)}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-emerald-400">
                              {formatPrice(profit)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: GESTION DES DÉPENSES                              */}
        {/* ========================================================= */}
        {activeTab === 'expenses' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>💸 Gestion Complète des Dépenses</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ne laissez plus vos charges s'échapper : loyer, électricité, salaires, fournitures et transport.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => exportExpensesToCsv(expenses, expenseCategories, settings.currency)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-extrabold text-white shadow-md shadow-rose-600/30 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter une Dépense</span>
                </button>
              </div>
            </div>

            {/* Total Expense Summary Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400 uppercase font-bold">Total des Dépenses Cumulées</div>
                <div className="text-2xl font-black text-rose-400 mt-1">
                  {formatPrice(expenses.reduce((a, b) => a + b.amount, 0))}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400 uppercase font-bold">Nombre d'opérations</div>
                <div className="text-2xl font-black text-white mt-1">{expenses.length} dépenses</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400 uppercase font-bold">Catégories actives</div>
                <div className="text-2xl font-black text-indigo-400 mt-1">
                  {expenseCategories.length} types de charges
                </div>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={expenseSearch}
                  onChange={e => setExpenseSearch(e.target.value)}
                  placeholder="Rechercher par titre, motif, note..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={expenseCategoryFilter}
                  onChange={e => setExpenseCategoryFilter(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                >
                  <option value="all">Toutes les catégories de dépenses</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon || '💸'} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Description / Motif</th>
                    <th className="py-3 px-3">Catégorie</th>
                    <th className="py-3 px-3">Mode Paiement</th>
                    <th className="py-3 px-3">Auteur</th>
                    <th className="py-3 px-3 text-right">Montant</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Aucune dépense enregistrée.
                      </td>
                    </tr>
                  ) : (
                    expenses
                      .filter(e => {
                        const matchCat =
                          expenseCategoryFilter === 'all' || e.categoryId === expenseCategoryFilter;
                        const matchQ =
                          !expenseSearch ||
                          e.title.toLowerCase().includes(expenseSearch.toLowerCase()) ||
                          (e.notes && e.notes.toLowerCase().includes(expenseSearch.toLowerCase()));
                        return matchCat && matchQ;
                      })
                      .map(exp => {
                        const cat = expenseCategories.find(c => c.id === exp.categoryId);
                        return (
                          <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                              {new Date(exp.date).toLocaleDateString('fr-FR')} {new Date(exp.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-white text-sm">{exp.title}</div>
                              {exp.notes && (
                                <div className="text-[11px] text-slate-400 italic mt-0.5">
                                  {exp.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700/60">
                                {cat?.icon || '💸'} {cat?.name || 'Général'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300 uppercase font-semibold">
                              {exp.paymentMethod}
                            </td>
                            <td className="py-3 px-3 text-slate-400 capitalize">
                              {exp.registeredBy}
                            </td>
                            <td className="py-3 px-3 text-right font-black text-rose-400 text-sm">
                              -{formatPrice(exp.amount)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingExpense(exp)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Supprimer la dépense "${exp.title}" ?`)) {
                                      deleteExpense(exp.id);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: JOURNAL DES VENTES & REÇUS                        */}
        {/* ========================================================= */}
        {activeTab === 'sales' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span>🛒 Journal Complet des Ventes & Reçus</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consultez chaque ticket, réimprimez des reçus ou effectuez des annulations avec réintégration en stock.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportSalesToCsv(sales, settings.currency)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Export Ventes CSV</span>
                </button>
              </div>
            </div>

            {/* Sales Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3 px-4">N° Reçu</th>
                    <th className="py-3 px-3">Date & Heure</th>
                    <th className="py-3 px-3">Articles</th>
                    <th className="py-3 px-3">Paiement</th>
                    <th className="py-3 px-3">Caissier / Client</th>
                    <th className="py-3 px-3 text-right">Montant</th>
                    <th className="py-3 px-3 text-center">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        Aucune vente enregistrée pour le moment.
                      </td>
                    </tr>
                  ) : (
                    sales.map(sale => {
                      const isVoided = sale.status === 'voided';
                      return (
                        <tr
                          key={sale.id}
                          className={`hover:bg-slate-800/40 transition ${
                            isVoided ? 'opacity-60 bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            {sale.receiptNumber}
                          </td>
                          <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                            {new Date(sale.timestamp).toLocaleDateString('fr-FR')} {new Date(sale.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-slate-300 font-medium">
                              {sale.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                            </div>
                          </td>
                          <td className="py-3 px-3 uppercase text-slate-300 font-semibold">
                            {sale.paymentMethod}
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            <div>{sale.cashierName}</div>
                            {sale.customerName && (
                              <div className="text-[10px] text-blue-400">Client: {sale.customerName}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-emerald-400 text-sm">
                            {formatPrice(sale.totalAmount)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isVoided ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                                Annulée
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                Complétée
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View / Print Receipt */}
                              <button
                                type="button"
                                onClick={() => setSelectedSaleForReceipt(sale)}
                                title="Voir et imprimer le reçu"
                                className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 font-bold transition flex items-center gap-1"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Reçu</span>
                              </button>

                              {/* Void Sale button (only if not already voided) */}
                              {!isVoided && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVoidingSaleId(sale.id);
                                    setVoidReason('');
                                  }}
                                  title="Annuler la vente et remettre en stock"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: HISTORIQUE COMPLET & AUDIT TRAIL                   */}
        {/* ========================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <span>🔐 Historique & Traçabilité Complète — Tout est Tracé !</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aucune modification, suppression ou vente ne peut se faire discrètement sans laisser de trace.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">
                  {auditLogs.length} événements enregistrés
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Rechercher dans les journaux d'audit..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <select
                  value={historyActorFilter}
                  onChange={e => setHistoryActorFilter(e.target.value as any)}
                  className="w-full py-2 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                >
                  <option value="all">Tous les rôles (Gérant & Superviseur)</option>
                  <option value="gerant">Actions du Gérant (Caisse)</option>
                  <option value="superviseur">Actions du Superviseur (Admin)</option>
                </select>
              </div>
            </div>

            {/* Audit Logs Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="divide-y divide-slate-800">
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Aucune action enregistrée.
                  </div>
                ) : (
                  auditLogs
                    .filter(log => {
                      const matchActor =
                        historyActorFilter === 'all' || log.actor === historyActorFilter;
                      const matchQ =
                        !historySearch ||
                        log.summary.toLowerCase().includes(historySearch.toLowerCase()) ||
                        (log.details && log.details.toLowerCase().includes(historySearch.toLowerCase()));
                      return matchActor && matchQ;
                    })
                    .map(log => {
                      const isSupervisor = log.actor === 'superviseur';
                      return (
                        <div key={log.id} className="p-3.5 hover:bg-slate-800/40 transition flex items-start gap-3">
                          <div
                            className={`p-2 rounded-xl text-xs font-bold ${
                              isSupervisor
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {isSupervisor ? 'SUPERVISEUR' : 'GÉRANT'}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-sm text-white">{log.summary}</h5>
                              <span className="text-[11px] font-mono text-slate-500">
                                {new Date(log.timestamp).toLocaleString('fr-FR')}
                              </span>
                            </div>
                            {log.details && (
                              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                {log.details}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: PARAMÈTRES & PERSONNALISATION                      */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="pb-2 border-b border-slate-800">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>⚙️ Paramètres de Votre Application</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Personnalisez le nom du commerce, la devise, les couleurs de l'application et la sécurité PIN.
              </p>
            </div>

            {/* Shop Details */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <span>🏢 Coordonnées du Commerce (Reçus & En-tête)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom du Commerce :
                  </label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={e => updateSettings({ storeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Slogan / Activité :
                  </label>
                  <input
                    type="text"
                    value={settings.storeTagline}
                    onChange={e => updateSettings({ storeTagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Téléphone de Contact :
                  </label>
                  <input
                    type="text"
                    value={settings.storePhone}
                    onChange={e => updateSettings({ storePhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Adresse / Emplacement :
                  </label>
                  <input
                    type="text"
                    value={settings.storeAddress}
                    onChange={e => updateSettings({ storeAddress: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    N° Registre / NIF / SIRET :
                  </label>
                  <input
                    type="text"
                    value={settings.storeTaxNumber}
                    onChange={e => updateSettings({ storeTaxNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Devise Monétaire Principale :
                  </label>
                  <select
                    value={settings.currency}
                    onChange={e => updateSettings({ currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="FCFA">FCFA (Franc CFA)</option>
                    <option value="€">EUR (€ Euro)</option>
                    <option value="$">USD ($ Dollar US)</option>
                    <option value="MAD">MAD (Dirham Marocain)</option>
                    <option value="GNF">GNF (Franc Guinéen)</option>
                    <option value="CDF">CDF (Franc Congolais)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Application Theme Colors */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-400" />
                <span>🎨 Personnaliser la Couleur de l'Application</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {[
                  { id: 'blue', name: 'Bleu Royal', bg: 'bg-blue-600' },
                  { id: 'emerald', name: 'Émeraude Pro', bg: 'bg-emerald-600' },
                  { id: 'indigo', name: 'Indigo Intense', bg: 'bg-indigo-600' },
                  { id: 'amber', name: 'Ambre Doré', bg: 'bg-amber-600' },
                  { id: 'rose', name: 'Rose Rubis', bg: 'bg-rose-600' },
                  { id: 'slate', name: 'Slate Carbone', bg: 'bg-slate-700' },
                ].map(col => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => updateSettings({ themeColor: col.id as AppThemeColor })}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition ${
                      settings.themeColor === col.id
                        ? 'ring-2 ring-white border-white bg-slate-800'
                        : 'border-slate-800 bg-slate-950 hover:bg-slate-850'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full ${col.bg} shadow-md`}></span>
                    <span className="text-xs font-bold text-slate-300">{col.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Thermal Printer & Ticket Settings */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>🖨️ Configuration des Imprimantes & Reçus</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Largeur Rouleau Papier Thermique :
                  </label>
                  <select
                    value={settings.receiptPaperSize}
                    onChange={e => updateSettings({ receiptPaperSize: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none"
                  >
                    <option value="80mm">80 mm (Format standard caisse)</option>
                    <option value="58mm">58 mm (Format compact / mini imprimante)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Message de Bas de Ticket (Pied de reçu) :
                  </label>
                  <input
                    type="text"
                    value={settings.receiptFooterMsg}
                    onChange={e => updateSettings({ receiptFooterMsg: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Security PIN code */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>🔐 Modifier le Code PIN Superviseur</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ancien Code PIN :
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={oldPin}
                    onChange={e => setOldPin(e.target.value)}
                    placeholder="Ex: 1234"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nouveau Code PIN :
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    placeholder="Min 4 chiffres"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      const res = changeSupervisorPin(oldPin, newPin);
                      setPinFeedback({ success: res.success, msg: res.message });
                      if (res.success) {
                        setOldPin('');
                        setNewPin('');
                      }
                      setTimeout(() => setPinFeedback(null), 3000);
                    }}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition"
                  >
                    Valider Nouveau PIN
                  </button>
                </div>
              </div>

              {pinFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    pinFeedback.success
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {pinFeedback.msg}
                </div>
              )}
            </div>

            {/* Backup & Restore Data */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>💾 Sauvegarde & Restauration 100% Hors-Ligne</span>
              </h3>
              <p className="text-xs text-slate-400">
                Vos données sont sauvegardées en toute sécurité sur votre appareil. Vous pouvez télécharger un fichier de sauvegarde (.json) à tout moment pour le transférer sur un autre ordinateur ou téléphone sans internet.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={exportBackupJson}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger la Sauvegarde Complète (JSON)</span>
                </button>

                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-200 border border-slate-700 cursor-pointer transition">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>Importer un fichier de Sauvegarde</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = evt => {
                          const content = evt.target?.result as string;
                          const res = importBackupJson(content);
                          alert(res.message);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Voulez-vous réinitialiser les données avec le jeu de démo initial ?')) {
                      resetToDefaultData();
                      alert('Données réinitialisées avec succès.');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-semibold transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Réinitialiser Données Démo</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT PRODUCT                                */}
      {/* ========================================================= */}
      {(isAddProductModalOpen || editingProduct) && (
        <ProductFormModal
          isOpen={isAddProductModalOpen || !!editingProduct}
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setIsAddProductModalOpen(false);
            setEditingProduct(null);
          }}
          onSave={prodData => {
            if (editingProduct) {
              updateProduct(editingProduct.id, prodData);
            } else {
              addProduct(prodData);
            }
            setIsAddProductModalOpen(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* MODAL: STOCK ADJUSTMENT (+/-) */}
      {stockAdjustProduct && (
        <StockAdjustModal
          isOpen={!!stockAdjustProduct}
          product={stockAdjustProduct}
          type={stockAdjustType}
          currency={settings.currency}
          onClose={() => setStockAdjustProduct(null)}
          onConfirm={(delta, reason, unitCost) => {
            adjustStock(stockAdjustProduct.id, delta, reason, stockAdjustType === 'add', unitCost);
            setStockAdjustProduct(null);
          }}
        />
      )}

      {/* MODAL: ADD / EDIT EXPENSE */}
      {(isAddExpenseModalOpen || editingExpense) && (
        <ExpenseFormModal
          isOpen={isAddExpenseModalOpen || !!editingExpense}
          expense={editingExpense}
          categories={expenseCategories}
          currency={settings.currency}
          onClose={() => {
            setIsAddExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          onSave={expData => {
            if (editingExpense) {
              updateExpense(editingExpense.id, expData);
            } else {
              addExpense({
                ...expData,
                registeredBy: 'superviseur',
              });
            }
            setIsAddExpenseModalOpen(false);
            setEditingExpense(null);
          }}
        />
      )}

      {/* MODAL: ADD CATEGORY */}
      {isAddCategoryModalOpen && (
        <CategoryFormModal
          isOpen={isAddCategoryModalOpen}
          onClose={() => setIsAddCategoryModalOpen(false)}
          onSave={(name, color, icon) => {
            addCategory(name, color, icon);
            setIsAddCategoryModalOpen(false);
          }}
        />
      )}

      {/* MODAL: VOID SALE CONFIRMATION */}
      {voidingSaleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-4">
            <h3 className="font-extrabold text-base text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirmer l'annulation de la vente</span>
            </h3>
            <p className="text-xs text-slate-300">
              L'annulation réintégrera automatiquement tous les articles vendus dans le stock disponible.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Motif de l'annulation (obligatoire) :
              </label>
              <input
                type="text"
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="Ex: Erreur de saisie caisse, retour client..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidingSaleId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!voidReason.trim()}
                onClick={() => {
                  voidSale(voidingSaleId, voidReason);
                  setVoidingSaleId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white disabled:opacity-50"
              >
                Confirmer l'Annulation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARCODE PRINT MODAL */}
      <BarcodePrintModal
        isOpen={!!barcodePrintProduct}
        product={barcodePrintProduct}
        settings={settings}
        formatPrice={formatPrice}
        onClose={() => setBarcodePrintProduct(null)}
      />

      {/* RECEIPT MODAL */}
      <ReceiptModal
        isOpen={!!selectedSaleForReceipt}
        sale={selectedSaleForReceipt}
        settings={settings}
        formatPrice={formatPrice}
        onClose={() => setSelectedSaleForReceipt(null)}
      />
    </div>
  );
};

// ------------------------------------------------------------------
// SUB-MODAL COMPONENTS
// ------------------------------------------------------------------

// Product Form Modal
interface ProductFormModalProps {
  isOpen: boolean;
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  product,
  categories,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(product?.name || '');
  const [code, setCode] = useState(product?.code || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || '');
  const [buyPrice, setBuyPrice] = useState<number | ''>(product?.buyPrice ?? '');
  const [sellPrice, setSellPrice] = useState<number | ''>(product?.sellPrice ?? '');
  const [stockQty, setStockQty] = useState<number | ''>(product?.stockQty ?? 0);
  const [minStockAlert, setMinStockAlert] = useState<number | ''>(product?.minStockAlert ?? 5);
  const [unit, setUnit] = useState(product?.unit || 'pièce');
  const [emoji, setEmoji] = useState(product?.emoji || '📦');
  const [description, setDescription] = useState(product?.description || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || sellPrice === '') return;

    onSave({
      name: name.trim(),
      code: code.trim(),
      categoryId,
      buyPrice: typeof buyPrice === 'number' ? buyPrice : 0,
      sellPrice: typeof sellPrice === 'number' ? sellPrice : 0,
      stockQty: typeof stockQty === 'number' ? stockQty : 0,
      minStockAlert: typeof minStockAlert === 'number' ? minStockAlert : 5,
      unit: unit.trim() || 'pièce',
      emoji: emoji.trim() || '📦',
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-extrabold text-base text-white">
            {product ? 'Modifier le Produit' : 'Ajouter un Nouveau Produit'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Désignation de l'article * :
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Coca-Cola Canette 33cl"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Icône / Emoji :
              </label>
              <input
                type="text"
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                className="w-full px-3 py-2 text-center rounded-xl bg-slate-950 border border-slate-700 text-lg text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-300">Code-barres / SKU * :</label>
                <button
                  type="button"
                  onClick={() => setCode(generateRandomBarcode())}
                  className="text-[10px] text-blue-400 font-bold hover:underline"
                >
                  Générer Auto
                </button>
              </div>
              <input
                type="text"
                required
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Ex: 618110012001"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Catégorie :</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Prix d'Achat Fournisseur :
              </label>
              <input
                type="number"
                min="0"
                value={buyPrice}
                onChange={e =>
                  setBuyPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                }
                placeholder="Ex: 350"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Prix de Vente Client * :
              </label>
              <input
                type="number"
                required
                min="0"
                value={sellPrice}
                onChange={e =>
                  setSellPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                }
                placeholder="Ex: 500"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-bold text-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Stock Initial :
              </label>
              <input
                type="number"
                min="0"
                value={stockQty}
                onChange={e =>
                  setStockQty(e.target.value === '' ? '' : parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Alerte Stock Faible :
              </label>
              <input
                type="number"
                min="1"
                value={minStockAlert}
                onChange={e =>
                  setMinStockAlert(e.target.value === '' ? '' : parseInt(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unité :</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
              >
                <option value="pièce">pièce</option>
                <option value="bouteille">bouteille</option>
                <option value="canette">canette</option>
                <option value="paquet">paquet</option>
                <option value="sac">sac</option>
                <option value="kg">kg</option>
                <option value="litre">litre</option>
                <option value="carton">carton</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Notes :
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Détails facultatifs sur le produit..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-extrabold text-xs text-white"
            >
              Enregistrer l'Article
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Stock Adjustment (+/-) Modal
interface StockAdjustModalProps {
  isOpen: boolean;
  product: Product;
  type: 'add' | 'subtract';
  currency: string;
  onClose: () => void;
  onConfirm: (delta: number, reason: string, unitCost?: number) => void;
}

const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  product,
  type,
  currency,
  onClose,
  onConfirm,
}) => {
  const [qty, setQty] = useState<number | ''>(10);
  const [reason, setReason] = useState(
    type === 'add' ? 'Réception livraison fournisseur' : 'Avarie / Produit abîmé'
  );
  const [unitCost, setUnitCost] = useState<number | ''>(product.buyPrice);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = typeof qty === 'number' ? qty : 0;
    if (qtyNum <= 0) return;

    const delta = type === 'add' ? qtyNum : -qtyNum;
    onConfirm(delta, reason, typeof unitCost === 'number' ? unitCost : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-extrabold text-base text-white flex items-center gap-2">
            <span>
              {type === 'add' ? '➕ Approvisionnement Stock' : '➖ Réduction de Stock'}
            </span>
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
          <span className="text-2xl">{product.emoji || '📦'}</span>
          <div>
            <div className="font-bold text-sm text-white">{product.name}</div>
            <div className="text-xs text-slate-400">
              Stock actuel : <span className="font-bold text-blue-400">{product.stockQty} {product.unit}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Quantité à {type === 'add' ? 'ajouter' : 'retirer'} ({product.unit}) :
            </label>
            <input
              type="number"
              min="1"
              required
              value={qty}
              onChange={e => setQty(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-lg font-bold text-white focus:outline-none"
            />
          </div>

          {type === 'add' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nouveau Prix d'Achat Unitaire ({currency}) :
              </label>
              <input
                type="number"
                min="0"
                value={unitCost}
                onChange={e =>
                  setUnitCost(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Motif de l'opération :
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
            >
              {type === 'add' ? (
                <>
                  <option value="Réception livraison fournisseur">Réception livraison fournisseur</option>
                  <option value="Retour client">Retour client</option>
                  <option value="Correction inventaire (+)">Correction inventaire (+)</option>
                  <option value="Autre approvisionnement">Autre approvisionnement</option>
                </>
              ) : (
                <>
                  <option value="Avarie / Produit abîmé">Avarie / Produit abîmé</option>
                  <option value="Périmé / Date d'expiration">Périmé / Date d'expiration</option>
                  <option value="Vol ou perte constatée">Vol ou perte constatée</option>
                  <option value="Consommation interne boutique">Consommation interne boutique</option>
                  <option value="Correction inventaire (-)">Correction inventaire (-)</option>
                </>
              )}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl font-extrabold text-xs text-white ${
                type === 'add' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              Valider l'Ajustement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Expense Form Modal
interface ExpenseFormModalProps {
  isOpen: boolean;
  expense: Expense | null;
  categories: ExpenseCategory[];
  currency: string;
  onClose: () => void;
  onSave: (data: Omit<Expense, 'id' | 'registeredBy'>) => void;
}

const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  expense,
  categories,
  currency,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(expense?.title || '');
  const [amount, setAmount] = useState<number | ''>(expense?.amount ?? '');
  const [categoryId, setCategoryId] = useState(expense?.categoryId || categories[0]?.id || '');
  const [date, setDate] = useState(
    expense?.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(
    expense?.paymentMethod || 'especes'
  );
  const [notes, setNotes] = useState(expense?.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount === '') return;

    onSave({
      title: title.trim(),
      amount: typeof amount === 'number' ? amount : 0,
      categoryId,
      date: new Date(date).toISOString(),
      paymentMethod,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-extrabold text-base text-white">
            {expense ? 'Modifier la Dépense' : 'Enregistrer une Dépense'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description / Titre de la dépense * :
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Facture électricité boutique, Achat sachets..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Montant ({currency}) * :
              </label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={e =>
                  setAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold text-rose-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Catégorie :</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Date :</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mode de Paiement :
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
              >
                <option value="especes">Espèces (Cash)</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="carte">Carte Bancaire</option>
                <option value="virement">Virement</option>
                <option value="cheque">Chèque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Note ou Réf Facture :
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Facultatif (ex: Facture #2049)..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 font-extrabold text-xs text-white"
            >
              Enregistrer la Dépense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Category Form Modal
interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string, icon: string) => void;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏷️');
  const [color, setColor] = useState('#2563eb');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-4">
        <h3 className="font-extrabold text-base text-white">Créer une Catégorie</h3>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Nom :</label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Confiserie & Biscuits"
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Emoji / Icône :</label>
          <input
            type="text"
            value={icon}
            onChange={e => setIcon(e.target.value)}
            className="w-full px-3 py-2 text-center rounded-xl bg-slate-950 border border-slate-700 text-lg text-white focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => onSave(name, color, icon)}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-extrabold text-xs text-white disabled:opacity-50"
          >
            Créer
          </button>
        </div>
      </div>
    </div>
  );
};
