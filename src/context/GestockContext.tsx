import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Product,
  Category,
  Sale,
  Expense,
  ExpenseCategory,
  AuditLog,
  AppSettings,
  InterfaceRole,
  AuditActionType,
  PaymentMethodType
} from '../types/gestock';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_EXPENSES,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_SALES,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
} from '../services/mockData';
import { sound } from '../services/sound';
import { downloadFile } from '../utils/exports';

interface GestockContextType {
  products: Product[];
  categories: Category[];
  sales: Sale[];
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  auditLogs: AuditLog[];
  settings: AppSettings;
  currentRole: InterfaceRole;
  isSupervisorUnlocked: boolean;
  isOnline: boolean;
  
  // Navigation & Security
  setCurrentRole: (role: InterfaceRole) => void;
  unlockSupervisorWithPin: (pin: string) => boolean;
  lockSupervisor: () => void;
  changeSupervisorPin: (oldPin: string, newPin: string) => { success: boolean; message: string };

  // Products & Stock
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (productId: string, deltaQty: number, reason: string, isSupply: boolean, unitCost?: number) => void;
  
  // Categories
  addCategory: (name: string, color: string, icon?: string) => Category;
  deleteCategory: (id: string) => void;

  // Sales
  createSale: (saleInput: {
    items: {
      productId: string;
      productName: string;
      productCode: string;
      quantity: number;
      unitPrice: number;
      buyPrice: number;
      discountPercent: number;
      totalPrice: number;
    }[];
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    totalAmount: number;
    paymentMethod: PaymentMethodType;
    amountReceived: number;
    changeGiven: number;
    customerName?: string;
    notes?: string;
  }) => Sale;
  voidSale: (saleId: string, reason: string) => boolean;

  // Expenses
  addExpense: (expenseData: Omit<Expense, 'id'>) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addExpenseCategory: (name: string, icon?: string) => ExpenseCategory;
  deleteExpenseCategory: (id: string) => void;

  // Settings & System
  updateSettings: (updates: Partial<AppSettings>) => void;
  exportBackupJson: () => void;
  importBackupJson: (jsonStr: string) => { success: boolean; message: string };
  resetToDefaultData: () => void;

  // Helpers
  formatPrice: (amount: number) => string;
}

const STORAGE_KEYS = {
  PRODUCTS: 'gestock_products_v2',
  CATEGORIES: 'gestock_categories_v2',
  SALES: 'gestock_sales_v2',
  EXPENSES: 'gestock_expenses_v2',
  EXPENSE_CATS: 'gestock_expense_cats_v2',
  AUDIT: 'gestock_audit_v2',
  SETTINGS: 'gestock_settings_v2',
};

const GestockContext = createContext<GestockContextType | undefined>(undefined);

export const GestockProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Offline connectivity state
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved) } : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  // Sound toggle synchronization
  useEffect(() => {
    sound.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Products
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  // Categories
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  // Sales
  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALES);
      return saved ? JSON.parse(saved) : INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  });

  // Expenses
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  // Expense Categories
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSE_CATS);
      return saved ? JSON.parse(saved) : INITIAL_EXPENSE_CATEGORIES;
    } catch {
      return INITIAL_EXPENSE_CATEGORIES;
    }
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  // Active Interface & Authentication
  const [currentRole, setCurrentRole] = useState<InterfaceRole>('gerant');
  const [isSupervisorUnlocked, setIsSupervisorUnlocked] = useState<boolean>(false);

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products:', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories:', e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
    } catch (e) {
      console.error('Failed to save sales:', e);
    }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to save expenses:', e);
    }
  }, [expenses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSE_CATS, JSON.stringify(expenseCategories));
    } catch (e) {
      console.error('Failed to save expense categories:', e);
    }
  }, [expenseCategories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
    } catch (e) {
      console.error('Failed to save audit logs:', e);
    }
  }, [auditLogs]);

  // Logging function
  const logAudit = useCallback((action: AuditActionType, summary: string, details?: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      actor: currentRole,
      action,
      summary,
      details,
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [currentRole]);

  // Security
  const unlockSupervisorWithPin = useCallback((pin: string): boolean => {
    if (pin.trim() === settings.supervisorPin.trim()) {
      setIsSupervisorUnlocked(true);
      setCurrentRole('superviseur');
      sound.playTap();
      return true;
    } else {
      sound.playWarning();
      return false;
    }
  }, [settings.supervisorPin]);

  const lockSupervisor = useCallback(() => {
    setIsSupervisorUnlocked(false);
    setCurrentRole('gerant');
    sound.playTap();
  }, []);

  const changeSupervisorPin = useCallback((oldPin: string, newPin: string) => {
    if (oldPin.trim() !== settings.supervisorPin.trim()) {
      sound.playWarning();
      return { success: false, message: 'Le code PIN actuel est incorrect.' };
    }
    if (newPin.trim().length < 4) {
      sound.playWarning();
      return { success: false, message: 'Le nouveau code PIN doit comporter au moins 4 chiffres.' };
    }
    setSettings(prev => ({ ...prev, supervisorPin: newPin.trim() }));
    logAudit('SECURITE_PIN_MODIFIE', 'Code PIN Superviseur modifié', 'Mise à jour du pass de sécurité.');
    sound.playSaleSuccess();
    return { success: true, message: 'Code PIN mis à jour avec succès.' };
  }, [settings.supervisorPin, logAudit]);

  // Products
  const addProduct = useCallback((productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts(prev => [newProduct, ...prev]);
    logAudit(
      'PRODUIT_CREE',
      `Produit ajouté: ${newProduct.name}`,
      `Code: ${newProduct.code}, Stock: ${newProduct.stockQty}, Prix Vente: ${newProduct.sellPrice}`
    );
    sound.playTap();
    return newProduct;
  }, [logAudit]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, ...updates, updatedAt: new Date().toISOString() };
          logAudit(
            'PRODUIT_MODIFIE',
            `Produit modifié: ${updated.name}`,
            `Modifications apportées aux caractéristiques de l'article.`
          );
          return updated;
        }
        return p;
      })
    );
    sound.playTap();
  }, [logAudit]);

  const deleteProduct = useCallback((id: string) => {
    const item = products.find(p => p.id === id);
    if (!item) return;
    setProducts(prev => prev.filter(p => p.id !== id));
    logAudit('PRODUIT_SUPPRIME', `Produit supprimé: ${item.name}`, `Code supprimé: ${item.code}`);
    sound.playTap();
  }, [products, logAudit]);

  const adjustStock = useCallback((
    productId: string,
    deltaQty: number,
    reason: string,
    isSupply: boolean,
    unitCost?: number
  ) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id === productId) {
          const newQty = Math.max(0, p.stockQty + deltaQty);
          const action: AuditActionType = deltaQty >= 0 ? 'STOCK_AJOUTE' : 'STOCK_REDUIT';
          const details = `${isSupply ? 'Approvisionnement' : 'Sortie'}: ${deltaQty > 0 ? '+' : ''}${deltaQty} ${p.unit}. Motif: ${reason}. Nouveau stock: ${newQty}.${unitCost ? ` Coût unitaire d'achat: ${unitCost}` : ''}`;
          logAudit(action, `Ajustement stock (${p.name})`, details);
          return {
            ...p,
            stockQty: newQty,
            buyPrice: unitCost && unitCost > 0 ? unitCost : p.buyPrice,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
    sound.playTap();
  }, [logAudit]);

  // Categories
  const addCategory = useCallback((name: string, color: string, icon?: string) => {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      color,
      icon: icon || '🏷️',
    };
    setCategories(prev => [...prev, newCat]);
    logAudit('CATEGORIE_CREEE', `Nouvelle catégorie créée: ${newCat.name}`);
    sound.playTap();
    return newCat;
  }, [logAudit]);

  const deleteCategory = useCallback((id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    setCategories(prev => prev.filter(c => c.id !== id));
    logAudit('CATEGORIE_SUPPRIMEE', `Catégorie supprimée: ${cat.name}`);
    sound.playTap();
  }, [categories, logAudit]);

  // Sales
  const createSale = useCallback((saleInput: {
    items: {
      productId: string;
      productName: string;
      productCode: string;
      quantity: number;
      unitPrice: number;
      buyPrice: number;
      discountPercent: number;
      totalPrice: number;
    }[];
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    totalAmount: number;
    paymentMethod: PaymentMethodType;
    amountReceived: number;
    changeGiven: number;
    customerName?: string;
    notes?: string;
  }): Sale => {
    const date = new Date();
    const dateFormatted = date.toISOString().slice(0, 10).replace(/-/g, '');
    const counter = (sales.length + 1).toString().padStart(4, '0');
    const receiptNumber = `REC-${dateFormatted}-${counter}`;

    const newSale: Sale = {
      ...saleInput,
      id: `sale-${Date.now()}`,
      receiptNumber,
      timestamp: date.toISOString(),
      cashierRole: currentRole,
      cashierName: currentRole === 'superviseur' ? 'Superviseur' : 'Caisse Principale',
      status: 'completed',
    };

    // Deduct stock for each item sold
    setProducts(prevProducts =>
      prevProducts.map(prod => {
        const soldItem = saleInput.items.find(item => item.productId === prod.id);
        if (soldItem) {
          const remaining = prod.stockQty - soldItem.quantity;
          return {
            ...prod,
            stockQty: settings.allowNegativeStock ? remaining : Math.max(0, remaining),
            updatedAt: date.toISOString(),
          };
        }
        return prod;
      })
    );

    setSales(prev => [newSale, ...prev]);

    const itemsSummary = saleInput.items.map(i => `${i.productName} (x${i.quantity})`).join(', ');
    logAudit(
      'VENTE_CREEE',
      `Vente ${receiptNumber} validée (${newSale.totalAmount} ${settings.currency})`,
      `Articles: ${itemsSummary}. Mode: ${newSale.paymentMethod}.`
    );

    sound.playSaleSuccess();
    return newSale;
  }, [sales.length, currentRole, settings.allowNegativeStock, settings.currency, logAudit]);

  const voidSale = useCallback((saleId: string, reason: string): boolean => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || sale.status === 'voided') return false;

    // Restore stock
    setProducts(prevProducts =>
      prevProducts.map(prod => {
        const item = sale.items.find(i => i.productId === prod.id);
        if (item) {
          return {
            ...prod,
            stockQty: prod.stockQty + item.quantity,
            updatedAt: new Date().toISOString(),
          };
        }
        return prod;
      })
    );

    setSales(prev =>
      prev.map(s => (s.id === saleId ? { ...s, status: 'voided', voidReason: reason } : s))
    );

    logAudit(
      'VENTE_ANNULEE',
      `Vente ${sale.receiptNumber} annulée`,
      `Remboursement / Annulation. Motif: ${reason}. Articles réintégrés au stock.`
    );
    sound.playWarning();
    return true;
  }, [sales, logAudit]);

  // Expenses
  const addExpense = useCallback((expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses(prev => [newExpense, ...prev]);
    logAudit(
      'DEPENSE_CREEE',
      `Dépense enregistrée: ${newExpense.title} (${newExpense.amount} ${settings.currency})`,
      `Mode: ${newExpense.paymentMethod}. Notes: ${newExpense.notes || 'Aucune'}`
    );
    sound.playTap();
    return newExpense;
  }, [settings.currency, logAudit]);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setExpenses(prev =>
      prev.map(e => {
        if (e.id === id) {
          const updated = { ...e, ...updates };
          logAudit('DEPENSE_MODIFIEE', `Dépense modifiée: ${updated.title}`, `Montant: ${updated.amount}`);
          return updated;
        }
        return e;
      })
    );
    sound.playTap();
  }, [logAudit]);

  const deleteExpense = useCallback((id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    setExpenses(prev => prev.filter(e => e.id !== id));
    logAudit('DEPENSE_SUPPRIMEE', `Dépense supprimée: ${exp.title} (${exp.amount} ${settings.currency})`);
    sound.playTap();
  }, [expenses, settings.currency, logAudit]);

  const addExpenseCategory = useCallback((name: string, icon?: string) => {
    const newCat: ExpenseCategory = {
      id: `expcat-${Date.now()}`,
      name: name.trim(),
      icon: icon || '💸',
    };
    setExpenseCategories(prev => [...prev, newCat]);
    sound.playTap();
    return newCat;
  }, []);

  const deleteExpenseCategory = useCallback((id: string) => {
    setExpenseCategories(prev => prev.filter(c => c.id !== id));
    sound.playTap();
  }, []);

  // Settings
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      return next;
    });
    logAudit('PARAMETRES_MODIFIES', 'Paramètres de l’application mis à jour');
    sound.playTap();
  }, [logAudit]);

  // Backups
  const exportBackupJson = useCallback(() => {
    const data = {
      version: 'GESTOCKv2-2026',
      exportedAt: new Date().toISOString(),
      settings,
      products,
      categories,
      sales,
      expenses,
      expenseCategories,
      auditLogs,
    };
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(JSON.stringify(data, null, 2), `GESTOCKv2_Sauvegarde_${dateStr}.json`, 'application/json');
    sound.playSaleSuccess();
  }, [settings, products, categories, sales, expenses, expenseCategories, auditLogs]);

  const importBackupJson = useCallback((jsonStr: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.products || !Array.isArray(parsed.products)) {
        return { success: false, message: 'Fichier invalide : données de stock absentes.' };
      }
      if (parsed.settings) setSettings(parsed.settings);
      if (parsed.products) setProducts(parsed.products);
      if (parsed.categories) setCategories(parsed.categories);
      if (parsed.sales) setSales(parsed.sales);
      if (parsed.expenses) setExpenses(parsed.expenses);
      if (parsed.expenseCategories) setExpenseCategories(parsed.expenseCategories);
      if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);

      logAudit('DONNEES_RESTAUREES', 'Sauvegarde restaurée avec succès');
      sound.playSaleSuccess();
      return { success: true, message: 'Sauvegarde restaurée avec succès !' };
    } catch {
      return { success: false, message: 'Erreur lors de la lecture du fichier JSON.' };
    }
  }, [logAudit]);

  const resetToDefaultData = useCallback(() => {
    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);
    setSales(INITIAL_SALES);
    setExpenses(INITIAL_EXPENSES);
    setExpenseCategories(INITIAL_EXPENSE_CATEGORIES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSettings(INITIAL_SETTINGS);
    sound.playTap();
  }, []);

  // Price formatting helper
  const formatPrice = useCallback((amount: number): string => {
    const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} ${settings.currency}`;
  }, [settings.currency]);

  return (
    <GestockContext.Provider
      value={{
        products,
        categories,
        sales,
        expenses,
        expenseCategories,
        auditLogs,
        settings,
        currentRole,
        isSupervisorUnlocked,
        isOnline,
        setCurrentRole,
        unlockSupervisorWithPin,
        lockSupervisor,
        changeSupervisorPin,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        addCategory,
        deleteCategory,
        createSale,
        voidSale,
        addExpense,
        updateExpense,
        deleteExpense,
        addExpenseCategory,
        deleteExpenseCategory,
        updateSettings,
        exportBackupJson,
        importBackupJson,
        resetToDefaultData,
        formatPrice,
      }}
    >
      {children}
    </GestockContext.Provider>
  );
};

export const useGestock = () => {
  const context = useContext(GestockContext);
  if (!context) {
    throw new Error('useGestock must be used within a GestockProvider');
  }
  return context;
};
