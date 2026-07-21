import useMultiplierStore from '@/store/multiplierStore';
import { dbOperations } from '@/lib/db';
import { generateUUID } from './jobModuleHelpers';

export const calculateItemTotal = (item) => {
  const { getCategoryMultiplier, getMultiplierByWorkType } = useMultiplierStore.getState();

  const baseAmount = (item.rate || 0) * (item.quantity || 1);

  let multiplier = 1;
  if (item.category) {
    multiplier = getCategoryMultiplier(item.category);
  } else if (item.workBy) {
    multiplier = getMultiplierByWorkType(item.workBy);
  }

  return baseAmount * multiplier;
};

export const calculateEstimateTotal = (items) => {
  if (!items || items.length === 0) return { subtotal: 0, tax: 0, total: 0 };

  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  return { subtotal, tax, total };
};

export const updateInventoryFromEstimate = (estimateItems) => {
  const { stockItems, updateStockItem } = useInventoryStore.getState();

  estimateItems.forEach(item => {
    const stockItem = stockItems.find(s => s.name === item.name || s.itemCode === item.itemCode);
    if (stockItem && item.quantity) {
      const updatedItem = {
        ...stockItem,
        quantity: (stockItem.quantity || 0) - (item.quantity || 0),
      };
      updateStockItem(updatedItem);
    }
  });
};

// Unified ledger writers (IndexedDB)
export const createLedgerEntry = async (type, entityId, entityName, amount, description, date = new Date()) => {
  const entryDate = date.toISOString().split('T')[0];
  const particulars = description || '';
  const debit_amount = amount > 0 ? amount : 0;
  const credit_amount = amount < 0 ? Math.abs(amount) : 0;

  if (type === 'customer') {
    return dbOperations.insert('customer_ledger_entries', {
      customer_id: entityId,
      entry_date: entryDate,
      particulars,
      debit_amount,
      credit_amount,
      ref_type: 'flow',
    });
  }
  if (type === 'vendor') {
    return dbOperations.insert('vendor_ledger_entries', {
      vendor_id: entityId,
      entry_date: entryDate,
      particulars,
      debit_amount,
      credit_amount,
      ref_type: 'flow',
    });
  }
  if (type === 'supplier') {
    return dbOperations.insert('supplier_ledger_entries', {
      supplier_id: entityId,
      entry_date: entryDate,
      particulars,
      debit_amount,
      credit_amount,
      ref_type: 'flow',
    });
  }
  // Fallback no-op
  return null;
};

export const syncJobToInvoice = (job) => {
  if (!job || !job.estimate) return null;

  const { subtotal, tax, total } = calculateEstimateTotal([
    ...(job.estimate.parts || []),
    ...(job.estimate.labour || []),
    ...(job.estimate.newBody || []),
  ]);

  return {
    jobId: job.id,
    jobNumber: job.jobNumber,
    customerName: job.customerName,
    vehicleNumber: job.vehicleNumber,
    items: [
      ...(job.estimate.parts || []),
      ...(job.estimate.labour || []),
      ...(job.estimate.newBody || []),
    ],
    subtotal,
    tax,
    total,
    date: new Date().toISOString().split('T')[0],
  };
};

export const createInvoiceFromJob = (job) => {
  const invoiceData = syncJobToInvoice(job);
  if (!invoiceData) return null;

  createLedgerEntry(
    'customer',
    job.customerId,
    job.customerName,
    invoiceData.total,
    `Invoice for Job ${job.jobNumber} - ${job.vehicleNumber}`
  );

  return invoiceData;
};

export const createChallanFromEstimate = (job, challanType = 'sell') => {
  if (!job || !job.estimate) return null;

  const items = [
    ...(job.estimate.parts || []),
    ...(job.estimate.newBody || []),
  ];

  const { subtotal, tax, total } = calculateEstimateTotal(items);

  return {
    jobId: job.id,
    jobNumber: job.jobNumber,
    type: challanType,
    customerName: job.customerName,
    vehicleNumber: job.vehicleNumber,
    items,
    subtotal,
    tax,
    total,
    date: new Date().toISOString().split('T')[0],
  };
};

export const recordPurchase = async (supplier, items, amount, reference = {}) => {
  if (supplier?.id) {
    await createLedgerEntry(
      'supplier',
      supplier.id,
      supplier.name,
      -Math.abs(amount || 0),
      `Purchase from ${supplier.name}`
    );
  }

  // Stock IN movements for each item
  for (const item of items || []) {
    await dbOperations.insert('stock_movements', {
      id: `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString().split('T')[0],
      movement_date: new Date().toISOString().split('T')[0],
      productId: item.productId || item.id || generateUUID(),
      productName: item.name || item.productName || '',
      material_name: item.name || item.productName || '',
      movement_type: 'in',  // Purchase = Stock IN
      quantity: item.quantity || 0,
      reason: 'purchase',
      reference_type: 'purchase',
      reference: reference || {},
    });
  }
};

export const recordPayment = async (type, entityId, entityName, amount, paymentMode = 'Cash') => {
  await createLedgerEntry(
    type,
    entityId,
    entityName,
    -Math.abs(amount || 0),
    `${paymentMode} Payment to ${entityName}`
  );

  // Also record voucher
  return dbOperations.insert('vouchers', {
    date: new Date().toISOString().split('T')[0],
    payeeType: type,
    payeeId: entityId,
    payeeName: entityName,
    amount: Math.abs(amount || 0),
    mode: paymentMode,
    voucherType: 'payment',
  });
};

export const recordReceipt = async (customerId, customerName, amount, paymentMode = 'Cash') => {
  await createLedgerEntry(
    'customer',
    customerId,
    customerName,
    -Math.abs(amount || 0),
    `${paymentMode} Receipt from ${customerName}`
  );

  return dbOperations.insert('vouchers', {
    date: new Date().toISOString().split('T')[0],
    payeeType: 'customer',
    payeeId: customerId,
    payeeName: customerName,
    amount: Math.abs(amount || 0),
    mode: paymentMode,
    voucherType: 'receipt',
  });
};

export const getCustomerBalance = (customerId) => {
  const { entries } = useLedgerStore.getState();
  const customerEntries = entries.filter(e => e.entityType === 'customer' && e.entityId === customerId);

  return customerEntries.reduce((balance, entry) => {
    return balance + (entry.debit || 0) - (entry.credit || 0);
  }, 0);
};

export const getVendorBalance = (vendorId) => {
  const { entries } = useLedgerStore.getState();
  const vendorEntries = entries.filter(e => e.entityType === 'vendor' && e.entityId === vendorId);

  return vendorEntries.reduce((balance, entry) => {
    return balance + (entry.debit || 0) - (entry.credit || 0);
  }, 0);
};

export const getSupplierBalance = (supplierId) => {
  const { entries } = useLedgerStore.getState();
  const supplierEntries = entries.filter(e => e.entityType === 'supplier' && e.entityId === supplierId);

  return supplierEntries.reduce((balance, entry) => {
    return balance + (entry.debit || 0) - (entry.credit || 0);
  }, 0);
};

export const generateGSTReport = (startDate, endDate) => {
  const { entries } = useLedgerStore.getState();

  const filteredEntries = entries.filter(e => {
    const entryDate = new Date(e.date);
    return entryDate >= new Date(startDate) && entryDate <= new Date(endDate);
  });

  const totalSales = filteredEntries
    .filter(e => e.entityType === 'customer' && e.debit > 0)
    .reduce((sum, e) => sum + e.debit, 0);

  const totalPurchases = filteredEntries
    .filter(e => e.entityType === 'supplier' && e.credit > 0)
    .reduce((sum, e) => sum + e.credit, 0);

  const outputGST = totalSales * 0.18;
  const inputGST = totalPurchases * 0.18;
  const netGST = outputGST - inputGST;

  return {
    period: { startDate, endDate },
    totalSales,
    totalPurchases,
    outputGST,
    inputGST,
    netGST,
  };
};

export const createStockMovement = async (itemId, itemName, type, quantity, reason, reference) => {
  return dbOperations.insert('stock_movements', {
    id: `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: new Date().toISOString().split('T')[0],
    movement_date: new Date().toISOString().split('T')[0],
    productId: itemId,
    productName: itemName,
    material_name: itemName,
    movement_type: type,  // Use movement_type instead of type
    quantity: quantity,
    reason: reason,
    reference_type: reason,
    reference: reference,
  });
};

export const getStockMovements = async (itemId = null) => {
  if (!itemId) return dbOperations.getAll('stock_movements');
  const all = await dbOperations.getAll('stock_movements');
  return all.filter(m => m.productId === itemId);
};

export const dataFlowHelpers = {
  calculateItemTotal,
  calculateEstimateTotal,
  updateInventoryFromEstimate,
  createLedgerEntry,
  syncJobToInvoice,
  createInvoiceFromJob,
  createChallanFromEstimate,
  recordPurchase,
  recordPayment,
  recordReceipt,
  getCustomerBalance,
  getVendorBalance,
  getSupplierBalance,
  generateGSTReport,
  createStockMovement,
  getStockMovements,
};

export default dataFlowHelpers;

// High-level flows to match the diagram
export const jobFlow = {
  // Create challan (sell) from jobsheet material items
  createSellChallanFromJobsheet: async (jobId) => {
    const items = await dbOperations.getByIndex('jobsheet_items', 'jobsheetId', jobId);
    const materialItems = (items || []).filter(i => i.itemType === 'material');
    if (materialItems.length === 0) return null;

    const challan = await dbOperations.insert('sell_challans', {
      jobId,
      date: new Date().toISOString().split('T')[0],
      items: materialItems.map(i => ({ productId: i.productId, qty: i.quantity, rate: i.rate })),
      status: 'issued'
    });

    // Stock OUT for each item
    for (const it of materialItems) {
      await createStockMovement(it.productId, it.productName || '', 'out', it.quantity || 0, 'job-issue', { jobId });
    }
    return challan;
  },

  // Create invoice from challan
  createInvoiceFromChallan: async (jobId) => {
    const challans = await dbOperations.getByIndex('sell_challans', 'jobId', jobId);
    const challan = (challans || []).slice(-1)[0];
    if (!challan) return null;

    const subtotal = (challan.items || []).reduce((s, i) => s + (i.qty || 0) * (i.rate || 0), 0);
    const gstRate = 18;
    const tax = (subtotal * gstRate) / 100;
    const total = subtotal + tax;

    const invoice = await dbOperations.insert('invoices', {
      jobId,
      challanId: challan.id,
      date: new Date().toISOString().split('T')[0],
      subtotal,
      tax,
      total,
      status: 'pending'
    });

    // Customer ledger debit
    const job = await dbOperations.getById('jobs', jobId);
    if (job?.customerId) {
      await createLedgerEntry('customer', job.customerId, job.customerName || '', total, `Invoice ${invoice.id}`);
    }
    return invoice;
  }
};

export const accountsFlow = {
  // Cash receipt against customer
  cashReceipt: async (customerId, customerName, amount, mode = 'Cash') => {
    return recordReceipt(customerId, customerName, amount, mode);
  },
  // Purchase invoice end-to-end: stock in + supplier ledger
  purchaseInvoice: async (supplier, items, amount) => {
    await recordPurchase(supplier, items, amount, { source: 'purchase_invoice' });
    return true;
  }
};
