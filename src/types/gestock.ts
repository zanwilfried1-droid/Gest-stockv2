export type InterfaceRole = 'gerant' | 'superviseur';

export type PaymentMethodType = 'especes' | 'carte' | 'mobile_money' | 'virement' | 'cheque';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface Product {
  id: string;
  code: string; // Barcode or SKU
  name: string;
  categoryId: string;
  buyPrice: number; // Prix d'achat
  sellPrice: number; // Prix de vente
  stockQty: number; // Quantité en stock
  minStockAlert: number; // Seuil d'alerte stock faible
  unit: string; // pièce, kg, litre, paquet, etc.
  description?: string;
  emoji?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discountPercent: number; // 0-100%
  totalPrice: number;
}

export interface Sale {
  id: string;
  receiptNumber: string; // e.g. REC-20261103-0001
  timestamp: string;
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
  cashierRole: InterfaceRole;
  cashierName: string;
  customerName?: string;
  notes?: string;
  status: 'completed' | 'voided';
  voidReason?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  date: string;
  paymentMethod: PaymentMethodType;
  registeredBy: InterfaceRole;
  notes?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
}

export type AuditActionType =
  | 'VENTE_CREEE'
  | 'VENTE_ANNULEE'
  | 'STOCK_AJOUTE'
  | 'STOCK_REDUIT'
  | 'PRODUIT_CREE'
  | 'PRODUIT_MODIFIE'
  | 'PRODUIT_SUPPRIME'
  | 'DEPENSE_CREEE'
  | 'DEPENSE_MODIFIEE'
  | 'DEPENSE_SUPPRIMEE'
  | 'CATEGORIE_CREEE'
  | 'CATEGORIE_SUPPRIMEE'
  | 'PARAMETRES_MODIFIES'
  | 'SECURITE_PIN_MODIFIE'
  | 'DONNEES_RESTAUREES';

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: InterfaceRole;
  action: AuditActionType;
  summary: string;
  details?: string;
}

export type AppThemeColor = 'blue' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate';

export interface AppSettings {
  storeName: string;
  storeTagline: string;
  storePhone: string;
  storeAddress: string;
  storeTaxNumber: string; // NIF / SIRET / RCCM
  currency: string; // FCFA, €, $, etc.
  supervisorPin: string; // Default: '1234'
  themeColor: AppThemeColor;
  taxRatePercent: number; // 0 for no tax, or 18%, 20%, etc.
  enableTax: boolean;
  receiptPaperSize: '58mm' | '80mm';
  receiptHeaderNotes: string;
  receiptFooterMsg: string;
  barcodeLabelType: 'compact' | 'standard';
  autoPrintReceipt: boolean;
  soundEnabled: boolean;
  allowNegativeStock: boolean;
}
