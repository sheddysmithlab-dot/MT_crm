import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Edit, Search } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { broadcastDataChange } from '@/utils/dataSync';

const VoucherForm = ({ voucher, onSave, onCancel, preselectedPayee }) => {
  const [formData, setFormData] = useState(
    voucher || {
      voucher_date: new Date().toISOString().split('T')[0],
      voucher_no: '',
      payee_type: preselectedPayee?.payee_type || 'vendor',
      payee_id: preselectedPayee?.payee_id || '',
      payee_name: '',
      amount: 0,
      payment_mode: 'cash', // cash, bank, cheque, upi
      cheque_no: '',
      bank_name: '',
      particulars: '',
      notes: '',
    }
  );

  const [vendors, setVendors] = useState([]);
  const [labours, setLabours] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    loadPayees();
  }, []);

  // Auto-fill payee name when preselected payee is available
  useEffect(() => {
    if (preselectedPayee?.payee_id && !voucher) {
      const fillPayeeName = async () => {
        let selectedPayee;
        if (preselectedPayee.payee_type === 'vendor') {
          selectedPayee = vendors.find(v => v.id === preselectedPayee.payee_id);
        } else if (preselectedPayee.payee_type === 'labour') {
          selectedPayee = labours.find(l => l.id === preselectedPayee.payee_id);
        } else if (preselectedPayee.payee_type === 'supplier') {
          selectedPayee = suppliers.find(s => s.id === preselectedPayee.payee_id);
        }
        if (selectedPayee) {
          setFormData(prev => ({ ...prev, payee_name: selectedPayee.name }));
        }
      };
      if (vendors.length > 0 || labours.length > 0 || suppliers.length > 0) {
        fillPayeeName();
      }
    }
  }, [vendors, labours, suppliers, preselectedPayee, voucher]);

  const loadPayees = async () => {
    try {
      const [vendorData, labourData, supplierData] = await Promise.all([
        dbOperations.getAll('vendors'),
        dbOperations.getAll('labour'),
        dbOperations.getAll('suppliers'),
      ]);
      setVendors(vendorData || []);
      setLabours(labourData || []);
      setSuppliers(supplierData || []);
    } catch (error) {
      console.error('Error loading payees:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Auto-fill payee name when payee is selected
    if (name === 'payee_id' && formData.payee_type !== 'other') {
      let selectedPayee;
      if (formData.payee_type === 'vendor') {
        selectedPayee = vendors.find(v => v.id === value);
      } else if (formData.payee_type === 'labour') {
        selectedPayee = labours.find(l => l.id === value);
      } else if (formData.payee_type === 'supplier') {
        selectedPayee = suppliers.find(s => s.id === value);
      }
      if (selectedPayee) {
        setFormData(prev => ({ ...prev, payee_name: selectedPayee.name }));
      }
    }

    // Reset payee selection when type changes
    if (name === 'payee_type') {
      setFormData(prev => ({ ...prev, payee_id: '', payee_name: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.voucher_date || !formData.amount || parseFloat(formData.amount) === 0) {
      toast.error('Please fill all required fields with valid values (amount cannot be 0)');
      return;
    }

    if (formData.payee_type !== 'other' && !formData.payee_id) {
      toast.error('Please select a payee');
      return;
    }

    if (formData.payee_type === 'other' && !formData.payee_name) {
      toast.error('Please enter payee name');
      return;
    }

    onSave(formData);
  };

  const getPayeeOptions = () => {
    switch (formData.payee_type) {
      case 'vendor':
        return vendors;
      case 'labour':
        return labours;
      case 'supplier':
        return suppliers;
      default:
        return [];
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Voucher Date *
          </label>
          <input
            type="date"
            name="voucher_date"
            value={formData.voucher_date}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Voucher No
          </label>
          <input
            type="text"
            name="voucher_no"
            value={formData.voucher_no}
            onChange={handleChange}
            placeholder="Auto-generated"
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-dark-text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Payee Type *
          </label>
          <select
            name="payee_type"
            value={formData.payee_type}
            onChange={handleChange}
            className={`w-full p-2 border border-gray-300 rounded-lg dark:bg-dark-card dark:border-gray-600 dark:text-dark-text ${
              preselectedPayee ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
            }`}
            required
            disabled={!!preselectedPayee}
          >
            <option value="vendor">Vendor (Service Provider)</option>
            <option value="labour">Employee (Worker)</option>
            <option value="supplier">Supplier (Material)</option>
            <option value="other">Other</option>
          </select>
        </div>

        {formData.payee_type !== 'other' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Select {formData.payee_type.charAt(0).toUpperCase() + formData.payee_type.slice(1)} *
            </label>
            <select
              name="payee_id"
              value={formData.payee_id}
              onChange={handleChange}
              className={`w-full p-2 border border-gray-300 rounded-lg dark:bg-dark-card dark:border-gray-600 dark:text-dark-text ${
                preselectedPayee ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
              }`}
              required
              disabled={!!preselectedPayee}
            >
              <option value="">Select...</option>
              {getPayeeOptions().map((payee) => (
                <option key={payee.id} value={payee.id}>
                  {payee.name} {payee.code ? `(${payee.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Payee Name *
            </label>
            <input
              type="text"
              name="payee_name"
              value={formData.payee_name}
              onChange={handleChange}
              placeholder="Enter payee name"
              className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
              required
            />
          </div>
        )}

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
          Particulars *
        </label>
        <input
          type="text"
          name="particulars"
          value={formData.particulars}
          onChange={handleChange}
          placeholder="e.g., Payment for service, Material payment"
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
          {voucher ? 'Update Voucher' : 'Save Voucher'}
        </Button>
      </div>
    </form>
  );
};

const Voucher = () => {
  const location = useLocation();
  const [vouchers, setVouchers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [preselectedPayee, setPreselectedPayee] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    date_from: '',
    date_to: '',
    payee_type: '',
    payee_name: '',
  });

  useEffect(() => {
    loadCategories();
    loadVouchers();
    
    // Check URL parameters for pre-selected payee
    const params = new URLSearchParams(location.search);
    const payeeType = params.get('payee_type');
    const payeeId = params.get('payee_id');
    
    if (payeeType && payeeId) {
      setPreselectedPayee({ payee_type: payeeType, payee_id: payeeId });
      setIsModalOpen(true); // Auto-open modal when navigating from vendor/labour page
    }
  }, [location.search]);

  // Auto-refresh when page becomes visible or focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadVouchers();
      }
    };

    const handleFocus = () => {
      loadVouchers();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadCategories = async () => {
    try {
      const data = await dbOperations.getAll('inventory_categories') || [];
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const data = await dbOperations.getAll('vouchers');
      const sorted = (data || []).sort((a, b) => new Date(b.voucher_date) - new Date(a.voucher_date));
      setVouchers(sorted);
    } catch (error) {
      console.error('Error loading vouchers:', error);
      toast.error('Failed to load vouchers');
    } finally {
      setLoading(false);
    }
  };

  const generateVoucherNo = async () => {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const existing = vouchers.filter(v => v.voucher_no?.startsWith(`V${year}${month}`));
    const sequence = existing.length + 1;
    return `V${year}${month}${sequence.toString().padStart(4, '0')}`;
  };

  const handleSaveVoucher = async (voucherData) => {
    try {
      const voucherNo = voucherData.voucher_no || await generateVoucherNo();

      const voucherRecord = {
        ...voucherData,
        voucher_no: voucherNo,
        amount: parseFloat(voucherData.amount),
        created_at: new Date().toISOString(),
        id: editingVoucher?.id || `v_${Date.now()}`,
      };

      if (editingVoucher) {
        await dbOperations.update('vouchers', editingVoucher.id, voucherRecord);
        
        // Update associated ledger entry
        if (voucherData.payee_type === 'vendor' && voucherData.payee_id) {
          const vendorLedger = await dbOperations.getAll('vendor_ledger_entries');
          const entry = vendorLedger.find(e => e.reference_id === editingVoucher.id && e.reference_type === 'voucher');
          if (entry) {
            await dbOperations.update('vendor_ledger_entries', entry.id, {
              ...entry,
              entry_date: voucherData.voucher_date,
              particulars: voucherData.particulars,
              debit_amount: parseFloat(voucherData.amount),
              credit_amount: 0,
            });
          }
        } else if (voucherData.payee_type === 'labour' && voucherData.payee_id) {
          const labourLedger = await dbOperations.getAll('labour_ledger_entries');
          const entry = labourLedger.find(e => e.reference_id === editingVoucher.id && e.reference_type === 'voucher');
          if (entry) {
            await dbOperations.update('labour_ledger_entries', entry.id, {
              ...entry,
              entry_date: voucherData.voucher_date,
              particulars: voucherData.particulars,
              debit_amount: parseFloat(voucherData.amount),
              credit_amount: 0,
            });
          }
        } else if (voucherData.payee_type === 'supplier' && voucherData.payee_id) {
          const supplierLedger = await dbOperations.getAll('supplier_ledger_entries');
          const entry = supplierLedger.find(e => e.reference_id === editingVoucher.id && e.reference_type === 'voucher');
          if (entry) {
            await dbOperations.update('supplier_ledger_entries', entry.id, {
              ...entry,
              entry_date: voucherData.voucher_date,
              particulars: voucherData.particulars,
              debit_amount: parseFloat(voucherData.amount),
              credit_amount: 0,
            });
          }
        }
        
        toast.success('Voucher updated successfully');
      } else {
        await dbOperations.insert('vouchers', voucherRecord);

        // Create ledger entry based on payee type
        if (voucherData.payee_type === 'vendor' && voucherData.payee_id) {
          await dbOperations.insert('vendor_ledger_entries', {
            id: `vle_${Date.now()}`,
            vendor_id: voucherData.payee_id,
            entry_date: voucherData.voucher_date,
            particulars: voucherData.particulars || `Payment - ${voucherNo}`,
            category: 'Payment',
            reference_no: voucherNo,
            reference_type: 'voucher',
            reference_id: voucherRecord.id,
            debit_amount: parseFloat(voucherData.amount),
            credit_amount: 0,
            entry_type: 'payment',
            created_at: new Date().toISOString(),
          });
        } else if (voucherData.payee_type === 'labour' && voucherData.payee_id) {
          await dbOperations.insert('labour_ledger_entries', {
            id: `lle_${Date.now()}`,
            labour_id: voucherData.payee_id,
            entry_date: voucherData.voucher_date,
            particulars: voucherData.particulars || `Payment - ${voucherNo}`,
            skill_type: 'Payment',
            reference_no: voucherNo,
            reference_type: 'voucher',
            reference_id: voucherRecord.id,
            debit_amount: parseFloat(voucherData.amount),
            credit_amount: 0,
            entry_type: 'payment',
            created_at: new Date().toISOString(),
          });
        } else if (voucherData.payee_type === 'supplier' && voucherData.payee_id) {
          await dbOperations.insert('supplier_ledger_entries', {
            id: `sle_${Date.now()}`,
            supplier_id: voucherData.payee_id,
            entry_date: voucherData.voucher_date,
            particulars: voucherData.particulars || `Payment - ${voucherNo}`,
            category: 'Payment',
            reference_no: voucherNo,
            reference_type: 'voucher',
            reference_id: voucherRecord.id,
            debit_amount: parseFloat(voucherData.amount),
            credit_amount: 0,
            entry_type: 'payment',
            created_at: new Date().toISOString(),
          });
        }

        toast.success('Voucher saved successfully');
        
        // Broadcast data change
        broadcastDataChange('voucher', editingVoucher ? 'updated' : 'created', {
          voucher: voucherRecord,
          payee_type: voucherData.payee_type,
          payee_id: voucherData.payee_id
        });
      }

      setIsModalOpen(false);
      setEditingVoucher(null);
      loadVouchers();
    } catch (error) {
      console.error('Error saving voucher:', error);
      toast.error('Failed to save voucher');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this voucher?')) return;

    try {
      const voucher = vouchers.find(v => v.id === id);
      
      // Delete the voucher
      await dbOperations.delete('vouchers', id);
      
      // Delete associated ledger entries
      if (voucher) {
        if (voucher.payee_type === 'vendor') {
          const vendorLedger = await dbOperations.getAll('vendor_ledger_entries');
          const entry = vendorLedger.find(e => e.reference_id === id && e.reference_type === 'voucher');
          if (entry) await dbOperations.delete('vendor_ledger_entries', entry.id);
        } else if (voucher.payee_type === 'labour') {
          const labourLedger = await dbOperations.getAll('labour_ledger_entries');
          const entry = labourLedger.find(e => e.reference_id === id && e.reference_type === 'voucher');
          if (entry) await dbOperations.delete('labour_ledger_entries', entry.id);
        } else if (voucher.payee_type === 'supplier') {
          const supplierLedger = await dbOperations.getAll('supplier_ledger_entries');
          const entry = supplierLedger.find(e => e.reference_id === id && e.reference_type === 'voucher');
          if (entry) await dbOperations.delete('supplier_ledger_entries', entry.id);
        }
      }
      
      toast.success('Voucher and related entries deleted successfully');
      
      // Broadcast data change
      broadcastDataChange('voucher', 'deleted', {
        id: id,
        payee_type: voucher?.payee_type,
        payee_id: voucher?.payee_id
      });
      
      loadVouchers();
    } catch (error) {
      console.error('Error deleting voucher:', error);
      toast.error('Failed to delete voucher');
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
      payee_type: '',
      payee_name: '',
    });
  };

  const filteredVouchers = vouchers.filter((voucher) => {
    if (searchFilters.date_from && voucher.voucher_date < searchFilters.date_from) {
      return false;
    }
    if (searchFilters.date_to && voucher.voucher_date > searchFilters.date_to) {
      return false;
    }
    if (searchFilters.payee_type && voucher.payee_type !== searchFilters.payee_type) {
      return false;
    }
    if (searchFilters.payee_name && !voucher.payee_name?.toLowerCase().includes(searchFilters.payee_name.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalAmount = filteredVouchers.reduce((sum, v) => sum + parseFloat(v.amount || 0), 0);

  return (
    <div className="p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Payment Vouchers
          </h2>
          <Button
            onClick={() => {
              setEditingVoucher(null);
              setPreselectedPayee(null);
              setIsModalOpen(true);
            }}
            variant="primary"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Voucher
          </Button>
        </div>

        {/* Search Filters */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-4 gap-4">
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
              <select
                name="payee_type"
                value={searchFilters.payee_type}
                onChange={handleSearchChange}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
              >
                <option value="">All Types</option>
                <option value="vendor">Vendor</option>
                <option value="labour">Employee</option>
                <option value="supplier">Supplier</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <input
                type="text"
                name="payee_name"
                value={searchFilters.payee_name}
                onChange={handleSearchChange}
                placeholder="Search by payee name"
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
        {filteredVouchers.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Vouchers: {filteredVouchers.length}
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Total Amount: ₹{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Vouchers Table */}
        {loading ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">No vouchers found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Add your first payment voucher to get started
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800 text-left">
                <tr>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Voucher No</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Date</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Payee Type</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Payee Name</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Category</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Particulars</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Payment Mode</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700 text-right">Amount</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.map((voucher) => (
                  <tr
                    key={voucher.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="py-1 px-2 font-medium text-gray-900 dark:text-white">
                      {voucher.voucher_no}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {new Date(voucher.voucher_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-1 px-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        voucher.payee_type === 'vendor' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        voucher.payee_type === 'labour' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        voucher.payee_type === 'supplier' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {voucher.payee_type?.toUpperCase() || voucher.payment_to?.toUpperCase() || 'N/A'}
                      </span>
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {voucher.payee_name}
                    </td>
                    <td className="py-1 px-2">
                      {voucher.category_id ? (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {categories.find(c => c.id === voucher.category_id)?.name || 'N/A'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {voucher.particulars}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300 capitalize">
                      {voucher.payment_mode}
                    </td>
                    <td className="py-1 px-2 text-right font-medium text-gray-900 dark:text-white">
                      ₹{parseFloat(voucher.amount).toFixed(2)}
                    </td>
                    <td className="py-1 px-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingVoucher(voucher);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(voucher.id)}
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

      {/* Voucher Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingVoucher(null);
        }}
        title={editingVoucher ? 'Edit Payment Voucher' : 'Add Payment Voucher'}
        size="xl"
      >
        <VoucherForm
          voucher={editingVoucher}
          onSave={handleSaveVoucher}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingVoucher(null);
            setPreselectedPayee(null);
          }}
          preselectedPayee={preselectedPayee}
        />
      </Modal>
    </div>
  );
};

export default Voucher;
export { VoucherForm };
