import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import {
  Download,
  Printer,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Wallet,
  Trash2,
  X,
  Eye,
  FileText,
  Edit,
} from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { subscribeToEntity, broadcastDataChange } from '@/utils/dataSync';
import { openPrintPreview, PRINT_PRESETS } from '@/utils/printHelpers';
import { findCustomerByIdentity, buildCustomerIdentityPatch } from '@/utils/customerIdentity';

const CustomerLedgerTab = () => {
  const [searchParams] = useSearchParams();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [challanModalOpen, setChallanModalOpen] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [challanLoading, setChallanLoading] = useState(false);
  const [stats, setStats] = useState({
    totalDebit: 0,
    totalCredit: 0,
    outstandingCredit15Plus: 0,
    monthlyData: [],
  });

  // Handle URL query param for customer_id (from Cash Receipt redirect)
  useEffect(() => {
    const customerIdFromUrl = searchParams.get('customer_id');
    if (customerIdFromUrl && customerIdFromUrl !== selectedCustomerId) {
      setSelectedCustomerId(customerIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchLedgerData();
      loadSelectedCustomer();
    } else {
      setLedgerEntries([]);
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, startDate, endDate]);

  // Auto-refresh when page becomes visible or focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedCustomerId) {
        fetchLedgerData();
        loadSelectedCustomer();
      }
    };

    const handleFocus = () => {
      if (selectedCustomerId) {
        fetchLedgerData();
        loadSelectedCustomer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedCustomerId, startDate, endDate]);

  // Listen for cash receipt changes from Accounts module
  useEffect(() => {
    const unsubscribe = subscribeToEntity('cash_receipt', ({ action, data }) => {
      console.log('[CustomerLedger] Cash receipt event received:', action, data);
      if (data?.customer_id === selectedCustomerId) {
        console.log('[CustomerLedger] Cash receipt change detected for current customer, refreshing...');
        // Immediate refresh
        setTimeout(() => {
          fetchLedgerData();
          loadSelectedCustomer();
        }, 100);
      }
    });

    return () => unsubscribe();
  }, [selectedCustomerId]);

  // Listen for customer ledger entry changes
  useEffect(() => {
    const unsubscribe = subscribeToEntity('customer_ledger_entries', ({ action, data }) => {
      console.log('[CustomerLedger] Ledger entry event received:', action, data);
      if (data?.customer_id === selectedCustomerId) {
        console.log('[CustomerLedger] Ledger entry change detected for current customer, refreshing...');
        setTimeout(() => {
          fetchLedgerData();
          loadSelectedCustomer();
        }, 100);
      }
    });

    return () => unsubscribe();
  }, [selectedCustomerId]);

  // Listen for job changes (jobs create ledger entries)
  useEffect(() => {
    const unsubscribe = subscribeToEntity('jobs', ({ action, data }) => {
      console.log('[CustomerLedger] Job event received:', action, data);
      if (data?.customer_id === selectedCustomerId) {
        console.log('[CustomerLedger] Job change detected for current customer, refreshing...');
        setTimeout(() => {
          fetchLedgerData();
          loadSelectedCustomer();
        }, 500); // Slightly longer delay for ledger entry creation
      }
    });

    return () => unsubscribe();
  }, [selectedCustomerId]);

  // Listen for customer changes
  useEffect(() => {
    const unsubscribe = subscribeToEntity('customers', ({ action, data }) => {
      console.log('[CustomerLedger] Customer event received:', action, data);
      if (data?.id === selectedCustomerId) {
        console.log('[CustomerLedger] Current customer updated, refreshing...');
        setTimeout(() => {
          loadSelectedCustomer();
        }, 100);
      }
      // Refresh customer list if any customer is added/deleted
      if (action === 'add' || action === 'delete') {
        fetchCustomers();
      }
    });

    return () => unsubscribe();
  }, [selectedCustomerId]);

  // Add polling for real-time updates every 3 seconds (reduced from 5)
  useEffect(() => {
    if (!selectedCustomerId) return;

    const pollInterval = setInterval(() => {
      fetchLedgerData();
    }, 3000); // More frequent polling for real-time feel

    return () => clearInterval(pollInterval);
  }, [selectedCustomerId, startDate, endDate]);

  const saveCustomersToBackend = async () => {
    if (!window.electron?.fs?.writeFile) return;

    try {
      const allCustomers = await dbOperations.getAll('customers');
      await window.electron.fs.writeFile(
        'C:/malwa-crm/Data_base/customer/Details.json',
        JSON.stringify(allCustomers, null, 2)
      );
    } catch (error) {
      console.error('Failed to save customers to backend:', error);
    }
  };

  const fetchCustomersWithTransactions = async (allCustomers = []) => {
    try {
      const customersSet = new Set();

      const workingCustomers = [...allCustomers];
      const updatedCustomers = new Map();

      const trackCustomerIdentity = ({ customerId = '', name = '', phone = '' }) => {
        const { customer, matchType } = findCustomerByIdentity(workingCustomers, {
          customerId,
          name,
          phone,
        });

        if (!customer) return;

        customersSet.add(customer.id);

        const patch = buildCustomerIdentityPatch(customer, {
          name,
          phone,
          matchType,
        });

        if (Object.keys(patch).length > 0) {
          const mergedCustomer = { ...customer, ...patch };
          const index = workingCustomers.findIndex((item) => String(item.id) === String(customer.id));
          if (index !== -1) {
            workingCustomers[index] = mergedCustomer;
          }
          updatedCustomers.set(String(customer.id), mergedCustomer);
        }
      };

      const [cashReceipts, sellChallans, jobs, ledgerEntries, payments] = await Promise.all([
        dbOperations.getAll('cash_receipts').catch(() => []),
        dbOperations.getAll('sell_challans').catch(() => []),
        dbOperations.getAll('jobs').catch(() => []),
        dbOperations.getAll('customer_ledger_entries').catch(() => []),
        dbOperations.getAll('payments').catch(() => []),
      ]);

      cashReceipts.forEach((receipt) => {
        trackCustomerIdentity({
          customerId: receipt.customer_id,
          name: receipt.received_from || receipt.name,
          phone: receipt.customer_phone,
        });
      });

      sellChallans.forEach((challan) => {
        trackCustomerIdentity({
          customerId: challan.customer_id,
          name: challan.party_name || challan.customer_name,
          phone: challan.phone || challan.contactNo,
        });
      });

      jobs.forEach((job) => {
        trackCustomerIdentity({
          customerId: job.customer_id,
          name: job.party_name || job.customer_name || job.ownerName,
          phone: job.phone || job.contactNo || job.contact_no || job.customer_phone,
        });
      });

      ledgerEntries.forEach((entry) => {
        trackCustomerIdentity({
          customerId: entry.customer_id,
          name: entry.customer_name || entry.party_name,
          phone: entry.customer_phone,
        });
      });

      payments.forEach((payment) => {
        trackCustomerIdentity({
          customerId: payment.customerId,
          name: payment.customer_name || payment.party_name,
          phone: payment.customer_phone || payment.phone,
        });
      });

      if (updatedCustomers.size > 0) {
        for (const [customerId, customerRecord] of updatedCustomers.entries()) {
          await dbOperations.update('customers', customerId, customerRecord);
        }
        await saveCustomersToBackend();
      }

      const relevantCustomers = workingCustomers.filter((customer) => customersSet.has(customer.id));

      if (selectedCustomerId && !customersSet.has(selectedCustomerId)) {
        const selectedMatch = workingCustomers.find(
          (customer) => String(customer.id) === String(selectedCustomerId)
        );
        if (selectedMatch) {
          relevantCustomers.push(selectedMatch);
          customersSet.add(selectedMatch.id);
        }
      }

      return relevantCustomers;
    } catch (error) {
      console.error('Error fetching customers with transactions:', error);
      return [];
    }
  };

  const fetchCustomers = async () => {
    try {
      const allCustomers = await dbOperations.getAll('customers') || [];
      const relevantCustomers = await fetchCustomersWithTransactions(allCustomers);
      const sorted = relevantCustomers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setCustomers(sorted);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    }
  };

  const loadSelectedCustomer = async () => {
    try {
      const customer = await dbOperations.getById('customers', selectedCustomerId);
      setSelectedCustomer(customer);
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  };

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      let data = [];
      
      try {
        // Try to get data using index first
        data = await dbOperations.getByIndex('customer_ledger_entries', 'customer_id', selectedCustomerId);
      } catch (indexError) {
        // If index doesn't exist, fall back to getting all entries and filtering
        console.warn('customer_id index not found, using fallback method');
        const allEntries = await dbOperations.getAll('customer_ledger_entries');
        data = allEntries.filter(entry => entry.customer_id === selectedCustomerId);
      }
      
      data = Array.isArray(data) ? data : [];

      // Apply date filters
      let filteredData = data;
      if (startDate) {
        filteredData = filteredData.filter(e => String(e.entry_date) >= startDate);
      }
      if (endDate) {
        filteredData = filteredData.filter(e => String(e.entry_date) <= endDate);
      }

      // IMPORTANT: Sort by date in ASCENDING order (oldest first) for correct balance calculation
      filteredData.sort((a, b) => {
        const dateCompare = String(a.entry_date).localeCompare(String(b.entry_date));
        if (dateCompare !== 0) return dateCompare;
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      });

      // Calculate running balance starting from opening balance
      let runningBalance = parseFloat(selectedCustomer?.opening_balance || 0);
      const entriesWithBalance = filteredData.map(entry => {
        runningBalance += parseFloat(entry.debit || 0) - parseFloat(entry.credit || 0);
        return { ...entry, balance: runningBalance };
      });

      // Reverse for display (show most recent first) but keep correct balances
      const entriesForDisplay = entriesWithBalance.reverse();

      setLedgerEntries(entriesForDisplay);
      calculateStats(entriesWithBalance);
    } catch (error) {
      console.error('Error fetching ledger:', error);
      toast.error('Failed to load ledger data');
      setLedgerEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (entries) => {
    const totalDebit = entries.reduce((sum, e) => sum + parseFloat(e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + parseFloat(e.credit || 0), 0);
    
    // Find debit entries older than 15 days that are still outstanding
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    // Calculate outstanding debit (receivables) older than 15 days
    // We need to check all debit entries older than 15 days and see how much is still unpaid
    let outstandingDebit15Plus = 0;
    
    // Get all entries sorted by date
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.entry_date) - new Date(b.entry_date)
    );
    
    // Calculate running balance to find outstanding amount
    let runningDebitOld = 0;
    sortedEntries.forEach(e => {
      const entryDate = new Date(e.entry_date);
      const debitAmt = parseFloat(e.debit || 0);
      const creditAmt = parseFloat(e.credit || 0);
      
      // If entry is older than 15 days and is a debit (sale), add to old debit
      if (entryDate < fifteenDaysAgo && debitAmt > 0) {
        runningDebitOld += debitAmt;
      }
      // Subtract any credit (payment) from running old debit
      if (creditAmt > 0 && runningDebitOld > 0) {
        runningDebitOld -= creditAmt;
        if (runningDebitOld < 0) runningDebitOld = 0;
      }
    });
    
    outstandingDebit15Plus = runningDebitOld;
    
    setStats({
      totalDebit,
      totalCredit,
      outstandingCredit15Plus: outstandingDebit15Plus,
      monthlyData: [],
    });
  };

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return ledgerEntries;

    const term = searchTerm.toLowerCase();
    return ledgerEntries.filter(entry =>
      entry.description?.toLowerCase().includes(term) ||
      entry.reference_type?.toLowerCase().includes(term) ||
      entry.reference_id?.toLowerCase().includes(term) ||
      entry.debit?.toString().includes(term) ||
      entry.credit?.toString().includes(term)
    );
  }, [ledgerEntries, searchTerm]);

  const totals = useMemo(() => {
    return filteredEntries.reduce(
      (acc, entry) => ({
        debit: acc.debit + parseFloat(entry.debit || 0),
        credit: acc.credit + parseFloat(entry.credit || 0),
      }),
      { debit: 0, credit: 0 }
    );
  }, [filteredEntries]);

  const finalBalance = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].balance : 0;

  const formatWorkDescription = (entry) => {
    const singleLine = String(entry?.description || '')
      .replace(/\s*\n+\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!singleLine) return '';

    let cleaned = singleLine
      .replace(/^Payment\s*-\s*/i, '')
      .replace(/^Challan Sale\s*-\s*/i, '')
      .replace(/^Invoice Sale\s*-\s*/i, '');

    const referenceMatch = cleaned.match(/^(?:CHN|INV|RCPT)[^|]*\|\s*[^\s|]+\s*(.*)$/i);
    if (referenceMatch) {
      cleaned = referenceMatch[1].trim();
    }

    return cleaned
      .replace(/^Items:\s*/i, '')
      .replace(/^[|:-]+\s*/, '')
      .trim();
  };

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

  const formatAmountIndian = (value, blankWhenZero = false) => {
    const amount = parseFloat(value || 0);
    if (blankWhenZero && amount === 0) return '';
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const escapeHtml = (value) =>
    String(value ?? '-')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const sanitizeFilePart = (value) => {
    const cleaned = String(value || 'customer')
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_+|_+$/g, '');
    return cleaned || 'customer';
  };

  const getSortedExportEntries = () =>
    [...filteredEntries].sort((a, b) => {
      const dateCompare = String(a.entry_date || '').localeCompare(String(b.entry_date || ''));
      if (dateCompare !== 0) return dateCompare;
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });

  const getExportDateRange = (rows) => {
    const firstEntryDate = rows.length > 0 ? rows[0].entry_date : '';
    const lastEntryDate = rows.length > 0 ? rows[rows.length - 1].entry_date : '';
    const exportStartDate = startDate || firstEntryDate || new Date().toISOString().split('T')[0];
    const exportEndDate = endDate || lastEntryDate || exportStartDate;
    return {
      startDate: exportStartDate,
      endDate: exportEndDate,
      label: `${formatDateForDisplay(exportStartDate, true)} - ${formatDateForDisplay(exportEndDate, true)}`,
    };
  };

  const handleExportCSV = () => {
    if (!selectedCustomer) return;

    const csvRows = [
      ['Customer Ledger Statement'],
      [`Customer: ${selectedCustomer.name || ''}`],
      [`Phone: ${selectedCustomer.phone || ''}`],
      [`Period: ${startDate || 'Start'} to ${endDate || 'End'}`],
      [],
      ['Date', 'Vehicle No', 'Type', 'Challan/Receipt No.', 'Work', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)'],
    ];

    filteredEntries.forEach(entry => {
      csvRows.push([
        new Date(entry.entry_date).toLocaleDateString('en-GB'),
        entry.vehicle_no || '',
        entry.type || entry.reference_type || '',
        entry.challan_no || entry.reference_id || '',
        formatWorkDescription(entry) || '',
        entry.debit || 0,
        entry.credit || 0,
        entry.balance,
      ]);
    });

    csvRows.push([]);
    csvRows.push(['', '', '', '', 'Total', totals.debit.toFixed(2), totals.credit.toFixed(2), finalBalance.toFixed(2)]);

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_ledger_${selectedCustomer.name}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Ledger exported to CSV');
  };

  // Cleanup duplicate payment entries for current customer
  const handleCleanupDuplicates = async () => {
    if (!selectedCustomerId) return;
    
    try {
      const allEntries = await dbOperations.getAll('customer_ledger_entries');
      const customerEntries = allEntries.filter(e => e.customer_id === selectedCustomerId);
      
      // Group payment entries by challan_no + vehicle_no
      const paymentGroups = {};
      const entriesToDelete = [];
      
      customerEntries.forEach(entry => {
        if (entry.type === 'payment') {
          // Extract challan info from description or fields
          let key = '';
          if (entry.challan_no && entry.vehicle_no) {
            key = `${entry.vehicle_no}|${entry.challan_no}`;
          } else if (entry.description) {
            // Try to extract from description patterns
            const vhMatch = entry.description.match(/VH:([^|]+)/);
            const chnMatch = entry.description.match(/CHN:([^|\s)]+)/);
            const challanMatch = entry.description.match(/Challan:\s*([^\s(]+)/);
            
            if (vhMatch && chnMatch) {
              key = `${vhMatch[1]}|${chnMatch[1]}`;
            } else if (challanMatch) {
              key = `challan_${challanMatch[1]}`;
            }
          }
          
          if (key) {
            if (!paymentGroups[key]) {
              paymentGroups[key] = [];
            }
            paymentGroups[key].push(entry);
          }
        }
      });
      
      // For each group with duplicates, keep the one with highest amount and delete rest
      Object.keys(paymentGroups).forEach(key => {
        const group = paymentGroups[key];
        if (group.length > 1) {
          // Sort by credit amount descending
          group.sort((a, b) => parseFloat(b.credit || 0) - parseFloat(a.credit || 0));
          // Keep first (highest), mark rest for deletion
          for (let i = 1; i < group.length; i++) {
            entriesToDelete.push(group[i]);
          }
        }
      });
      
      if (entriesToDelete.length === 0) {
        toast.info('No duplicate entries found');
        return;
      }
      
      // Delete duplicate entries
      for (const entry of entriesToDelete) {
        await dbOperations.delete('customer_ledger_entries', entry.id);
        broadcastDataChange('customer_ledger_entries', 'delete', { id: entry.id, customer_id: entry.customer_id });
      }
      
      // Save to backend
      if (window.electron?.fs?.writeFile) {
        const updatedLedger = await dbOperations.getAll('customer_ledger_entries');
        await window.electron.fs.writeFile(
          'C:/malwa-crm/Data_base/customer/Ledger.json',
          JSON.stringify(updatedLedger, null, 2)
        );
      }
      
      toast.success(`Removed ${entriesToDelete.length} duplicate payment entries`);
      fetchLedgerData();
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Failed to cleanup duplicates');
    }
  };

  // View Challan details from ledger entry
  const handleViewChallan = async (entry) => {
    if (!entry.challan_no && !entry.reference_id && !entry.vehicle_no) {
      toast.info('No challan details available for this entry');
      return;
    }
    
    setChallanLoading(true);
    setChallanModalOpen(true);
    
    try {
      // Try to find challan in multiple tables
      let challan = null;
      
      // Search in challans table first
      try {
        const allChallans = await dbOperations.getAll('challans');
        if (entry.challan_no) {
          challan = allChallans.find(c => 
            c.challan_no === entry.challan_no || 
            c.challanNo === entry.challan_no
          );
        }
        if (!challan && entry.reference_id) {
          challan = allChallans.find(c => c.id === entry.reference_id);
        }
        if (!challan && entry.vehicle_no) {
          challan = allChallans.find(c => 
            (c.vehicle_no === entry.vehicle_no || c.vehicleNo === entry.vehicle_no) &&
            c.date === entry.entry_date
          );
        }
      } catch (err) {
        console.log('Challans table not found, trying jobs');
      }
      
      // If not found in challans, try jobs table
      if (!challan) {
        try {
          const allJobs = await dbOperations.getAll('jobs');
          if (entry.challan_no) {
            challan = allJobs.find(j => 
              j.challanNo === entry.challan_no || 
              j.challan_no === entry.challan_no
            );
          }
          if (!challan && entry.reference_id) {
            challan = allJobs.find(j => j.id === entry.reference_id);
          }
          if (!challan && entry.vehicle_no) {
            challan = allJobs.find(j => 
              (j.vehicleNo === entry.vehicle_no || j.vehicle_no === entry.vehicle_no) &&
              j.date === entry.entry_date
            );
          }
        } catch (err) {
          console.log('Jobs table error:', err);
        }
      }
      
      // Try sell_challans table
      if (!challan) {
        try {
          const sellChallans = await dbOperations.getAll('sell_challans');
          if (entry.challan_no) {
            challan = sellChallans.find(c => 
              c.challan_no === entry.challan_no || 
              c.challanNo === entry.challan_no
            );
          }
          if (!challan && entry.vehicle_no) {
            challan = sellChallans.find(c => 
              (c.vehicle_no === entry.vehicle_no || c.vehicleNo === entry.vehicle_no)
            );
          }
        } catch (err) {
          console.log('Sell challans table not found');
        }
      }
      
      if (challan) {
        console.log('Found challan:', challan);
        setSelectedChallan(challan);
      } else {
        // If no challan found, show entry data as fallback
        console.log('No challan found, showing entry data:', entry);
        // Create a challan-like object from the ledger entry
        const fallbackChallan = {
          challanNo: entry.challan_no || 'N/A',
          date: entry.entry_date,
          vehicleNo: entry.vehicle_no || 'N/A',
          partyName: selectedCustomer?.name || 'N/A',
          grandTotal: entry.debit || 0,
          items: [],
          note: 'Challan details from ledger entry'
        };
        setSelectedChallan(fallbackChallan);
      }
    } catch (error) {
      console.error('Error fetching challan:', error);
      toast.error('Failed to load challan details');
      setChallanModalOpen(false);
    } finally {
      setChallanLoading(false);
    }
  };


  const handleSavePDF = async () => {
    let renderRoot = null;
    try {
      if (!selectedCustomer) {
        toast.error('Please select a customer first');
        return;
      }

      if (filteredEntries.length === 0) {
        toast.error('No ledger entries to export');
        return;
      }

      const sortedRows = getSortedExportEntries();
      const dateRange = getExportDateRange(sortedRows);
      const openingBalance = parseFloat(selectedCustomer.opening_balance || 0);
      const currentBalance = openingBalance + totals.debit - totals.credit;
      const accountNumber = selectedCustomer.code || selectedCustomer.id || '-';

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

      const buildRowHtml = (entry) => {
        const debitAmount = parseFloat(entry.debit || 0);
        const creditAmount = parseFloat(entry.credit || 0);
        const referenceNo = entry.challan_no || entry.invoice_no || entry.bill_no || entry.reference_id || '-';
        return `
          <tr>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 5px;text-align:center;font-size:16px;font-weight:700;line-height:1.22;vertical-align:middle;white-space:normal;">
              ${escapeHtml(formatDateForDisplay(entry.entry_date))}
            </td>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 6px;text-align:center;font-size:16px;font-weight:700;line-height:1.22;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">
              ${escapeHtml(entry.vehicle_no || '-')}
            </td>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 6px;text-align:center;font-size:16px;font-weight:700;line-height:1.22;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;word-break:break-word;text-transform:capitalize;">
              ${escapeHtml(entry.type || entry.reference_type || '-')}
            </td>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 6px;text-align:center;font-size:16px;font-weight:700;line-height:1.22;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">
              ${escapeHtml(referenceNo)}
            </td>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 10px;text-align:center;font-size:16px;font-weight:700;line-height:1.28;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">
              ${escapeHtml(formatWorkDescription(entry) || '-').replace(/\r?\n/g, '<br/>')}
            </td>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 6px;text-align:center;font-size:16px;font-weight:700;line-height:1.22;vertical-align:middle;white-space:normal;">
              ${debitAmount > 0 ? escapeHtml(formatAmountIndian(debitAmount, true)) : ''}
            </td>
            <td style="border:1px solid #333;background:#f2f2f2;padding:8px 6px;text-align:center;font-size:16px;font-weight:700;line-height:1.22;vertical-align:middle;white-space:normal;">
              ${creditAmount > 0 ? escapeHtml(formatAmountIndian(creditAmount, true)) : ''}
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
                  ${escapeHtml(selectedCustomer.name || '-')}
                </div>
                <div style="font-size:16px;font-weight:700;line-height:1.25;">
                  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #333;padding-bottom:4px;">
                    <span>Oppning Balance</span>
                    <span>${escapeHtml(formatAmountIndian(openingBalance))}</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;padding-top:4px;">
                    <span>Total Balance</span>
                    <span>${escapeHtml(formatAmountIndian(currentBalance))}</span>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <div style="padding:${isFirstPage ? '0' : '10px 0 0 0'};flex:1 1 auto;">
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
              <colgroup>
                <col style="width:9%;" />
                <col style="width:11%;" />
                <col style="width:9%;" />
                <col style="width:13%;" />
                <col style="width:36%;" />
                <col style="width:12%;" />
                <col style="width:10%;" />
              </colgroup>
              <thead>
                <tr style="background:#5b9bd5;color:#ffffff;">
                  <th style="border:1px solid #222;padding:6px 5px;text-align:left;font-size:22px;font-weight:700;">Date</th>
                  <th style="border:1px solid #222;padding:6px 5px;text-align:center;font-size:22px;font-weight:700;">Vh. Num.</th>
                  <th style="border:1px solid #222;padding:6px 5px;text-align:center;font-size:22px;font-weight:700;">Type</th>
                  <th style="border:1px solid #222;padding:6px 5px;text-align:center;font-size:20px;font-weight:700;">Challan/Receipt</th>
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
                  Total Amount: ${escapeHtml(formatAmountIndian(totals.debit))}
                </div>
                <div style="border:1px solid #8ea5bc;border-radius:4px;background:#ffffff;padding:6px 8px;">
                  Total Paid: ${escapeHtml(formatAmountIndian(totals.credit))}
                </div>
                <div style="border:1px solid #8ea5bc;border-radius:4px;background:#ffffff;padding:6px 8px;">
                  Final Balance: ${escapeHtml(formatAmountIndian(currentBalance))}
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

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pages.forEach((canvas, index) => {
        if (index > 0) pdf.addPage();
        const imageData = canvas.toDataURL('image/png');
        const maxWidth = pageWidth - 4;
        const maxHeight = pageHeight - 4;
        const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
        const imageWidth = canvas.width * ratio;
        const imageHeight = canvas.height * ratio;
        const x = (pageWidth - imageWidth) / 2;
        const y = (pageHeight - imageHeight) / 2;
        pdf.addImage(imageData, 'PNG', x, y, imageWidth, imageHeight, undefined, 'FAST');
      });

      const filename = `customer_ledger_${sanitizeFilePart(selectedCustomer.name)}_${dateRange.startDate}_to_${dateRange.endDate}.pdf`;
      pdf.save(filename);
      toast.success('Customer ledger PDF generated');
    } catch (error) {
      console.error('Error generating customer ledger PDF:', error);
      toast.error('Failed to save PDF: ' + error.message);
    } finally {
      if (renderRoot && renderRoot.parentNode) {
        renderRoot.parentNode.removeChild(renderRoot);
      }
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Filters and Actions */}
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                Customer Ledger
              </h2>
              {selectedCustomerId && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={fetchLedgerData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleSavePDF}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCleanupDuplicates}
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    title="Remove duplicate payment entries"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Fix Duplicates
                  </Button>
                </div>
              )}
            </div>

            {/* Customer Selection and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Select Customer *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                >
                  <option value="">Choose a customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone && `(${customer.phone})`}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  Only customers linked from challans &amp; payment receipts are shown.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search entries..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Colorful Metric Blocks */}
        {selectedCustomerId && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Total Debit */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">Total Debit (Sales)</p>
                  <p className="text-2xl font-bold">₹{(stats.totalDebit / 1000).toFixed(1)}K</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <TrendingUp className="h-8 w-8" />
                </div>
              </div>
            </div>

            {/* Total Credit */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium mb-1">Total Credit (Payments)</p>
                  <p className="text-2xl font-bold">₹{(stats.totalCredit / 1000).toFixed(1)}K</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <TrendingDown className="h-8 w-8" />
                </div>
              </div>
            </div>

            {/* Outstanding 15+ Days */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium mb-1">Credit 15+ Days Old</p>
                  <p className="text-2xl font-bold">₹{(stats.outstandingCredit15Plus / 1000).toFixed(1)}K</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <AlertCircle className="h-8 w-8" />
                </div>
              </div>
            </div>

            {/* Current Balance */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium mb-1">Current Balance</p>
                  <p className="text-2xl font-bold">
                    ₹{(Math.abs(parseFloat(selectedCustomer?.opening_balance || 0) + stats.totalDebit - stats.totalCredit) / 1000).toFixed(1)}K
                    <span className="text-sm ml-1">{(parseFloat(selectedCustomer?.opening_balance || 0) + stats.totalDebit - stats.totalCredit) > 0 ? '(Dr)' : (parseFloat(selectedCustomer?.opening_balance || 0) + stats.totalDebit - stats.totalCredit) < 0 ? '(Cr)' : ''}</span>
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <DollarSign className="h-8 w-8" />
                </div>
              </div>
            </div>

            {/* Previous Balance (Opening Balance) */}
            <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium mb-1">Previous Balance</p>
                  <p className="text-2xl font-bold">
                    ₹{(Math.abs(parseFloat(selectedCustomer?.opening_balance || 0)) / 1000).toFixed(1)}K
                    <span className="text-sm ml-1">{parseFloat(selectedCustomer?.opening_balance || 0) > 0 ? '(Dr)' : parseFloat(selectedCustomer?.opening_balance || 0) < 0 ? '(Cr)' : ''}</span>
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <Wallet className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Summary Table */}
        {/* Removed - Monthly summary table deleted as per requirements */}

        {/* Customer Info Card */}
        {selectedCustomer && (
          <Card>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Customer Name</p>
                  <p className="font-semibold dark:text-dark-text">{selectedCustomer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="font-semibold dark:text-dark-text">{selectedCustomer.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="font-semibold dark:text-dark-text">{selectedCustomer.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Opening Balance</p>
                  <p className="font-semibold dark:text-dark-text">
                    ₹{parseFloat(selectedCustomer.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Ledger Table */}
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
              Ledger Entries
            </h3>

            {!selectedCustomerId ? (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-gray-400">Please select a customer to view ledger</p>
            </div>
          ) : loading ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading ledger entries...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-gray-400">
                No ledger entries found
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Entries will appear when you create invoices or challans for this customer
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-800 text-left">
                  <tr>
                    <th className="px-2 py-0.5 border-b dark:border-gray-700">Date</th>
                    <th className="px-2 py-0.5 border-b dark:border-gray-700">Vehicle No</th>
                    <th className="px-2 py-0.5 border-b dark:border-gray-700">Type</th>
                    <th className="px-2 py-0.5 border-b dark:border-gray-700">Challan/Receipt No.</th>
                    <th className="px-2 py-0.5 border-b dark:border-gray-700">Work</th>
                    <th className="px-2 py-0.5 text-right border-b dark:border-gray-700">Debit (₹)</th>
                    <th className="px-2 py-0.5 text-right border-b dark:border-gray-700">Credit (₹)</th>
                    <th className="px-2 py-0.5 text-right border-b dark:border-gray-700">Balance (₹)</th>
                    <th className="px-2 py-0.5 text-center border-b dark:border-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, index) => (
                    <tr
                      key={entry.id || index}
                      className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-2 py-0.5 text-gray-700 dark:text-gray-300">
                        {new Date(entry.entry_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-2 py-0.5 text-gray-700 dark:text-gray-300 font-medium">
                        {entry.vehicle_no || '-'}
                      </td>
                      <td className="px-2 py-0.5 text-gray-700 dark:text-gray-300">
                        <span className={`px-2 py-1 rounded text-xs ${
                          entry.type === 'invoice' || entry.reference_type === 'invoice' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                          entry.type === 'challan' || entry.type === 'sale' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                          entry.type === 'payment' || entry.reference_type === 'payment' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          entry.type === 'discount' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {entry.type || entry.reference_type || 'Entry'}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 text-gray-700 dark:text-gray-300 font-medium">
                        {entry.challan_no || entry.reference_id || '-'}
                      </td>
                      <td className="px-2 py-0.5 text-gray-700 dark:text-gray-300">
                        <p className="whitespace-normal break-words leading-5">
                          {formatWorkDescription(entry) || '-'}
                        </p>
                      </td>
                      <td className="px-2 py-0.5 text-right text-gray-900 dark:text-white font-medium">
                        {entry.debit > 0 ? `₹ ${parseFloat(entry.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-2 py-0.5 text-right text-gray-900 dark:text-white font-medium">
                        {entry.credit > 0 ? `₹ ${parseFloat(entry.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className={`px-3 py-1.5 text-right font-bold ${
                        entry.balance > 0 ? 'text-red-600' : 
                        entry.balance < 0 ? 'text-green-600' : 
                        'text-gray-900 dark:text-white'
                      }`}>
                        ₹ {Math.abs(entry.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-0.5 text-center">
                        {(entry.type === 'sale' || entry.type === 'challan' || entry.type === 'invoice' || entry.reference_type === 'challan') && (
                          <button
                            onClick={() => handleViewChallan(entry)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="View Challan Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold">
                  <tr>
                    <td colSpan="5" className="px-2 py-0.5 border-t dark:border-gray-700 text-right dark:text-dark-text">
                      Totals:
                    </td>
                    <td className="py-1 px-2 text-right border-t dark:border-gray-700 dark:text-dark-text">
                      ₹ {totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-1 px-2 text-right border-t dark:border-gray-700 dark:text-dark-text">
                      ₹ {totals.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`py-1 px-2 text-right border-t dark:border-gray-700 ${
                      finalBalance > 0 ? 'text-red-600' : 
                      finalBalance < 0 ? 'text-green-600' : 
                      'text-gray-900 dark:text-dark-text'
                    }`}>
                      ₹ {Math.abs(finalBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      {finalBalance > 0 ? ' (Dr)' : finalBalance < 0 ? ' (Cr)' : ''}
                    </td>
                    <td className="py-1 px-2 border-t dark:border-gray-700"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          </div>
        </Card>
      </div>

      {/* Challan Details Modal */}
      <Modal
        isOpen={challanModalOpen}
        onClose={() => {
          setChallanModalOpen(false);
          setSelectedChallan(null);
        }}
        title={`Challan Details - ${selectedChallan?.challanNo || selectedChallan?.challan_no || ''}`}
        size="xl"
      >
        {challanLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : selectedChallan ? (
          <div className="space-y-6">
            {/* Header with Actions */}
            <div className="flex justify-end gap-2 pb-4 border-b dark:border-gray-700">
              <Button variant="outline" size="sm" onClick={() => {
                // Print challan
                const printContent = `
                  <html>
                  <head>
                    <title>Challan - ${selectedChallan.challanNo || selectedChallan.challan_no}</title>
                    <style>
                      body { font-family: Arial, sans-serif; padding: 20px; }
                      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                      th { background-color: #f5f5f5; }
                      .header { margin-bottom: 20px; }
                      .totals { margin-top: 20px; text-align: right; }
                      .text-right { text-align: right; }
                    </style>
                  </head>
                  <body>
                    <div class="header">
                      <h2>Challan: ${selectedChallan.challanNo || selectedChallan.challan_no || 'N/A'}</h2>
                      <p>Date: ${selectedChallan.date ? new Date(selectedChallan.date).toLocaleDateString('en-GB') : 'N/A'}</p>
                      <p>Vehicle No: ${selectedChallan.vehicleNo || selectedChallan.vehicle_no || 'N/A'}</p>
                      <p>Party Name: ${selectedChallan.partyName || selectedChallan.party_name || 'N/A'}</p>
                    </div>
                    <table>
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Item Name</th>
                          <th>HSN</th>
                          <th class="text-right">Qty</th>
                          <th class="text-right">Rate</th>
                          <th class="text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${(selectedChallan.items || []).map((item, idx) => `
                          <tr>
                            <td>${idx + 1}</td>
                            <td>${item.name || item.itemName || item.productName || '-'}</td>
                            <td>${item.hsn || '-'}</td>
                            <td class="text-right">${item.quantity || item.qty || 0}</td>
                            <td class="text-right">₹${parseFloat(item.rate || 0).toFixed(2)}</td>
                            <td class="text-right">₹${parseFloat(item.amount || (item.quantity || item.qty || 0) * (item.rate || 0)).toFixed(2)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                    <div class="totals">
                      <p><strong>Subtotal:</strong> ₹${parseFloat(selectedChallan.subtotal || selectedChallan.subTotal || 0).toFixed(2)}</p>
                      ${(selectedChallan.discount || 0) > 0 ? `<p><strong>Discount:</strong> -₹${parseFloat(selectedChallan.discount || 0).toFixed(2)}</p>` : ''}
                      <p style="font-size: 18px;"><strong>Grand Total:</strong> ₹${parseFloat(selectedChallan.grandTotal || selectedChallan.total || selectedChallan.finalTotal || 0).toFixed(2)}</p>
                    </div>
                  </body>
                  </html>
                `;
                const printWindow = window.open('', '_blank');
                printWindow.document.write(printContent);
                printWindow.document.close();
                printWindow.print();
              }}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>

              <Button variant="outline" size="sm" onClick={() => {
                // Save PDF
                const doc = new jsPDF();
                doc.setFontSize(16);
                doc.text('Challan Details', 14, 15);
                doc.setFontSize(10);
                doc.text(`Challan No: ${selectedChallan.challanNo || selectedChallan.challan_no || 'N/A'}`, 14, 25);
                doc.text(`Date: ${selectedChallan.date ? new Date(selectedChallan.date).toLocaleDateString('en-GB') : 'N/A'}`, 14, 32);
                doc.text(`Vehicle No: ${selectedChallan.vehicleNo || selectedChallan.vehicle_no || 'N/A'}`, 14, 39);
                doc.text(`Party Name: ${selectedChallan.partyName || selectedChallan.party_name || 'N/A'}`, 14, 46);
                doc.text(`Grand Total: Rs.${parseFloat(selectedChallan.grandTotal || selectedChallan.total || 0).toFixed(2)}`, 14, 53);
                
                const vehicleNo = (selectedChallan.vehicleNo || selectedChallan.vehicle_no || 'no-vehicle').replace(/[^a-zA-Z0-9]/g, '-');
                doc.save(`Challan_${vehicleNo}_${new Date().toISOString().split('T')[0]}.pdf`);
                toast.success('PDF saved successfully');
              }}>
                <Download className="h-4 w-4 mr-1" />
                Save PDF
              </Button>
            </div>

            {/* Challan Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Challan No</label>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {selectedChallan.challanNo || selectedChallan.challan_no || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</label>
                <p className="text-gray-900 dark:text-white">
                  {selectedChallan.date ? new Date(selectedChallan.date).toLocaleDateString('en-GB') : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Vehicle No</label>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {selectedChallan.vehicleNo || selectedChallan.vehicle_no || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Party Name</label>
                <p className="text-gray-900 dark:text-white">
                  {selectedChallan.partyName || selectedChallan.party_name || selectedCustomer?.name || 'N/A'}
                </p>
              </div>
            </div>

            {/* Items Table */}
            {selectedChallan.items && selectedChallan.items.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items</h3>
                <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="p-2 text-left border-b dark:border-gray-700">S.No</th>
                      <th className="p-2 text-left border-b dark:border-gray-700">Product Name</th>
                      <th className="p-2 text-left border-b dark:border-gray-700">HSN</th>
                      <th className="p-2 text-right border-b dark:border-gray-700">Quantity</th>
                      <th className="p-2 text-right border-b dark:border-gray-700">Rate</th>
                      <th className="p-2 text-right border-b dark:border-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedChallan.items.map((item, index) => (
                      <tr key={index} className="border-b dark:border-gray-700">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2">{item.productName || item.name || item.itemName || item.item_name || 'N/A'}</td>
                        <td className="p-2">{item.hsn || '-'}</td>
                        <td className="p-2 text-right">{item.qty || item.quantity || 0}</td>
                        <td className="p-2 text-right">₹{parseFloat(item.rate || 0).toFixed(2)}</td>
                        <td className="p-2 text-right">₹{parseFloat(item.amount || ((item.qty || item.quantity || 0) * (item.rate || 0))).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Financial Details */}
            <div className="flex justify-end">
              <div className="w-96 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal</label>
                    <p className="text-gray-900 dark:text-white">₹{parseFloat(selectedChallan.subtotal || selectedChallan.subTotal || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Tax</label>
                    <p className="text-gray-900 dark:text-white">₹{parseFloat(selectedChallan.tax || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Discount</label>
                    <p className="text-gray-900 dark:text-white">₹{parseFloat(selectedChallan.discount || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Advance Payment</label>
                    <p className="text-gray-900 dark:text-white">₹{parseFloat(selectedChallan.advance_payment || selectedChallan.advancePayment || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</label>
                    <p className="text-gray-900 dark:text-white font-bold text-lg">₹{parseFloat(selectedChallan.grandTotal || selectedChallan.total || selectedChallan.finalTotal || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Received</label>
                    <p className="text-gray-900 dark:text-white font-medium">₹{parseFloat(selectedChallan.manualPayment || selectedChallan.payment_received || 0).toFixed(2)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Balance Due</label>
                    <p className="font-bold text-red-600 dark:text-red-400">
                      ₹{(parseFloat(selectedChallan.grandTotal || selectedChallan.total || selectedChallan.finalTotal || 0) - parseFloat(selectedChallan.manualPayment || selectedChallan.payment_received || selectedChallan.advance_payment || 0)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>Challan details not found</p>
          </div>
        )}
      </Modal>
    </>
  );
};

export default CustomerLedgerTab;
