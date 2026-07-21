/**
 * Module Integration - Deep Relations & Data Flow
 * Connects Supplier, Inventory, and Accounts modules
 * Reference: SUPPLIER_INVENTORY_ACCOUNTS_DEEP_RELATION.md
 */

import { dbOperations, dbTransaction } from '@/lib/db';
import { generateUUID } from './jobModuleHelpers';
import { broadcastDataChange } from './dataSync';

// Store constants for consistency
const SUPPLIER_STORE = 'suppliers';
const CUSTOMER_STORE = 'customers';

/**
 * SUPPLIER → INVENTORY → ACCOUNTS Integration
 */

// ========================================
// 1. PURCHASE INVOICE FLOW (CRITICAL)
// ========================================

/**
 * Create Purchase Invoice with complete data flow
 * Flow: Purchase → Stock IN → Supplier Ledger → Journal Entries
 */
export const createPurchaseInvoice = async (purchaseData) => {
  try {
    const {
      invoice_no,
      invoice_date,
      supplier_id,
      item_id,
      quantity,
      unit_price,
      cgst_rate = 0,
      sgst_rate = 0,
      igst_rate = 0,
      notes = '',
      payment_status = 'pending'
    } = purchaseData;

    // Validation
    if (!supplier_id) throw new Error('Supplier is required');
    if (!item_id) throw new Error('Item is required');
    if (quantity <= 0) throw new Error('Quantity must be greater than 0');
    if (unit_price <= 0) throw new Error('Unit price must be greater than 0');

    // Get supplier and item details
    const supplier = await dbOperations.getById('suppliers', supplier_id);
    if (!supplier) throw new Error('Supplier not found');

    const item = await dbOperations.getById('inventory_items', item_id);
    if (!item) throw new Error('Inventory item not found');

    // Calculate amounts
    const subtotal = quantity * unit_price;
    const cgst_amount = (subtotal * cgst_rate) / 100;
    const sgst_amount = (subtotal * sgst_rate) / 100;
    const igst_amount = (subtotal * igst_rate) / 100;
    const total_amount = subtotal + cgst_amount + sgst_amount + igst_amount;

    const purchaseId = generateUUID();
    const currentDate = new Date().toISOString();

    // Prepare purchase record
    const purchase = {
      id: purchaseId,
      invoice_no: invoice_no || `PINV-${Date.now()}`,
      invoice_date,
      supplier_id,
      supplier_name: supplier.name,
      item_id,
      item_name: item.item_name,
      quantity,
      unit: item.unit,
      unit_price,
      subtotal,
      cgst_rate,
      cgst_amount,
      sgst_rate,
      sgst_amount,
      igst_rate,
      igst_amount,
      total_amount,
      payment_status,
      notes,
      created_at: currentDate,
      updated_at: currentDate,
      sync_status: 'pending'
    };

    // Prepare stock movement (IN)
    const stockMovement = {
      id: generateUUID(),
      item_id,
      movement_type: 'in',
      quantity,
      movement_date: invoice_date,
      reference_type: 'purchase',
      reference_id: purchaseId,
      reference_no: purchase.invoice_no,
      unit_price,
      total_value: subtotal,
      notes: `Purchase from ${supplier.name}`,
      created_at: currentDate,
      sync_status: 'pending'
    };

    // Prepare supplier ledger entry (DEBIT - increases payable)
    const ledgerEntry = {
      id: generateUUID(),
      supplier_id,
      entry_type: 'debit',
      amount: total_amount,
      entry_date: invoice_date,
      reference_type: 'purchase',
      reference_id: purchaseId,
      reference_no: purchase.invoice_no,
      description: `Purchase Invoice ${purchase.invoice_no}`,
      created_at: currentDate,
      sync_status: 'pending'
    };

    // Prepare journal entries (for accounting)
    const journalEntryId = generateUUID();
    const journalEntry = {
      id: journalEntryId,
      entry_date: invoice_date,
      source_type: 'purchase',
      source_id: purchaseId,
      description: `Purchase from ${supplier.name} - ${purchase.invoice_no}`,
      created_at: currentDate,
      sync_status: 'pending'
    };

    const journalLines = [
      // DEBIT: Inventory (Asset increases)
      {
        id: generateUUID(),
        journal_entry_id: journalEntryId,
        account_type: 'Inventory',
        debit_amount: total_amount,
        credit_amount: 0,
        description: 'Material purchase - stock IN',
        created_at: currentDate
      },
      // CREDIT: Accounts Payable (Liability increases)
      {
        id: generateUUID(),
        journal_entry_id: journalEntryId,
        account_type: 'Accounts Payable',
        debit_amount: 0,
        credit_amount: total_amount,
        description: `Payable to ${supplier.name}`,
        created_at: currentDate
      }
    ];

    // Execute ATOMIC transaction
    await dbTransaction([
      'purchases',
      'stock_movements',
      'inventory_items',
      'supplier_ledger_entries',
      'journal_entries',
      'journal_lines',
      'offline_operations'
    ], 'readwrite', async (tx) => {
      // 1. Insert purchase
      tx.objectStore('purchases').put(purchase);

      // 2. Insert stock movement
      tx.objectStore('stock_movements').put(stockMovement);

      // 3. Update inventory stock (CRITICAL)
      const itemStore = tx.objectStore('inventory_items');
      const itemRequest = itemStore.get(item_id);
      itemRequest.onsuccess = () => {
        if (itemRequest.result) {
          const updatedItem = {
            ...itemRequest.result,
            current_stock: (itemRequest.result.current_stock || 0) + quantity,
            updated_at: currentDate
          };
          itemStore.put(updatedItem);
        }
      };

      // 4. Insert supplier ledger entry
      tx.objectStore('supplier_ledger_entries').put(ledgerEntry);

      // 5. Insert journal entries
      tx.objectStore('journal_entries').put(journalEntry);
      const journalLinesStore = tx.objectStore('journal_lines');
      journalLines.forEach(line => journalLinesStore.put(line));

      // 6. Queue offline operation
      tx.objectStore('offline_operations').put({
        id: generateUUID(),
        op_type: 'purchase_create',
        payload: { purchase, stockMovement, ledgerEntry, journalEntry, journalLines },
        status: 'pending',
        created_at: currentDate
      });
    });

    // Broadcast data changes for real-time updates
    broadcastDataChange('purchases', 'add', purchase);
    broadcastDataChange('stock_movements', 'add', stockMovement);
    broadcastDataChange('supplier_ledger_entries', 'add', ledgerEntry);
    broadcastDataChange('journal_entries', 'add', journalEntry);

    return {
      success: true,
      purchaseId,
      message: `Purchase invoice ${purchase.invoice_no} created successfully`
    };

  } catch (error) {
    console.error('Purchase invoice creation failed:', error);
    throw error;
  }
};

// ========================================
// 2. PAYMENT VOUCHER FLOW
// ========================================

/**
 * Create Payment Voucher to Supplier
 * Flow: Payment → Supplier Ledger (CREDIT) → Journal Entries
 */
export const createSupplierPayment = async (paymentData) => {
  try {
    const {
      voucher_no,
      voucher_date,
      supplier_id,
      amount,
      payment_mode = 'cash',
      reference = '',
      notes = ''
    } = paymentData;

    if (!supplier_id) throw new Error('Supplier is required');
    if (amount === 0) throw new Error('Payment amount cannot be 0');

    const supplier = await dbOperations.getById(SUPPLIER_STORE, supplier_id);
    if (!supplier) throw new Error('Supplier not found');

    const voucherId = generateUUID();
    const currentDate = new Date().toISOString();

    // Prepare voucher record
    const voucher = {
      id: voucherId,
      voucher_no: voucher_no || `VCH-${Date.now()}`,
      voucher_date,
      voucher_type: 'payment',
      payee_type: 'supplier',
      payee_id: supplier_id,
      payee_name: supplier.name,
      amount,
      payment_mode,
      reference,
      notes,
      created_at: currentDate,
      sync_status: 'pending'
    };

    // Prepare supplier ledger entry (CREDIT - decreases payable)
    const ledgerEntry = {
      id: generateUUID(),
      supplier_id,
      entry_type: 'credit',
      amount,
      entry_date: voucher_date,
      reference_type: 'payment',
      reference_id: voucherId,
      reference_no: voucher.voucher_no,
      description: `Payment to ${supplier.name}`,
      created_at: currentDate,
      sync_status: 'pending'
    };

    // Prepare journal entries
    const journalEntryId = generateUUID();
    const journalEntry = {
      id: journalEntryId,
      entry_date: voucher_date,
      source_type: 'payment',
      source_id: voucherId,
      description: `Payment to ${supplier.name} - ${voucher.voucher_no}`,
      created_at: currentDate,
      sync_status: 'pending'
    };

    const journalLines = [
      // DEBIT: Accounts Payable (Liability decreases)
      {
        id: generateUUID(),
        journal_entry_id: journalEntryId,
        account_type: 'Accounts Payable',
        debit_amount: amount,
        credit_amount: 0,
        description: `Payment to ${supplier.name}`,
        created_at: currentDate
      },
      // CREDIT: Cash/Bank (Asset decreases)
      {
        id: generateUUID(),
        journal_entry_id: journalEntryId,
        account_type: payment_mode === 'cash' ? 'Cash' : 'Bank',
        debit_amount: 0,
        credit_amount: amount,
        description: `Payment via ${payment_mode}`,
        created_at: currentDate
      }
    ];

    // Execute ATOMIC transaction
    await dbTransaction([
      'vouchers',
      'supplier_ledger_entries',
      'journal_entries',
      'journal_lines',
      'offline_operations'
    ], 'readwrite', async (tx) => {
      tx.objectStore('vouchers').put(voucher);
      tx.objectStore('supplier_ledger_entries').put(ledgerEntry);
      tx.objectStore('journal_entries').put(journalEntry);
      
      const journalLinesStore = tx.objectStore('journal_lines');
      journalLines.forEach(line => journalLinesStore.put(line));

      tx.objectStore('offline_operations').put({
        id: generateUUID(),
        op_type: 'supplier_payment',
        payload: { voucher, ledgerEntry, journalEntry, journalLines },
        status: 'pending',
        created_at: currentDate
      });
    });

    // Broadcast data changes for real-time updates
    broadcastDataChange('vouchers', 'add', voucher);
    broadcastDataChange('supplier_ledger_entries', 'add', ledgerEntry);
    broadcastDataChange('journal_entries', 'add', journalEntry);

    return {
      success: true,
      voucherId,
      message: `Payment ${voucher.voucher_no} recorded successfully`
    };

  } catch (error) {
    console.error('Supplier payment failed:', error);
    throw error;
  }
};

// ========================================
// 3. SALES INVOICE FLOW
// ========================================

/**
 * Create Sales Invoice with Stock OUT
 * Flow: Invoice → Stock OUT → Customer Ledger → Journal Entries
 */
export const createSalesInvoiceWithStock = async (invoiceData) => {
  try {
    const {
      invoice_no,
      invoice_date,
      customer_id,
      items = [], // Array of { item_id, quantity, unit_price }
      cgst_rate = 0,
      sgst_rate = 0,
      igst_rate = 0,
      round_off = 0,
      payment_type = 'full',
      payment_amount = 0
    } = invoiceData;

    if (!customer_id) throw new Error('Customer is required');
    if (!items || items.length === 0) throw new Error('At least one item is required');

    const customer = await dbOperations.getById(CUSTOMER_STORE, customer_id);
    if (!customer) throw new Error('Customer not found');

    // Calculate totals
    let subtotal = 0;
    const validatedItems = [];
    const stockMovements = [];

    for (const item of items) {
      const inventoryItem = await dbOperations.getById('inventory_items', item.item_id);
      if (!inventoryItem) throw new Error(`Item ${item.item_id} not found`);

      // Check stock availability
      if (inventoryItem.current_stock < item.quantity) {
        throw new Error(`Insufficient stock for ${inventoryItem.item_name}. Available: ${inventoryItem.current_stock}`);
      }

      const itemTotal = item.quantity * item.unit_price;
      subtotal += itemTotal;

      validatedItems.push({
        item_id: item.item_id,
        item_name: inventoryItem.item_name,
        quantity: item.quantity,
        unit: inventoryItem.unit,
        unit_price: item.unit_price,
        total: itemTotal
      });

      // Prepare stock OUT movement
      stockMovements.push({
        id: generateUUID(),
        item_id: item.item_id,
        movement_type: 'out',
        quantity: item.quantity,
        movement_date: invoice_date,
        reference_type: 'invoice',
        reference_id: '', // Will be set after invoice creation
        unit_price: item.unit_price,
        total_value: itemTotal,
        notes: `Sale to ${customer.name}`,
        created_at: new Date().toISOString()
      });
    }

    const cgst_amount = (subtotal * cgst_rate) / 100;
    const sgst_amount = (subtotal * sgst_rate) / 100;
    const igst_amount = (subtotal * igst_rate) / 100;
    const total_amount = subtotal + cgst_amount + sgst_amount + igst_amount + round_off;
    const balance = total_amount - payment_amount;

    const invoiceId = generateUUID();
    const currentDate = new Date().toISOString();

    const invoice = {
      id: invoiceId,
      invoice_no: invoice_no || `INV-${Date.now()}`,
      invoice_date,
      customer_id,
      customer_name: customer.name,
      items: validatedItems,
      subtotal,
      cgst_rate,
      cgst_amount,
      sgst_rate,
      sgst_amount,
      igst_rate,
      igst_amount,
      round_off,
      total_amount,
      payment_type,
      payment_amount,
      balance_amount: balance,
      payment_status: balance === 0 ? 'paid' : 'pending',
      created_at: currentDate,
      sync_status: 'pending'
    };

    // Update reference_id in stock movements
    stockMovements.forEach(sm => sm.reference_id = invoiceId);
    stockMovements.forEach(sm => sm.reference_no = invoice.invoice_no);

    // Customer ledger entry (DEBIT - increases receivable)
    const ledgerEntry = {
      id: generateUUID(),
      customer_id,
      entry_type: 'debit',
      amount: total_amount,
      entry_date: invoice_date,
      reference_type: 'invoice',
      reference_id: invoiceId,
      reference_no: invoice.invoice_no,
      description: `Invoice ${invoice.invoice_no}`,
      created_at: currentDate
    };

    // Payment ledger entry if payment received (CREDIT)
    const paymentLedgerEntry = payment_amount > 0 ? {
      id: generateUUID(),
      customer_id,
      entry_type: 'credit',
      amount: payment_amount,
      entry_date: invoice_date,
      reference_type: 'invoice_payment',
      reference_id: invoiceId,
      reference_no: invoice.invoice_no,
      description: `Payment received for ${invoice.invoice_no}`,
      created_at: currentDate
    } : null;

    // Execute ATOMIC transaction
    await dbTransaction([
      'invoices',
      'stock_movements',
      'inventory_items',
      'customer_ledger_entries',
      'offline_operations'
    ], 'readwrite', async (tx) => {
      tx.objectStore('invoices').put(invoice);

      // Insert stock movements and update inventory
      const stockStore = tx.objectStore('stock_movements');
      const itemStore = tx.objectStore('inventory_items');
      
      stockMovements.forEach(sm => {
        stockStore.put(sm);
        
        const itemRequest = itemStore.get(sm.item_id);
        itemRequest.onsuccess = () => {
          if (itemRequest.result) {
            itemStore.put({
              ...itemRequest.result,
              current_stock: itemRequest.result.current_stock - sm.quantity,
              updated_at: currentDate
            });
          }
        };
      });

      // Insert customer ledger entries
      const ledgerStore = tx.objectStore('customer_ledger_entries');
      ledgerStore.put(ledgerEntry);
      if (paymentLedgerEntry) {
        ledgerStore.put(paymentLedgerEntry);
      }

      tx.objectStore('offline_operations').put({
        id: generateUUID(),
        op_type: 'invoice_create',
        payload: { invoice, stockMovements, ledgerEntry, paymentLedgerEntry },
        status: 'pending',
        created_at: currentDate
      });
    });

    // Broadcast data changes for real-time updates
    broadcastDataChange('invoices', 'add', invoice);
    broadcastDataChange('customer_ledger_entries', 'add', ledgerEntry);
    if (paymentLedgerEntry) {
      broadcastDataChange('customer_ledger_entries', 'add', paymentLedgerEntry);
    }
    stockMovements.forEach(sm => {
      broadcastDataChange('stock_movements', 'add', sm);
    });

    return {
      success: true,
      invoiceId,
      message: `Invoice ${invoice.invoice_no} created successfully`
    };

  } catch (error) {
    console.error('Sales invoice creation failed:', error);
    throw error;
  }
};

// ========================================
// 4. HELPER FUNCTIONS
// ========================================

/**
 * Get Supplier Outstanding Balance
 */
export const getSupplierBalance = async (supplierId) => {
  try {
    const entries = await dbOperations.getByIndex('supplier_ledger_entries', 'supplier_id', supplierId);
    
    const balance = entries.reduce((sum, entry) => {
      if (entry.entry_type === 'debit') {
        return sum + (entry.amount || 0);
      } else if (entry.entry_type === 'credit') {
        return sum - (entry.amount || 0);
      }
      return sum;
    }, 0);

    return balance;
  } catch (error) {
    console.error('Failed to get supplier balance:', error);
    return 0;
  }
};

/**
 * Get Stock Movements for Item
 */
export const getItemStockHistory = async (itemId) => {
  try {
    const movements = await dbOperations.getByIndex('stock_movements', 'item_id', itemId);
    
    // Calculate running balance
    let runningStock = 0;
    const history = movements.map(m => {
      if (m.movement_type === 'in') {
        runningStock += m.quantity;
      } else if (m.movement_type === 'out') {
        runningStock -= m.quantity;
      }
      
      return {
        ...m,
        running_stock: runningStock
      };
    });

    return history;
  } catch (error) {
    console.error('Failed to get stock history:', error);
    return [];
  }
};

/**
 * Get GST Summary
 */
export const getGSTSummary = async (startDate, endDate) => {
  try {
    // Input GST from purchases
    const purchases = await dbOperations.getAll('purchases');
    const inputGST = purchases
      .filter(p => p.invoice_date >= startDate && p.invoice_date <= endDate)
      .reduce((sum, p) => sum + (p.cgst_amount || 0) + (p.sgst_amount || 0) + (p.igst_amount || 0), 0);

    // Output GST from invoices
    const invoices = await dbOperations.getAll('invoices');
    const outputGST = invoices
      .filter(i => i.invoice_date >= startDate && i.invoice_date <= endDate)
      .reduce((sum, i) => sum + (i.cgst_amount || 0) + (i.sgst_amount || 0) + (i.igst_amount || 0), 0);

    const netGST = outputGST - inputGST;

    return {
      inputGST,
      outputGST,
      netGST,
      status: netGST > 0 ? 'payable' : 'refundable'
    };
  } catch (error) {
    console.error('Failed to get GST summary:', error);
    return { inputGST: 0, outputGST: 0, netGST: 0, status: 'unknown' };
  }
};

/**
 * Navigate to Related Document
 */
export const navigateToDocument = (referenceType, referenceId) => {
  const routes = {
    'purchase': `/accounts?tab=purchase&id=${referenceId}`,
    'payment': `/accounts?tab=voucher&id=${referenceId}`,
    'invoice': `/accounts?tab=invoice&id=${referenceId}`,
    'challan': `/accounts?tab=challan&id=${referenceId}`,
    'supplier': `/supplier?tab=details&id=${referenceId}`,
    'inventory': `/inventory?tab=stock&id=${referenceId}`
  };

  return routes[referenceType] || '/';
};

export default {
  createPurchaseInvoice,
  createSupplierPayment,
  createSalesInvoiceWithStock,
  getSupplierBalance,
  getItemStockHistory,
  getGSTSummary,
  navigateToDocument
};
