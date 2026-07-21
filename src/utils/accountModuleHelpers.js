/**
 * Account Module Helper Functions
 * Implements composite operations for accounting flows per ACCOUNT_MODULE_RELATION.md
 */

import cachedDb from '@/utils/cachedDbOperations';
import { dbTransaction, bulkPut } from '@/lib/db';
const dbOperations = cachedDb;
import unifiedDataFlowManager from './unifiedDataFlowManager.js';
import unifiedSyncManager from './unifiedSyncManager.js';
import { generateUUID } from './jobModuleHelpers';

/**
 * Validate journal entry balancing
 */
export const validateJournalBalance = (journalLines) => {
  const totalDebits = journalLines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredits = journalLines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const tolerance = 0.01;
  
  const balanced = Math.abs(totalDebits - totalCredits) < tolerance;
  
  return {
    balanced,
    totalDebits,
    totalCredits,
    difference: totalDebits - totalCredits
  };
};

/**
 * Post Purchase Invoice (P-Invoice)
 * Per spec: atomic across purchases, purchase_items, stock_transactions, journal_entries, journal_lines, products
 */
export const postPurchaseInvoice = async (purchase, purchaseItems, vendorId) => {
  try {
    const purchaseId = purchase.id || generateUUID();
    const purchaseRecord = {
      ...purchase,
      id: purchaseId,
      vendorId,
      date: purchase.date || new Date().toISOString(),
      syncStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    const itemRecords = purchaseItems.map(item => ({
      ...item,
      id: item.id || generateUUID(),
      purchaseId,
      createdAt: new Date().toISOString()
    }));

    // Create stock transactions (positive for purchases)
    const stockTransactions = itemRecords.map(item => ({
      id: generateUUID(),
      referenceType: 'purchase',
      referenceId: purchaseId,
      productId: item.productId,
      qty: Math.abs(item.qty),
      date: purchaseRecord.date,
      createdAt: new Date().toISOString()
    }));

    // Create journal entry
    const journalId = generateUUID();
    const totalAmount = itemRecords.reduce((sum, item) => sum + (item.amount || 0), 0);
    const gstAmount = totalAmount * (purchase.gstRate || 0.18);
    const grandTotal = totalAmount + gstAmount;

    const journalEntry = {
      id: journalId,
      sourceType: 'purchase',
      sourceId: purchaseId,
      date: purchaseRecord.date,
      description: `Purchase from ${vendorId}`,
      createdAt: new Date().toISOString()
    };

    const journalLines = [
      {
        id: generateUUID(),
        journalEntryId: journalId,
        accountId: 'INVENTORY', // Inventory account
        debit: totalAmount,
        credit: 0,
        description: 'Inventory purchased',
        createdAt: new Date().toISOString()
      },
      {
        id: generateUUID(),
        journalEntryId: journalId,
        accountId: 'GST_INPUT', // GST Input
        debit: gstAmount,
        credit: 0,
        description: 'Input GST',
        createdAt: new Date().toISOString()
      },
      {
        id: generateUUID(),
        journalEntryId: journalId,
        accountId: 'AP', // Accounts Payable
        debit: 0,
        credit: grandTotal,
        description: 'Accounts Payable',
        createdAt: new Date().toISOString()
      }
    ];

    // Validate balance
    const validation = validateJournalBalance(journalLines);
    if (!validation.balanced) {
      throw new Error(`Journal entry not balanced. Difference: ${validation.difference}`);
    }

    // Execute atomic transaction
    await dbTransaction(
      ['purchases', 'purchase_items', 'stock_transactions', 'journal_entries', 'journal_lines', 'products', 'offline_operations'],
      'readwrite',
      (tx) => {
        const purchaseStore = tx.objectStore('purchases');
        const itemsStore = tx.objectStore('purchase_items');
        const stockStore = tx.objectStore('stock_transactions');
        const journalStore = tx.objectStore('journal_entries');
        const linesStore = tx.objectStore('journal_lines');
        const productsStore = tx.objectStore('products');
        const opsStore = tx.objectStore('offline_operations');

        // Insert purchase and items
        purchaseStore.put(purchaseRecord);
        itemRecords.forEach(item => itemsStore.put(item));

        // Insert stock transactions and update product stock
        stockTransactions.forEach(st => {
          stockStore.put(st);
          
          // Update product stock
          const productRequest = productsStore.get(st.productId);
          productRequest.onsuccess = () => {
            if (productRequest.result) {
              const product = productRequest.result;
              productsStore.put({
                ...product,
                currentStock: (product.currentStock || 0) + st.qty,
                updatedAt: new Date().toISOString()
              });
            }
          };
        });

        // Insert journal entries
        journalStore.put(journalEntry);
        journalLines.forEach(line => linesStore.put(line));

        // Create offline operation
        const op = {
          id: generateUUID(),
          opId: `op-purchase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          opType: 'composite',
          stores: ['purchases', 'purchase_items', 'stock_transactions', 'journal_entries', 'journal_lines'],
          payload: { purchase: purchaseRecord, items: itemRecords, stockTransactions, journalEntry, journalLines },
          priority: 'high',
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        opsStore.put(op);
      }
    );

    return { purchase: purchaseRecord, items: itemRecords, stockTransactions, journal: journalEntry, lines: journalLines };
  } catch (error) {
    console.error('Failed to post purchase invoice:', error);
    throw error;
  }
};

/**
 * Post Sales Invoice (Sell-Invoice)
 * Per spec: atomic across invoices, invoice_items, journal_entries, journal_lines
 */
export const postSalesInvoice = async (invoice, invoiceItems, customerId) => {
  try {
    const invoiceId = invoice.id || generateUUID();
    const invoiceRecord = {
      ...invoice,
      id: invoiceId,
      customerId,
      date: invoice.date || new Date().toISOString(),
      status: invoice.status || 'Pending',
      paidAmount: 0,
      syncStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    const itemRecords = invoiceItems.map(item => ({
      ...item,
      id: item.id || generateUUID(),
      invoiceId,
      createdAt: new Date().toISOString()
    }));

    // Validate totals
    const calculatedTotal = itemRecords.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tolerance = 0.01;
    if (Math.abs(calculatedTotal - (invoice.subTotal || 0)) > tolerance) {
      throw new Error('Invoice subtotal does not match sum of items');
    }

    // Create journal entry
    const journalId = generateUUID();
    const subTotal = invoice.subTotal || calculatedTotal;
    const gstAmount = subTotal * (invoice.gstRate || 0.18);
    const grandTotal = subTotal + gstAmount;

    const journalEntry = {
      id: journalId,
      sourceType: 'invoice',
      sourceId: invoiceId,
      date: invoiceRecord.date,
      description: `Sales invoice for customer ${customerId}`,
      createdAt: new Date().toISOString()
    };

    const journalLines = [
      {
        id: generateUUID(),
        journalEntryId: journalId,
        accountId: 'AR', // Accounts Receivable
        debit: grandTotal,
        credit: 0,
        description: 'Accounts Receivable',
        createdAt: new Date().toISOString()
      },
      {
        id: generateUUID(),
        journalEntryId: journalId,
        accountId: 'SALES', // Sales Revenue
        debit: 0,
        credit: subTotal,
        description: 'Sales Revenue',
        createdAt: new Date().toISOString()
      },
      {
        id: generateUUID(),
        journalEntryId: journalId,
        accountId: 'GST_OUTPUT', // GST Output
        debit: 0,
        credit: gstAmount,
        description: 'Output GST',
        createdAt: new Date().toISOString()
      }
    ];

    // Validate balance
    const validation = validateJournalBalance(journalLines);
    if (!validation.balanced) {
      throw new Error(`Journal entry not balanced. Difference: ${validation.difference}`);
    }

    // Execute atomic transaction
    await dbTransaction(
      ['invoices', 'invoice_items', 'journal_entries', 'journal_lines', 'offline_operations'],
      'readwrite',
      (tx) => {
        const invoiceStore = tx.objectStore('invoices');
        const itemsStore = tx.objectStore('invoice_items');
        const journalStore = tx.objectStore('journal_entries');
        const linesStore = tx.objectStore('journal_lines');
        const opsStore = tx.objectStore('offline_operations');

        invoiceStore.put(invoiceRecord);
        itemRecords.forEach(item => itemsStore.put(item));
        journalStore.put(journalEntry);
        journalLines.forEach(line => linesStore.put(line));

        const op = {
          id: generateUUID(),
          opId: `op-invoice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          opType: 'composite',
          stores: ['invoices', 'invoice_items', 'journal_entries', 'journal_lines'],
          payload: { invoice: invoiceRecord, items: itemRecords, journalEntry, journalLines },
          priority: 'high',
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        opsStore.put(op);
      }
    );

    return { invoice: invoiceRecord, items: itemRecords, journal: journalEntry, lines: journalLines };
  } catch (error) {
    console.error('Failed to post sales invoice:', error);
    throw error;
  }
};

/**
 * Create Manual Voucher
 * Per spec: atomic journal_entries + journal_lines with balance validation
 */
export const createVoucher = async (voucherData, journalLines) => {
  try {
    // Validate balance first
    const validation = validateJournalBalance(journalLines);
    if (!validation.balanced) {
      throw new Error(`Voucher not balanced. Debits: ${validation.totalDebits}, Credits: ${validation.totalCredits}`);
    }

    const journalId = generateUUID();
    const journalEntry = {
      ...voucherData,
      id: journalId,
      sourceType: 'voucher',
      sourceId: journalId,
      date: voucherData.date || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const lineRecords = journalLines.map(line => ({
      ...line,
      id: line.id || generateUUID(),
      journalEntryId: journalId,
      createdAt: new Date().toISOString()
    }));

    await dbTransaction(
      ['journal_entries', 'journal_lines', 'offline_operations'],
      'readwrite',
      (tx) => {
        const journalStore = tx.objectStore('journal_entries');
        const linesStore = tx.objectStore('journal_lines');
        const opsStore = tx.objectStore('offline_operations');

        journalStore.put(journalEntry);
        lineRecords.forEach(line => linesStore.put(line));

        const op = {
          id: generateUUID(),
          opId: `op-voucher-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          opType: 'composite',
          stores: ['journal_entries', 'journal_lines'],
          payload: { journalEntry, journalLines: lineRecords },
          priority: 'high',
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        opsStore.put(op);
      }
    );

    return { journal: journalEntry, lines: lineRecords };
  } catch (error) {
    console.error('Failed to create voucher:', error);
    throw error;
  }
};

/**
 * Receive Payment (Cash Receipt)
 * Per spec: atomic payments, journal_entries, journal_lines, update invoice
 */
export const receivePayment = async (paymentData, invoiceId) => {
  try {
    const paymentId = generateUUID();
    const paymentRecord = {
      ...paymentData,
      id: paymentId,
      invoiceId,
      date: paymentData.date || new Date().toISOString(),
      syncStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    // Get invoice to update
    const invoice = await dbOperations.getById('invoices', invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const paidAmount = (invoice.paidAmount || 0) + paymentData.amount;
    const totalAmount = invoice.total || invoice.grandTotal || 0;
    const newStatus = paidAmount >= totalAmount ? 'Paid' : 'Partial';

    // Create journal entry
    const journalId = generateUUID();
    const journalEntry = {
      id: journalId,
      sourceType: 'payment',
      sourceId: paymentId,
      date: paymentRecord.date,
      description: `Payment received for invoice ${invoiceId}`,
      createdAt: new Date().toISOString()
    };

    const journalLines = [
      {
        id: generateUUID(),
        journalEntryId: journalId,
        accountId: paymentData.accountId || 'CASH', // Bank/Cash
        debit: paymentData.amount,
        credit: 0,
        description: 'Cash/Bank received',
        createdAt: new Date().toISOString()
      },
      {
        id: generateUUID(),
        journalEntryId: journalId,
        accountId: 'AR', // Accounts Receivable
        debit: 0,
        credit: paymentData.amount,
        description: 'AR settlement',
        createdAt: new Date().toISOString()
      }
    ];

    await dbTransaction(
      ['payments', 'journal_entries', 'journal_lines', 'invoices', 'offline_operations'],
      'readwrite',
      (tx) => {
        const paymentStore = tx.objectStore('payments');
        const journalStore = tx.objectStore('journal_entries');
        const linesStore = tx.objectStore('journal_lines');
        const invoiceStore = tx.objectStore('invoices');
        const opsStore = tx.objectStore('offline_operations');

        paymentStore.put(paymentRecord);
        journalStore.put(journalEntry);
        journalLines.forEach(line => linesStore.put(line));

        // Update invoice
        invoiceStore.put({
          ...invoice,
          paidAmount,
          status: newStatus,
          updatedAt: new Date().toISOString()
        });

        const op = {
          id: generateUUID(),
          opId: `op-payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          opType: 'composite',
          stores: ['payments', 'journal_entries', 'journal_lines', 'invoices'],
          payload: { payment: paymentRecord, journalEntry, journalLines, invoice: { ...invoice, paidAmount, status: newStatus } },
          priority: 'high',
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        opsStore.put(op);
      }
    );

    return { payment: paymentRecord, journal: journalEntry, lines: journalLines };
  } catch (error) {
    console.error('Failed to receive payment:', error);
    throw error;
  }
};

/**
 * Get GST Report for a period
 */
export const getGSTReport = async (fromDate, toDate) => {
  try {
    const journalEntries = await dbOperations.getAll('journal_entries');
    const filteredEntries = journalEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= new Date(fromDate) && entryDate <= new Date(toDate);
    });

    const entryIds = filteredEntries.map(e => e.id);
    const allLines = await dbOperations.getAll('journal_lines');
    
    const gstLines = allLines.filter(line => 
      entryIds.includes(line.journalEntryId) &&
      (line.accountId === 'GST_INPUT' || line.accountId === 'GST_OUTPUT')
    );

    const inputGST = gstLines
      .filter(line => line.accountId === 'GST_INPUT')
      .reduce((sum, line) => sum + (line.debit || 0) - (line.credit || 0), 0);

    const outputGST = gstLines
      .filter(line => line.accountId === 'GST_OUTPUT')
      .reduce((sum, line) => sum + (line.credit || 0) - (line.debit || 0), 0);

    return {
      inputGST,
      outputGST,
      netGST: outputGST - inputGST,
      lines: gstLines,
      period: { fromDate, toDate }
    };
  } catch (error) {
    console.error('Failed to get GST report:', error);
    throw error;
  }
};

/**
 * Get Account Ledger
 */
export const getAccountLedger = async (accountId, fromDate, toDate) => {
  try {
    const allLines = await dbOperations.getByIndex('journal_lines', 'accountId', accountId);
    
    let filteredLines = allLines;
    if (fromDate || toDate) {
      const journalEntries = await dbOperations.getAll('journal_entries');
      const journalMap = {};
      journalEntries.forEach(entry => {
        journalMap[entry.id] = entry;
      });

      filteredLines = allLines.filter(line => {
        const entry = journalMap[line.journalEntryId];
        if (!entry) return false;
        
        const entryDate = new Date(entry.date);
        const from = fromDate ? new Date(fromDate) : new Date('1900-01-01');
        const to = toDate ? new Date(toDate) : new Date('2100-12-31');
        
        return entryDate >= from && entryDate <= to;
      });
    }

    // Calculate running balance
    let balance = 0;
    const ledgerEntries = filteredLines.map(line => {
      balance += (line.debit || 0) - (line.credit || 0);
      return {
        ...line,
        balance
      };
    });

    return {
      accountId,
      entries: ledgerEntries,
      openingBalance: 0,
      closingBalance: balance,
      totalDebits: filteredLines.reduce((sum, line) => sum + (line.debit || 0), 0),
      totalCredits: filteredLines.reduce((sum, line) => sum + (line.credit || 0), 0)
    };
  } catch (error) {
    console.error('Failed to get account ledger:', error);
    throw error;
  }
};

/**
 * Create/Update Challan
 */
export const createChallan = async (challanData, challanItems, type = 'sell') => {
  try {
    const challanId = generateUUID();
    const challanRecord = {
      ...challanData,
      id: challanId,
      type, // 'sell' or 'purchase'
      date: challanData.date || new Date().toISOString(),
      syncStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    const itemRecords = challanItems.map(item => ({
      ...item,
      id: item.id || generateUUID(),
      challanId,
      createdAt: new Date().toISOString()
    }));

    // Create stock transactions if needed
    const stockTransactions = itemRecords.map(item => ({
      id: generateUUID(),
      referenceType: 'challan',
      referenceId: challanId,
      productId: item.productId,
      qty: type === 'sell' ? -Math.abs(item.qty) : Math.abs(item.qty),
      date: challanRecord.date,
      createdAt: new Date().toISOString()
    }));

    await dbTransaction(
      ['challans', 'challan_items', 'stock_transactions', 'offline_operations'],
      'readwrite',
      (tx) => {
        const challanStore = tx.objectStore('challans');
        const itemsStore = tx.objectStore('challan_items');
        const stockStore = tx.objectStore('stock_transactions');
        const opsStore = tx.objectStore('offline_operations');

        challanStore.put(challanRecord);
        itemRecords.forEach(item => itemsStore.put(item));
        stockTransactions.forEach(st => stockStore.put(st));

        const op = {
          id: generateUUID(),
          opId: `op-challan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          opType: 'composite',
          stores: ['challans', 'challan_items', 'stock_transactions'],
          payload: { challan: challanRecord, items: itemRecords, stockTransactions },
          priority: 'normal',
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        opsStore.put(op);
      }
    );

    return { challan: challanRecord, items: itemRecords, stockTransactions };
  } catch (error) {
    console.error('Failed to create challan:', error);
    throw error;
  }
};
