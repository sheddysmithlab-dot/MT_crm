import { useState, useEffect } from "react";
import { toItemsArray } from "@/utils/jsonField";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Save, Trash2, Receipt, Printer } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import JobSearchBar from "@/components/jobs/JobSearchBar";
import JobReportList from "@/components/jobs/JobReportList";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { AssignedManagerTableRow } from "@/components/jobs/AssignedManagerLine";
import { dbOperations } from "@/lib/db";
import { createStockMovement } from "@/utils/dataFlow";
import { toast } from "sonner";
import { openPrintPreview, PRINT_PRESETS } from '@/utils/printHelpers';
import useMultiplierStore from "@/store/multiplierStore";
import { broadcastDataChange } from "@/utils/dataSync";
import { saveRateListMemory } from "@/utils/rateListMemory";
import useDeleteHistoryStore from '@/store/deleteHistoryStore';
import { getAssignedManagerFields, normalizeAssignedManager } from "@/utils/jobAssignment";
import {
  findCustomerByIdentity,
  buildCustomerIdentityPatch,
  createCustomerPayloadFromIdentity,
} from "@/utils/customerIdentity";

// Cash Receipt Modal Component
const CashReceiptModal = ({
  isOpen,
  onClose,
  onSubmit,
  customerName,
  vehicleNo,
  maxAmount,
  advancePaid = 0,
  finalSettledAmount = 0,
}) => {
  const initialSettledAmount = parseFloat(finalSettledAmount || 0) || 0;
  const [formData, setFormData] = useState({
    name: customerName || "",
    vehicleNo: vehicleNo || "",
    finalSettledAmount: initialSettledAmount.toFixed(2),
    paymentType: "Cash",
    amount: "",
    status: "Received",
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (customerName) {
      setFormData(prev => ({ ...prev, name: customerName }));
    }
  }, [customerName]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, vehicleNo: vehicleNo || "" }));
  }, [vehicleNo]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      finalSettledAmount: (parseFloat(finalSettledAmount || 0) || 0).toFixed(2),
    }));
  }, [finalSettledAmount]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const receivableAmount = parseFloat(formData.finalSettledAmount) || 0;
    const paymentAmount = parseFloat(formData.amount) || 0;
    if (receivableAmount <= 0) {
      toast.error("Please enter a valid final settled amount");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) === 0) {
      toast.error("Please enter a valid amount (cannot be 0)");
      return;
    }
    // Only check max amount for positive values
    if (paymentAmount > 0 && paymentAmount > receivableAmount) {
      toast.error(`Amount cannot exceed receivable amount: ₹${receivableAmount.toFixed(2)}`);
      return;
    }
    onSubmit(formData);
    setFormData({
      name: customerName || "",
      vehicleNo: vehicleNo || "",
      finalSettledAmount: (parseFloat(finalSettledAmount || 0) || 0).toFixed(2),
      paymentType: "Cash",
      amount: "",
      status: "Received",
      date: new Date().toISOString().split('T')[0],
    });
  };

  const resetForm = () => {
    setFormData({
      name: customerName || "",
      vehicleNo: vehicleNo || "",
      finalSettledAmount: (parseFloat(finalSettledAmount || 0) || 0).toFixed(2),
      paymentType: "Cash",
      amount: "",
      status: "Received",
      date: new Date().toISOString().split('T')[0],
    });
  };

  const currentReceivableAmount = parseFloat(formData.finalSettledAmount) || maxAmount || 0;
  const currentPaymentAmount = parseFloat(formData.amount) || 0;
  const currentDueAmount = Math.max(0, currentReceivableAmount - currentPaymentAmount);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cash Receipt">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Customer Name *</label>
          <input
            type="text"
            value={formData.name}
            readOnly
            className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Vehicle Number</label>
          <input
            type="text"
            value={formData.vehicleNo}
            readOnly
            className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Advance Paid</label>
            <input
              type="text"
              value={`₹${parseFloat(advancePaid || 0).toFixed(2)}`}
              readOnly
              className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Final Settled Amount</label>
            <input
              type="number"
              value={formData.finalSettledAmount}
              onChange={(e) => setFormData({ ...formData, finalSettledAmount: e.target.value })}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              min="0"
              step="0.01"
            />
            {false && (
            <input
              type="text"
              value={`₹${parseFloat(finalSettledAmount || 0).toFixed(2)}`}
              readOnly
              className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
            />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Payment Type</label>
            <select
              value={formData.paymentType}
              onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
              <option value="Cheque">Cheque</option>
              <option value="UPI">UPI</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Amount (₹) *</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter amount"
              step="0.01"
              min="0"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Receivable Amount: ₹{currentReceivableAmount.toFixed(2)}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Due Amount</label>
          <input
            type="text"
            value={`₹${currentDueAmount.toFixed(2)}`}
            readOnly
            className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-600">
          <Button type="button" variant="secondary" onClick={() => { resetForm(); onClose(); }}>
            Cancel
          </Button>
          <Button type="submit">
            Submit Receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ChalanStep = ({ registerOnNext }) => {
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [jobCtx, setJobCtx] = useState({ vehicleNo: "", partyName: "", contactNo: "", assignedManager: null });
  const [isCashReceiptModalOpen, setIsCashReceiptModalOpen] = useState(false);
  const [challanNo, setChallanNo] = useState(""); // Challan number state
  const [challanDate, setChallanDate] = useState(getTodayString());

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const data = await dbOperations.getAll('sell_challans');
      const sorted = (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecords(sorted);
      setFilteredRecords(sorted);
    } catch (e) {
      console.error('Failed to load challans:', e);
    }
  };

  const findMatchingChallanRecord = (challans, {
    challanNumber = '',
    vehicleNo = '',
    partyName = '',
    date = '',
  } = {}) => {
    const normalizedChallanNumber = String(challanNumber || '').trim();
    const normalizedVehicle = normalizeReceiptLookup(vehicleNo);
    const normalizedParty = normalizeReceiptLookup(partyName);
    const normalizedDate = String(date || '').trim();

    if (normalizedChallanNumber) {
      const directMatch = challans.find(
        (record) => String(record.challan_no || '').trim() === normalizedChallanNumber
      );
      if (directMatch) return directMatch;
    }

    if (!normalizedVehicle || !normalizedParty || !normalizedDate) {
      return null;
    }

    return challans.find((record) =>
      normalizeReceiptLookup(record.vehicle_no) === normalizedVehicle &&
      normalizeReceiptLookup(record.party_name) === normalizedParty &&
      String(record.date || '').trim() === normalizedDate
    );
  };

  const buildPaymentReceiptUpdates = (receipts = [], settledAmount = 0) =>
    receipts
      .map((receipt) => {
        const amount = parseFloat(receipt.amount || 0) || 0;
        const finalSettledAmount = parseFloat(receipt.final_settled_amount || settledAmount || 0) || 0;

        return {
          id: receipt.id,
          receipt_no: receipt.receipt_no || '',
          date: receipt.receipt_date || receipt.date || '',
          amount,
          payment_mode: receipt.payment_mode || '',
          final_settled_amount: finalSettledAmount,
          due_amount: Math.max(0, parseFloat(receipt.due_amount ?? finalSettledAmount - amount) || 0),
        };
      })
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

  // Generate challan number
  const generateChallanNo = async (overrides = {}) => {
    try {
      const effectiveDate = overrides.date || challanDate || getTodayString();
      const effectiveVehicle = overrides.vehicleNo ?? jobCtx.vehicleNo;
      const effectiveParty = overrides.partyName ?? jobCtx.partyName;
      const year = new Date(effectiveDate || getTodayString()).getFullYear();
      const prefix = `CHN/${year}/`;
      
      const allChallans = await dbOperations.getAll('sell_challans');
      const existingMatchingChallan = findMatchingChallanRecord(allChallans, {
        challanNumber: overrides.challanNumber || challanNo,
        vehicleNo: effectiveVehicle,
        partyName: effectiveParty,
        date: effectiveDate,
      });

      if (existingMatchingChallan?.challan_no) {
        setChallanNo(existingMatchingChallan.challan_no);
        return existingMatchingChallan.challan_no;
      }

      const currentYearChallans = allChallans.filter(
        ch => ch.challan_no && ch.challan_no.startsWith(prefix)
      );
      
      let nextSeq = 1;
      if (currentYearChallans.length > 0) {
        const sequences = currentYearChallans.map(ch => {
          const parts = ch.challan_no.split('/');
          return parseInt(parts[2]) || 0;
        });
        nextSeq = Math.max(...sequences) + 1;
      }
      
      const newChallanNo = `${prefix}${nextSeq.toString().padStart(3, '0')}`;
      setChallanNo(newChallanNo);
      return newChallanNo;
    } catch (error) {
      console.error('Failed to generate challan number:', error);
      const fallback = `CHN/${new Date().getFullYear()}/001`;
      setChallanNo(fallback);
      return fallback;
    }
  };

  // 🔧 Backend Save Function - Saves challans to JSON file
  const saveChallansToBackend = async () => {
    if (!window.electron?.fs?.writeFile) {
      console.log('⚠️ Electron not available - skipping backend save');
      return;
    }
    
    try {
      const allChallans = await dbOperations.getAll('sell_challans');
      const filePath = 'C:/malwa-crm/Data_base/jobs/ChalanStep.json';
      await window.electron.fs.writeFile(
        filePath,
        JSON.stringify(allChallans, null, 2)
      );
      console.log('✅ Challans saved to backend:', filePath);
    } catch (error) {
      console.error('❌ Failed to save challans to backend:', error);
    }
  };

  const handleSearch = (filters) => {
    let filtered = [...records];
    if (filters.vehicleNo) {
      filtered = filtered.filter(r => r.vehicle_no && r.vehicle_no.toLowerCase().includes(filters.vehicleNo.toLowerCase()));
    }
    if (filters.partyName) {
      filtered = filtered.filter(r => r.party_name && r.party_name.toLowerCase().includes(filters.partyName.toLowerCase()));
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(r => r.date && r.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(r => r.date && r.date <= filters.dateTo);
    }
    setFilteredRecords(filtered);
  };

  const handleReset = () => {
    setFilteredRecords(records);
  };

  const handleEditRecord = (record) => {
    try {
      // All challan items (estimate + extra work) are merged into record.items when saved.
      // Load them ALL into jobSheetEstimate so they display correctly after reload.
      const loadedItems = toItemsArray(record.items).map(item => ({
        item: item.productName,
        cost: item.rate,
        multiplier: item.qty,
        category: item.category || ''
      }));
      localStorage.setItem('jobSheetEstimate', JSON.stringify(loadedItems));

      // CRITICAL: clear extraWork so the running job's extra work doesn't bleed into this old challan.
      // Old challans have everything in record.items — there is no separate extra_work array.
      localStorage.setItem('extraWork', JSON.stringify([]));

      // Persist all other challan fields so they survive the reload
      const editContext = {
        discount:             record.discount             ?? 0,
        advance_payment:      record.advance_payment      ?? 0,
        round_off:            record.round_off            ?? 0,
        payment_status:       record.payment_status       || 'pending',
        payment_received:     record.payment_received     ?? 0,
        // Older challans never persisted final_settled_amount — for those the
        // settled figure lives in `total` (what the report list shows). Fall
        // back to it so edit shows the saved amount instead of recomputing it
        // from the line items.
        final_settled_amount: record.final_settled_amount ?? record.total ?? '',
        status:               record.status               || 'issued',
        remark:               record.remark               || '',
        create_invoice:       record.create_invoice       ?? false,
      };
      localStorage.setItem('challanEditContext', JSON.stringify(editContext));

      // Use the SAME fallback chain as JobReportList so party/vehicle details that
      // were stored under alternate keys (older/restored/migrated records) still
      // load on edit. Also default to '' so JSON.stringify never drops the keys.
      const ctx = {
        vehicleNo:       record.vehicle_no || record.vehicleNo || record.vehicleNumber || record.vehicle_number || '',
        partyName:       record.party_name || record.partyName || record.ownerName || record.owner_name || record.customerName || record.customer_name || '',
        contactNo:       record.phone || record.contactNo || record.phone_number || record.phoneNumber || record.customer_phone || '',
        challanNo:       record.challan_no || '',
        challanDate:     record.date || getTodayString(),
        assignedManager: normalizeAssignedManager(record),
      };
      localStorage.setItem('jobsContext', JSON.stringify(ctx));

      // Tell the Jobs module's draft-reset NOT to wipe what we just loaded:
      // this reload is an intentional edit, not a fresh/direct open.
      sessionStorage.setItem('jobFlowResume', '1');

      toast.success('Labour Bill loaded successfully');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => window.location.reload(), 300);
    } catch (error) {
      console.error('Failed to load record:', error);
      toast.error('Failed to load record');
    }
  };

  const handleDeleteRecord = async (id) => {
    try {
      // Get challan details before deleting
      const challan = await dbOperations.getById('sell_challans', id);
      
      // Track in delete history
      const { addDeletedItem } = useDeleteHistoryStore.getState();
      if (challan) {
        addDeletedItem('sell_challans', challan);
      }
      
      // Delete the challan
      await dbOperations.delete('sell_challans', id);
      await saveChallansToBackend();
      
      // Delete related ledger entries
      if (challan && challan.customer_id) {
        try {
          const allLedgerEntries = await dbOperations.getAll('customer_ledger_entries');
          
          // Find and delete ledger entries for this challan
          const ledgerEntriesToDelete = allLedgerEntries.filter(entry => 
            entry.customer_id === challan.customer_id &&
            entry.reference_type === 'challan' &&
            (
              (challan.challan_no && entry.challan_no === challan.challan_no && entry.vehicle_no === challan.vehicle_no) ||
              entry.reference_id === id
            )
          );
          
          console.log('Deleting ledger entries for challan:', ledgerEntriesToDelete.length);
          
          for (const entry of ledgerEntriesToDelete) {
            await dbOperations.delete('customer_ledger_entries', entry.id);
            broadcastDataChange('customer_ledger_entries', 'delete', { id: entry.id, customer_id: entry.customer_id });
          }
          
          // Save ledger to backend
          if (window.electron?.fs?.writeFile) {
            const updatedLedger = await dbOperations.getAll('customer_ledger_entries');
            await window.electron.fs.writeFile(
              'C:/malwa-crm/Data_base/customer/Ledger.json',
              JSON.stringify(updatedLedger, null, 2)
            );
            console.log('✅ Ledger entries deleted and saved to backend');
          }
        } catch (ledgerError) {
          console.error('Failed to delete ledger entries:', ledgerError);
        }
      }
      
      toast.success('Labour Bill deleted successfully');
      await loadRecords();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete challan');
    }
  };

  const normalizeReceiptLookup = (value) => String(value || '').trim().toLowerCase();

  useEffect(() => {
    generateChallanNo({
      vehicleNo: jobCtx.vehicleNo,
      partyName: jobCtx.partyName,
      date: challanDate,
    });
  }, [jobCtx.vehicleNo, jobCtx.partyName, challanDate, records.length]);

  const saveCustomersToBackend = async () => {
    if (!window.electron?.fs?.writeFile) return;

    try {
      const allCustomers = await dbOperations.getAll('customers');
      await window.electron.fs.writeFile(
        'C:/malwa-crm/Data_base/customer/Details.json',
        JSON.stringify(allCustomers, null, 2)
      );
      console.log('✅ Customers saved to backend');
    } catch (error) {
      console.error('❌ Failed to save customers to backend:', error);
    }
  };

  const ensureCustomerAccount = async ({ customerId = '', name = '', phone = '' }) => {
    const trimmedName = String(name || '').trim();
    const trimmedPhone = String(phone || '').trim();
    const customers = await dbOperations.getAll('customers');
    const { customer: matchedCustomer, matchType } = findCustomerByIdentity(customers, {
      customerId,
      name: trimmedName,
      phone: trimmedPhone,
    });

    if (matchedCustomer) {
      const patch = buildCustomerIdentityPatch(matchedCustomer, {
        name: trimmedName,
        phone: trimmedPhone,
        matchType,
      });

      if (Object.keys(patch).length > 0) {
        const updatedCustomer = { ...matchedCustomer, ...patch };
        await dbOperations.update('customers', matchedCustomer.id, updatedCustomer);
        await saveCustomersToBackend();
        broadcastDataChange('customers', 'update', updatedCustomer);
        return { customer: updatedCustomer, created: false, updated: true };
      }

      return { customer: matchedCustomer, created: false, updated: false };
    }

    if (!trimmedName && !trimmedPhone) {
      return { customer: null, created: false, updated: false };
    }

    const newCustomer = await dbOperations.insert(
      'customers',
      createCustomerPayloadFromIdentity({
        name: trimmedName,
        phone: trimmedPhone,
      })
    );

    await saveCustomersToBackend();
    broadcastDataChange('customers', 'add', newCustomer);
    return { customer: newCustomer, created: true, updated: false };
  };

  const getEstimateAdvancePaid = async (vehicleNo, partyName, date) => {
    try {
      const estimates = await dbOperations.getAll('estimates');
      const normalizedVehicle = normalizeReceiptLookup(vehicleNo);
      const normalizedParty = normalizeReceiptLookup(partyName);
      const normalizedDate = String(date || '').trim();

      const matchingEstimate =
        estimates.find((estimate) =>
          normalizeReceiptLookup(estimate.vehicle_no) === normalizedVehicle &&
          normalizeReceiptLookup(estimate.party_name) === normalizedParty &&
          String(estimate.date || '').trim() === normalizedDate
        ) ||
        estimates.find((estimate) =>
          normalizeReceiptLookup(estimate.vehicle_no) === normalizedVehicle &&
          normalizeReceiptLookup(estimate.party_name) === normalizedParty
        ) ||
        estimates.find((estimate) =>
          normalizeReceiptLookup(estimate.vehicle_no) === normalizedVehicle &&
          String(estimate.date || '').trim() === normalizedDate
        );

      return parseFloat(matchingEstimate?.advance_payment || advancePayment || 0) || 0;
    } catch (error) {
      console.error('Failed to fetch estimate advance payment:', error);
      return parseFloat(advancePayment || 0) || 0;
    }
  };

  // Handle Cash Receipt submission
  const handleCashReceiptSubmit = async (receiptData) => {
    try {
      const { customer } = await ensureCustomerAccount({
        name: receiptData.name || jobCtx.partyName,
        phone: jobCtx.contactNo,
      });

      if (!customer) {
        toast.error('Customer name or phone is required for payment receipt');
        return;
      }

      const amount = parseFloat(receiptData.amount);
      const vehicleNo = jobCtx.vehicleNo || '';
      const entryDate = receiptData.date;
      const estimateAdvancePaid = await getEstimateAdvancePaid(
        vehicleNo,
        receiptData.name || jobCtx.partyName,
        jobCtx.date || entryDate
      );
      const settledAmount = parseFloat(receiptData.finalSettledAmount || receivableAmount || finalTotal || 0) || 0;
      const allChallans = await dbOperations.getAll('sell_challans');
      const matchingChallan = findMatchingChallanRecord(allChallans, {
        challanNumber: challanNo,
        vehicleNo,
        partyName: receiptData.name || jobCtx.partyName,
        date: challanDate || getTodayString(),
      });
      const currentPaymentReceived = parseFloat(matchingChallan?.payment_received || manualPayment || 0) || 0;
      const updatedPaymentReceived = currentPaymentReceived + amount;
      let dueAmount = Math.max(0, settledAmount - updatedPaymentReceived);
      setSettledAmountOverride(settledAmount);

      // Save to cash receipts IndexedDB (for Accounts/Cash Receipt page)
      const receiptNo = `CR${Date.now()}`;
      const cashReceiptEntry = {
        id: `cr_${Date.now()}`,
        receipt_no: receiptNo,
        receipt_date: receiptData.date,
        challan_date: challanDate || getTodayString(),
        customer_id: customer.id,
        received_from: receiptData.name,
        amount: amount,
        payment_mode: receiptData.paymentType?.toLowerCase() || 'cash',
        particulars: `Payment for Challan - ${challanNo}`,
        notes: `Vehicle: ${jobCtx.vehicleNo || 'N/A'}`,
        source: 'challan',
        challan_no: challanNo,
        vehicle_no: jobCtx.vehicleNo || '',
        advance_paid: estimateAdvancePaid,
        final_settled_amount: settledAmount,
        due_amount: dueAmount,
        customer_phone: jobCtx.contactNo || customer.phone || '',
        created_at: new Date().toISOString(),
      };
      await dbOperations.insert('cash_receipts', cashReceiptEntry);

      if (matchingChallan) {
        const existingReceiptUpdates = Array.isArray(matchingChallan.payment_receipt_updates)
          ? matchingChallan.payment_receipt_updates
          : [];
        const nextReceiptUpdates = [
          ...existingReceiptUpdates,
          ...buildPaymentReceiptUpdates([cashReceiptEntry], settledAmount),
        ];
        await dbOperations.update('sell_challans', matchingChallan.id, {
          final_settled_amount: settledAmount,
          payment_received: updatedPaymentReceived,
          balance_due: dueAmount,
          due_amount: dueAmount,
          payment_receipt_updates: nextReceiptUpdates,
        });
        await saveChallansToBackend();
        broadcastDataChange('sell_challans', 'update', {
          id: matchingChallan.id,
          challan_no: matchingChallan.challan_no,
        });
      }
      
      // Also save to localStorage for backward compatibility
      const cashReceipts = JSON.parse(localStorage.getItem('cashReceipts') || '[]');
      const newReceipt = {
        id: cashReceiptEntry.id,
        name: receiptData.name,
        customer_id: customer.id,
        vehicleNo: jobCtx.vehicleNo || 'N/A',
        purpose: `Payment for Challan - ${challanNo}`,
        paymentType: receiptData.paymentType,
        amount: amount,
        advancePaid: estimateAdvancePaid,
        finalSettledAmount: settledAmount,
        dueAmount: dueAmount,
        customerPhone: jobCtx.contactNo || customer.phone || '',
        status: 'Received',
        date: receiptData.date,
        source: 'challan',
        challan_no: challanNo,
      };
      cashReceipts.push(newReceipt);
      localStorage.setItem('cashReceipts', JSON.stringify(cashReceipts));
      
      // Save cash receipts to backend
      if (window.electron?.fs?.writeFile) {
        try {
          const allReceipts = await dbOperations.getAll('cash_receipts');
          await window.electron.fs.writeFile(
            'C:/malwa-crm/Data_base/Accounts_Module/cash-receipts.json',
            JSON.stringify(allReceipts, null, 2)
          );
          console.log('✅ Cash receipts saved to backend');
        } catch (err) {
          console.error('❌ Failed to save cash receipts to backend:', err);
        }
      }

      // Update manual payment amount
      setManualPayment(updatedPaymentReceived);

      toast.success(`Cash receipt of ₹${amount.toFixed(2)} recorded successfully`);
      setIsCashReceiptModalOpen(false);
    } catch (error) {
      console.error('Cash receipt error:', error);
      toast.error('Failed to record cash receipt');
    }
  };

  const [jobSheetEstimate, setJobSheetEstimate] = useState([]);
  const [extraWork, setExtraWork] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [advancePayment, setAdvancePayment] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [manualPayment, setManualPayment] = useState(0);
  const [settledAmountOverride, setSettledAmountOverride] = useState('');
  const [createInvoice, setCreateInvoice] = useState(false);
  const [completionStatus] = useState('completed');
  const [completionRemark, setCompletionRemark] = useState('');

  useEffect(() => {
    const estimateData = JSON.parse(localStorage.getItem("jobSheetEstimate") || "[]");
    const extraData    = JSON.parse(localStorage.getItem("extraWork")        || "[]");

    setJobSheetEstimate(estimateData);
    setExtraWork(extraData);

    // If we just reloaded after editing an old challan, restore its specific fields
    const editCtxRaw = localStorage.getItem('challanEditContext');
    if (editCtxRaw) {
      try {
        const ec = JSON.parse(editCtxRaw);
        setDiscount(ec.discount ?? 0);
        setAdvancePayment(ec.advance_payment ?? 0);
        setRoundOff(ec.round_off ?? 0);
        setPaymentStatus(ec.payment_status || 'pending');
        setManualPayment(ec.payment_received ?? 0);
        setSettledAmountOverride(ec.final_settled_amount ?? '');
        // status is always 'completed' for challans
        setCompletionRemark(ec.remark || '');
        setCreateInvoice(ec.create_invoice ?? false);
        // Consume it so a future fresh load doesn't reuse old values
        localStorage.removeItem('challanEditContext');
      } catch (e) {
        console.error('Failed to parse challanEditContext:', e);
        localStorage.removeItem('challanEditContext');
      }
    } else {
      // Normal forward flow — load from estimate context
      try {
        const estimateContext = localStorage.getItem("estimateContext");
        if (estimateContext) {
          const ctx = JSON.parse(estimateContext);
          setDiscount(ctx.discount || 0);
          setAdvancePayment(ctx.advancePayment || 0);
          setRoundOff(ctx.roundOff || 0);
        } else {
          setDiscount(parseFloat(localStorage.getItem("estimateDiscount")) || 0);
          setAdvancePayment(parseFloat(localStorage.getItem("estimateAdvancePayment")) || 0);
          setRoundOff(parseFloat(localStorage.getItem("estimateRoundOff")) || 0);
        }
      } catch (e) {
        console.error('Failed to load estimate context:', e);
      }
    }
    
    try {
      const raw = localStorage.getItem('jobsContext');
      if (raw) {
        const parsed = JSON.parse(raw);
        setJobCtx({
          ...parsed,
          assignedManager: normalizeAssignedManager(parsed),
        });
        if (parsed.challanNo) {
          setChallanNo(parsed.challanNo);
        }
        if (parsed.challanDate) {
          setChallanDate(parsed.challanDate);
        }
      }
    } catch {}
  }, []);

  const { getCategoryMultiplier, getMultiplierByWorkType } = useMultiplierStore();

  const calculateTotal = (item) => {
    const cost = parseFloat(item.cost) || 0;
    let multiplier = 1;

    // Use saved multiplier if available, otherwise calculate from category/workBy
    if (item.multiplier !== undefined && item.multiplier !== null) {
      multiplier = parseFloat(item.multiplier) || 1;
    } else if (item.category) {
      multiplier = getCategoryMultiplier(item.category.trim());
    } else if (item.workBy) {
      multiplier = getMultiplierByWorkType(item.workBy);
    }

    return cost * multiplier;
  };

  const subTotalEstimate = jobSheetEstimate.reduce(
    (acc, item) => acc + calculateTotal(item),
    0
  );

  const subTotalExtra = extraWork.reduce(
    (acc, item) => acc + calculateTotal(item),
    0
  );

  const grandTotal = subTotalEstimate + subTotalExtra;
  const totalAfterDiscount = grandTotal - discount;
  const totalWithRoundOff = totalAfterDiscount + roundOff;
  const finalTotal = totalWithRoundOff - advancePayment;
  const receivableAmount = parseFloat(settledAmountOverride || finalTotal || 0) || 0;

  // ✅ Delete entry from localStorage + UI
  const handleDelete = (type, index) => {
    if (type === "estimate") {
      const updated = jobSheetEstimate.filter((_, i) => i !== index);
      setJobSheetEstimate(updated);
      localStorage.setItem("jobSheetEstimate", JSON.stringify(updated));
    } else if (type === "extra") {
      const updated = extraWork.filter((_, i) => i !== index);
      setExtraWork(updated);
      localStorage.setItem("extraWork", JSON.stringify(updated));
    }
  };

  // ✅ Print Challan
  const handlePrint = () => {
    const input = document.getElementById('challan-body');
    if (!input) {
      toast.error('Labour Bill not found. Please try again.');
      return;
    }

    const success = openPrintPreview({
      elementId: 'challan-body',
      title: `Labour Bill - ${jobCtx.vehicleNo || 'N/A'}`,
      ...PRINT_PRESETS.invoice
    });

    if (!success) {
      toast.error('Failed to open print preview');
    }
  };

  // ✅ Save as PDF using html2canvas - Fixed A4 width rendering
  const handleSavePDF = async () => {
    try {
      const input = document.getElementById("challan-body");
      if (!input) {
        toast.error('Labour Bill not found. Please try again.');
        return;
      }

      // Clone element at fixed A4 width (794px = A4 at 96dpi) to prevent column wrapping
      const clone = input.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.width = '794px';
      clone.style.background = '#fff';
      clone.style.padding = '28px 32px 120px 32px';
      clone.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
      clone.style.fontSize = '13px';
      clone.style.color = '#000';
      // Remove overflow clipping so Grand Total is never cut
      clone.querySelectorAll('*').forEach(el => {
        const cs = window.getComputedStyle(el);
        if (cs.overflow === 'auto' || cs.overflow === 'hidden' || cs.overflowX === 'auto') {
          el.style.overflow = 'visible';
          el.style.overflowX = 'visible';
        }
      });
      // Remove input borders for cleaner PDF
      clone.querySelectorAll('input').forEach(el => {
        el.style.border = 'none';
        el.style.outline = 'none';
        el.style.background = 'transparent';
        el.style.width = '100%';
      });
      document.body.appendChild(clone);

      // Wait for layout to settle before capture
      await new Promise(resolve => setTimeout(resolve, 300));

      const cloneHeight = clone.scrollHeight + 60;
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        height: cloneHeight,
        windowWidth: 794,
        windowHeight: cloneHeight,
        scrollY: 0,
        scrollX: 0,
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight);
      } else {
        let yOffset = 0;
        let remainingHeight = imgHeight;
        while (remainingHeight > 0) {
          pdf.addImage(imgData, "PNG", 0, -yOffset, pdfWidth, imgHeight);
          remainingHeight -= pdfHeight;
          yOffset += pdfHeight;
          if (remainingHeight > 0) pdf.addPage();
        }
      }

      const challanSuffix = challanNo ? 'CHN' + String(challanNo).slice(-3) : 'CHN000';
      const vehicleSuffix = jobCtx.vehicleNo ? String(jobCtx.vehicleNo).slice(-4) : '0000';
      const filename = `${vehicleSuffix}_${challanSuffix}.pdf`;
      pdf.save(filename);
      toast.success('Labour Bill PDF saved successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF. Please try Print Labour Bill instead.');
    }
  };

  // ✅ Persist challan to IndexedDB and create stock movements (OUT)
  const handlePersistChallan = async () => {
    try {
      const items = [...jobSheetEstimate, ...extraWork].map((item) => {
        const cost = parseFloat(item.cost) || 0;
        let multiplier = 1;
        
        // Use saved multiplier if available, otherwise calculate from category/workBy
        if (item.multiplier !== undefined && item.multiplier !== null) {
          multiplier = parseFloat(item.multiplier) || 1;
        } else if (item.category) {
          multiplier = getCategoryMultiplier(item.category.trim());
        } else if (item.workBy) {
          multiplier = getMultiplierByWorkType(item.workBy);
        }
        
        return {
          productName: item.item,
          qty: multiplier,
          rate: cost,
          total: cost * multiplier
        };
      });

      const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
      const tax = 0;
      const total = subtotal - (discount || 0);
      const vehicleNo = jobCtx.vehicleNo || '';
      const date = challanDate || getTodayString();

      const allRecords = await dbOperations.getAll('sell_challans');
      const existingRecord = findMatchingChallanRecord(allRecords, {
        challanNumber: challanNo,
        vehicleNo,
        partyName: jobCtx.partyName,
        date,
      });

      const effectiveChallanNo = existingRecord?.challan_no || challanNo || await generateChallanNo({
        vehicleNo,
        partyName: jobCtx.partyName,
        date,
      });
      const relatedCashReceipts = (await dbOperations.getAll('cash_receipts')).filter((receipt) =>
        receipt.source === 'challan' &&
        (
          (effectiveChallanNo && receipt.challan_no === effectiveChallanNo) ||
          (
            normalizeReceiptLookup(receipt.vehicle_no) === normalizeReceiptLookup(vehicleNo) &&
            normalizeReceiptLookup(receipt.received_from) === normalizeReceiptLookup(jobCtx.partyName) &&
            String(receipt.challan_date || date).trim() === String(date).trim()
          )
        )
      );
      const paymentReceiptUpdates = buildPaymentReceiptUpdates(relatedCashReceipts, receivableAmount);
      const paymentReceivedTotal = paymentReceiptUpdates.reduce((sum, receipt) => sum + (parseFloat(receipt.amount || 0) || 0), 0);
      const normalizedPaymentReceived = Math.max(paymentReceivedTotal, parseFloat(manualPayment || 0) || 0);

    const challanData = {
      date: date,
      challan_no: effectiveChallanNo,
      vehicle_no: vehicleNo || undefined,
      party_name: jobCtx.partyName || undefined,
      phone: jobCtx.contactNo || undefined,
      items,
      subtotal,
      tax,
      discount: discount,
      advance_payment: advancePayment,
      total,
      payment_status: paymentStatus,
      payment_received: normalizedPaymentReceived,
      final_settled_amount: receivableAmount,
      due_amount: Math.max(0, receivableAmount - normalizedPaymentReceived),
      balance_due: Math.max(0, receivableAmount - normalizedPaymentReceived),
      payment_receipt_updates: paymentReceiptUpdates,
      ...getAssignedManagerFields(jobCtx),
      create_invoice: createInvoice,
      status: completionStatus,
      remark: completionRemark || undefined,
    };      let challanId = null;
      setChallanNo(effectiveChallanNo);
      setManualPayment(normalizedPaymentReceived);

      if (existingRecord) {
        await dbOperations.update('sell_challans', existingRecord.id, challanData);
        await saveChallansToBackend();
        challanId = existingRecord.id;
        toast.success('Labour Bill updated successfully');
        // Propagate completed status to prior modules on update too
        try {
          const vNo   = vehicleNo?.trim().toLowerCase();
          const pName = jobCtx.partyName?.trim().toLowerCase();
          if (vNo || pName) {
            const match = r =>
              (vNo   ? (r.vehicle_no  || '').trim().toLowerCase() === vNo   : true) &&
              (pName ? (r.party_name  || '').trim().toLowerCase() === pName : true);
            const [allEstimates, allJobsheets, allInspections] = await Promise.all([
              dbOperations.getAll('estimates'),
              dbOperations.getAll('jobsheets'),
              dbOperations.getAll('inspections'),
            ]);
            await Promise.all([
              ...allEstimates.filter(match).map(r => dbOperations.update('estimates',    r.id, { status: 'completed' })),
              ...allJobsheets.filter(match).map(r => dbOperations.update('jobsheets',   r.id, { status: 'completed' })),
              ...allInspections.filter(match).map(r => dbOperations.update('inspections', r.id, { status: 'complete' })),
            ]);
            broadcastDataChange('estimates',  'updated', { vehicleNo: vNo, partyName: pName });
            broadcastDataChange('jobsheets',  'updated', { vehicleNo: vNo, partyName: pName });
          }
        } catch (propErr) {
          console.error('⚠️ Status propagation (update) failed:', propErr);
        }
      } else {
        // Create new record
        const challan = await dbOperations.insert('sell_challans', challanData);
        await saveChallansToBackend();
        challanId = challan.id;

        // Create stock movements only for new challans
        for (const it of items) {
          await createStockMovement(undefined, it.productName, 'out', it.qty || 0, 'sell-challan', { challanId: challan.id });
          
          // Update inventory stock - reduce quantity
          try {
            const allInventoryItems = await dbOperations.getAll('inventory_items');
            const inventoryItem = allInventoryItems.find(item => 
              item.material_name?.toLowerCase() === it.productName?.toLowerCase()
            );
            
            if (inventoryItem) {
              const currentQty = parseFloat(inventoryItem.stock_quantity) || 0;
              const qtyToReduce = parseFloat(it.qty) || 0;
              const newQty = Math.max(0, currentQty - qtyToReduce); // Don't allow negative stock
              
              await dbOperations.update('inventory_items', inventoryItem.id, {
                stock_quantity: newQty,
                updated_at: new Date().toISOString(),
              });
              
              console.log(`✅ Updated stock for ${it.productName}: ${currentQty} -> ${newQty} (reduced by ${qtyToReduce})`);
            } else {
              console.warn(`⚠️ Item "${it.productName}" not found in inventory`);
            }
          } catch (invError) {
            console.error('Error updating inventory:', invError);
          }
          
          // Save sell rate history
          try {
            await dbOperations.insert('rate_history', {
              id: `rate_challan_${challan.id}_${item.id || Date.now()}_${Math.random()}`,
              item_name: it.productName,
              category_id: it.category || '',
              rate: parseFloat(it.rate) || 0,
              vendor_name: jobCtx.partyName || 'N/A',
              source: 'sell_challan',
              reference_no: vehicleNo,
              reference_id: challan.id,
              date: date,
              created_at: new Date().toISOString(),
            });
          } catch (err) {
            console.error('Error saving rate history:', err);
          }
        }

        // Save to Rate List Memory
        await saveRateListMemory(items.map(it => ({
          material_name: it.productName,
          category_id: it.category || '',
          rate: parseFloat(it.rate) || 0
        })));

        toast.success('Labour Bill saved and stock updated');

        // Auto-propagate 'completed' status to all prior modules for same vehicle + party
        try {
          const vNo    = vehicleNo?.trim().toLowerCase();
          const pName  = jobCtx.partyName?.trim().toLowerCase();
          if (vNo || pName) {
            const match = (r) =>
              (vNo   ? (r.vehicle_no  || '').trim().toLowerCase() === vNo   : true) &&
              (pName ? (r.party_name  || '').trim().toLowerCase() === pName : true);

            const [allEstimates, allJobsheets, allInspections] = await Promise.all([
              dbOperations.getAll('estimates'),
              dbOperations.getAll('jobsheets'),
              dbOperations.getAll('inspections'),
            ]);

            await Promise.all([
              ...allEstimates.filter(match).map(r =>
                dbOperations.update('estimates',    r.id, { status: 'completed' })
              ),
              ...allJobsheets.filter(match).map(r =>
                dbOperations.update('jobsheets',   r.id, { status: 'completed' })
              ),
              ...allInspections.filter(match).map(r =>
                dbOperations.update('inspections', r.id, { status: 'complete' })
              ),
            ]);
            broadcastDataChange('estimates', 'updated', { vehicleNo: vNo, partyName: pName });
            broadcastDataChange('jobsheets', 'updated', { vehicleNo: vNo, partyName: pName });
            console.log('✅ Status propagated to estimates, jobsheets, inspections');
          }
        } catch (propErr) {
          console.error('⚠️ Status propagation failed:', propErr);
        }
      }

      // Update customer ledger for challan
      if (jobCtx.partyName || jobCtx.contactNo) {
        try {
          const { customer } = await ensureCustomerAccount({
            name: jobCtx.partyName,
            phone: jobCtx.contactNo,
          });

          if (customer) {
            const allLedgerEntries = await dbOperations.getAll('customer_ledger_entries');
            const matchingSaleEntries = allLedgerEntries.filter(entry =>
              entry.customer_id === customer.id &&
              (entry.type === 'sale' || entry.type === 'invoice') &&
              (
                entry.challan_no === effectiveChallanNo ||
                (entry.vehicle_no === vehicleNo && entry.entry_date === date)
              )
            );
            const matchingPaymentEntries = allLedgerEntries.filter(entry =>
              entry.customer_id === customer.id &&
              entry.type === 'payment' &&
              (
                entry.challan_no === effectiveChallanNo ||
                (entry.vehicle_no === vehicleNo && entry.entry_date === date)
              )
            );
            const matchingDiscountEntries = allLedgerEntries.filter(entry =>
              entry.customer_id === customer.id &&
              entry.type === 'discount' &&
              (
                entry.challan_no === effectiveChallanNo ||
                (entry.vehicle_no === vehicleNo && entry.entry_date === date)
              )
            );

            const existingSaleLedger = matchingSaleEntries.find((entry) => entry.challan_no === effectiveChallanNo) || matchingSaleEntries[0];
            const existingPaymentLedger = matchingPaymentEntries.find((entry) => entry.challan_no === effectiveChallanNo) || matchingPaymentEntries[0];
            const ledgerSettledAmount = parseFloat(challanData.final_settled_amount || receivableAmount || 0) || 0;
            const ledgerPaymentAmount = parseFloat(challanData.payment_received || 0) || 0;
            const itemsList = items.map(it => it.productName).join(', ');
            
            if (existingSaleLedger) {
              await dbOperations.update('customer_ledger_entries', existingSaleLedger.id, {
                entry_date: date,
                description: existingSaleLedger.type === 'invoice' ? `Invoice - ${effectiveChallanNo} | ${vehicleNo}\n${itemsList}` : `Challan Sale - ${effectiveChallanNo} | ${vehicleNo}\n${itemsList}`,
                debit: ledgerSettledAmount,
                credit: 0,
                reference_id: challanId,
                challan_no: effectiveChallanNo,
                vehicle_no: vehicleNo,
              });
              
              broadcastDataChange('customer_ledger_entries', 'update', { 
                id: existingSaleLedger.id, 
                customer_id: customer.id 
              });
              for (const duplicateEntry of matchingSaleEntries) {
                if (duplicateEntry.id !== existingSaleLedger.id) {
                  await dbOperations.delete('customer_ledger_entries', duplicateEntry.id);
                  broadcastDataChange('customer_ledger_entries', 'delete', { id: duplicateEntry.id, customer_id: customer.id });
                }
              }
            } else {
              const saleLedgerEntry = await dbOperations.insert('customer_ledger_entries', {
                customer_id: customer.id,
                entry_date: date,
                type: 'sale',
                description: `Challan Sale - ${effectiveChallanNo} | ${vehicleNo}\nItems: ${itemsList}`,
                debit: ledgerSettledAmount,
                credit: 0,
                reference_type: 'challan',
                reference_id: challanId,
                challan_no: effectiveChallanNo,
                vehicle_no: vehicleNo,
              });
              
              broadcastDataChange('customer_ledger_entries', 'add', { ...saleLedgerEntry, customer_id: customer.id });
            }
            
            if (ledgerPaymentAmount > 0) {
              if (existingPaymentLedger) {
                await dbOperations.update('customer_ledger_entries', existingPaymentLedger.id, {
                  entry_date: date,
                  description: `Payment - ${effectiveChallanNo} | ${vehicleNo}`,
                  debit: 0,
                  credit: ledgerPaymentAmount,
                  reference_id: challanId,
                  challan_no: effectiveChallanNo,
                  vehicle_no: vehicleNo,
                });
                
                broadcastDataChange('customer_ledger_entries', 'update', { 
                  id: existingPaymentLedger.id, 
                  customer_id: customer.id 
                });
                for (const duplicateEntry of matchingPaymentEntries) {
                  if (duplicateEntry.id !== existingPaymentLedger.id) {
                    await dbOperations.delete('customer_ledger_entries', duplicateEntry.id);
                    broadcastDataChange('customer_ledger_entries', 'delete', { id: duplicateEntry.id, customer_id: customer.id });
                  }
                }
              } else {
                const paymentLedgerEntry = await dbOperations.insert('customer_ledger_entries', {
                  customer_id: customer.id,
                  entry_date: date,
                  type: 'payment',
                  description: `Payment - ${effectiveChallanNo} | ${vehicleNo}`,
                  debit: 0,
                  credit: ledgerPaymentAmount,
                  reference_type: 'challan',
                  reference_id: challanId,
                  challan_no: effectiveChallanNo,
                  vehicle_no: vehicleNo,
                });
                
                broadcastDataChange('customer_ledger_entries', 'add', { ...paymentLedgerEntry, customer_id: customer.id });
              }
            } else {
              for (const entry of matchingPaymentEntries) {
                await dbOperations.delete('customer_ledger_entries', entry.id);
                broadcastDataChange('customer_ledger_entries', 'delete', { id: entry.id, customer_id: customer.id });
              }
            }

            for (const entry of matchingDiscountEntries) {
              await dbOperations.delete('customer_ledger_entries', entry.id);
              broadcastDataChange('customer_ledger_entries', 'delete', { id: entry.id, customer_id: customer.id });
            }
            
            // Save ledger entries to backend
            if (window.electron?.fs?.writeFile) {
              try {
                const allLedgerEntries = await dbOperations.getAll('customer_ledger_entries');
                await window.electron.fs.writeFile(
                  'C:/malwa-crm/Data_base/customer/Ledger.json',
                  JSON.stringify(allLedgerEntries, null, 2)
                );
                console.log('✅ Customer ledger entries saved to backend');
              } catch (err) {
                console.error('❌ Failed to save ledger to backend:', err);
              }
            }

            toast.success('Customer ledger updated');
          }
        } catch (ledgerError) {
          console.error('Ledger update error:', ledgerError);
          toast.error('Failed to update customer ledger');
        }
      }

      // Create invoice if requested
      if (createInvoice && (jobCtx.partyName || jobCtx.contactNo)) {
        try {
          const { customer } = await ensureCustomerAccount({
            name: jobCtx.partyName,
            phone: jobCtx.contactNo,
          });

          if (customer) {
            await dbOperations.insert('invoices', {
              customer_id: customer.id,
              invoice_no: `INV-${Date.now()}`,
              date: date,
              vehicle_no: vehicleNo,
              items: items,
              subtotal: subtotal,
              tax: tax,
              discount: discount,
              total: receivableAmount,
              payment_received: manualPayment,
              balance_due: Math.max(0, receivableAmount - manualPayment),
              status: paymentStatus === 'full' ? 'paid' : 'pending',
            });
            toast.success('Invoice created successfully');
          }
        } catch (invoiceError) {
          console.error('Invoice creation error:', invoiceError);
          toast.error('Failed to create invoice');
        }
      }

      await loadRecords();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save challan');
    }
  };

  // Register auto-save for global Next navigation to Invoice
  useEffect(() => {
    if (typeof registerOnNext === 'function') {
      registerOnNext(async () => {
        await handlePersistChallan();
        // Ensure context stays in sync for invoice step
        try {
          const ctx = {
            vehicleNo: jobCtx.vehicleNo,
            partyName: jobCtx.partyName,
            contactNo: jobCtx.contactNo || '',
            challanNo: effectiveChallanNo,
            challanDate: date,
          };
          localStorage.setItem('jobsContext', JSON.stringify(ctx));
        } catch {}
      });
    }
  }, [registerOnNext, jobCtx.vehicleNo, jobCtx.partyName, jobCtx.contactNo, jobSheetEstimate, extraWork, discount, advancePayment, paymentStatus, manualPayment, completionStatus, completionRemark, challanNo, challanDate, settledAmountOverride]);

  // ✅ Print with proper styling


  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">Labour Bill</h3>

      <Card>
        <div id="challan-body" style={{ padding: '10px 14px 80px 14px' }}>
          {/* Labour Bill Header with Details */}
          <div className="mb-4 border-b pb-4">
            <h2 className="text-2xl font-bold text-center mb-4">LABOUR BILL</h2>
            <table className="w-full text-sm border">
              <tbody>
                <tr>
                  <td className="p-2 border bg-gray-50 font-semibold w-1/4">Labour Bill No:</td>
                  <td className="p-2 border">
                    <input
                      type="text"
                      value={challanNo}
                      onChange={(e) => setChallanNo(e.target.value)}
                      className="w-full p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Auto-generated"
                    />
                  </td>
                  <td className="p-2 border bg-gray-50 font-semibold w-1/4">Date:</td>
                  <td className="p-2 border">{new Date(challanDate || getTodayString()).toLocaleDateString('en-GB')}</td>
                </tr>
                <tr>
                  <td className="p-2 border bg-gray-50 font-semibold w-1/4">Party Name:</td>
                  <td className="p-2 border">{jobCtx.partyName || '--'}</td>
                  <td className="p-2 border bg-gray-50 font-semibold w-1/4">Phone Number:</td>
                  <td className="p-2 border">{jobCtx.contactNo || '--'}</td>
                </tr>
                <tr>
                  <td className="p-2 border bg-gray-50 font-semibold">Vehicle Number:</td>
                  <td className="p-2 border" colSpan="3">{jobCtx.vehicleNo || '--'}</td>
                </tr>

              </tbody>
            </table>
          </div>

          <h4 className="font-semibold mb-2">LABOUR BILL</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-base border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border" style={{width: '40%'}}>Work</th>
                  <th className="p-2 border text-center" style={{width: '15%'}}>Extra Work</th>
                  <th className="p-2 border text-center" style={{width: '15%'}}>Category</th>
                  <th className="p-2 border text-center" style={{width: '12%'}}>Cost (₹)</th>
                  <th className="p-2 border text-center" style={{width: '8%'}}>Qty</th>
                  <th className="p-2 border text-center" style={{width: '10%'}}>Total (₹)</th>
                </tr>
              </thead>

              <tbody>

                {/* Estimate Data */}
                {jobSheetEstimate.map((item, idx) => {
                  // Use saved multiplier if available, otherwise calculate from category/workBy
                  let multiplier = 1;
                  if (item.multiplier !== undefined && item.multiplier !== null) {
                    multiplier = parseFloat(item.multiplier) || 1;
                  } else if (item.category) {
                    multiplier = getCategoryMultiplier(item.category.trim());
                  } else if (item.workBy) {
                    multiplier = getMultiplierByWorkType(item.workBy);
                  }
                  
                  return (
                    <tr key={`est-${idx}`} className="border-b">
                      <td className="p-2">{item.item}</td>
                      <td className="p-2 text-center">--</td>
                      <td className="p-2 text-center">{item.category}</td>
                      <td className="p-2 text-center">₹{item.cost}</td>
                      <td className="p-2 text-center">{multiplier}</td>
                      <td className="p-2 text-center font-semibold">₹{calculateTotal(item).toFixed(2)}</td>
                    </tr>
                  );
                })}

                {/* Extra Work Data */}
                {extraWork.map((item, idx) => {
                  // Use saved multiplier if available, otherwise calculate from category/workBy
                  let multiplier = 1;
                  if (item.multiplier !== undefined && item.multiplier !== null) {
                    multiplier = parseFloat(item.multiplier) || 1;
                  } else if (item.category) {
                    multiplier = getCategoryMultiplier(item.category.trim());
                  } else if (item.workBy) {
                    multiplier = getMultiplierByWorkType(item.workBy);
                  }
                  
                  return (
                    <tr key={`extra-${idx}`} className="border-b">
                      <td className="p-2">{item.item}</td>
                      <td className="p-2 text-center">✓</td>
                      <td className="p-2 text-center">{item.category}</td>
                      <td className="p-2 text-center">₹{item.cost}</td>
                      <td className="p-2 text-center">{multiplier}</td>
                      <td className="p-2 text-center font-semibold">₹{calculateTotal(item).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

          </div>

          {/* Summary totals - outside overflow-x-auto so they never get clipped */}
          <div className="mt-4 text-right font-semibold pr-2">
            <div>Subtotal (Estimate): ₹{subTotalEstimate.toFixed(2)}</div>
            <div>Subtotal (Extra Work): ₹{subTotalExtra.toFixed(2)}</div>
            <div>Estimate Discount: ₹{discount.toFixed(2)}</div>
            <div className="font-semibold">Total: ₹{totalAfterDiscount.toFixed(2)}</div>
            <div className="text-green-600">Advance Payment: ₹{advancePayment.toFixed(2)}</div>
            <div className="font-bold text-2xl mt-1">Grand Total: ₹{finalTotal.toFixed(2)}</div>
          </div>

          <div className="mt-8 flex justify-end no-print" data-html2canvas-ignore="true">
            <div className="text-right font-bold text-2xl leading-tight">
              <div>Final settled Ammount : {receivableAmount.toFixed(2)}</div>
              <div>Payment&nbsp;&nbsp;: {parseFloat(manualPayment || 0).toFixed(2)}</div>
              <div>balance&nbsp;&nbsp;&nbsp;: {Math.max(0, receivableAmount - (parseFloat(manualPayment || 0) || 0)).toFixed(2)}</div>
            </div>
          </div>

        </div>


        <div className="flex flex-wrap gap-4 mt-4">
          <Button onClick={handlePrint} variant="secondary">
            <Printer className="h-4 w-4 mr-2" /> Print Labour Bill
          </Button>
          <Button variant="secondary" onClick={handleSavePDF}>
            <Save className="h-4 w-4 mr-2" /> Save Labour Bill
          </Button>
          <Button variant="secondary" onClick={() => setIsCashReceiptModalOpen(true)}>
            <Receipt className="h-4 w-4 mr-2" /> Payment Receipt
          </Button>

          <Button onClick={handlePersistChallan}>
            <Save className="h-4 w-4 mr-2" /> Post Labour Bill (Stock OUT)
          </Button>
        </div>
      </Card>

      <JobSearchBar onSearch={handleSearch} onReset={handleReset} />

      <JobReportList
        records={filteredRecords}
        onEdit={handleEditRecord}
        onDelete={(id) => setDeleteConfirmId(id)}
        stepName="Chalan"
      />

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => handleDeleteRecord(deleteConfirmId)}
        title="Delete Chalan"
        message="Are you sure you want to delete this chalan record? This action cannot be undone."
      />

      {/* Cash Receipt Modal */}
      <CashReceiptModal
        isOpen={isCashReceiptModalOpen}
        onClose={() => setIsCashReceiptModalOpen(false)}
        onSubmit={handleCashReceiptSubmit}
        customerName={jobCtx.partyName}
        vehicleNo={jobCtx.vehicleNo}
        maxAmount={receivableAmount}
        advancePaid={advancePayment}
        finalSettledAmount={receivableAmount}
      />
    </div>
  );
};

export default ChalanStep;
