import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useVendorStore from '@/store/vendorStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import { PlusCircle, Download, FileText, Edit, Trash2, Search, Receipt, Save, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import { dbOperations } from '@/lib/db';
import { subscribeToEntity, broadcastDataChange } from '@/utils/dataSync';
import { VoucherForm } from '@/pages/accounts/Voucher';
import { handlePaymentFocus, handlePaymentBlur, validateDecimalInput } from '@/utils/inputValidation';

const sortEntriesChronologically = (entries = []) =>
  [...entries].sort((a, b) => {
    const dateCompare = String(a.entry_date || '').localeCompare(String(b.entry_date || ''));
    if (dateCompare !== 0) return dateCompare;

    const createdAtCompare = String(a.created_at || '').localeCompare(String(b.created_at || ''));
    if (createdAtCompare !== 0) return createdAtCompare;

    return String(a.id || '').localeCompare(String(b.id || ''));
  });

const formatSignedCurrency = (amount) => {
  const absoluteValue = Math.abs(parseFloat(amount || 0));
  return `₹${absoluteValue.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Format a Date as YYYY-MM-DD using LOCAL time (avoids the UTC shift that
// toISOString() introduces for timezones ahead of UTC, e.g. IST = UTC+5:30,
// which would otherwise push month/week boundaries back by one day).
const formatDateLocal = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekDates = (date) => {
  const curr = new Date(date);
  const first = curr.getDate() - curr.getDay();
  const weekDates = [];

  for (let i = 0; i < 7; i++) {
    const day = new Date(curr);
    day.setDate(first + i);
    weekDates.push(formatDateLocal(day));
  }

  return weekDates;
};



const ManualEntryForm = ({ vendorId, entry, onSave, onCancel }) => {
  const isEditMode = !!entry; // Check if editing existing entry
  
  const [formData, setFormData] = useState(
    entry || {
      entry_date: new Date().toISOString().split('T')[0],
      vehicle_no: '',
      owner_name: '',
      work: '',
      particulars: '',
      category: '',
      debit_amount: '',
      credit_amount: '',
      notes: '',
    }
  );

  const debitAmountRef = useRef(null);
  const creditAmountRef = useRef(null);

  const handleChange = (e) => {
    let { name, value } = e.target;
    
    // Apply validation for amount fields
    if (name === 'debit_amount' || name === 'credit_amount') {
      value = validateDecimalInput(value);
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.vehicle_no) {
      toast.error('Vehicle No is required.');
      return;
    }
    if (!formData.owner_name) {
      toast.error('Owner Name is required.');
      return;
    }
    if (!formData.work) {
      toast.error('Work is required.');
      return;
    }
    // Convert string values to numbers for validation and saving
    const debitAmount = parseFloat(formData.debit_amount) || 0;
    const creditAmount = parseFloat(formData.credit_amount) || 0;
    
    if (debitAmount === 0 && creditAmount === 0) {
      toast.error('Either Debit or Credit amount must be greater than 0.');
      return;
    }
    
    // Set particulars from work field
    const dataToSave = { 
      ...formData, 
      vendor_id: vendorId,
      debit_amount: debitAmount,
      credit_amount: creditAmount,
      particulars: formData.work // Auto-set particulars from work
    };
    onSave(dataToSave);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date and Vehicle No Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <label className="block text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
            📅 Entry Date *
          </label>
          <input
            type="date"
            name="entry_date"
            value={formData.entry_date}
            onChange={handleChange}
            className="w-full p-3 border-2 border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-dark-card dark:text-dark-text focus:ring-2 focus:ring-blue-500 text-base font-medium"
            required
            disabled={isEditMode}
          />
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <label className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
            🚗 Vehicle No *
          </label>
          <input
            type="text"
            name="vehicle_no"
            value={formData.vehicle_no}
            onChange={handleChange}
            placeholder="e.g., PB01AB1234"
            className="w-full p-3 border-2 border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-dark-card dark:text-dark-text focus:ring-2 focus:ring-indigo-500 text-base uppercase"
            required
            disabled={isEditMode}
          />
        </div>
      </div>

      {/* Owner Name and Work Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-800">
          <label className="block text-sm font-semibold text-teal-700 dark:text-teal-300 mb-2">
            👤 Owner Name *
          </label>
          <input
            type="text"
            name="owner_name"
            value={formData.owner_name}
            onChange={handleChange}
            placeholder="e.g., Rajesh Kumar"
            className="w-full p-3 border-2 border-teal-300 dark:border-teal-600 rounded-lg bg-white dark:bg-dark-card dark:text-dark-text focus:ring-2 focus:ring-teal-500 text-base"
            required
            disabled={isEditMode}
          />
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <label className="block text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">
            🔧 Work *
          </label>
          <input
            type="text"
            name="work"
            value={formData.work}
            onChange={handleChange}
            placeholder="e.g., Painting, Denting, Body Work"
            className="w-full p-3 border-2 border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-dark-card dark:text-dark-text focus:ring-2 focus:ring-purple-500 text-base"
            required
            disabled={isEditMode}
          />
        </div>
      </div>

      {/* Debit and Credit Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border-2 border-red-200 dark:border-red-800">
          <label className="block text-sm font-semibold text-red-700 dark:text-red-300 mb-2">
            💸 Debit Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600 dark:text-red-400 font-bold text-lg">₹</span>
            <input
              ref={debitAmountRef}
              type="text"
              name="debit_amount"
              value={formData.debit_amount}
              onChange={handleChange}
              onFocus={() => handlePaymentFocus(debitAmountRef)}
              onBlur={() => handlePaymentBlur(debitAmountRef)}
              placeholder=""
              className="w-full pl-8 pr-4 py-3 border-2 border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-dark-card dark:text-dark-text focus:ring-2 focus:ring-red-500 text-base font-semibold"
            />
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Amount you owe to vendor</p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
          <label className="block text-sm font-semibold text-green-700 dark:text-green-300 mb-2">
            💰 Credit Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400 font-bold text-lg">₹</span>
            <input
              ref={creditAmountRef}
              type="text"
              name="credit_amount"
              value={formData.credit_amount}
              onChange={handleChange}
              onFocus={() => handlePaymentFocus(creditAmountRef)}
              onBlur={() => handlePaymentBlur(creditAmountRef)}
              placeholder=""
              className="w-full pl-8 pr-4 py-3 border-2 border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-dark-card dark:text-dark-text focus:ring-2 focus:ring-green-500 text-base font-semibold"
            />
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Amount you paid to vendor</p>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <label className="block text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
          📌 Additional Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          placeholder="Add any additional details, reference numbers, or comments..."
          className="w-full p-3 border-2 border-yellow-300 dark:border-yellow-600 rounded-lg bg-white dark:bg-dark-card dark:text-dark-text focus:ring-2 focus:ring-yellow-500 text-base resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel} className="px-6">
          ✖ Cancel
        </Button>
        <Button type="submit" className="px-6">
          {entry ? '✓ Update Entry' : '+ Add Entry'}
        </Button>
      </div>
    </form>
  );
};

const VendorLedgerTab = () => {
  const { vendors, fetchVendors } = useVendorStore();
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [inlineEditingEntryId, setInlineEditingEntryId] = useState(null);
  const [inlineEditingWork, setInlineEditingWork] = useState('');
  const [inlineEditingDebit, setInlineEditingDebit] = useState('');
  const [inlineEditingCredit, setInlineEditingCredit] = useState('');
  // Inline "Add Manual Entry" — a blank editable row shown at the top of the table.
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEntryData, setNewEntryData] = useState({
    entry_date: formatDateLocal(new Date()),
    vehicle_no: '',
    wheeler: '',
    owner_name: '',
    work: '',
    debit_amount: '',
    credit_amount: '',
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [vendorVouchers, setVendorVouchers] = useState([]);
  const [editingVoucher, setEditingVoucher] = useState(null); // For editing voucher
  const [showVoucherList, setShowVoucherList] = useState(false); // For showing voucher list
  const [periodOpeningBalance, setPeriodOpeningBalance] = useState(0);
  const [hasPreviousBalanceHistory, setHasPreviousBalanceHistory] = useState(false);
  const [dateRangeMode, setDateRangeMode] = useState('month');
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const now = new Date();
    return formatDateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [customEndDate, setCustomEndDate] = useState(() => formatDateLocal(new Date()));

  const [filters, setFilters] = useState({
    categorySearch: '',
  });

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    if (selectedVendorId) {
      fetchLedgerEntries();
      fetchVendorVouchers();
    } else {
      setLedgerEntries([]);
      setVendorVouchers([]);
    }
  }, [selectedVendorId, filters.categorySearch, dateRangeMode, currentWeekStart, selectedMonth, customStartDate, customEndDate]);

  const getActiveDateRange = () => {
    if (dateRangeMode === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      return {
        startDate: `${year}-${String(month).padStart(2, '0')}-01`,
        endDate: formatDateLocal(new Date(year, month, 0)),
      };
    }

    if (dateRangeMode === 'custom') {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }

    const weekDates = getWeekDates(currentWeekStart);
    return {
      startDate: weekDates[0] || '',
      endDate: weekDates[weekDates.length - 1] || '',
    };
  };

  const { startDate: activeStartDate, endDate: activeEndDate } = getActiveDateRange();

  // Auto-refresh when page becomes visible or focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedVendorId) {
        fetchLedgerEntries();
      }
    };

    const handleFocus = () => {
      if (selectedVendorId) {
        fetchLedgerEntries();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedVendorId, filters.categorySearch, dateRangeMode, currentWeekStart, selectedMonth, customStartDate, customEndDate]);

  // Listen for voucher changes from Accounts module
  useEffect(() => {
    const unsubscribe = subscribeToEntity('voucher', ({ action, data }) => {
      console.log('[VendorLedger] Voucher event received:', action, data);
      if (data?.payee_type === 'vendor' && data?.payee_id === selectedVendorId) {
        console.log('[VendorLedger] Voucher change detected for current vendor, refreshing...');
        // Immediate refresh
        setTimeout(() => {
          fetchLedgerEntries();
          fetchVendorVouchers();
        }, 100);
      }
    });

    return () => unsubscribe();
  }, [selectedVendorId]);

  // Listen for vendor_ledger_entries changes
  useEffect(() => {
    const unsubscribe = subscribeToEntity('vendor_ledger_entries', ({ action, data }) => {
      console.log('[VendorLedger] Ledger entry event received:', action, data);
      if (data?.vendor_id === selectedVendorId) {
        console.log('[VendorLedger] Ledger entry change detected for current vendor, refreshing...');
        setTimeout(() => fetchLedgerEntries(), 100);
      }
    });

    return () => unsubscribe();
  }, [selectedVendorId]);

  // Listen for vendor changes
  useEffect(() => {
    const unsubscribe = subscribeToEntity('vendors', ({ action, data }) => {
      console.log('[VendorLedger] Vendor event received:', action, data);
      if (data?.id === selectedVendorId && action === 'update') {
        console.log('[VendorLedger] Current vendor updated, refreshing...');
        setTimeout(() => fetchLedgerEntries(), 100);
      }
    });

    return () => unsubscribe();
  }, [selectedVendorId]);

  // Add polling for real-time updates every 3 seconds
  useEffect(() => {
    if (!selectedVendorId) return;

    const pollInterval = setInterval(() => {
      fetchLedgerEntries(true); // Pass silent flag to prevent loading indicator
      fetchVendorVouchers();
    }, 3000); // Faster polling for real-time feel

    return () => clearInterval(pollInterval);
  }, [selectedVendorId, filters.categorySearch, dateRangeMode, currentWeekStart, selectedMonth, customStartDate, customEndDate]);

  const fetchLedgerEntries = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let data;
      try {
        data = await dbOperations.getByIndex('vendor_ledger_entries', 'vendor_id', selectedVendorId);
      } catch (indexError) {
        console.warn('Index not available, using fallback:', indexError);
        // Fallback: get all entries and filter manually
        const allEntries = await dbOperations.getAll('vendor_ledger_entries');
        data = allEntries.filter(entry => entry.vendor_id === selectedVendorId);
      }
      
      data = Array.isArray(data) ? data : [];
      
      // Fetch voucher payment modes for debit entries
      const allVouchers = await dbOperations.getAll('vouchers');
      const voucherMap = {};
      allVouchers.forEach(v => {
        voucherMap[v.id] = v.payment_mode;
      });
      
      // Add payment_mode to entries that reference vouchers
      data = data.map(entry => {
        if (entry.reference_type === 'voucher' && entry.reference_id) {
          return {
            ...entry,
            payment_mode: voucherMap[entry.reference_id] || null
          };
        }
        return entry;
      });

      const selectedVendor = vendors.find((v) => v.id === selectedVendorId);
      const baseOpeningBalance = parseFloat(selectedVendor?.opening_balance || 0);
      const chronologicalEntries = sortEntriesChronologically(data);
      // Resolve each entry to the SAME calendar date the table shows. The table
      // renders dates via new Date(...).toLocaleDateString (local time), so an
      // entry stored with a time/timezone stamp (e.g. "2026-05-31T18:30:00Z",
      // which is 01-Jun in IST) must be filtered as that local date too —
      // otherwise it shows in one month but is counted in another.
      const entryDateOf = (entry) => {
        const raw = entry?.entry_date;
        if (!raw) return '';
        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? String(raw).slice(0, 10) : formatDateLocal(parsed);
      };

      const computedOpeningBalance = activeStartDate
        ? chronologicalEntries
            .filter((entry) => entryDateOf(entry) < activeStartDate)
            .reduce(
              (balance, entry) =>
                balance + (parseFloat(entry.credit_amount) || 0) - (parseFloat(entry.debit_amount) || 0),
              baseOpeningBalance
            )
        : baseOpeningBalance;

      setPeriodOpeningBalance(computedOpeningBalance);
      setHasPreviousBalanceHistory(
        Boolean(activeStartDate) &&
          chronologicalEntries.some((entry) => entryDateOf(entry) < activeStartDate)
      );

      let filteredData = [...chronologicalEntries].sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)));
      if (activeStartDate) {
        filteredData = filteredData.filter((e) => entryDateOf(e) >= activeStartDate);
      }
      if (activeEndDate) {
        filteredData = filteredData.filter((e) => entryDateOf(e) <= activeEndDate);
      }

      if (filters.categorySearch) {
        filteredData = filteredData.filter((entry) =>
          entry.category?.toLowerCase().includes(filters.categorySearch.toLowerCase())
        );
      }

      setLedgerEntries(filteredData);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      if (!silent) toast.error('Failed to load ledger entries: ' + error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchVendorVouchers = async () => {
    if (!selectedVendorId) return;
    try {
      const allVouchers = await dbOperations.getAll('vouchers');
      const filtered = allVouchers.filter(
        v => v.payee_type === 'vendor' && v.payee_id === selectedVendorId
      );
      setVendorVouchers(filtered);
    } catch (error) {
      console.error('Error fetching vendor vouchers:', error);
    }
  };

  const handleAddEntry = async (entryData) => {
    try {
      const newEntry = await dbOperations.insert('vendor_ledger_entries', {
        ...entryData,
        entry_type: 'manual',
      });

      // Broadcast change for real-time updates
      broadcastDataChange('vendor_ledger_entries', 'add', { ...newEntry, vendor_id: selectedVendorId });

      toast.success('Manual entry added successfully!');
      setIsModalOpen(false);
      fetchLedgerEntries();
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('Failed to add entry');
    }
  };

  const getBlankNewEntry = () => ({
    entry_date: formatDateLocal(new Date()),
    vehicle_no: '',
    wheeler: '',
    owner_name: '',
    work: '',
    debit_amount: '',
    credit_amount: '',
  });

  const startAddNewRow = () => {
    if (!selectedVendorId) {
      toast.error('Please select a vendor first');
      return;
    }
    cancelInlineWorkEdit();
    setNewEntryData(getBlankNewEntry());
    setIsAddingNew(true);
  };

  const cancelAddNewRow = () => {
    setIsAddingNew(false);
    setNewEntryData(getBlankNewEntry());
  };

  const handleNewEntryChange = (field, value) => {
    setNewEntryData((prev) => ({ ...prev, [field]: value }));
  };

  const saveNewRow = async () => {
    const work = (newEntryData.work || '').trim();
    const debitAmount = parseFloat(newEntryData.debit_amount) || 0;
    const creditAmount = parseFloat(newEntryData.credit_amount) || 0;

    if (!work) {
      toast.error('Work is required.');
      return;
    }
    if (debitAmount === 0 && creditAmount === 0) {
      toast.error('Either Debit or Credit amount must be greater than 0.');
      return;
    }

    await handleAddEntry({
      vendor_id: selectedVendorId,
      entry_date: newEntryData.entry_date,
      vehicle_no: newEntryData.vehicle_no.trim(),
      wheeler: (newEntryData.wheeler || '').trim(),
      owner_name: (newEntryData.owner_name || '').trim(),
      work,
      particulars: work,
      category: '',
      debit_amount: debitAmount,
      credit_amount: creditAmount,
      notes: '',
    });

    setIsAddingNew(false);
    setNewEntryData(getBlankNewEntry());
  };

  const handleEditEntry = async (entryData) => {
    try {
      await dbOperations.update('vendor_ledger_entries', editingEntry.id, entryData);

      // Broadcast change for real-time updates
      broadcastDataChange('vendor_ledger_entries', 'update', { ...entryData, id: editingEntry.id, vendor_id: selectedVendorId });

      toast.success('Entry updated successfully!');
      setIsModalOpen(false);
      setEditingEntry(null);
      fetchLedgerEntries();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Failed to update entry.');
    }
  };

  const startInlineWorkEdit = (entry) => {
    setInlineEditingEntryId(entry.id);
    setInlineEditingWork(entry.work || entry.particulars || '');
    setInlineEditingDebit(entry.debit_amount?.toString() || '');
    setInlineEditingCredit(entry.credit_amount?.toString() || '');
  };

  const cancelInlineWorkEdit = () => {
    setInlineEditingEntryId(null);
    setInlineEditingWork('');
    setInlineEditingDebit('');
    setInlineEditingCredit('');
  };

  const saveInlineWorkEdit = async (entry) => {
    const work = inlineEditingWork.trim();
    const debitAmount = parseFloat(inlineEditingDebit) || 0;
    const creditAmount = parseFloat(inlineEditingCredit) || 0;

    if (!work) {
      toast.error('Work is required.');
      return;
    }

    if (debitAmount === 0 && creditAmount === 0) {
      toast.error('Either Debit or Credit amount must be greater than 0.');
      return;
    }

    try {
      const updatedEntry = {
        ...entry,
        work,
        particulars: work,
        debit_amount: debitAmount,
        credit_amount: creditAmount,
      };

      await dbOperations.update('vendor_ledger_entries', entry.id, {
        work,
        particulars: work,
        debit_amount: debitAmount,
        credit_amount: creditAmount,
      });

      broadcastDataChange('vendor_ledger_entries', 'update', {
        ...updatedEntry,
        vendor_id: selectedVendorId,
      });

      setLedgerEntries((prev) =>
        prev.map((ledgerEntry) =>
          ledgerEntry.id === entry.id ? updatedEntry : ledgerEntry
        )
      );
      cancelInlineWorkEdit();
      toast.success('Entry updated successfully!');
    } catch (error) {
      console.error('Error updating work:', error);
      toast.error('Failed to update work.');
    }
  };

  const handleDeleteEntry = async () => {
    try {
      await dbOperations.delete('vendor_ledger_entries', entryToDelete.id);

      // Broadcast change for real-time updates
      broadcastDataChange('vendor_ledger_entries', 'delete', { id: entryToDelete.id, vendor_id: selectedVendorId });

      toast.success('Entry deleted successfully!');
      setIsDeleteModalOpen(false);
      setEntryToDelete(null);
      fetchLedgerEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry.');
    }
  };

  const handleSaveVoucher = async (voucherData) => {
    try {
      // Generate voucher number
      const allVouchers = await dbOperations.getAll('vouchers');
      const voucherNo = `VCH-${String(allVouchers.length + 1).padStart(5, '0')}`;
      
      const voucherRecord = {
        ...voucherData,
        voucher_no: voucherNo,
        amount: parseFloat(voucherData.amount),
        created_at: new Date().toISOString(),
        id: `v_${Date.now()}`,
      };

      // Save voucher
      await dbOperations.insert('vouchers', voucherRecord);

      // Create ledger entry for vendor (DEBIT - payment made to vendor)
      if (voucherData.payee_type === 'vendor' && voucherData.payee_id) {
        const ledgerEntry = {
          id: `vle_${Date.now()}`,
          vendor_id: voucherData.payee_id,
          entry_date: voucherData.voucher_date,
          vehicle_no: '',
          owner_name: '',
          work: voucherData.particulars || 'Payment Voucher',
          particulars: voucherData.particulars || 'Payment Voucher',
          category: 'Payment',
          debit_amount: parseFloat(voucherData.amount),
          credit_amount: 0,
          reference_type: 'voucher',
          reference_id: voucherRecord.id,
          entry_type: 'voucher',
          notes: voucherData.notes || '',
          created_at: new Date().toISOString(),
        };
        
        await dbOperations.insert('vendor_ledger_entries', ledgerEntry);
      }

      toast.success('Voucher created and added to vendor ledger!');
      
      // Broadcast data change
      broadcastDataChange('voucher', 'created', {
        voucher: voucherRecord,
        payee_type: voucherData.payee_type,
        payee_id: voucherData.payee_id
      });

      setIsVoucherModalOpen(false);
      fetchLedgerEntries();
      fetchVendorVouchers();
    } catch (error) {
      console.error('Error saving voucher:', error);
      toast.error('Failed to save voucher');
    }
  };

  const handleEditVoucher = async (entry) => {
    // Load the voucher from database
    if (entry.reference_id) {
      try {
        console.log('Trying to load voucher with ID:', entry.reference_id);
        
        // Get all vouchers and find the matching one
        const allVouchers = await dbOperations.getAll('vouchers');
        console.log('Total vouchers in database:', allVouchers.length);
        
        const voucher = allVouchers.find(v => v.id === entry.reference_id);
        
        if (voucher) {
          console.log('Voucher found:', voucher);
          setEditingVoucher(voucher);
          setIsVoucherModalOpen(true);
        } else {
          console.error('Voucher not found with ID:', entry.reference_id);
          console.log('Available voucher IDs:', allVouchers.map(v => v.id));
          toast.error('Voucher not found in database');
        }
      } catch (err) {
        console.error('Error loading voucher:', err);
        toast.error('Failed to load voucher: ' + err.message);
      }
    } else {
      toast.error('No voucher reference found in this entry');
    }
  };

  const openDeleteModal = (entry) => {
    setEntryToDelete(entry);
    setIsDeleteModalOpen(true);
  };

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  // Calculate running balance for table display
  // For vendors: Credit = work done (we owe them), Debit = payment made (reduces what we owe)
  const calculateRunningBalance = () => {
    const openingBalance = periodOpeningBalance;
    let balance = openingBalance;
    const runningBalanceMap = new Map();
    const chronologicalEntries = sortEntriesChronologically(ledgerEntries);

    chronologicalEntries.forEach((entry) => {
      balance += parseFloat(entry.credit_amount || 0) - parseFloat(entry.debit_amount || 0);
      runningBalanceMap.set(entry, balance);
    });

    return ledgerEntries.map((entry) => ({
      ...entry,
      running_balance: runningBalanceMap.get(entry) ?? openingBalance,
    }));
  };

  const entriesWithBalance = calculateRunningBalance();

  // Final closing balance = opening + net of every entry in the period.
  // Computed order-independently so it always matches the Net Balance card
  // (ledgerEntries is sorted descending, so picking an array index here is unsafe).
  const currentBalance =
    periodOpeningBalance +
    ledgerEntries.reduce(
      (sum, entry) =>
        sum + (parseFloat(entry.credit_amount) || 0) - (parseFloat(entry.debit_amount) || 0),
      0
    );

  // ============ SUMMARY CARDS CALCULATION ============
  // Opening balance is previous closing balance before selected start date
  const openingBalance = periodOpeningBalance;
  
  // Calculate totals from ALL entries (not just current month)
  const totalDebit = ledgerEntries.reduce((sum, e) => sum + (parseFloat(e.debit_amount) || 0), 0);
  const totalCredit = ledgerEntries.reduce((sum, e) => sum + (parseFloat(e.credit_amount) || 0), 0);
  
  // Net Balance = Opening + Total Credits - Total Debits
  // Positive = We owe vendor, Negative = Vendor owes us
  const netBalance = openingBalance + totalCredit - totalDebit;
  const openingBalanceTitle = hasPreviousBalanceHistory ? 'Net Previous Balance' : 'Opening Balance';
  const openingBalanceLabel = openingBalance > 0 ? 'Payable' : openingBalance < 0 ? 'Receivable' : '';
  const netBalanceLabel = netBalance > 0 ? 'Payable' : netBalance < 0 ? 'Receivable' : '';

  const formatDateForDisplay = (dateValue, shortYear = false) => {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: shortYear ? '2-digit' : 'numeric',
    });
  };

  const formatAmountPlain = (value, blankWhenZero = false) => {
    const amount = parseFloat(value || 0);
    if (blankWhenZero && amount === 0) return '';
    return amount.toFixed(2);
  };

  const formatAmountIndian = (value, blankWhenZero = false) => {
    const amount = parseFloat(value || 0);
    if (blankWhenZero && amount === 0) return '';
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Balance display for exports: show the absolute amount and mark a negative
  // (receivable) balance with a small "(Advance)" tag instead of a minus sign.
  const formatBalanceIndian = (value) => {
    const amount = parseFloat(value || 0);
    const formatted = Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return amount < 0 ? `${formatted} (Advance)` : formatted;
  };

  const escapeCSVCell = (value) => {
    const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
    if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const escapeHtml = (value) =>
    String(value ?? '-')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const sanitizeFilePart = (value) => {
    const cleaned = String(value || 'vendor')
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_+|_+$/g, '');
    return cleaned || 'vendor';
  };

  const getSortedExportEntries = () =>
    [...ledgerEntries].sort((a, b) => {
      const dateCompare = String(a.entry_date || '').localeCompare(String(b.entry_date || ''));
      if (dateCompare !== 0) return dateCompare;
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });

  const getExportDateRange = (rows) => {
    const firstEntryDate = rows.length > 0 ? rows[0].entry_date : '';
    const lastEntryDate = rows.length > 0 ? rows[rows.length - 1].entry_date : '';
    const startDate = activeStartDate || firstEntryDate || new Date().toISOString().split('T')[0];
    const endDate = activeEndDate || lastEntryDate || startDate;
    return {
      startDate,
      endDate,
      label: `${formatDateForDisplay(startDate, true)} - ${formatDateForDisplay(endDate, true)}`,
    };
  };

  const exportToCSV = () => {
    if (!selectedVendor) {
      toast.error('Please select a vendor first');
      return;
    }

    const sortedRows = getSortedExportEntries();
    const dateRange = getExportDateRange(sortedRows);
    const accountNumber = selectedVendor.code || selectedVendor.id || '-';

    const csvRows = [
      [`Account Num. ${accountNumber}`, '', selectedVendor.name || '-', '', 'Oppning Balance', formatAmountPlain(openingBalance)],
      [`Last Date ${dateRange.label}`, '', '', '', 'Total Balance', formatAmountPlain(currentBalance)],
      [],
      ['Date', 'Vh. Num.', 'Party name', 'Short details of work', 'Ammount', 'Paid'],
      ...sortedRows.map((entry) => [
        formatDateForDisplay(entry.entry_date),
        entry.vehicle_no || '',
        entry.owner_name || selectedVendor.name || '',
        entry.work || entry.particulars || '',
        formatAmountPlain(entry.credit_amount, true),
        formatAmountPlain(entry.debit_amount, true),
      ]),
      [],
      ['', '', '', 'Total', formatAmountPlain(totalCredit), formatAmountPlain(totalDebit)],
    ];

    const csvContent = `\uFEFF${csvRows.map((row) => row.map(escapeCSVCell).join(',')).join('\r\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor_ledger_${sanitizeFilePart(selectedVendor.name)}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Ledger exported in formatted CSV layout');
  };

  const saveToPDF = async () => {
    let renderRoot = null;
    try {
      if (!selectedVendor) {
        toast.error('Please select a vendor first');
        return;
      }

      if (entriesWithBalance.length === 0) {
        toast.error('No ledger entries to export');
        return;
      }

      const sortedRows = getSortedExportEntries();
      const dateRange = getExportDateRange(sortedRows);
      const accountNumber = selectedVendor.code || selectedVendor.id || '-';

      renderRoot = document.createElement('div');
      renderRoot.style.position = 'fixed';
      renderRoot.style.left = '-99999px';
      renderRoot.style.top = '0';
      renderRoot.style.width = '1120px';
      renderRoot.style.background = '#ffffff';
      renderRoot.style.padding = '0';
      document.body.appendChild(renderRoot);

      const pageWidthPx = 1120;
      const pageHeightPx = 792;
      const toCanvas = async (el) => html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true,
      });
      const formatPaymentModeForPdf = (mode) => {
        const normalized = String(mode || '').trim().toLowerCase();
        const labels = {
          cash: 'Cash',
          upi: 'UPI',
          cheque: 'Cheque',
          bank: 'Bank',
          bank_transfer: 'Bank Transfer',
          card: 'Card',
          online: 'Online',
        };
        return labels[normalized] || normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
      };

      const getPdfWorkText = (entry) => {
        if (parseFloat(entry.debit_amount || 0) > 0 && entry.payment_mode) {
          return formatPaymentModeForPdf(entry.payment_mode);
        }
        return entry.work || entry.particulars || '-';
      };

      const buildRowHtml = (entry) => {
        const workText = getPdfWorkText(entry);
        return `
          <tr>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 5px;text-align:center;font-size:16px;font-weight:700;line-height:1.22;vertical-align:middle;white-space:normal;">
              ${escapeHtml(formatDateForDisplay(entry.entry_date))}
            </td>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 6px;text-align:center;font-size:16px;font-weight:700;line-height:1.22;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">
              ${escapeHtml(entry.vehicle_no || '-')}
            </td>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 6px;text-align:center;font-size:16px;font-weight:700;line-height:1.22;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">
              ${escapeHtml(entry.wheeler || '-')}
            </td>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 10px;text-align:center;font-size:16px;font-weight:700;line-height:1.28;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">
              ${escapeHtml(workText).replace(/\r?\n/g, '<br/>')}
            </td>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 6px;text-align:center;font-size:16px;font-weight:700;line-height:1.22;vertical-align:middle;white-space:normal;">
              ${escapeHtml(formatAmountIndian(entry.credit_amount, true))}
            </td>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 6px;text-align:center;font-size:16px;font-weight:700;line-height:1.22;vertical-align:middle;white-space:normal;">
              ${escapeHtml(formatAmountIndian(entry.debit_amount, true))}
            </td>
          </tr>
        `;
      };

      const buildPageHtml = ({ entries, isFirstPage, isLastPage, pageNumber, totalPages }) => `
        <div style="width:${pageWidthPx}px;min-height:${pageHeightPx}px;background:#ffffff;border:2px solid #2d5f8f;box-sizing:border-box;font-family:'Noto Sans Devanagari','Mangal','Arial',sans-serif;color:#101418;display:flex;flex-direction:column;">
          ${isFirstPage ? `
            <div style="background:#cfe2f3;padding:7px 10px;border-bottom:2px solid #222;flex:0 0 auto;">
              <div style="display:grid;grid-template-columns:1.05fr 1.1fr 1.05fr;gap:12px;align-items:flex-start;">
                <div style="font-size:18px;font-weight:700;line-height:1.25;">
                  <div>Account Num. ${escapeHtml(accountNumber)}</div>
                  <div style="margin-top:6px;">Last Date ${escapeHtml(dateRange.label)}</div>
                </div>
                <div style="text-align:center;font-size:38px;font-weight:700;line-height:1.05;word-break:break-word;">
                  ${escapeHtml(selectedVendor.name || '-')}
                </div>
                <div style="font-size:16px;font-weight:700;line-height:1.25;">
                  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #333;padding-bottom:4px;">
                    <span>Oppning Balance</span>
                    <span>${escapeHtml(formatBalanceIndian(openingBalance))}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;padding-top:4px;">
                    <span>Total Balance</span>
                    <span>${escapeHtml(formatBalanceIndian(currentBalance))}</span>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <div style="padding:${isFirstPage ? '0' : '10px 0 0 0'};flex:1 1 auto;">
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
              <colgroup>
                <col style="width:9%;" />
                <col style="width:12%;" />
                <col style="width:14%;" />
                <col style="width:43%;" />
                <col style="width:13%;" />
                <col style="width:9%;" />
              </colgroup>
              <thead>
                <tr style="background:#5b9bd5;color:#ffffff;">
                  <th style="border:1px solid #222;padding:6px 5px;text-align:left;font-size:22px;font-weight:700;">Date</th>
                  <th style="border:1px solid #222;padding:6px 5px;text-align:center;font-size:22px;font-weight:700;">Vh. Num.</th>
                  <th style="border:1px solid #222;padding:6px 5px;text-align:center;font-size:22px;font-weight:700;">Wheeler</th>
                  <th style="border:1px solid #222;padding:6px 5px;text-align:center;font-size:22px;font-weight:700;">Short details of work</th>
                  <th style="border:1px solid #222;padding:6px 5px;text-align:center;font-size:22px;font-weight:700;">Ammount</th>
                  <th style="border:1px solid #222;padding:6px 5px;text-align:center;font-size:22px;font-weight:700;">Paid</th>
                </tr>
              </thead>
              <tbody>
                ${entries.map((entry) => buildRowHtml(entry)).join('')}
              </tbody>
            </table>
          </div>

          ${isLastPage ? `
            <div style="padding:8px 12px 10px 12px;border-top:2px solid #3f6d96;background:#edf4fb;flex:0 0 auto;">
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:13px;font-weight:700;">
                <div style="border:1px solid #8ea5bc;border-radius:4px;background:#ffffff;padding:6px 8px;">
                  Total Amount: ${escapeHtml(formatAmountIndian(totalCredit))}
                </div>
                <div style="border:1px solid #8ea5bc;border-radius:4px;background:#ffffff;padding:6px 8px;">
                  Total Paid: ${escapeHtml(formatAmountIndian(totalDebit))}
                </div>
                <div style="border:1px solid #8ea5bc;border-radius:4px;background:#ffffff;padding:6px 8px;">
                  Final Balance: ${escapeHtml(formatBalanceIndian(currentBalance))}
                </div>
              </div>
              <div style="margin-top:6px;text-align:right;font-size:10px;font-weight:600;color:#1f2937;">
                Generated on ${escapeHtml(new Date().toLocaleDateString('en-GB'))} | Page ${pageNumber} of ${totalPages}
              </div>
            </div>
          ` : ''}
        </div>
      `;

      const measurePageHeight = ({ entries, isFirstPage, isLastPage, pageNumber, totalPages }) => {
        const probe = document.createElement('div');
        probe.style.width = `${pageWidthPx}px`;
        probe.innerHTML = buildPageHtml({ entries, isFirstPage, isLastPage, pageNumber, totalPages });
        renderRoot.appendChild(probe);
        const measured = probe.firstElementChild?.getBoundingClientRect().height || probe.getBoundingClientRect().height;
        renderRoot.removeChild(probe);
        return measured;
      };

      const pageChunks = [];
      let remainingRows = [...sortedRows];
      const pageFillAllowance = 90;

      while (remainingRows.length > 0) {
        const chunk = [];
        while (remainingRows.length > 0) {
          chunk.push(remainingRows[0]);
          const height = measurePageHeight({
            entries: chunk,
            isFirstPage: pageChunks.length === 0,
            isLastPage: false,
            pageNumber: pageChunks.length + 1,
            totalPages: pageChunks.length + 1,
          });

          if (height > pageHeightPx + pageFillAllowance && chunk.length > 1) {
            chunk.pop();
            break;
          }

          remainingRows.shift();

          if (height > pageHeightPx + pageFillAllowance) {
            break;
          }
        }

        if (chunk.length === 0 && remainingRows.length > 0) {
          chunk.push(remainingRows.shift());
        }

        pageChunks.push(chunk);
      }

      let needsFooterFitCheck = true;
      while (needsFooterFitCheck) {
        needsFooterFitCheck = false;
        const lastChunk = pageChunks[pageChunks.length - 1];
        const lastHeight = measurePageHeight({
          entries: lastChunk,
          isFirstPage: pageChunks.length === 1,
          isLastPage: true,
          pageNumber: pageChunks.length,
          totalPages: pageChunks.length,
        });

        if (lastHeight > pageHeightPx + pageFillAllowance && lastChunk.length > 1) {
          const movedRow = lastChunk.pop();
          pageChunks.push([movedRow]);
          needsFooterFitCheck = true;
        }
      }

      const totalPages = pageChunks.length;
      const pages = [];

      for (let page = 0; page < pageChunks.length; page++) {
        const pageDiv = document.createElement('div');
        pageDiv.style.width = `${pageWidthPx}px`;
        pageDiv.innerHTML = buildPageHtml({
          entries: pageChunks[page],
          isFirstPage: page === 0,
          isLastPage: page === totalPages - 1,
          pageNumber: page + 1,
          totalPages,
        });
        renderRoot.appendChild(pageDiv);
        const canvas = await toCanvas(pageDiv.firstElementChild || pageDiv);
        pages.push(canvas);
        renderRoot.removeChild(pageDiv);
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      pages.forEach((canvas, idx) => {
        if (idx > 0) doc.addPage();

        const imgData = canvas.toDataURL('image/png');
        const maxWidth = pageWidth - 4;
        const maxHeight = pageHeight - 4;
        const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
        const imgWidth = canvas.width * ratio;
        const imgHeight = canvas.height * ratio;
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;

        doc.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
      });

      doc.save(`vendor_ledger_${sanitizeFilePart(selectedVendor.name)}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('A4 landscape PDF generated with multi-page setup');
    } catch (error) {
      console.error('[PDF] Error generating PDF:', error);
      toast.error('Failed to export ledger to PDF: ' + error.message);
    } finally {
      if (renderRoot && renderRoot.parentNode) {
        renderRoot.parentNode.removeChild(renderRoot);
      }
    }
  };



  return (
    <div>
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteEntry}
        title="Delete Entry"
        message="Are you sure you want to delete this manual entry? This action cannot be undone."
      />

      <Modal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setEditingVoucher(null);
        }}
        title={editingVoucher ? "Edit Payment Voucher" : "Create Payment Voucher"}
        size="xl"
      >
        <VoucherForm
          voucher={editingVoucher}
          onSave={async (voucherData) => {
            if (editingVoucher) {
              // Update mode
              try {
                await dbOperations.update('vouchers', editingVoucher.id, voucherData);
                
                // Also update the ledger entry
                const ledgerEntries = await dbOperations.getAll('vendor_ledger_entries');
                const matchingEntry = ledgerEntries.find(
                  e => e.reference_type === 'voucher' && e.reference_id === editingVoucher.id
                );
                
                if (matchingEntry) {
                  await dbOperations.update('vendor_ledger_entries', matchingEntry.id, {
                    ...matchingEntry,
                    entry_date: voucherData.voucher_date,
                    debit_amount: parseFloat(voucherData.amount),
                    particulars: voucherData.particulars,
                    work: voucherData.particulars || 'Payment Voucher',
                    notes: voucherData.notes || '',
                  });
                }
                
                toast.success('Voucher updated successfully');
                broadcastDataChange('voucher', 'update', { ...voucherData, id: editingVoucher.id });
                setIsVoucherModalOpen(false);
                setEditingVoucher(null);
                await fetchLedgerEntries();
                await fetchVendorVouchers();
              } catch (error) {
                console.error('Error updating voucher:', error);
                toast.error('Failed to update voucher');
              }
            } else {
              // Create mode
              await handleSaveVoucher(voucherData);
            }
          }}
          onCancel={() => {
            setIsVoucherModalOpen(false);
            setEditingVoucher(null);
          }}
          preselectedPayee={{ payee_type: 'vendor', payee_id: selectedVendorId }}
        />
      </Modal>

      {/* Voucher List Modal */}
      <Modal
        isOpen={showVoucherList}
        onClose={() => setShowVoucherList(false)}
        title="Payment Vouchers"
        size="2xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
              Total Vouchers: {vendorVouchers.length}
            </h3>
            <Button
              onClick={() => {
                setShowVoucherList(false);
                setEditingVoucher(null);
                setIsVoucherModalOpen(true);
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add New Voucher
            </Button>
          </div>

          {vendorVouchers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="py-1 px-2 text-left font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="py-1 px-2 text-left font-semibold text-gray-700 dark:text-gray-300">Voucher No</th>
                    <th className="py-1 px-2 text-left font-semibold text-gray-700 dark:text-gray-300">Particulars</th>
                    <th className="py-1 px-2 text-left font-semibold text-gray-700 dark:text-gray-300">Payment Mode</th>
                    <th className="py-1 px-2 text-right font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                    <th className="py-1 px-2 text-center font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorVouchers.map((voucher) => (
                    <tr key={voucher.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-1 px-2 text-gray-900 dark:text-dark-text">
                        {new Date(voucher.voucher_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-1 px-2 text-gray-900 dark:text-dark-text font-medium">
                        {voucher.voucher_no}
                      </td>
                      <td className="py-1 px-2 text-gray-900 dark:text-dark-text">
                        {voucher.particulars || '-'}
                      </td>
                      <td className="py-1 px-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                          {voucher.payment_mode?.toUpperCase() || 'CASH'}
                        </span>
                      </td>
                      <td className="py-1 px-2 text-right text-red-600 dark:text-red-400 font-semibold">
                        ₹{parseFloat(voucher.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-1 px-2 text-center">
                        <Button
                          variant="ghost"
                          className="p-2 h-auto"
                          onClick={() => {
                            setEditingVoucher(voucher);
                            setShowVoucherList(false);
                            setIsVoucherModalOpen(true);
                          }}
                          title="Edit Voucher"
                        >
                          <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-dark-text-secondary mb-4">
                No vouchers found for this vendor
              </p>
              <Button
                onClick={() => {
                  setShowVoucherList(false);
                  setEditingVoucher(null);
                  setIsVoucherModalOpen(true);
                }}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create First Voucher
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <Card>
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Date Range Mode
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="week" checked={dateRangeMode === 'week'} onChange={(e) => setDateRangeMode(e.target.value)} className="w-4 h-4" />
                    <span className="text-sm text-gray-700 dark:text-dark-text">Weekly View</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="month" checked={dateRangeMode === 'month'} onChange={(e) => setDateRangeMode(e.target.value)} className="w-4 h-4" />
                    <span className="text-sm text-gray-700 dark:text-dark-text">Monthly View</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value="custom" checked={dateRangeMode === 'custom'} onChange={(e) => setDateRangeMode(e.target.value)} className="w-4 h-4" />
                    <span className="text-sm text-gray-700 dark:text-dark-text">Custom Date Range</span>
                  </label>
                </div>
              </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Select Vendor *
              </label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              >
                <option value="">-- Choose Vendor --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.vendor_type ? `(${v.vendor_type})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {dateRangeMode === 'week' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Week Starting
                </label>
                <input
                  type="date"
                  value={currentWeekStart}
                  onChange={(e) => setCurrentWeekStart(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
              </div>
            ) : dateRangeMode === 'month' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 lg:col-span-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Search Category
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.categorySearch}
                  onChange={(e) => setFilters({ ...filters, categorySearch: e.target.value })}
                  placeholder="e.g., Painter"
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
              </div>
            </div>
          </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={startAddNewRow}
              disabled={!selectedVendorId || isAddingNew}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Manual Entry
            </Button>

            <Button
              onClick={() => {
                if (!selectedVendorId) {
                  toast.error('Please select a vendor first');
                  return;
                }
                setShowVoucherList(true);
              }}
              disabled={!selectedVendorId}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Voucher ({vendorVouchers.length})
            </Button>

            <Button variant="secondary" onClick={exportToCSV} disabled={!selectedVendorId}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

            <Button variant="secondary" onClick={saveToPDF} disabled={!selectedVendorId}>
              <FileText className="h-4 w-4 mr-2" />
              Save PDF
            </Button>


          </div>

          {selectedVendor && (
            <>
              {/* Vendor Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Vendor</p>
                    <p className="font-semibold text-gray-900 dark:text-dark-text">{selectedVendor.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Phone</p>
                    <p className="font-semibold text-gray-900 dark:text-dark-text">{selectedVendor.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Type</p>
                    <p className="font-semibold text-gray-900 dark:text-dark-text">
                      {selectedVendor.vendor_type || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Company</p>
                    <p className="font-semibold text-gray-900 dark:text-dark-text">
                      {selectedVendor.company_name || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Balance Blocks */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">{openingBalanceTitle}</p>
                  <p className={`text-xl font-bold ${
                    openingBalance > 0
                      ? 'text-red-600 dark:text-red-400'
                      : openingBalance < 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-yellow-900 dark:text-yellow-300'
                  }`}>
                    {formatSignedCurrency(openingBalance)}
                    <span className="text-xs ml-1">{openingBalanceLabel ? `(${openingBalanceLabel})` : ''}</span>
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-600 dark:text-green-400">Total Credit (Work Done)</p>
                  <p className="text-xl font-bold text-green-900 dark:text-green-300">
                    ₹{totalCredit.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-600 dark:text-red-400">Total Debit (Payments)</p>
                  <p className="text-xl font-bold text-red-900 dark:text-red-300">
                    ₹{totalDebit.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">Net Balance</p>
                  <p className={`text-xl font-bold ${
                    netBalance > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {formatSignedCurrency(netBalance)}
                    <span className="text-xs ml-1">{netBalanceLabel ? `(${netBalanceLabel})` : ''}</span>
                  </p>
                </div>
              </div>
            </>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
              <span className="ml-3 text-gray-600 dark:text-dark-text-secondary">Loading entries...</span>
            </div>
          ) : !selectedVendorId ? (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-dark-text-secondary">
                Please select a vendor to view their ledger entries
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-left">
                    <tr>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 w-24">Date</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 w-32">Vehicle No</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 w-20">Wheeler</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 w-32">Owner Name</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Work</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right w-20">Debit</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right w-20">Credit</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isAddingNew && (
                      <tr className="border-b dark:border-gray-700 bg-yellow-50/60 dark:bg-yellow-900/10">
                        <td className="py-1 px-2">
                          <input
                            type="date"
                            value={newEntryData.entry_date}
                            onChange={(e) => handleNewEntryChange('entry_date', e.target.value)}
                            className="w-32 px-2 py-1 text-sm border rounded-md bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            value={newEntryData.vehicle_no}
                            onChange={(e) => handleNewEntryChange('vehicle_no', e.target.value.toUpperCase())}
                            placeholder="Vehicle No"
                            autoFocus
                            className="w-28 px-2 py-1 text-sm border rounded-md bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red uppercase"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            value={newEntryData.wheeler}
                            onChange={(e) => handleNewEntryChange('wheeler', e.target.value)}
                            placeholder="Wheeler"
                            className="w-20 px-2 py-1 text-sm border rounded-md bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            value={newEntryData.owner_name}
                            onChange={(e) => handleNewEntryChange('owner_name', e.target.value)}
                            placeholder="Owner Name"
                            className="w-32 px-2 py-1 text-sm border rounded-md bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            value={newEntryData.work}
                            onChange={(e) => handleNewEntryChange('work', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); saveNewRow(); }
                              if (e.key === 'Escape') { e.preventDefault(); cancelAddNewRow(); }
                            }}
                            placeholder="Work *"
                            className="w-full min-w-[220px] px-2 py-1 text-sm border rounded-md bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                          />
                        </td>
                        <td className="py-1 px-2 text-right">
                          <input
                            type="text"
                            value={newEntryData.debit_amount}
                            onChange={(e) => handleNewEntryChange('debit_amount', validateDecimalInput(e.target.value))}
                            placeholder="0"
                            className="w-20 px-2 py-1 text-sm border rounded-md bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-red-500 text-right"
                          />
                        </td>
                        <td className="py-1 px-2 text-right">
                          <input
                            type="text"
                            value={newEntryData.credit_amount}
                            onChange={(e) => handleNewEntryChange('credit_amount', validateDecimalInput(e.target.value))}
                            placeholder="0"
                            className="w-20 px-2 py-1 text-sm border rounded-md bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-green-500 text-right"
                          />
                        </td>
                        <td className="py-1 px-2 text-right">
                          <div className="flex justify-end items-center space-x-2">
                            <Button variant="ghost" className="p-2 h-auto" onClick={saveNewRow} title="Save Entry">
                              <Save className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </Button>
                            <Button variant="ghost" className="p-2 h-auto" onClick={cancelAddNewRow} title="Cancel">
                              <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {entriesWithBalance.length > 0 ? (
                      entriesWithBalance.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary">
                            {new Date(entry.entry_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-1 px-2 text-gray-900 dark:text-dark-text font-medium">
                            {entry.vehicle_no || '-'}
                          </td>
                          <td className="py-1 px-2 text-gray-900 dark:text-dark-text font-medium">
                            {entry.wheeler || '-'}
                          </td>
                          <td className="py-1 px-2 text-gray-900 dark:text-dark-text">
                            {entry.owner_name || '-'}
                          </td>
                          <td className="py-1 px-2 text-gray-900 dark:text-dark-text">
                            {/* Show payment mode for debit entries (vouchers), otherwise work/particulars */}
                            {inlineEditingEntryId === entry.id ? (
                              <input
                                type="text"
                                value={inlineEditingWork}
                                onChange={(e) => setInlineEditingWork(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveInlineWorkEdit(entry);
                                  }
                                  if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelInlineWorkEdit();
                                  }
                                }}
                                autoFocus
                                className="w-full min-w-[220px] px-2 py-1 text-sm border rounded-md bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                              />
                            ) : parseFloat(entry.debit_amount || 0) > 0 && entry.payment_mode
                              ? <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                                  💳 {entry.payment_mode.toUpperCase()}
                                </span>
                              : (entry.work || entry.particulars || '-')}
                          </td>
                          <td className="py-1 px-2 text-right text-red-600 dark:text-red-400 font-medium">
                            {inlineEditingEntryId === entry.id ? (
                              <input
                                type="text"
                                value={inlineEditingDebit}
                                onChange={(e) => setInlineEditingDebit(validateDecimalInput(e.target.value))}
                                placeholder="0"
                                className="w-20 px-2 py-1 text-sm border rounded-md bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-red-500 text-right"
                              />
                            ) : parseFloat(entry.debit_amount || 0) > 0
                              ? `₹${parseFloat(entry.debit_amount).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                })}`
                              : '-'}
                          </td>
                          <td className="py-1 px-2 text-right text-green-600 dark:text-green-400 font-medium">
                            {inlineEditingEntryId === entry.id ? (
                              <input
                                type="text"
                                value={inlineEditingCredit}
                                onChange={(e) => setInlineEditingCredit(validateDecimalInput(e.target.value))}
                                placeholder="0"
                                className="w-20 px-2 py-1 text-sm border rounded-md bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-green-500 text-right"
                              />
                            ) : parseFloat(entry.credit_amount || 0) > 0
                              ? `₹${parseFloat(entry.credit_amount).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                })}`
                              : '-'}
                          </td>
                          <td className="py-1 px-2 text-right">
                            <div className="flex justify-end items-center space-x-2">
                              {inlineEditingEntryId === entry.id ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    className="p-2 h-auto"
                                    onClick={() => saveInlineWorkEdit(entry)}
                                    title="Save Entry"
                                  >
                                    <Save className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="p-2 h-auto"
                                    onClick={cancelInlineWorkEdit}
                                    title="Cancel"
                                  >
                                    <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  className="p-2 h-auto"
                                  onClick={() => {
                                    if (entry.reference_type === 'voucher' && entry.reference_id) {
                                      handleEditVoucher(entry);
                                    } else {
                                      startInlineWorkEdit(entry);
                                    }
                                  }}
                                  title={entry.reference_type === 'voucher' ? 'Edit Voucher' : 'Edit Entry (Work & Amounts)'}
                                >
                                  <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                className="p-2 h-auto"
                                onClick={() => openDeleteModal(entry)}
                                title="Delete Entry"
                              >
                                <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : !isAddingNew ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <p className="text-gray-500 dark:text-dark-text-secondary">
                            No entries found for the selected filters
                          </p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  {entriesWithBalance.length > 0 && (
                    <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold">
                      <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                        <td colSpan="5" className="py-1 px-2 text-right text-gray-900 dark:text-dark-text font-bold">
                          Totals:
                        </td>
                        <td className="py-1 px-2 text-right text-red-600 dark:text-red-400 font-bold text-lg">
                          ₹{entriesWithBalance.reduce((sum, e) => sum + (parseFloat(e.debit_amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2 text-right text-green-600 dark:text-green-400 font-bold text-lg">
                          ₹{entriesWithBalance.reduce((sum, e) => sum + (parseFloat(e.credit_amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {entriesWithBalance.length > 0 && (
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                    Showing {entriesWithBalance.length} entries
                  </p>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">Final Balance</p>
                    <p
                      className={`text-2xl font-bold ${
                        currentBalance > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      ₹{Math.abs(currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">
                      {currentBalance > 0 ? 'Amount Payable' : 'Amount in Credit'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default VendorLedgerTab;
