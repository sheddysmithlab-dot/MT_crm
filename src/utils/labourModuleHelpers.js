/**
 * Labour Module Helper Functions
 * Implements labour/technician operations per VENDOR + LABOUR + SUPPLIER MODULE RELATION.md
 * 
 * Labour = technicians/workers/contractors who perform labor on jobs
 * Operations: Jobsheet creation, labour cost posting, payroll/contractor payments
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
 * Create Jobsheet with Labour Hours and Items Used
 * This extends the existing jobsheet functionality from jobModuleHelpers
 */
export const createLabourJobsheet = async (jobId, technicianId, jobsheetData, items = []) => {
  try {
    const job = await dbOperations.getById('jobs', jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const technician = await dbOperations.getById('labour', technicianId);
    if (!technician) {
      throw new Error('Technician/Labour not found');
    }

    if (!jobsheetData.hours || jobsheetData.hours <= 0) {
      throw new Error('Labour hours must be greater than 0');
    }

    if (!technician.hourly_rate && !technician.daily_rate) {
      throw new Error('Technician rate not set');
    }

    // Calculate labour cost
    const rate = technician.hourly_rate || (technician.daily_rate / 8); // Assume 8-hour day
    const labourCost = jobsheetData.hours * rate;

    const jobsheetId = generateUUID();
    const jobsheet = {
      id: jobsheetId,
      jobId,
      technicianId,
      technicianName: technician.name,
      date: jobsheetData.date || new Date().toISOString().split('T')[0],
      hours: jobsheetData.hours,
      rate,
      labourCost,
      description: jobsheetData.description || '',
      workPerformed: jobsheetData.workPerformed || '',
      status: 'draft',
      isContractor: technician.is_contractor || false,
      vendorId: technician.vendor_id || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    // Validate and prepare jobsheet items
    const validatedItems = [];
    for (const item of items) {
      const product = await dbOperations.getById('products', item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      validatedItems.push({
        id: generateUUID(),
        jobsheetId,
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        rate: item.rate || product.rate || 0,
        amount: item.quantity * (item.rate || product.rate || 0),
        isIssued: false,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending'
      });
    }

    await dbTransaction(['jobsheets', 'jobsheet_items', 'offline_operations'], 'readwrite', (tx) => {
      const jobsheetsStore = tx.objectStore('jobsheets');
      const itemsStore = tx.objectStore('jobsheet_items');
      const opsStore = tx.objectStore('offline_operations');

      jobsheetsStore.put(jobsheet);

      validatedItems.forEach(item => itemsStore.put(item));

      opsStore.put({
        id: generateUUID(),
        opId: `op-jobsheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        opType: 'jobsheet_create',
        stores: ['jobsheets', 'jobsheet_items'],
        payload: { jobsheet, items: validatedItems },
        priority: 'normal',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });

    return { jobsheet, items: validatedItems };
  } catch (error) {
    console.error('Failed to create labour jobsheet:', error);
    throw error;
  }
};

/**
 * Approve Jobsheet and Post Labour Cost to Accounts
 * Creates journal entry: Debit Labour Expense, Credit Payroll Payable
 */
export const approveJobsheetWithLabourCost = async (jobsheetId, approvalData = {}) => {
  try {
    const jobsheet = await dbOperations.getById('jobsheets', jobsheetId);
    if (!jobsheet) {
      throw new Error('Jobsheet not found');
    }

    if (jobsheet.status === 'approved') {
      throw new Error('Jobsheet already approved');
    }

    const job = await dbOperations.getById('jobs', jobsheet.jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const technician = await dbOperations.getById('labour', jobsheet.technicianId);
    if (!technician) {
      throw new Error('Technician not found');
    }

    // Update jobsheet status
    const updatedJobsheet = {
      ...jobsheet,
      status: 'approved',
      approvedBy: approvalData.approvedBy || 'System',
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create journal entry for labour cost
    const journalEntry = {
      id: generateUUID(),
      sourceType: 'jobsheet',
      sourceId: jobsheetId,
      date: jobsheet.date,
      description: `Labour cost - ${technician.name} - Job ${job.jobNo || job.id}`,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    // Determine if this is contractor (vendor) or employee
    const isContractor = jobsheet.isContractor || technician.is_contractor;
    const payableAccountId = isContractor ? 'CONTRACTOR_PAYABLE' : 'PAYROLL_PAYABLE';
    const payableAccountName = isContractor ? 'Contractor Payable' : 'Payroll Payable';

    const journalLines = [
      // Debit: Labour Expense or Job Cost
      {
        id: generateUUID(),
        journalEntryId: journalEntry.id,
        accountId: 'LABOUR_EXPENSE',
        accountName: 'Labour Expense',
        debit: jobsheet.labourCost,
        credit: 0,
        description: `Labour: ${technician.name} - ${jobsheet.hours}hrs`
      },
      // Credit: Payroll/Contractor Payable
      {
        id: generateUUID(),
        journalEntryId: journalEntry.id,
        accountId: payableAccountId,
        accountName: payableAccountName,
        debit: 0,
        credit: jobsheet.labourCost,
        description: `Payable: ${technician.name}`
      }
    ];

    const validation = validateJournalBalance(journalLines);
    if (!validation.balanced) {
      throw new Error(`Journal entry not balanced: ${validation.message}`);
    }

    // Update job total cost
    const updatedJob = {
      ...job,
      labourCost: (job.labourCost || 0) + jobsheet.labourCost,
      totalCost: (job.totalCost || 0) + jobsheet.labourCost,
      updatedAt: new Date().toISOString()
    };

    await dbTransaction([
      'jobsheets',
      'jobs',
      'journal_entries',
      'journal_lines',
      'offline_operations'
    ], 'readwrite', (tx) => {
      const jobsheetsStore = tx.objectStore('jobsheets');
      const jobsStore = tx.objectStore('jobs');
      const journalStore = tx.objectStore('journal_entries');
      const journalLinesStore = tx.objectStore('journal_lines');
      const opsStore = tx.objectStore('offline_operations');

      jobsheetsStore.put(updatedJobsheet);
      jobsStore.put(updatedJob);
      journalStore.put(journalEntry);
      journalLines.forEach(line => journalLinesStore.put(line));

      opsStore.put({
        id: generateUUID(),
        opId: `op-jobsheet-approve-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        opType: 'jobsheet_approve',
        stores: ['jobsheets', 'jobs', 'journal_entries', 'journal_lines'],
        payload: {
          jobsheet: updatedJobsheet,
          job: updatedJob,
          journalEntry,
          journalLines
        },
        priority: 'high',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });

    return {
      success: true,
      jobsheet: updatedJobsheet,
      job: updatedJob,
      journalEntry,
      journalLines
    };

  } catch (error) {
    console.error('Failed to approve jobsheet:', error);
    throw error;
  }
};

/**
 * Issue Materials from Jobsheet (Stock Out)
 */
export const issueJobsheetMaterials = async (jobsheetId) => {
  try {
    const jobsheet = await dbOperations.getById('jobsheets', jobsheetId);
    if (!jobsheet) {
      throw new Error('Jobsheet not found');
    }

    const items = await dbOperations.getByIndex('jobsheet_items', 'jobsheetId', jobsheetId);
    if (!items || items.length === 0) {
      throw new Error('No jobsheet items found');
    }

    const stockTransactions = [];

    // Validate stock availability
    for (const item of items) {
      if (item.isIssued) {
        continue; // Skip already issued items
      }

      const product = await dbOperations.getById('products', item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const currentStock = product.currentStock || 0;
      if (currentStock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${currentStock}, Required: ${item.quantity}`);
      }

      stockTransactions.push({
        id: generateUUID(),
        productId: item.productId,
        quantity: -item.quantity, // Negative for stock out
        type: 'jobsheet_issue',
        referenceType: 'jobsheet',
        referenceId: jobsheetId,
        date: new Date().toISOString().split('T')[0],
        description: `Issued to jobsheet ${jobsheet.id}`,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending'
      });
    }

    await dbTransaction(['jobsheet_items', 'stock_transactions', 'products', 'offline_operations'], 'readwrite', (tx) => {
      const itemsStore = tx.objectStore('jobsheet_items');
      const stockStore = tx.objectStore('stock_transactions');
      const productsStore = tx.objectStore('products');
      const opsStore = tx.objectStore('offline_operations');

      // Update items as issued
      items.forEach(item => {
        itemsStore.put({
          ...item,
          isIssued: true,
          issuedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      // Create stock transactions and update product stock
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
        opId: `op-jobsheet-issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        opType: 'jobsheet_issue_materials',
        stores: ['jobsheet_items', 'stock_transactions', 'products'],
        payload: { jobsheetId, stockTransactions },
        priority: 'high',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });

    return { stockTransactions };
  } catch (error) {
    console.error('Failed to issue jobsheet materials:', error);
    throw error;
  }
};

/**
 * Record Labour Payment (Wages/Contractor Settlement)
 */
export const recordLabourPayment = async (labourId, paymentData, jobsheetIds = []) => {
  try {
    const labour = await dbOperations.getById('labour', labourId);
    if (!labour) {
      throw new Error('Labour/Technician not found');
    }

    const paymentId = generateUUID();
    const payment = {
      id: paymentId,
      payeeId: labourId,
      payeeType: 'labour',
      payeeName: labour.name,
      amount: paymentData.amount,
      date: paymentData.date || new Date().toISOString().split('T')[0],
      paymentMode: paymentData.paymentMode || 'Cash',
      referenceNo: paymentData.referenceNo || '',
      bankDetails: paymentData.bankDetails || '',
      description: paymentData.description || `Payment to ${labour.name}`,
      jobsheetIds: jobsheetIds,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    // Determine account based on contractor vs employee
    const isContractor = labour.is_contractor || false;
    const payableAccountId = isContractor ? 'CONTRACTOR_PAYABLE' : 'PAYROLL_PAYABLE';
    const payableAccountName = isContractor ? 'Contractor Payable' : 'Payroll Payable';

    const journalEntry = {
      id: generateUUID(),
      sourceType: 'labour_payment',
      sourceId: paymentId,
      date: payment.date,
      description: payment.description,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    const journalLines = [
      // Debit: Payroll/Contractor Payable (Liability decreases)
      {
        id: generateUUID(),
        journalEntryId: journalEntry.id,
        accountId: payableAccountId,
        accountName: payableAccountName,
        debit: payment.amount,
        credit: 0,
        description: `Payment to ${labour.name}`
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

    // Mark jobsheets as paid if provided
    const updatedJobsheets = [];
    if (jobsheetIds.length > 0) {
      for (const jobsheetId of jobsheetIds) {
        const jobsheet = await dbOperations.getById('jobsheets', jobsheetId);
        if (jobsheet && jobsheet.technicianId === labourId) {
          updatedJobsheets.push({
            ...jobsheet,
            isPaid: true,
            paidAt: new Date().toISOString(),
            paymentId,
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    await dbTransaction(['payments', 'jobsheets', 'journal_entries', 'journal_lines', 'offline_operations'], 'readwrite', (tx) => {
      const paymentsStore = tx.objectStore('payments');
      const jobsheetsStore = tx.objectStore('jobsheets');
      const journalStore = tx.objectStore('journal_entries');
      const journalLinesStore = tx.objectStore('journal_lines');
      const opsStore = tx.objectStore('offline_operations');

      paymentsStore.put(payment);

      updatedJobsheets.forEach(js => jobsheetsStore.put(js));

      journalStore.put(journalEntry);
      journalLines.forEach(line => journalLinesStore.put(line));

      opsStore.put({
        id: generateUUID(),
        opId: `op-labour-payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        opType: 'labour_payment',
        stores: ['payments', 'jobsheets', 'journal_entries', 'journal_lines'],
        payload: { payment, jobsheets: updatedJobsheets, journalEntry, journalLines },
        priority: 'high',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    });

    return { payment, jobsheets: updatedJobsheets, journalEntry, journalLines };
  } catch (error) {
    console.error('Failed to record labour payment:', error);
    throw error;
  }
};

/**
 * Get Labour Ledger (Hours, Cost, Payments)
 */
export const getLabourLedger = async (labourId, fromDate, toDate) => {
  try {
    const labour = await dbOperations.getById('labour', labourId);
    if (!labour) {
      throw new Error('Labour/Technician not found');
    }

    let jobsheets = await dbOperations.getByIndex('jobsheets', 'technicianId', labourId);
    let payments = await dbOperations.getByIndex('payments', 'payeeId', labourId);

    // Filter by date
    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : new Date('1900-01-01');
      const to = toDate ? new Date(toDate) : new Date('2100-12-31');

      jobsheets = jobsheets.filter(js => {
        const date = new Date(js.date);
        return date >= from && date <= to;
      });

      payments = payments.filter(pay => {
        const date = new Date(pay.date);
        return date >= from && date <= to;
      });
    }

    const entries = [];

    // Approved jobsheets create debit entries (cost owed to labour)
    jobsheets.filter(js => js.status === 'approved').forEach(js => {
      entries.push({
        date: js.date,
        type: 'jobsheet',
        reference: js.id,
        description: `Labour: ${js.hours}hrs @ ${js.rate}/hr`,
        debit: 0,
        credit: js.labourCost,
        hours: js.hours,
        isPaid: js.isPaid || false,
        sourceId: js.id,
        syncStatus: js.syncStatus
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
        hours: 0,
        isPaid: true,
        sourceId: pay.id,
        syncStatus: pay.syncStatus
      });
    });

    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    let balance = labour.opening_balance || 0;
    const entriesWithBalance = entries.map(entry => {
      balance += entry.credit - entry.debit;
      return { ...entry, balance };
    });

    const totalHours = jobsheets.filter(js => js.status === 'approved')
      .reduce((sum, js) => sum + js.hours, 0);
    const totalLabourCost = jobsheets.filter(js => js.status === 'approved')
      .reduce((sum, js) => sum + js.labourCost, 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);

    return {
      labourId,
      labourName: labour.name,
      openingBalance: labour.opening_balance || 0,
      entries: entriesWithBalance,
      closingBalance: balance,
      totalHours,
      totalLabourCost,
      totalPaid,
      outstandingAmount: balance
    };
  } catch (error) {
    console.error('Failed to get labour ledger:', error);
    throw error;
  }
};

/**
 * Get Labour Summary Statistics
 */
export const getLabourSummary = async (labourId) => {
  try {
    const [labour, jobsheets, payments] = await Promise.all([
      dbOperations.getById('labour', labourId),
      dbOperations.getByIndex('jobsheets', 'technicianId', labourId),
      dbOperations.getByIndex('payments', 'payeeId', labourId)
    ]);

    if (!labour) {
      throw new Error('Labour/Technician not found');
    }

    const approvedJobsheets = jobsheets.filter(js => js.status === 'approved');
    const totalHours = approvedJobsheets.reduce((sum, js) => sum + js.hours, 0);
    const totalLabourCost = approvedJobsheets.reduce((sum, js) => sum + js.labourCost, 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);

    return {
      labourId,
      labourName: labour.name,
      isContractor: labour.is_contractor || false,
      totalJobsheets: jobsheets.length,
      approvedJobsheets: approvedJobsheets.length,
      totalHours,
      totalLabourCost,
      totalPaid,
      outstanding: totalLabourCost - totalPaid,
      averageHourlyRate: totalHours > 0 ? totalLabourCost / totalHours : labour.hourly_rate || 0,
      lastJobsheetDate: jobsheets.length > 0
        ? new Date(Math.max(...jobsheets.map(js => new Date(js.date)))).toISOString()
        : null,
      lastPaymentDate: payments.length > 0
        ? new Date(Math.max(...payments.map(p => new Date(p.date)))).toISOString()
        : null
    };
  } catch (error) {
    console.error('Failed to get labour summary:', error);
    throw error;
  }
};

/**
 * Upload Labour Document (Timesheet, Contract, etc.)
 */
export const uploadLabourDocument = async (labourId, fileData, metadata) => {
  try {
    let filePath = null;
    if (window.electron) {
      const result = await window.electron.invoke('fs.writeAtomic', {
        path: `${await pathConfig.getModulePath('labour')}/${labourId}/${fileData.name}`,
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
      entityType: 'labour',
      entityId: labourId,
      fileName: fileData.name,
      filePath,
      fileSize: fileData.size,
      fileType: fileData.type,
      category: metadata.category || 'timesheet',
      description: metadata.description || '',
      uploadedAt: new Date().toISOString()
    };

    await dbOperations.insert('documents', document);

    return document;
  } catch (error) {
    console.error('Failed to upload labour document:', error);
    throw error;
  }
};
