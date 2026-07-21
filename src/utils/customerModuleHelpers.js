/**
 * Customer Module Helper Functions
 * Implements customer-related operations per CUSTOMER_MODULE_RELATION.md
 */

import cachedDb from '@/utils/cachedDbOperations';
import { dbTransaction, bulkPut } from '@/lib/db';
const dbOperations = cachedDb;
import unifiedDataFlowManager from './unifiedDataFlowManager.js';
import unifiedSyncManager from './unifiedSyncManager.js';
import { generateUUID } from './jobModuleHelpers';
import { postSalesInvoice, receivePayment } from './accountModuleHelpers';
import pathConfig from './pathConfig.js';

/**
 * UNIFIED BACKEND: Store name standardization
 * Always use 'customers' (plural) for consistency across all operations
 */
const CUSTOMER_STORE = 'customers';
const CUSTOMER_LEDGER_STORE = 'customer_ledger_entries';
const CUSTOMER_JOBS_STORE = 'customer_jobs';

/**
 * Create or Update Customer - UNIFIED BACKEND
 */
export const saveCustomer = async (customerData, isUpdate = false) => {
  try {
    console.log('🔄 [CUSTOMER-UNIFIED] Saving customer:', { isUpdate, id: customerData.id });
    
    // Use unified data flow manager for consistent operations
    const operation = isUpdate ? 'update' : 'create';
    const result = await unifiedDataFlowManager[operation](CUSTOMER_STORE, customerData, {
      user: { id: 'system' },
      page: 'customer'
    });

    if (result.success) {
      console.log('✅ [CUSTOMER-UNIFIED] Customer saved successfully');
      
      // Trigger sync for real-time updates
      await unifiedSyncManager.fullSyncStore(CUSTOMER_STORE);
      
      return {
        success: true,
        customer: result.data,
        message: `Customer ${isUpdate ? 'updated' : 'created'} successfully`
      };
    } else {
      console.error('❌ [CUSTOMER-UNIFIED] Failed to save customer:', result.error);
      
      // Fallback to old method if unified fails
      const customerId = customerData.id || generateUUID();
      const customer = {
        ...customerData,
        id: customerId,
        createdAt: customerData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
        type: customerData.type || 'customer'
      };

      if (isUpdate) {
        await dbOperations.update(CUSTOMER_STORE, customerId, customer);
      } else {
        // Check for duplicates
        const existing = await checkDuplicateCustomer(customer.email, customer.phone);
        if (existing.length > 0) {
          return {
            success: false,
            duplicates: existing,
            message: 'Duplicate customer found with same email or phone'
          };
        }

        await dbTransaction([CUSTOMER_STORE, 'offline_operations'], 'readwrite', (tx) => {
          const customerStore = tx.objectStore(CUSTOMER_STORE);
          const opsStore = tx.objectStore('offline_operations');

          customerStore.put(customer);

          const op = {
            id: generateUUID(),
            opId: `op-customer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            opType: 'create',
            stores: [CUSTOMER_STORE],
            payload: { customer },
            priority: 'normal',
            status: 'pending',
            createdAt: new Date().toISOString()
          };
          opsStore.put(op);
        });
      }

      return { success: true, customer };
    }
  } catch (error) {
    console.error('Failed to save customer:', error);
    throw error;
  }
};

/**
 * Check for duplicate customers by email or phone
 */
export const checkDuplicateCustomer = async (email, phone) => {
  try {
    const duplicates = [];
    
    if (email) {
      const byEmail = await dbOperations.getByIndex(CUSTOMER_STORE, 'email', email);
      duplicates.push(...byEmail);
    }
    
    if (phone) {
      const byPhone = await dbOperations.getByIndex(CUSTOMER_STORE, 'phone', phone);
      duplicates.push(...byPhone);
    }

    // Remove duplicates based on id
    const unique = [];
    const ids = new Set();
    duplicates.forEach(cust => {
      if (!ids.has(cust.id)) {
        ids.add(cust.id);
        unique.push(cust);
      }
    });

    return unique;
  } catch (error) {
    console.error('Failed to check duplicates:', error);
    return [];
  }
};

/**
 * Convert Lead to Customer
 */
export const convertLeadToCustomer = async (leadId, additionalData = {}) => {
  try {
    const lead = await dbOperations.getById(CUSTOMER_STORE, leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    if (lead.type !== 'lead') {
      throw new Error('Record is not a lead');
    }

    const customer = {
      ...lead,
      ...additionalData,
      type: 'customer',
      convertedAt: new Date().toISOString(),
      convertedFrom: leadId,
      updatedAt: new Date().toISOString()
    };

    await dbTransaction([CUSTOMER_STORE, 'offline_operations'], 'readwrite', (tx) => {
      const customerStore = tx.objectStore(CUSTOMER_STORE);
      const opsStore = tx.objectStore('offline_operations');

      customerStore.put(customer);

      const op = {
        id: generateUUID(),
        opId: `op-convert-lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        opType: 'update',
        stores: [CUSTOMER_STORE],
        payload: { customer, action: 'convert_lead' },
        priority: 'normal',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      opsStore.put(op);
    });

    return customer;
  } catch (error) {
    console.error('Failed to convert lead:', error);
    throw error;
  }
};

/**
 * Get Customer with Related Data
 */
export const getCustomerWithRelations = async (customerId) => {
  try {
    const customer = await dbOperations.getById(CUSTOMER_STORE, customerId);
    if (!customer) return null;

    const [jobs, estimates, invoices, payments, documents] = await Promise.all([
      dbOperations.getByIndex('jobs', 'customerId', customerId),
      dbOperations.getByIndex('estimates', 'customerId', customerId),
      dbOperations.getByIndex('invoices', 'customerId', customerId),
      dbOperations.getByIndex('payments', 'customerId', customerId),
      getCustomerDocuments(customerId)
    ]);

    return {
      customer,
      jobs,
      estimates,
      invoices,
      payments,
      documents
    };
  } catch (error) {
    console.error('Failed to get customer with relations:', error);
    throw error;
  }
};

/**
 * Get Customer Ledger
 */
export const getCustomerLedger = async (customerId, fromDate, toDate) => {
  try {
    const customer = await dbOperations.getById(CUSTOMER_STORE, customerId);
    if (!customer) throw new Error('Customer not found');

    // Get all invoices
    let invoices = await dbOperations.getByIndex('invoices', 'customerId', customerId);
    
    // Filter by date if provided
    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : new Date('1900-01-01');
      const to = toDate ? new Date(toDate) : new Date('2100-12-31');
      
      invoices = invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= from && invDate <= to;
      });
    }

    // Get all payments
    let payments = await dbOperations.getByIndex('payments', 'customerId', customerId);
    
    // Filter payments by date
    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : new Date('1900-01-01');
      const to = toDate ? new Date(toDate) : new Date('2100-12-31');
      
      payments = payments.filter(pay => {
        const payDate = new Date(pay.date);
        return payDate >= from && payDate <= to;
      });
    }

    // Combine and sort ledger entries
    const ledgerEntries = [];
    
    invoices.forEach(inv => {
      ledgerEntries.push({
        date: inv.date,
        type: 'invoice',
        reference: inv.invoiceNo || inv.id,
        description: inv.description || 'Sales Invoice',
        debit: inv.total || inv.grandTotal || 0,
        credit: 0,
        sourceId: inv.id,
        syncStatus: inv.syncStatus
      });
    });

    payments.forEach(pay => {
      ledgerEntries.push({
        date: pay.date,
        type: 'payment',
        reference: pay.receiptNo || pay.id,
        description: pay.description || 'Payment Received',
        debit: 0,
        credit: pay.amount,
        sourceId: pay.id,
        syncStatus: pay.syncStatus
      });
    });

    // Sort by date
    ledgerEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate running balance
    let balance = customer.openingBalance || 0;
    const entriesWithBalance = ledgerEntries.map(entry => {
      balance += entry.debit - entry.credit;
      return {
        ...entry,
        balance
      };
    });

    return {
      customerId,
      customerName: customer.name,
      openingBalance: customer.openingBalance || 0,
      entries: entriesWithBalance,
      closingBalance: balance,
      totalDebits: entriesWithBalance.reduce((sum, e) => sum + e.debit, 0),
      totalCredits: entriesWithBalance.reduce((sum, e) => sum + e.credit, 0),
      outstandingAmount: balance
    };
  } catch (error) {
    console.error('Failed to get customer ledger:', error);
    throw error;
  }
};

/**
 * Create Invoice from Customer
 */
export const createInvoiceFromCustomer = async (customerId, invoiceData, invoiceItems) => {
  try {
    const customer = await dbOperations.getById(CUSTOMER_STORE, customerId);
    if (!customer) throw new Error('Customer not found');

    // Validate customer has billing details if GST invoice
    if (invoiceData.gstRate && (!customer.gstin || !customer.billingAddress)) {
      console.warn('Customer missing GSTIN or billing address for GST invoice');
    }

    // Use account module helper for invoice posting
    const result = await postSalesInvoice(invoiceData, invoiceItems, customerId);
    
    return result;
  } catch (error) {
    console.error('Failed to create invoice from customer:', error);
    throw error;
  }
};

/**
 * Record Payment from Customer
 */
export const recordCustomerPayment = async (customerId, invoiceId, paymentData) => {
  try {
    const invoice = await dbOperations.getById('invoices', invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    
    if (invoice.customerId !== customerId) {
      throw new Error('Invoice does not belong to this customer');
    }

    const outstandingAmount = (invoice.total || invoice.grandTotal || 0) - (invoice.paidAmount || 0);
    
    // Warn if payment exceeds outstanding
    if (paymentData.amount > outstandingAmount) {
      console.warn(`Payment amount ${paymentData.amount} exceeds outstanding ${outstandingAmount}`);
    }

    const paymentRecord = {
      ...paymentData,
      customerId,
      invoiceId
    };

    // Use account module helper for payment receipt
    const result = await receivePayment(paymentRecord, invoiceId);
    
    return result;
  } catch (error) {
    console.error('Failed to record customer payment:', error);
    throw error;
  }
};

/**
 * Upload Customer Document/Attachment
 */
export const uploadCustomerDocument = async (customerId, fileData, metadata) => {
  try {
    // Save file via Electron IPC
    let filePath = null;
    if (window.electron) {
      const result = await window.electron.invoke('fs.writeAtomic', {
        path: `${await pathConfig.getModulePath('customer')}/${customerId}/${fileData.name}`,
        dataBuffer: fileData.buffer
      });
      
      if (result.ok) {
        filePath = result.path;
      } else {
        throw new Error('Failed to save file: ' + result.error);
      }
    }

    const documentId = generateUUID();
    const document = {
      id: documentId,
      customerId,
      fileName: fileData.name,
      filePath,
      fileSize: fileData.size,
      fileType: fileData.type,
      ...metadata,
      uploadedAt: new Date().toISOString()
    };

    await dbTransaction(['documents', CUSTOMER_STORE, 'offline_operations'], 'readwrite', (tx) => {
      const docStore = tx.objectStore('documents');
      const customerStore = tx.objectStore(CUSTOMER_STORE);
      const opsStore = tx.objectStore('offline_operations');

      docStore.put(document);

      // Update customer documents array
      const customerRequest = customerStore.get(customerId);
      customerRequest.onsuccess = () => {
        if (customerRequest.result) {
          const customer = customerRequest.result;
          const documents = customer.documents || [];
          documents.push(documentId);
          customerStore.put({
            ...customer,
            documents,
            updatedAt: new Date().toISOString()
          });
        }
      };

      const op = {
        id: generateUUID(),
        opId: `op-document-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        opType: 'create',
        stores: ['documents', CUSTOMER_STORE],
        payload: { document },
        priority: 'low',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      opsStore.put(op);
    });

    return document;
  } catch (error) {
    console.error('Failed to upload customer document:', error);
    throw error;
  }
};

/**
 * Get Customer Documents
 */
export const getCustomerDocuments = async (customerId) => {
  try {
    const customer = await dbOperations.getById(CUSTOMER_STORE, customerId);
    if (!customer || !customer.documents || customer.documents.length === 0) {
      return [];
    }

    const documents = await Promise.all(
      customer.documents.map(docId => dbOperations.getById('documents', docId))
    );

    return documents.filter(doc => doc !== null);
  } catch (error) {
    console.error('Failed to get customer documents:', error);
    return [];
  }
};

/**
 * Export Customer Data
 */
export const exportCustomerData = async (customerId) => {
  try {
    if (!window.electron) {
      throw new Error('Electron IPC not available');
    }

    const data = await getCustomerWithRelations(customerId);
    const ledger = await getCustomerLedger(customerId);

    const exportData = {
      ...data,
      ledger,
      exportedAt: new Date().toISOString()
    };

    const result = await window.electron.invoke('backup.export', {
      stores: [CUSTOMER_STORE, 'invoices', 'payments', 'jobs', 'estimates'],
      filter: { customerId }
    });

    return result;
  } catch (error) {
    console.error('Failed to export customer data:', error);
    throw error;
  }
};

/**
 * Import Customers from File
 */
export const importCustomers = async (customersData) => {
  try {
    const results = {
      success: [],
      duplicates: [],
      errors: []
    };

    for (const customerData of customersData) {
      try {
        const result = await saveCustomer(customerData, false);
        
        if (result.success) {
          results.success.push(result.customer);
        } else if (result.duplicates) {
          results.duplicates.push({
            data: customerData,
            duplicates: result.duplicates
          });
        }
      } catch (error) {
        results.errors.push({
          data: customerData,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to import customers:', error);
    throw error;
  }
};

/**
 * Get Customer Summary Statistics
 */
export const getCustomerSummary = async (customerId) => {
  try {
    const [customer, jobs, invoices, payments] = await Promise.all([
      dbOperations.getById(CUSTOMER_STORE, customerId),
      dbOperations.getByIndex('jobs', 'customerId', customerId),
      dbOperations.getByIndex('invoices', 'customerId', customerId),
      dbOperations.getByIndex('payments', 'customerId', customerId)
    ]);

    if (!customer) throw new Error('Customer not found');

    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || inv.grandTotal || 0), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const outstanding = totalInvoiced - totalPaid;

    return {
      customerId,
      customerName: customer.name,
      totalJobs: jobs.length,
      completedJobs: jobs.filter(j => j.status === 'Completed').length,
      totalInvoices: invoices.length,
      totalInvoiced,
      totalPaid,
      outstanding,
      lastInvoiceDate: invoices.length > 0 
        ? new Date(Math.max(...invoices.map(i => new Date(i.date)))).toISOString()
        : null,
      lastPaymentDate: payments.length > 0
        ? new Date(Math.max(...payments.map(p => new Date(p.date)))).toISOString()
        : null
    };
  } catch (error) {
    console.error('Failed to get customer summary:', error);
    throw error;
  }
};

/**
 * Search Customers
 */
export const searchCustomers = async (searchTerm, filters = {}) => {
  try {
    let customers = await dbOperations.getAll(CUSTOMER_STORE);

    // Filter by type if specified
    if (filters.type) {
      customers = customers.filter(c => c.type === filters.type);
    }

    // Search by term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      customers = customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.company && c.company.toLowerCase().includes(term))
      );
    }

    return customers;
  } catch (error) {
    console.error('Failed to search customers:', error);
    return [];
  }
};
