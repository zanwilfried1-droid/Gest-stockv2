/**
 * Export and printing utilities for GESTOCKv2 (Excel/CSV, PDF printing, JSON backup)
 */

import { Product, Expense, Sale, Category, ExpenseCategory } from '../types/gestock';

/**
 * Downloads a string content as a file with UTF-8 BOM
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Stock to CSV (Excel compatible with UTF-8 BOM)
 */
export function exportStockToCsv(products: Product[], categories: Category[], currency: string) {
  const catMap = new Map(categories.map(c => [c.id, c.name]));
  
  const headers = [
    'Code-barres / Ref',
    'Nom du Produit',
    'Catégorie',
    `Prix d'Achat (${currency})`,
    `Prix de Vente (${currency})`,
    'Marge Unitaire',
    'Stock Actuel',
    'Alerte Seuil Mini',
    'Unité',
    `Valeur Stock Vente (${currency})`,
    `Valeur Stock Achat (${currency})`,
    'Statut Stock'
  ];

  const rows = products.map(p => {
    const catName = catMap.get(p.categoryId) || 'Non classé';
    const margin = p.sellPrice - p.buyPrice;
    const stockValSell = p.stockQty * p.sellPrice;
    const stockValBuy = p.stockQty * p.buyPrice;
    let status = 'Normal';
    if (p.stockQty <= 0) status = 'RUPTURE';
    else if (p.stockQty <= p.minStockAlert) status = 'ALERTE FAIBLE';

    return [
      `"${p.code}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${catName}"`,
      p.buyPrice,
      p.sellPrice,
      margin,
      p.stockQty,
      p.minStockAlert,
      `"${p.unit}"`,
      stockValSell,
      stockValBuy,
      `"${status}"`
    ].join(';');
  });

  // \uFEFF is UTF-8 Byte Order Mark for Microsoft Excel
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `GESTOCK_Inventaire_Stock_${dateStr}.csv`, 'text/csv');
}

/**
 * Export Expenses to CSV
 */
export function exportExpensesToCsv(expenses: Expense[], categories: ExpenseCategory[], currency: string) {
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  const headers = [
    'Date & Heure',
    'Description / Titre',
    'Catégorie',
    `Montant (${currency})`,
    'Moyen de Paiement',
    'Enregistré par',
    'Notes / Justificatif'
  ];

  const rows = expenses.map(e => {
    const catName = catMap.get(e.categoryId) || 'Autre';
    return [
      `"${new Date(e.date).toLocaleString('fr-FR')}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${catName}"`,
      e.amount,
      `"${e.paymentMethod}"`,
      `"${e.registeredBy}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `GESTOCK_Depenses_${dateStr}.csv`, 'text/csv');
}

/**
 * Export Sales to CSV
 */
export function exportSalesToCsv(sales: Sale[], currency: string) {
  const headers = [
    'N° Reçu',
    'Date',
    'Articles',
    `Sous-total (${currency})`,
    `Remise (${currency})`,
    `Total (${currency})`,
    'Mode de Paiement',
    'Caissier / Rôle',
    'Client',
    'Statut'
  ];

  const rows = sales.map(s => {
    const itemsSummary = s.items.map(i => `${i.productName} (x${i.quantity})`).join(', ');
    return [
      `"${s.receiptNumber}"`,
      `"${new Date(s.timestamp).toLocaleString('fr-FR')}"`,
      `"${itemsSummary.replace(/"/g, '""')}"`,
      s.subtotal,
      s.discountTotal,
      s.totalAmount,
      `"${s.paymentMethod}"`,
      `"${s.cashierName} (${s.cashierRole})"`,
      `"${s.customerName || 'Client standard'}"`,
      `"${s.status === 'completed' ? 'Complétée' : 'Annulée'}"`
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `GESTOCK_Ventes_${dateStr}.csv`, 'text/csv');
}

/**
 * Trigger system print dialogue
 */
export function triggerPrint() {
  window.print();
}
