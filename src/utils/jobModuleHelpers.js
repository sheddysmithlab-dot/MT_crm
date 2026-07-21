/**
 * Job Module Helper Functions
 * Implements composite operations and transaction management per JOB_MODULE_RELATION.md
 */

import cachedDb from '@/utils/cachedDbOperations';
import { dbTransaction, bulkPut } from '@/lib/db';
const dbOperations = cachedDb;
import unifiedDataFlowManager from './unifiedDataFlowManager.js';
import unifiedSyncManager from './unifiedSyncManager.js';

/**
 * Generate UUID for records
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Create composite offline operation
 */
export const createOfflineOperation = async (opType, stores, payload, priority = 'normal') => {
  const operation = {
    id: generateUUID(),
    opType,
    stores,
    payload,
    priority,
    status: 'pending',
    createdAt: new Date().toISOString(),
    retryCount: 0
  };

  await dbOperations.insert('offline_operations', operation);
  return operation;
};

/**
 * Create Estimate with Items (Atomic Transaction)
 * Per spec: estimates.put() + estimate_items.bulkPut() in single transaction
 */
export const createEstimateWithItems = async (estimate, items) => {
  try {
    const estimateId = estimate.id || generateUUID();
    const estimateRecord = {
      ...estimate,
      id: estimateId,
      createdAt: estimate.createdAt || new Date().toISOString(),
      syncStatus: 'pending'
    };

    const itemRecords = items.map(item => ({
      ...item,
      id: item.id || generateUUID(),
      estimateId,
      createdAt: new Date().toISOString()
    }));

    // Validate totals
    const calculatedTotal = itemRecords.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tolerance = 0.01;
    if (Math.abs(calculatedTotal - (estimate.total || 0)) > tolerance) {
      throw new Error('Estimate total does not match sum of items');
    }

    // Execute in transaction
    await dbTransaction(['estimates', 'estimate_items', 'offline_operations'], 'readwrite', (tx) => {
      const estimateStore = tx.objectStore('estimates');
      const itemsStore = tx.objectStore('estimate_items');
      const opsStore = tx.objectStore('offline_operations');

      estimateStore.put(estimateRecord);
      itemRecords.forEach(item => itemsStore.put(item));

      // Add offline operation for sync
      const op = {
        id: generateUUID(),
        opType: 'composite',
        stores: ['estimates', 'estimate_items'],
        payload: { estimate: estimateRecord, items: itemRecords },
        priority: 'normal',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      opsStore.put(op);
    });

    return { estimate: estimateRecord, items: itemRecords };
  } catch (error) {
    console.error('Failed to create estimate:', error);
    throw error;
  }
};

/**
 * Convert Estimate to Job (Atomic Transaction)
 * Per spec: update estimates.status + create jobs in same transaction
 */
export const convertEstimateToJob = async (estimateId, jobData) => {
  try {
    const estimate = await dbOperations.getById('estimates', estimateId);
    if (!estimate) throw new Error('Estimate not found');

    const jobId = generateUUID();
    const job = {
      ...jobData,
      id: jobId,
      estimateId,
      status: 'Inspection',
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    const updatedEstimate = { ...estimate, status: 'Converted', jobId, updatedAt: new Date().toISOString() };

    await dbTransaction(['estimates', 'jobs', 'offline_operations'], 'readwrite', (tx) => {
      const estimateStore = tx.objectStore('estimates');
      const jobsStore = tx.objectStore('jobs');
      const opsStore = tx.objectStore('offline_operations');

      // Update estimate status
      estimateStore.put(updatedEstimate);

      // Create job
      jobsStore.put(job);

      // Add offline operation
      const op = {
        id: generateUUID(),
        opType: 'composite',
        stores: ['estimates', 'jobs'],
        payload: { estimate: { ...estimate, status: 'Converted' }, job },
        priority: 'normal',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      opsStore.put(op);
    });

    return job;
  } catch (error) {
    console.error('Failed to convert estimate to job:', error);
    throw error;
  }
};

/**
 * Create Jobsheet with Items (Atomic Transaction)
 */
export const createJobsheetWithItems = async (jobsheet, items) => {
  try {
    const jobsheetId = jobsheet.id || generateUUID();
    const jobsheetRecord = {
      ...jobsheet,
      id: jobsheetId,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    const itemRecords = items.map(item => ({
      ...item,
      id: item.id || generateUUID(),
      jobsheetId,
      isIssued: item.isIssued || false,
      createdAt: new Date().toISOString()
    }));

    await dbTransaction(['jobsheets', 'jobsheet_items', 'offline_operations'], 'readwrite', (tx) => {
      const jobsheetStore = tx.objectStore('jobsheets');
      const itemsStore = tx.objectStore('jobsheet_items');
      const opsStore = tx.objectStore('offline_operations');

      jobsheetStore.put(jobsheetRecord);
      itemRecords.forEach(item => itemsStore.put(item));

      const op = {
        id: generateUUID(),
        opType: 'composite',
        stores: ['jobsheets', 'jobsheet_items'],
        payload: { jobsheet: jobsheetRecord, items: itemRecords },
        priority: 'normal',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      opsStore.put(op);
    });

    return { jobsheet: jobsheetRecord, items: itemRecords };
  } catch (error) {
    console.error('Failed to create jobsheet:', error);
    throw error;
  }
};

/**
 * Issue Challan (Atomic Transaction with Stock Updates)
 * Per spec: challans.put() + challan_items.bulkPut() + stock_transactions.bulkPut() + update jobsheet_items.isIssued
 */
export const issueChallan = async (challan, challanItems, jobsheetItemIds) => {
  try {
    const challanId = challan.id || generateUUID();
    const challanRecord = {
      ...challan,
      id: challanId,
      date: challan.date || new Date().toISOString(),
      syncStatus: 'pending'
    };

    const challanItemRecords = challanItems.map(item => ({
      ...item,
      id: item.id || generateUUID(),
      challanId,
      createdAt: new Date().toISOString()
    }));

    const stockTransactions = challanItemRecords.map(item => ({
      id: generateUUID(),
      referenceType: 'challan',
      referenceId: challanId,
      productId: item.productId,
      qty: -Math.abs(item.qty), // Negative for stock reduction
      createdAt: new Date().toISOString()
    }));

    await dbTransaction(
      ['challans', 'challan_items', 'stock_transactions', 'jobsheet_items', 'offline_operations'],
      'readwrite',
      (tx) => {
        const challanStore = tx.objectStore('challans');
        const challanItemsStore = tx.objectStore('challan_items');
        const stockStore = tx.objectStore('stock_transactions');
        const jobsheetItemsStore = tx.objectStore('jobsheet_items');
        const opsStore = tx.objectStore('offline_operations');

        // Create challan and items
        challanStore.put(challanRecord);
        challanItemRecords.forEach(item => challanItemsStore.put(item));

        // Create stock transactions
        stockTransactions.forEach(st => stockStore.put(st));

        // Mark jobsheet items as issued
        jobsheetItemIds.forEach(itemId => {
          const request = jobsheetItemsStore.get(itemId);
          request.onsuccess = () => {
            if (request.result) {
              jobsheetItemsStore.put({ ...request.result, isIssued: true, updatedAt: new Date().toISOString() });
            }
          };
        });

        // Add offline operation
        const op = {
          id: generateUUID(),
          opType: 'composite',
          stores: ['challans', 'challan_items', 'stock_transactions', 'jobsheet_items'],
          payload: { challan: challanRecord, challanItems: challanItemRecords, stockTransactions, jobsheetItemIds },
          priority: 'high',
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        opsStore.put(op);
      }
    );

    return { challan: challanRecord, items: challanItemRecords, stockTransactions };
  } catch (error) {
    console.error('Failed to issue challan:', error);
    throw error;
  }
};

/**
 * Create Invoice with Journal Entries (Atomic Transaction)
 * Per spec: invoices.put() + invoice_items.bulkPut() + journal_entries.put() + journal_lines.bulkPut()
 */
export const createInvoiceWithJournal = async (invoice, invoiceItems, journalEntry, journalLines) => {
  try {
    const invoiceId = invoice.id || generateUUID();
    const invoiceRecord = {
      ...invoice,
      id: invoiceId,
      date: invoice.date || new Date().toISOString(),
      syncStatus: 'pending'
    };

    const itemRecords = invoiceItems.map(item => ({
      ...item,
      id: item.id || generateUUID(),
      invoiceId,
      createdAt: new Date().toISOString()
    }));

    const journalId = journalEntry.id || generateUUID();
    const journalRecord = {
      ...journalEntry,
      id: journalId,
      sourceType: 'invoice',
      sourceId: invoiceId,
      date: invoice.date,
      createdAt: new Date().toISOString()
    };

    const lineRecords = journalLines.map(line => ({
      ...line,
      id: line.id || generateUUID(),
      journalEntryId: journalId,
      createdAt: new Date().toISOString()
    }));

    // Validate journal balancing
    const totalDebits = lineRecords.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredits = lineRecords.reduce((sum, line) => sum + (line.credit || 0), 0);
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Journal entries are not balanced');
    }

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
        journalStore.put(journalRecord);
        lineRecords.forEach(line => linesStore.put(line));

        const op = {
          id: generateUUID(),
          opType: 'composite',
          stores: ['invoices', 'invoice_items', 'journal_entries', 'journal_lines'],
          payload: { invoice: invoiceRecord, items: itemRecords, journalEntry: journalRecord, journalLines: lineRecords },
          priority: 'high',
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        opsStore.put(op);
      }
    );

    return { invoice: invoiceRecord, items: itemRecords, journal: journalRecord, lines: lineRecords };
  } catch (error) {
    console.error('Failed to create invoice with journal:', error);
    throw error;
  }
};

/**
 * Calculate current stock for a product
 * Per spec: computed via sum of stock_transactions
 */
export const calculateCurrentStock = async (productId) => {
  try {
    const transactions = await dbOperations.getByIndex('stock_transactions', 'productId', productId);
    const totalStock = transactions.reduce((sum, tx) => sum + (tx.qty || 0), 0);
    return totalStock;
  } catch (error) {
    console.error('Failed to calculate stock:', error);
    return 0;
  }
};

/**
 * Get job with all related data
 */
export const getJobWithRelations = async (jobId) => {
  try {
    const job = await dbOperations.getById('jobs', jobId);
    if (!job) return null;

    const [inspections, jobsheets, challans, invoices, customer] = await Promise.all([
      dbOperations.getByIndex('inspections', 'jobId', jobId),
      dbOperations.getByIndex('jobsheets', 'jobId', jobId),
      dbOperations.getByIndex('challans', 'jobId', jobId),
      dbOperations.getByIndex('invoices', 'jobId', jobId),
      job.customerId ? dbOperations.getById('customers', job.customerId) : null
    ]);

    return {
      job,
      inspections,
      jobsheets,
      challans,
      invoices,
      customer
    };
  } catch (error) {
    console.error('Failed to get job with relations:', error);
    throw error;
  }
};

/**
 * Validate stock availability before issuing challan
 */
export const validateStockAvailability = async (productId, requiredQty) => {
  try {
    const currentStock = await calculateCurrentStock(productId);
    return {
      available: currentStock >= requiredQty,
      currentStock,
      requiredQty,
      shortfall: Math.max(0, requiredQty - currentStock)
    };
  } catch (error) {
    console.error('Failed to validate stock:', error);
    return { available: false, error: error.message };
  }
};
