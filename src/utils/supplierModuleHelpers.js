/**
 * Supplier Module Helper Functions
 * Implements supplier (materials) operations per VENDOR + LABOUR + SUPPLIER MODULE RELATION.md
 * 
 * Supplier = materials provider (paints, electrodes, steel, hardware)
 * Operations: Purchase invoices, GRN, stock in, payments
 */

import cachedDb from '@/utils/cachedDbOperations';
import { dbTransaction } from '@/lib/db';
const dbOperations = cachedDb;
import unifiedDataFlowManager from './unifiedDataFlowManager.js';
import unifiedSyncManager from './unifiedSyncManager.js';
import { generateUUID } from './jobModuleHelpers';
import pathConfig from './pathConfig.js';
import { validateJournalBalance } from './accountModuleHelpers';

/**
 * UNIFIED BACKEND: Store name standardization
 * Always use 'suppliers' (plural) for consistency across all operations
 */
const SUPPLIER_STORE = 'suppliers';
const SUPPLIER_LEDGER_STORE = 'supplier_ledger_entries';
const SUPPLIER_PRODUCTS_STORE = 'supplier_products';

/**
 * Post Purchase Invoice with Stock In - UNIFIED BACKEND
 * Creates purchase, items, stock transactions, and journal entries atomically
 */
export const postPurchaseInvoice = async (purchaseData, purchaseItems, createGRN = true) => {
  try {
    console.log('🔄 [SUPPLIER-UNIFIED] Processing purchase invoice:', purchaseData.id);
    
    // Validation
    if (!purchaseData.supplierId) {
      throw new Error('Supplier ID is required');
    }

    if (!purchaseItems || purchaseItems.length === 0) {
      throw new Error('At least one purchase item is required');
    }

    // Use unified data flow manager to validate supplier
    const supplierResult = await unifiedDataFlowManager.read(SUPPLIER_STORE, purchaseData.supplierId);
    if (!supplierResult.success || !supplierResult.data) {
      throw new Error('Supplier not found');
    }
    
    const supplier = supplierResult.data;

    // Validate GST if required
    if (purchaseData.gstRate && purchaseData.gstRate > 0) {
      if (!supplier.gstin) {
        console.warn('Supplier missing GSTIN for GST purchase');
      }
    }

    // Calculate totals
    let subtotal = 0;
    const validatedItems = [];

    for (const item of purchaseItems) {
      // Validate product exists
      const product = await dbOperations.getById('products', item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const itemAmount = item.quantity * item.rate;
      subtotal += itemAmount;

      validatedItems.push({
        id: generateUUID(),
        productId: item.productId,
        productName: product.name || item.productName,
        quantity: item.quantity,
        rate: item.rate,
        amount: itemAmount,
        gstRate: item.gstRate || purchaseData.gstRate || 0,
        ...item
      });
    }

    const gstAmount = (subtotal * (purchaseData.gstRate || 0)) / 100;
    const total = subtotal + gstAmount;

    // Validate total matches
    if (purchaseData.total && Math.abs(purchaseData.total - total) > 0.01) {
      console.warn(`Purchase total mismatch: provided ${purchaseData.total}, calculated ${total}`);
    }

    const purchaseId = purchaseData.id || generateUUID();
    const opId = `op-purchase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create purchase record
    const purchase = {
      id: purchaseId,
      supplierId: purchaseData.supplierId,
      supplierName: supplier.name,
      invoiceNo: purchaseData.invoiceNo || `PINV-${Date.now()}`,
      date: purchaseData.date || new Date().toISOString().split('T')[0],
      subtotal,
      gstRate: purchaseData.gstRate || 0,
      gstAmount,
      total,
      paidAmount: 0,
      status: 'pending',
      type: 'material',
      description: purchaseData.description || 'Material Purchase',
      paymentTerms: purchaseData.paymentTerms || 'Net 30',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
      opId
    };

    // Prepare journal entries for accounting
    const journalEntry = {
      id: generateUUID(),
      sourceType: 'purchase',
      sourceId: purchaseId,
      date: purchase.date,
      description: `Purchase from ${supplier.name} - ${purchase.invoiceNo}`,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    const journalLines = [
      // Debit: Inventory (Asset increases)
      {
        id: generateUUID(),
        journalEntryId: journalEntry.id,
        accountId: 'INVENTORY', // Should map to actual account ID
        accountName: 'Inventory',
        debit: total,
        credit: 0,
        description: 'Material purchase'
      },
      // Credit: Accounts Payable (Liability increases)
      {
        id: generateUUID(),
        journalEntryId: journalEntry.id,
        accountId: 'ACCOUNTS_PAYABLE',
        accountName: 'Accounts Payable - Suppliers',
        debit: 0,
        credit: total,
        description: `AP: ${supplier.name}`
      }
    ];

    // Validate journal balance
    const validation = validateJournalBalance(journalLines);
    if (!validation.balanced) {
      throw new Error(`Journal entry not balanced: ${validation.message}`);
    }

    // Create GRN and stock transactions if requested
    let purchaseChallan = null;
    const stockTransactions = [];

    if (createGRN) {
      purchaseChallan = {
        id: generateUUID(),
        purchaseId,
        supplierId: purchaseData.supplierId,
        challanNo: purchaseData.challanNo || `GRN-${Date.now()}`,
        date: purchase.date,
        receivedBy: purchaseData.receivedBy || 'System',
        status: 'received',
        createdAt: new Date().toISOString(),
        syncStatus: 'pending'
      };

      // Create stock transactions for each item
      for (const item of validatedItems) {
        const stockTxn = {
          id: generateUUID(),
          productId: item.productId,
          quantity: item.quantity,
          type: 'purchase_in',
          referenceType: 'purchase',
          referenceId: purchaseId,
          date: purchase.date,
          description: `Purchase from ${supplier.name}`,
          createdAt: new Date().toISOString(),
          syncStatus: 'pending'
        };
        stockTransactions.push(stockTxn);
      }
    }

    // Execute atomic transaction
    await dbTransaction([
      'purchases',
      'purchase_items',
      'purchase_challans',
      'stock_transactions',
      'journal_entries',
      'journal_lines',
      'products',
      'offline_operations'
    ], 'readwrite', async (tx) => {
      const purchaseStore = tx.objectStore('purchases');
      const itemsStore = tx.objectStore('purchase_items');
      const challanStore = tx.objectStore('purchase_challans');
      const stockStore = tx.objectStore('stock_transactions');
      const journalStore = tx.objectStore('journal_entries');
      const journalLinesStore = tx.objectStore('journal_lines');
      const productsStore = tx.objectStore('products');
      const opsStore = tx.objectStore('offline_operations');

      // Insert purchase
      purchaseStore.put(purchase);

      // Insert items
      validatedItems.forEach(item => {
        itemsStore.put({
          ...item,
          purchaseId,
          createdAt: new Date().toISOString(),
          syncStatus: 'pending'
        });
      });

      // Insert GRN if created
      if (purchaseChallan) {
        challanStore.put(purchaseChallan);
      }

      // Insert stock transactions and update product stock
      stockTransactions.forEach(txn => {
        stockStore.put(txn);

        // Update product current stock
        const productRequest = productsStore.get(txn.productId);
        productRequest.onsuccess = () => {
          if (productRequest.result) {
            const product = productRequest.result;
            const newStock = (product.currentStock || 0) + txn.quantity;
            productsStore.put({
              ...product,
              currentStock: newStock,
              updatedAt: new Date().toISOString()
            });
          }
        };
      });

      // Insert journal entries
      journalStore.put(journalEntry);
      journalLines.forEach(line => journalLinesStore.put(line));

      // Queue offline operation
      const op = {
        id: generateUUID(),
        opId,
        opType: 'purchase_post',
        stores: ['purchases', 'purchase_items', 'purchase_challans', 'stock_transactions', 'journal_entries', 'journal_lines'],
        payload: {
          purchase,
          items: validatedItems,
          challan: purchaseChallan,
          stockTransactions,
          journalEntry,
          journalLines
        },
        priority: 'high',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      opsStore.put(op);
    });

    return {
      success: true,
      purchase,
      items: validatedItems,
      challan: purchaseChallan,
      stockTransactions,
      journalEntry,
      journalLines
    };

  } catch (error) {
    console.error('Failed to post purchase invoice:', error);
    throw error;
  }
};

/**
 * Create Purchase Challan (GRN) for existing purchase
 */
export const createGRN = async (purchaseId, challanData) => {
  try {
    const purchase = await dbOperations.getById('purchases', purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }

    const purchaseItems = await dbOperations.getByIndex('purchase_items', 'purchaseId', purchaseId);
    if (!purchaseItems || purchaseItems.length === 0) {
      throw new Error('No purchase items found');
    }

    const challanId = generateUUID();
    const challan = {
      id: challanId,
      purchaseId,
      supplierId: purchase.supplierId,
      challanNo: challanData.challanNo || `GRN-${Date.now()}`,
      date: challanData.date || new Date().toISOString().split('T')[0],
      receivedBy: challanData.receivedBy || 'System',
      remarks: challanData.remarks || '',
      status: 'received',
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    const stockTransactions = [];
    for (const item of purchaseItems) {
      stockTransactions.push({
        id: generateUUID(),
        productId: item.productId,
        quantity: item.quantity,
        type: 'purchase_in',
        referenceType: 'purchase_challan',
        referenceId: challanId,
        date: challan.date,
        description: `GRN: ${challan.challanNo}`,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending'
      });
    }

    await dbTransaction(['purchase_challans', 'stock_transactions', 'products', 'offline_operations'], 'readwrite', (tx) => {
      const challanStore = tx.objectStore('purchase_challans');
      const stockStore = tx.objectStore('stock_transactions');
      const productsStore = tx.objectStore('products');
      const opsStore = tx.objectStore('offline_operations');

      challanStore.put(challan);

      stockTransactions.forEach(txn => {
        stockStore.put(txn);

        const productRequest = productsStore.get(txn.productId);
        productRequest.onsuccess = () => {
          if (productRequest.result) {
            const product = productRequest.result;
            productsStore.put({
              ...product,
              currentStock: (product.currentStock || 0) + txn.quantity,
              updatedAt: new Date().toISOString()
            });
          }
        };
      });

      opsStore.put({
        id: generateUUID(),
        opId: `op-grn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        opType: 'grn_create',
        stores: ['purchase_challans', 'stock_transactions'],
        payload: { challan, stockTransactions },
        priority: 'high',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });

    return { challan, stockTransactions };
  } catch (error) {
    console.error('Failed to create GRN:', error);
    throw error;
  }
};

/**
 * Record Payment to Supplier
 */
export const recordSupplierPayment = async (supplierId, purchaseId, paymentData) => {
  try {
    const supplier = await dbOperations.getById(SUPPLIER_STORE, supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    let purchase = null;
    if (purchaseId) {
      purchase = await dbOperations.getById('purchases', purchaseId);
      if (!purchase) {
        throw new Error('Purchase not found');
      }
      if (purchase.supplierId !== supplierId) {
        throw new Error('Purchase does not belong to this supplier');
      }

      const outstanding = purchase.total - (purchase.paidAmount || 0);
      if (paymentData.amount > outstanding + 0.01) {
        console.warn(`Payment ${paymentData.amount} exceeds outstanding ${outstanding}`);
      }
    }

    const paymentId = generateUUID();
    const payment = {
      id: paymentId,
      payeeId: supplierId,
      payeeType: 'supplier',
      payeeName: supplier.name,
      invoiceId: purchaseId,
      amount: paymentData.amount,
      date: paymentData.date || new Date().toISOString().split('T')[0],
      paymentMode: paymentData.paymentMode || 'Cash',
      referenceNo: paymentData.referenceNo || '',
      bankDetails: paymentData.bankDetails || '',
      description: paymentData.description || `Payment to ${supplier.name}`,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    // Journal entry for payment
    const journalEntry = {
      id: generateUUID(),
      sourceType: 'payment',
      sourceId: paymentId,
      date: payment.date,
      description: payment.description,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    const journalLines = [
      // Debit: Accounts Payable (Liability decreases)
      {
        id: generateUUID(),
        journalEntryId: journalEntry.id,
        accountId: 'ACCOUNTS_PAYABLE',
        accountName: 'Accounts Payable - Suppliers',
        debit: payment.amount,
        credit: 0,
        description: `Payment to ${supplier.name}`
      },
      // Credit: Bank/Cash (Asset decreases)
      {
        id: generateUUID(),
        journalEntryId: journalEntry.id,
        accountId: payment.paymentMode === 'Cash' ? 'CASH' : 'BANK',
        accountName: payment.paymentMode === 'Cash' ? 'Cash' : 'Bank',
        debit: 0,
        credit: payment.amount,
        description: `Payment via ${payment.paymentMode}`
      }
    ];

    const validation = validateJournalBalance(journalLines);
    if (!validation.balanced) {
      throw new Error(`Journal entry not balanced: ${validation.message}`);
    }

    await dbTransaction(['payments', 'purchases', 'journal_entries', 'journal_lines', 'offline_operations'], 'readwrite', (tx) => {
      const paymentsStore = tx.objectStore('payments');
      const purchasesStore = tx.objectStore('purchases');
      const journalStore = tx.objectStore('journal_entries');
      const journalLinesStore = tx.objectStore('journal_lines');
      const opsStore = tx.objectStore('offline_operations');

      paymentsStore.put(payment);

      if (purchase) {
        const updatedPurchase = {
          ...purchase,
          paidAmount: (purchase.paidAmount || 0) + payment.amount,
          status: (purchase.paidAmount || 0) + payment.amount >= purchase.total ? 'paid' : 'partial',
          updatedAt: new Date().toISOString()
        };
        purchasesStore.put(updatedPurchase);
      }

      journalStore.put(journalEntry);
      journalLines.forEach(line => journalLinesStore.put(line));

      opsStore.put({
        id: generateUUID(),
        opId: `op-payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        opType: 'supplier_payment',
        stores: ['payments', 'purchases', 'journal_entries', 'journal_lines'],
        payload: { payment, journalEntry, journalLines },
        priority: 'high',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });

    return { payment, journalEntry, journalLines };
  } catch (error) {
    console.error('Failed to record supplier payment:', error);
    throw error;
  }
};

/**
 * Get Supplier Ledger
 */
export const getSupplierLedger = async (supplierId, fromDate, toDate) => {
  try {
    const supplier = await dbOperations.getById(SUPPLIER_STORE, supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    let purchases = await dbOperations.getByIndex('purchases', 'supplierId', supplierId);
    let payments = await dbOperations.getByIndex('payments', 'payeeId', supplierId);

    // Filter by date
    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : new Date('1900-01-01');
      const to = toDate ? new Date(toDate) : new Date('2100-12-31');

      purchases = purchases.filter(p => {
        const date = new Date(p.date);
        return date >= from && date <= to;
      });

      payments = payments.filter(p => {
        const date = new Date(p.date);
        return date >= from && date <= to;
      });
    }

    const entries = [];

    purchases.forEach(p => {
      entries.push({
        date: p.date,
        type: 'purchase',
        reference: p.invoiceNo,
        description: p.description || 'Material Purchase',
        debit: 0,
        credit: p.total,
        sourceId: p.id,
        syncStatus: p.syncStatus
      });
    });

    payments.forEach(p => {
      entries.push({
        date: p.date,
        type: 'payment',
        reference: p.referenceNo || p.id,
        description: p.description,
        debit: p.amount,
        credit: 0,
        sourceId: p.id,
        syncStatus: p.syncStatus
      });
    });

    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    let balance = supplier.opening_balance || 0;
    const entriesWithBalance = entries.map(entry => {
      balance += entry.credit - entry.debit;
      return { ...entry, balance };
    });

    return {
      supplierId,
      supplierName: supplier.name,
      openingBalance: supplier.opening_balance || 0,
      entries: entriesWithBalance,
      closingBalance: balance,
      totalPurchases: entriesWithBalance.reduce((sum, e) => sum + e.credit, 0),
      totalPayments: entriesWithBalance.reduce((sum, e) => sum + e.debit, 0),
      outstandingAmount: balance
    };
  } catch (error) {
    console.error('Failed to get supplier ledger:', error);
    throw error;
  }
};

/**
 * Get Supplier Summary
 */
export const getSupplierSummary = async (supplierId) => {
  try {
    const [supplier, purchases, payments] = await Promise.all([
      dbOperations.getById(SUPPLIER_STORE, supplierId),
      dbOperations.getByIndex('purchases', 'supplierId', supplierId),
      dbOperations.getByIndex('payments', 'payeeId', supplierId)
    ]);

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      supplierId,
      supplierName: supplier.name,
      totalPurchases: purchases.length,
      totalPurchaseAmount: totalPurchases,
      totalPaid,
      outstanding: totalPurchases - totalPaid,
      lastPurchaseDate: purchases.length > 0 
        ? new Date(Math.max(...purchases.map(p => new Date(p.date)))).toISOString()
        : null,
      lastPaymentDate: payments.length > 0
        ? new Date(Math.max(...payments.map(p => new Date(p.date)))).toISOString()
        : null
    };
  } catch (error) {
    console.error('Failed to get supplier summary:', error);
    throw error;
  }
};

/**
 * Upload Supplier Document (Invoice PDF, etc.)
 */
export const uploadSupplierDocument = async (supplierId, fileData, metadata) => {
  try {
    let filePath = null;
    if (window.electron) {
      const result = await window.electron.invoke('fs.writeAtomic', {
        path: `${await pathConfig.getModulePath('supplier')}/${supplierId}/${fileData.name}`,
        dataBuffer: fileData.buffer
      });

      if (result.ok) {
        filePath = result.path;
      } else {
        throw new Error('Failed to save file: ' + result.error);
      }
    }

    const document = {
      id: generateUUID(),
      entityType: 'supplier',
      entityId: supplierId,
      fileName: fileData.name,
      filePath,
      fileSize: fileData.size,
      fileType: fileData.type,
      category: metadata.category || 'invoice',
      description: metadata.description || '',
      uploadedAt: new Date().toISOString()
    };

    await dbOperations.insert('documents', document);

    return document;
  } catch (error) {
    console.error('Failed to upload supplier document:', error);
    throw error;
  }
};
