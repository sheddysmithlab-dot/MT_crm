/**
 * Vendor Module Helper Functions
 * Implements vendor (service provider) operations per VENDOR + LABOUR + SUPPLIER MODULE RELATION.md
 * 
 * Vendor = service provider (painting, welding, mechanical services, installation)
 * Operations: Service orders, vendor invoices, payments for services
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
 * Create Service Order for Vendor
 */
export const createServiceOrder = async (orderData, serviceItems = []) => {
  try {
    if (!orderData.vendorId) {
      throw new Error('Vendor ID is required');
    }

    const vendor = await dbOperations.getById('vendors', orderData.vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const orderId = generateUUID();
    const order = {
      id: orderId,
      vendorId: orderData.vendorId,
      vendorName: vendor.name,
      jobId: orderData.jobId || null,
      orderNo: orderData.orderNo || `SO-${Date.now()}`,
      date: orderData.date || new Date().toISOString().split('T')[0],
      serviceType: orderData.serviceType || vendor.serviceType || 'general',
      description: orderData.description || '',
      estimatedAmount: orderData.estimatedAmount || 0,
      status: 'pending',
      startDate: orderData.startDate || null,
      endDate: orderData.endDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    await dbTransaction(['vendor_orders', 'offline_operations'], 'readwrite', (tx) => {
      const ordersStore = tx.objectStore('vendor_orders');
      const opsStore = tx.objectStore('offline_operations');

      ordersStore.put(order);

      opsStore.put({
        id: generateUUID(),
        opId: `op-vendor-order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        opType: 'vendor_order_create',
        stores: ['vendor_orders'],
        payload: { order },
        priority: 'normal',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });

    return order;
  } catch (error) {
    console.error('Failed to create service order:', error);
    throw error;
  }
};

/**
 * Post Vendor Invoice for Services
 * Creates vendor invoice, journal entries (Expense debit, AP credit)
 */
export const postVendorInvoice = async (invoiceData, serviceItems = []) => {
  try {
    if (!invoiceData.vendorId) {
      throw new Error('Vendor ID is required');
    }

    const vendor = await dbOperations.getById('vendors', invoiceData.vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Calculate totals
    let subtotal = 0;
    const validatedItems = serviceItems.map(item => {
      const amount = item.quantity * item.rate;
      subtotal += amount;
      return {
        id: generateUUID(),
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount,
        gstRate: item.gstRate || invoiceData.gstRate || 0,
        ...item
      };
    });

    const gstAmount = (subtotal * (invoiceData.gstRate || 0)) / 100;
    const total = subtotal + gstAmount;

    const invoiceId = generateUUID();
    const opId = `op-vendor-invoice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const invoice = {
      id: invoiceId,
      vendorId: invoiceData.vendorId,
      vendorName: vendor.name,
      jobId: invoiceData.jobId || null,
      serviceOrderId: invoiceData.serviceOrderId || null,
      invoiceNo: invoiceData.invoiceNo || `VINV-${Date.now()}`,
      date: invoiceData.date || new Date().toISOString().split('T')[0],
      serviceType: invoiceData.serviceType || vendor.serviceType || 'general',
      description: invoiceData.description || 'Service Invoice',
      subtotal,
      gstRate: invoiceData.gstRate || 0,
      gstAmount,
      total,
      paidAmount: 0,
      status: 'pending',
      type: 'service',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
      opId
    };

    // Determine expense account (Job Cost if linked to job, else Service Expense)
    const expenseAccountId = invoice.jobId ? 'JOB_COST' : 'SERVICE_EXPENSE';
    const expenseAccountName = invoice.jobId ? 'Job Cost - Services' : 'Service Expense';

    // Journal entry
    const journalEntry = {
      id: generateUUID(),
      sourceType: 'vendor_invoice',
      sourceId: invoiceId,
      date: invoice.date,
      description: `Vendor service invoice: ${invoice.invoiceNo} - ${vendor.name}`,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    const journalLines = [
      // Debit: Service Expense or Job Cost
      {
        id: generateUUID(),
        journalEntryId: journalEntry.id,
        accountId: expenseAccountId,
        accountName: expenseAccountName,
        debit: total,
        credit: 0,
        description: invoice.description
      },
      // Credit: Accounts Payable - Vendors
      {
        id: generateUUID(),
        journalEntryId: journalEntry.id,
        accountId: 'ACCOUNTS_PAYABLE_VENDORS',
        accountName: 'Accounts Payable - Vendors',
        debit: 0,
        credit: total,
        description: `AP: ${vendor.name}`
      }
    ];

    const validation = validateJournalBalance(journalLines);
    if (!validation.balanced) {
      throw new Error(`Journal entry not balanced: ${validation.message}`);
    }

    // Update job cost if linked
    let updatedJob = null;
    if (invoice.jobId) {
      const job = await dbOperations.getById('jobs', invoice.jobId);
      if (job) {
        updatedJob = {
          ...job,
          vendorCost: (job.vendorCost || 0) + total,
          totalCost: (job.totalCost || 0) + total,
          updatedAt: new Date().toISOString()
        };
      }
    }

    await dbTransaction([
      'vendor_invoices',
      'vendor_invoice_items',
      'journal_entries',
      'journal_lines',
      'jobs',
      'offline_operations'
    ], 'readwrite', (tx) => {
      const invoicesStore = tx.objectStore('vendor_invoices');
      const itemsStore = tx.objectStore('vendor_invoice_items');
      const journalStore = tx.objectStore('journal_entries');
      const journalLinesStore = tx.objectStore('journal_lines');
      const jobsStore = tx.objectStore('jobs');
      const opsStore = tx.objectStore('offline_operations');

      invoicesStore.put(invoice);

      validatedItems.forEach(item => {
        itemsStore.put({
          ...item,
          vendorInvoiceId: invoiceId,
          createdAt: new Date().toISOString(),
          syncStatus: 'pending'
        });
      });

      journalStore.put(journalEntry);
      journalLines.forEach(line => journalLinesStore.put(line));

      if (updatedJob) {
        jobsStore.put(updatedJob);
      }

      opsStore.put({
        id: generateUUID(),
        opId,
        opType: 'vendor_invoice_post',
        stores: ['vendor_invoices', 'vendor_invoice_items', 'journal_entries', 'journal_lines', 'jobs'],
        payload: {
          invoice,
          items: validatedItems,
          journalEntry,
          journalLines,
          job: updatedJob
        },
        priority: 'high',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });

    return {
      success: true,
      invoice,
      items: validatedItems,
      journalEntry,
      journalLines,
      updatedJob
    };

  } catch (error) {
    console.error('Failed to post vendor invoice:', error);
    throw error;
  }
};

/**
 * Record Payment to Vendor
 */
export const recordVendorPayment = async (vendorId, invoiceId, paymentData) => {
  try {
    const vendor = await dbOperations.getById('vendors', vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    let invoice = null;
    if (invoiceId) {
      invoice = await dbOperations.getById('vendor_invoices', invoiceId);
      if (!invoice) {
        throw new Error('Vendor invoice not found');
      }
      if (invoice.vendorId !== vendorId) {
        throw new Error('Invoice does not belong to this vendor');
      }

      const outstanding = invoice.total - (invoice.paidAmount || 0);
      if (paymentData.amount > outstanding + 0.01) {
        console.warn(`Payment ${paymentData.amount} exceeds outstanding ${outstanding}`);
      }
    }

    const paymentId = generateUUID();
    const payment = {
      id: paymentId,
      payeeId: vendorId,
      payeeType: 'vendor',
      payeeName: vendor.name,
      invoiceId,
      amount: paymentData.amount,
      date: paymentData.date || new Date().toISOString().split('T')[0],
      paymentMode: paymentData.paymentMode || 'Cash',
      referenceNo: paymentData.referenceNo || '',
      bankDetails: paymentData.bankDetails || '',
      description: paymentData.description || `Payment to ${vendor.name}`,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

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
      // Debit: Accounts Payable - Vendors
      {
        id: generateUUID(),
        journalEntryId: journalEntry.id,
        accountId: 'ACCOUNTS_PAYABLE_VENDORS',
        accountName: 'Accounts Payable - Vendors',
        debit: payment.amount,
        credit: 0,
        description: `Payment to ${vendor.name}`
      },
      // Credit: Bank/Cash
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

    await dbTransaction(['payments', 'vendor_invoices', 'journal_entries', 'journal_lines', 'offline_operations'], 'readwrite', (tx) => {
      const paymentsStore = tx.objectStore('payments');
      const invoicesStore = tx.objectStore('vendor_invoices');
      const journalStore = tx.objectStore('journal_entries');
      const journalLinesStore = tx.objectStore('journal_lines');
      const opsStore = tx.objectStore('offline_operations');

      paymentsStore.put(payment);

      if (invoice) {
        const updatedInvoice = {
          ...invoice,
          paidAmount: (invoice.paidAmount || 0) + payment.amount,
          status: (invoice.paidAmount || 0) + payment.amount >= invoice.total ? 'paid' : 'partial',
          updatedAt: new Date().toISOString()
        };
        invoicesStore.put(updatedInvoice);
      }

      journalStore.put(journalEntry);
      journalLines.forEach(line => journalLinesStore.put(line));

      opsStore.put({
        id: generateUUID(),
        opId: `op-vendor-payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        opType: 'vendor_payment',
        stores: ['payments', 'vendor_invoices', 'journal_entries', 'journal_lines'],
        payload: { payment, journalEntry, journalLines },
        priority: 'high',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });

    return { payment, journalEntry, journalLines };
  } catch (error) {
    console.error('Failed to record vendor payment:', error);
    throw error;
  }
};

/**
 * Get Vendor Ledger
 */
export const getVendorLedger = async (vendorId, fromDate, toDate) => {
  try {
    const vendor = await dbOperations.getById('vendors', vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    let invoices = await dbOperations.getByIndex('vendor_invoices', 'vendorId', vendorId);
    let payments = await dbOperations.getByIndex('payments', 'payeeId', vendorId);

    // Filter by date
    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : new Date('1900-01-01');
      const to = toDate ? new Date(toDate) : new Date('2100-12-31');

      invoices = invoices.filter(inv => {
        const date = new Date(inv.date);
        return date >= from && date <= to;
      });

      payments = payments.filter(pay => {
        const date = new Date(pay.date);
        return date >= from && date <= to;
      });
    }

    const entries = [];

    invoices.forEach(inv => {
      entries.push({
        date: inv.date,
        type: 'invoice',
        reference: inv.invoiceNo,
        description: inv.description || 'Service Invoice',
        debit: 0,
        credit: inv.total,
        sourceId: inv.id,
        syncStatus: inv.syncStatus
      });
    });

    payments.forEach(pay => {
      entries.push({
        date: pay.date,
        type: 'payment',
        reference: pay.referenceNo || pay.id,
        description: pay.description,
        debit: pay.amount,
        credit: 0,
        sourceId: pay.id,
        syncStatus: pay.syncStatus
      });
    });

    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    let balance = vendor.opening_balance || 0;
    const entriesWithBalance = entries.map(entry => {
      balance += entry.credit - entry.debit;
      return { ...entry, balance };
    });

    return {
      vendorId,
      vendorName: vendor.name,
      openingBalance: vendor.opening_balance || 0,
      entries: entriesWithBalance,
      closingBalance: balance,
      totalInvoices: entriesWithBalance.reduce((sum, e) => sum + e.credit, 0),
      totalPayments: entriesWithBalance.reduce((sum, e) => sum + e.debit, 0),
      outstandingAmount: balance
    };
  } catch (error) {
    console.error('Failed to get vendor ledger:', error);
    throw error;
  }
};

/**
 * Get Vendor Summary
 */
export const getVendorSummary = async (vendorId) => {
  try {
    const [vendor, invoices, payments, serviceOrders] = await Promise.all([
      dbOperations.getById('vendors', vendorId),
      dbOperations.getByIndex('vendor_invoices', 'vendorId', vendorId),
      dbOperations.getByIndex('payments', 'payeeId', vendorId),
      dbOperations.getByIndex('vendor_orders', 'vendorId', vendorId)
    ]);

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);

    return {
      vendorId,
      vendorName: vendor.name,
      serviceType: vendor.serviceType,
      totalServiceOrders: serviceOrders.length,
      totalInvoices: invoices.length,
      totalInvoiced,
      totalPaid,
      outstanding: totalInvoiced - totalPaid,
      lastInvoiceDate: invoices.length > 0
        ? new Date(Math.max(...invoices.map(i => new Date(i.date)))).toISOString()
        : null,
      lastPaymentDate: payments.length > 0
        ? new Date(Math.max(...payments.map(p => new Date(p.date)))).toISOString()
        : null
    };
  } catch (error) {
    console.error('Failed to get vendor summary:', error);
    throw error;
  }
};

/**
 * Link Vendor Invoice to Job
 */
export const linkVendorInvoiceToJob = async (invoiceId, jobId) => {
  try {
    const invoice = await dbOperations.getById('vendor_invoices', invoiceId);
    if (!invoice) {
      throw new Error('Vendor invoice not found');
    }

    const job = await dbOperations.getById('jobs', jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const updatedInvoice = {
      ...invoice,
      jobId,
      updatedAt: new Date().toISOString()
    };

    const updatedJob = {
      ...job,
      vendorCost: (job.vendorCost || 0) + invoice.total,
      totalCost: (job.totalCost || 0) + invoice.total,
      updatedAt: new Date().toISOString()
    };

    await dbTransaction(['vendor_invoices', 'jobs'], 'readwrite', (tx) => {
      const invoicesStore = tx.objectStore('vendor_invoices');
      const jobsStore = tx.objectStore('jobs');

      invoicesStore.put(updatedInvoice);
      jobsStore.put(updatedJob);
    });

    return { invoice: updatedInvoice, job: updatedJob };
  } catch (error) {
    console.error('Failed to link vendor invoice to job:', error);
    throw error;
  }
};

/**
 * Upload Vendor Document (Invoice, Contract, etc.)
 */
export const uploadVendorDocument = async (vendorId, fileData, metadata) => {
  try {
    let filePath = null;
    if (window.electron) {
      const result = await window.electron.invoke('fs.writeAtomic', {
        path: `${await pathConfig.getModulePath('vendors')}/${vendorId}/${fileData.name}`,
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
      entityType: 'vendor',
      entityId: vendorId,
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
    console.error('Failed to upload vendor document:', error);
    throw error;
  }
};
