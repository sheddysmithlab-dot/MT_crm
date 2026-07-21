import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Edit, ExternalLink, FileText } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { broadcastDataChange } from '@/utils/dataSync';

const normalizeLookup = (value) => String(value || '').trim().toLowerCase();

const parseAmount = (value) => parseFloat(value || 0) || 0;

const formatCurrency = (value) =>
  `₹${parseAmount(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getReceiptVehicleNo = (receipt) => {
  if (receipt.vehicle_no || receipt.vehicleNo) {
    return receipt.vehicle_no || receipt.vehicleNo;
  }

  const match = String(receipt.notes || '').match(/Vehicle:\s*([^,]+)/i);
  return match?.[1]?.trim() || '';
};

const findMatchingEstimate = (receipt, estimates) => {
  const vehicleNo = normalizeLookup(getReceiptVehicleNo(receipt));
  const partyName = normalizeLookup(receipt.received_from || receipt.name);
  const receiptDate = String(receipt.estimate_date || receipt.job_date || receipt.receipt_date || receipt.date || '').trim();

  if (!vehicleNo) return null;

  return (
    estimates.find((estimate) =>
      normalizeLookup(estimate.vehicle_no) === vehicleNo &&
      normalizeLookup(estimate.party_name) === partyName &&
      String(estimate.date || '').trim() === receiptDate
    ) ||
    estimates.find((estimate) =>
      normalizeLookup(estimate.vehicle_no) === vehicleNo &&
      normalizeLookup(estimate.party_name) === partyName
    ) ||
    estimates.find((estimate) =>
      normalizeLookup(estimate.vehicle_no) === vehicleNo &&
      String(estimate.date || '').trim() === receiptDate
    )
  );
};

const CashReceiptForm = ({ receipt, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    receipt || {
      receipt_date: new Date().toISOString().split('T')[0],
      receipt_no: '',
      customer_id: '',
      received_from: '',
      amount: 0,
      payment_mode: 'cash',
      cheque_no: '',
      bank_name: '',
      particulars: '',
      notes: '',
      profile_id: '', // Added for incentive tracking
    }
  );

  const [customers, setCustomers] = useState([]);
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    loadCustomers();
    loadProfiles();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await dbOperations.getAll('customers');
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProfiles = async () => {
    try {
      const data = await dbOperations.getAll('profiles');
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Auto-fill customer name when customer is selected
    if (name === 'customer_id') {
      const selectedCustomer = customers.find(c => c.id === value);
      if (selectedCustomer) {
        setFormData(prev => ({ ...prev, received_from: selectedCustomer.name }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.receipt_date || !formData.received_from || !formData.amount || parseFloat(formData.amount) === 0) {
      toast.error('Please fill all required fields with valid values (amount cannot be 0)');
      return;
    }

    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Receipt Date *
          </label>
          <input
            type="date"
            name="receipt_date"
            value={formData.receipt_date}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Receipt No
          </label>
          <input
            type="text"
            name="receipt_no"
            value={formData.receipt_no}
            onChange={handleChange}
            placeholder="Auto-generated"
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-dark-text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Customer *
          </label>
          <select
            name="customer_id"
            value={formData.customer_id}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
            required
          >
            <option value="">Select Customer...</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.phone ? `(${customer.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Received From
          </label>
          <input
            type="text"
            name="received_from"
            value={formData.received_from}
            onChange={handleChange}
            placeholder="Auto-filled from customer"
            disabled
            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-dark-text cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Amount *
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Payment Mode *
          </label>
          <select
            name="payment_mode"
            value={formData.payment_mode}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
            required
          >
            <option value="cash">Cash</option>
            <option value="bank">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="upi">UPI</option>
          </select>
        </div>

        {formData.payment_mode === 'cheque' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Cheque No
              </label>
              <input
                type="text"
                name="cheque_no"
                value={formData.cheque_no}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Bank Name
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
              />
            </div>
          </>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Related Profile (Staff)
        </label>
        <select
          name="profile_id"
          value={formData.profile_id}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
        >
          <option value="">Select Profile...</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} ({profile.role})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Particulars *
        </label>
        <input
          type="text"
          name="particulars"
          value={formData.particulars}
          onChange={handleChange}
          placeholder="e.g., Payment received for invoice, Advance payment"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {receipt ? 'Update Receipt' : 'Save Receipt'}
        </Button>
      </div>
    </form>
  );
};

const CashReceipt = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    date_from: '',
    date_to: '',
    received_from: '',
  });

  useEffect(() => {
    loadReceipts();
  }, []);

  // Auto-refresh when page becomes visible or focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadReceipts();
      }
    };

    const handleFocus = () => {
      loadReceipts();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      // Load from IndexedDB
      const data = await dbOperations.getAll('cash_receipts');
      const estimates = await dbOperations.getAll('estimates').catch(() => []);
      
      // Also load from localStorage (from jobs module)
      const localStorageReceipts = JSON.parse(localStorage.getItem('cashReceipts') || '[]');
      
      // Sync localStorage receipts to IndexedDB if they don't exist
      for (const localReceipt of localStorageReceipts) {
        const existsInDb = data.find(r => r.id === localReceipt.id);
        if (!existsInDb) {
          // Convert localStorage format to database format
          const dbReceipt = {
            id: localReceipt.id || `cr_${Date.now()}_${Math.random()}`,
            receipt_date: localReceipt.date || new Date().toISOString().split('T')[0],
            receipt_no: localReceipt.id || '',
            customer_id: localReceipt.customer_id || '',
            received_from: localReceipt.name || '',
            amount: parseFloat(localReceipt.amount) || 0,
            payment_mode: localReceipt.paymentType?.toLowerCase() || 'cash',
            particulars: localReceipt.purpose || '',
            notes: `Vehicle: ${localReceipt.vehicleNo || 'N/A'}, Source: ${localReceipt.source || 'jobs'}`,
            source: localReceipt.source || '',
            challan_no: localReceipt.challan_no || '',
            vehicle_no: localReceipt.vehicleNo || '',
            advance_paid: parseFloat(localReceipt.advancePaid || 0) || 0,
            final_settled_amount: parseFloat(localReceipt.finalSettledAmount || localReceipt.amount || 0) || 0,
            due_amount: parseFloat(localReceipt.dueAmount || 0) || 0,
            customer_phone: localReceipt.customerPhone || '',
            created_at: new Date().toISOString(),
          };
          await dbOperations.insert('cash_receipts', dbReceipt);
          data.push(dbReceipt);
        }
      }
      
      const enrichedReceipts = (data || []).map((receipt) => {
        const matchingEstimate = findMatchingEstimate(receipt, estimates);
        const vehicleNo = getReceiptVehicleNo(receipt);
        const storedAdvance = receipt.advance_paid ?? receipt.advancePaid ?? receipt.advance_payment;
        const advancePaid =
          storedAdvance !== undefined && storedAdvance !== ''
            ? parseAmount(storedAdvance)
            : receipt.source === 'estimate'
              ? parseAmount(receipt.amount)
              : parseAmount(matchingEstimate?.advance_payment);
        const storedSettled =
          receipt.final_settled_amount ?? receipt.finalSettledAmount ?? receipt.settled_amount;
        const estimateSettledAmount = matchingEstimate
          ? parseAmount(
              matchingEstimate.balance_due ??
              (parseAmount(matchingEstimate.total) - parseAmount(matchingEstimate.advance_payment))
            )
          : 0;

        const finalSettledAmount =
          storedSettled !== undefined && storedSettled !== ''
            ? parseAmount(storedSettled)
            : estimateSettledAmount || parseAmount(receipt.amount);
        const storedDue = receipt.due_amount ?? receipt.dueAmount;

        return {
          ...receipt,
          vehicle_no: vehicleNo,
          advance_paid: advancePaid,
          final_settled_amount: finalSettledAmount,
          due_amount:
            storedDue !== undefined && storedDue !== ''
              ? parseAmount(storedDue)
              : Math.max(0, finalSettledAmount - parseAmount(receipt.amount)),
        };
      });

      const sorted = enrichedReceipts.sort((a, b) => new Date(b.receipt_date) - new Date(a.receipt_date));
      setReceipts(sorted);
    } catch (error) {
      console.error('Error loading receipts:', error);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptNo = async () => {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `CR${year}${month}`;
    const existing = receipts.filter(r => {
      const receiptNo = String(r.receipt_no || '');
      return receiptNo.startsWith(prefix);
    });
    const sequence = existing.length + 1;
    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  };

  const handleSaveReceipt = async (receiptData) => {
    try {
      const receiptNo = receiptData.receipt_no || await generateReceiptNo();

      const receiptRecord = {
        ...receiptData,
        receipt_no: receiptNo,
        amount: parseFloat(receiptData.amount),
        created_at: editingReceipt?.created_at || new Date().toISOString(),
        id: editingReceipt?.id || `cr_${Date.now()}`,
      };

      if (editingReceipt) {
        await dbOperations.update('cash_receipts', editingReceipt.id, receiptRecord);
        
        // Update or create customer ledger entry for edited receipt
        if (receiptData.customer_id) {
          // Try to find existing ledger entry
          const allLedgerEntries = await dbOperations.getAll('customer_ledger_entries');
          const existingEntry = allLedgerEntries.find(e => 
            e.reference_type === 'cash_receipt' && e.reference_id === editingReceipt.id
          );
          
          if (existingEntry) {
            // Update existing entry
            await dbOperations.update('customer_ledger_entries', existingEntry.id, {
              customer_id: receiptData.customer_id,
              entry_date: receiptData.receipt_date,
              type: 'payment',
              description: `Cash Receipt - ${receiptData.particulars || 'Payment received'}`,
              debit: 0,
              credit: parseFloat(receiptData.amount),
            });
          } else {
            // Create new entry if it doesn't exist
            await dbOperations.insert('customer_ledger_entries', {
              id: `cle_${Date.now()}`,
              customer_id: receiptData.customer_id,
              entry_date: receiptData.receipt_date,
              type: 'payment',
              description: `Cash Receipt - ${receiptData.particulars || 'Payment received'}`,
              debit: 0,
              credit: parseFloat(receiptData.amount),
              reference_type: 'cash_receipt',
              reference_id: receiptRecord.id,
              created_at: new Date().toISOString(),
            });
          }
        }
        
        toast.success('Receipt updated successfully');
      } else {
        await dbOperations.insert('cash_receipts', receiptRecord);

        // Create customer ledger entry (credit - reduces outstanding)
        if (receiptData.customer_id) {
          await dbOperations.insert('customer_ledger_entries', {
            id: `cle_${Date.now()}`,
            customer_id: receiptData.customer_id,
            entry_date: receiptData.receipt_date,
            type: 'payment',
            description: `Cash Receipt - ${receiptData.particulars || 'Payment received'}`,
            debit: 0,
            credit: parseFloat(receiptData.amount),
            reference_type: 'cash_receipt',
            reference_id: receiptRecord.id,
            created_at: new Date().toISOString(),
          });
        }

        toast.success('Receipt saved successfully');
      }

      // Save to backend file system
      if (window.electron?.fs?.writeFile) {
        try {
          const allReceipts = await dbOperations.getAll('cash_receipts');
          await window.electron.fs.writeFile(
            'C:/malwa-crm/Data_base/Accounts_Module/cash-receipts.json',
            JSON.stringify(allReceipts, null, 2)
          );
          console.log('✅ Cash receipts saved to backend');
          
          // Also save customer ledger entries
          const allLedgerEntries = await dbOperations.getAll('customer_ledger_entries');
          await window.electron.fs.writeFile(
            'C:/malwa-crm/Data_base/customer/Ledger.json',
            JSON.stringify(allLedgerEntries, null, 2)
          );
          console.log('✅ Customer ledger entries saved to backend');
        } catch (err) {
          console.error('❌ Failed to save to backend:', err);
        }
      }

      // Broadcast data change to customer ledger
      broadcastDataChange('cash_receipt', editingReceipt ? 'updated' : 'created', {
        receipt_id: receiptRecord.id,
        customer_id: receiptData.customer_id,
        receipt_no: receiptNo,
        amount: parseFloat(receiptData.amount)
      });
      
      // Broadcast ledger update
      if (receiptData.customer_id) {
        broadcastDataChange('customer_ledger_entries', editingReceipt ? 'update' : 'add', {
          customer_id: receiptData.customer_id
        });
      }

      setIsModalOpen(false);
      setEditingReceipt(null);
      loadReceipts();
    } catch (error) {
      console.error('Error saving receipt:', error);
      toast.error('Failed to save receipt');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
      // Delete the receipt from IndexedDB
      await dbOperations.delete('cash_receipts', id);
      
      // Delete from localStorage as well
      const localStorageReceipts = JSON.parse(localStorage.getItem('cashReceipts') || '[]');
      const updatedLocalReceipts = localStorageReceipts.filter(r => r.id !== id);
      localStorage.setItem('cashReceipts', JSON.stringify(updatedLocalReceipts));
      
      // Delete associated ledger entry
      const allLedgerEntries = await dbOperations.getAll('customer_ledger_entries');
      const ledgerEntry = allLedgerEntries.find(e => 
        e.reference_type === 'cash_receipt' && e.reference_id === id
      );
      
      if (ledgerEntry) {
        await dbOperations.delete('customer_ledger_entries', ledgerEntry.id);
      }
      
      // Save to backend file system
      if (window.electron?.fs?.writeFile) {
        try {
          const allReceipts = await dbOperations.getAll('cash_receipts');
          await window.electron.fs.writeFile(
            'C:/malwa-crm/Data_base/Accounts_Module/cash-receipts.json',
            JSON.stringify(allReceipts, null, 2)
          );
          console.log('✅ Cash receipts updated in backend after delete');
        } catch (err) {
          console.error('❌ Failed to update cash receipts in backend:', err);
        }
      }
      
      toast.success('Receipt deleted successfully');
      
      // Broadcast data change
      const deletedReceipt = receipts.find(r => r.id === id);
      broadcastDataChange('cash_receipt', 'deleted', {
        receipt_id: id,
        customer_id: deletedReceipt?.customer_id
      });
      
      loadReceipts();
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast.error('Failed to delete receipt');
    }
  };

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchFilters({ ...searchFilters, [name]: value });
  };

  const handleReset = () => {
    setSearchFilters({
      date_from: '',
      date_to: '',
      received_from: '',
    });
  };

  const filteredReceipts = receipts.filter((receipt) => {
    if (searchFilters.date_from && receipt.receipt_date < searchFilters.date_from) {
      return false;
    }
    if (searchFilters.date_to && receipt.receipt_date > searchFilters.date_to) {
      return false;
    }
    if (searchFilters.received_from && !receipt.received_from?.toLowerCase().includes(searchFilters.received_from.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalAmount = filteredReceipts.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);

  return (
    <div className="p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Cash Receipts
          </h2>
          <Button
            onClick={() => {
              setEditingReceipt(null);
              setIsModalOpen(true);
            }}
            variant="primary"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Cash Receipt
          </Button>
        </div>

        {/* Search Filters */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <input
                type="date"
                name="date_from"
                value={searchFilters.date_from}
                onChange={handleSearchChange}
                placeholder="From Date"
                className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
              />
            </div>
            <div>
              <input
                type="date"
                name="date_to"
                value={searchFilters.date_to}
                onChange={handleSearchChange}
                placeholder="To Date"
                className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
              />
            </div>
            <div>
              <input
                type="text"
                name="received_from"
                value={searchFilters.received_from}
                onChange={handleSearchChange}
                placeholder="Search by received from"
                className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleReset} variant="outline" size="sm">
              Reset
            </Button>
          </div>
        </div>

        {/* Summary */}
        {filteredReceipts.length > 0 && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Receipts: {filteredReceipts.length}
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Total Amount: ₹{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Receipts Table */}
        {loading ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">No cash receipts found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Add your first cash receipt to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800 text-left">
                <tr>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Receipt No</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Date</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Received From</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Source</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Vehicle No</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Particulars</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700 text-right">Advance Paid</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700 text-right">Final Settled Amount</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700 text-right">Due Amount</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Payment Mode</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700 text-right">Amount</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => (
                  <tr
                    key={receipt.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="py-1 px-2 font-medium text-gray-900 dark:text-white">
                      {receipt.receipt_no}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {new Date(receipt.receipt_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {receipt.received_from}
                    </td>
                    <td className="py-1 px-2">
                      {receipt.source ? (
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                          receipt.source === 'estimate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          receipt.source === 'challan' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          receipt.source === 'invoice' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          <FileText className="w-3 h-3 mr-1" />
                          {receipt.source.charAt(0).toUpperCase() + receipt.source.slice(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Direct</span>
                      )}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {receipt.vehicle_no || '-'}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {receipt.particulars || '-'}
                    </td>
                    <td className="py-1 px-2 text-right font-medium text-blue-600 dark:text-blue-400">
                      {formatCurrency(receipt.advance_paid)}
                    </td>
                    <td className="py-1 px-2 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(receipt.final_settled_amount)}
                    </td>
                    <td className="py-1 px-2 text-right font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(receipt.due_amount)}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300 capitalize">
                      {receipt.payment_mode}
                    </td>
                    <td className="py-1 px-2 text-right font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(receipt.amount)}
                    </td>
                    <td className="py-1 px-2">
                      <div className="flex justify-end gap-2">
                        {receipt.customer_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/customer?tab=ledger&customer_id=${receipt.customer_id}`)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            title="View Customer Ledger"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingReceipt(receipt);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(receipt.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Receipt Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReceipt(null);
        }}
        title={editingReceipt ? 'Edit Cash Receipt' : 'Add Cash Receipt'}
        size="xl"
      >
        <CashReceiptForm
          receipt={editingReceipt}
          onSave={handleSaveReceipt}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingReceipt(null);
          }}
        />
      </Modal>
    </div>
  );
};

export default CashReceipt;
