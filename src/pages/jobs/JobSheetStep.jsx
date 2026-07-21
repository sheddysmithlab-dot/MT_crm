





import { Save, FileText, Printer } from "lucide-react";
import React, { useState, useEffect } from "react";
import { toItemsArray } from "@/utils/jsonField";
import JobSearchBar from "@/components/jobs/JobSearchBar";
import JobReportList from "@/components/jobs/JobReportList";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Modal from "@/components/ui/Modal";
import AssignedManagerLine, { AssignedManagerTableRow } from "@/components/jobs/AssignedManagerLine";
import AutocompleteInput from "@/components/ui/AutocompleteInput";
import ComboBox from "@/components/ui/ComboBox";
import { dbOperations } from "@/lib/db";
import { toast } from "sonner";
import { openPrintPreview, PRINT_PRESETS } from '@/utils/printHelpers';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { saveRateListMemory } from "@/utils/rateListMemory";
import useDeleteHistoryStore from '@/store/deleteHistoryStore';
import { broadcastDataChange, DATA_SYNC_EVENT } from '@/utils/dataSync';
import { getAssignedManagerFields, normalizeAssignedManager } from "@/utils/jobAssignment";

const EMPTY_JOB_FILTERS = {
  vehicleNo: '',
  partyName: '',
  dateFrom: '',
  dateTo: '',
};

const JobSheetStep = ({ registerOnNext }) => {
  // ALL STATE DECLARATIONS AT TOP
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_JOB_FILTERS);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [labourers, setLabourers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [workOrderTimelines, setWorkOrderTimelines] = useState({});
  const [estimateItems, setEstimateItems] = useState(() => {
    const saved = localStorage.getItem("inspectionItems");
    return saved ? JSON.parse(saved) : [];
  });
  const [jobStatus, setJobStatus] = useState('in-progress');
  const [jobCtx, setJobCtx] = useState({ vehicleNo: "", partyName: "", contactNo: "", wheeler: "", date: "", assignedManager: null });
  // Extra work is NEVER read from generic localStorage — always tied to a specific job record id
  const [extraWork, setExtraWork] = useState([]);
  const [currentJobId, setCurrentJobId] = useState(null); // tracks which job record is being edited
  const [discount, setDiscount] = useState(0);
  const [advancePayment, setAdvancePayment] = useState(0);
  const [roundOff, setRoundOff] = useState(0);

  useEffect(() => {
    loadRecords();
    loadVendorsAndLabourers();
    loadCategories();
    loadInventoryItems();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.entity === 'jobsheets') loadRecords();
    };
    window.addEventListener(DATA_SYNC_EVENT, handler);
    return () => window.removeEventListener(DATA_SYNC_EVENT, handler);
  }, []);

  const loadVendorsAndLabourers = async () => {
    try {
      const vendorData = await dbOperations.getAll('vendors');
      setVendors(vendorData || []);
      
      const labourData = await dbOperations.getAll('labour');
      setLabourers(labourData || []);
    } catch (error) {
      console.error('Failed to load vendors/labourers:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const categoryData = await dbOperations.getAll('inventory_categories');
      setCategories(categoryData || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const items = await dbOperations.getAll('inventory_items');
      const cats = await dbOperations.getAll('inventory_categories');
      const rateMemory = await dbOperations.getAll('rate_list_memory') || [];
      
      // Enrich items with category names
      const enrichedItems = (items || []).map(item => {
        const category = cats.find(c => c.id === item.category_id);
        return {
          ...item,
          category_name: category ? category.name : 'Uncategorized'
        };
      });
      
      // Also add rate list memory items that don't exist in inventory
      const inventoryNames = enrichedItems.map(i => i.name?.toLowerCase());
      const rateMemoryItems = rateMemory
        .filter(r => r.material_name && !inventoryNames.includes(r.material_name?.toLowerCase()))
        .map(r => {
          const category = cats.find(c => c.id === r.category_id);
          return {
            id: `rate_${r.id}`,
            name: r.material_name,
            category_id: r.category_id,
            category_name: category ? category.name : 'Uncategorized',
            selling_price: r.selling_price || r.rate || 0,
            cost_price: r.actual_price || 0
          };
        });
      
      setInventoryItems([...enrichedItems, ...rateMemoryItems]);
    } catch (error) {
      console.error('Failed to load inventory items:', error);
    }
  };

  const loadRecords = async () => {
    try {
      const [data, challans] = await Promise.all([
        dbOperations.getAll('jobsheets'),
        dbOperations.getAll('sell_challans'),
      ]);

      // Reconcile: if a challan (completed) exists for same vehicle+party, jobsheet = completed
      const dbUpdates = [];
      const reconciled = (data || []).map(js => {
        const vNo   = (js.vehicle_no  || '').trim().toLowerCase();
        const pName = (js.party_name  || '').trim().toLowerCase();
        if (!vNo && !pName) return js;
        const hasChallan = (challans || []).some(c =>
          (c.vehicle_no  || '').trim().toLowerCase() === vNo &&
          (c.party_name  || '').trim().toLowerCase() === pName
        );
        if (hasChallan && js.status !== 'completed') {
          dbUpdates.push(dbOperations.update('jobsheets', js.id, { status: 'completed' }));
          return { ...js, status: 'completed' };
        }
        return js;
      });
      if (dbUpdates.length) Promise.all(dbUpdates).catch(console.error);

      const sorted = reconciled.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecords(sorted);
      setFilteredRecords(sorted);
    } catch (error) {
      console.error('Failed to load job sheets:', error);
      toast.error('Failed to load job sheets');
    }
  };

  // 🔧 Backend Save Function - Saves job sheets to JSON file
  const saveJobSheetsToBackend = async () => {
    if (!window.electron?.fs?.writeFile) {
      console.log('⚠️ Electron not available - skipping backend save');
      return;
    }
    
    try {
      const allJobSheets = await dbOperations.getAll('jobsheets');
      const filePath = 'C:/malwa-crm/Data_base/jobs/JobSheetStep.json';
      await window.electron.fs.writeFile(
        filePath,
        JSON.stringify(allJobSheets, null, 2)
      );
      console.log('✅ Job sheets saved to backend:', filePath);
    } catch (error) {
      console.error('❌ Failed to save job sheets to backend:', error);
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
    setAppliedFilters({
      vehicleNo: filters.vehicleNo || '',
      partyName: filters.partyName || '',
      dateFrom: filters.dateFrom || '',
      dateTo: filters.dateTo || '',
    });
    setFilteredRecords(filtered);
  };

  const handleReset = () => {
    setFilteredRecords(records);
    setAppliedFilters(EMPTY_JOB_FILTERS);
  };

  const handleEditRecord = (record) => {
    try {
      const ctx = {
        vehicleNo: record.vehicle_no,
        partyName: record.party_name,
        contactNo: record.phone || record.contactNo || '',
        wheeler: record.wheeler,
        date: record.date,
        assignedManager: normalizeAssignedManager(record),
      };
      localStorage.setItem('jobsContext', JSON.stringify(ctx));
      setJobCtx(ctx);

      // Track which job record is currently open — extra work is scoped to this id
      setCurrentJobId(record.id);

      if (record.inspection_items) {
        setEstimateItems(record.inspection_items);
        localStorage.setItem('inspectionItems', JSON.stringify(record.inspection_items));
      }

      // Load extra work ONLY from the database record — never from generic localStorage
      setExtraWork(Array.isArray(record.extra_work) ? record.extra_work : []);

      if (record.discount !== undefined) setDiscount(record.discount);
      if (record.status) setJobStatus(record.status);

      toast.success('Job sheet loaded successfully');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Failed to load record:', error);
      toast.error('Failed to load record');
    }
  };

  const handleDeleteRecord = async (id) => {
    try {
      const { addDeletedItem } = useDeleteHistoryStore.getState();
      
      // Get the jobsheet before deleting
      const jobsheet = await dbOperations.getById('jobsheets', id);
      if (jobsheet) {
        addDeletedItem('jobsheets', jobsheet);
      }
      
      await dbOperations.delete('jobsheets', id);
      await saveJobSheetsToBackend();
      toast.success('Job sheet deleted successfully');
      loadRecords();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete job sheet:', error);
      toast.error('Failed to delete job sheet');
    }
  };

  const getVendorPercentageByAmount = (amount) => {
    const total = parseFloat(amount) || 0;

    if (total >= 1000 && total <= 5999) return 25;
    if (total >= 6000 && total <= 10999) return 20;
    if (total >= 11000 && total <= 30999) return 15;
    if (total >= 31000 && total <= 50999) return 12;
    if (total >= 51000 && total <= 159999) return 10;
    if (total >= 160000 && total <= 500000) return 8;

    if (total < 1000) return 25;
    return 8;
  };

  const calculateJobItemAmount = (item) => {
    const explicitTotal = parseFloat(item?.total);
    if (!Number.isNaN(explicitTotal) && explicitTotal > 0) {
      return explicitTotal;
    }

    const cost = parseFloat(item?.cost ?? item?.rate ?? 0) || 0;
    const multiplier = parseFloat(item?.multiplier ?? item?.qty ?? item?.quantity ?? 1) || 1;
    return cost * multiplier;
  };


  // Auto load saved workBy & notes if present in jobSheetEstimate
  useEffect(() => {
    const savedJobSheet = JSON.parse(localStorage.getItem("jobSheetEstimate") || "[]");
    if (savedJobSheet.length > 0) {
      const merged = estimateItems.map((item) => {
        const existing = savedJobSheet.find(
          (e) => e.item === item.item && e.category === item.category
        );
        return {
          ...item,
          workOrder: existing?.workOrder || item.workOrder || "",
          assignedTo: existing?.assignedTo || item.assignedTo || "",
          workBy: existing?.workBy || "Labour",
          notes: existing?.notes || "",
          multiplier: item.multiplier || 1,
        };
      });
      setEstimateItems(merged);
    } else {
      const init = estimateItems.map((item) => ({
        ...item,
        workOrder: item.workOrder || "",
        assignedTo: item.assignedTo || "",
        workBy: "Labour",
        notes: "",
        multiplier: item.multiplier || 1,
      }));
      setEstimateItems(init);
    }
    
    // extraWork is loaded from DB — no localStorage init needed here
  }, []);

  // Sync estimateItems to localStorage whenever they change (for data carry-forward to next steps)
  useEffect(() => {
    if (estimateItems && estimateItems.length > 0) {
      localStorage.setItem('jobSheetEstimate', JSON.stringify(estimateItems));
    }
  }, [estimateItems]);

  // When job context changes and no record is being edited, look up DB to reload correct extra work
  useEffect(() => {
    if (!jobCtx.vehicleNo || !jobCtx.date) return;
    // If a record is already loaded via handleEditRecord, currentJobId is set — don't override
    if (currentJobId) return;

    // For jobs loaded via jobsContext (e.g. from Inspection step), find the matching DB record
    (async () => {
      try {
        const allRecords = await dbOperations.getAll('jobsheets');
        const match = allRecords.find(
          (r) => r.vehicle_no === jobCtx.vehicleNo && r.date === jobCtx.date
        );
        if (match) {
          setCurrentJobId(match.id);
          setExtraWork(Array.isArray(match.extra_work) ? match.extra_work : []);
        } else {
          // Truly a new job — start with empty extra work
          setExtraWork([]);
        }
      } catch (e) {
        console.error('Failed to load job extra work from DB:', e);
        setExtraWork([]);
      }
    })();
  }, [jobCtx.vehicleNo, jobCtx.date]);

  // Handle field changes
  const handleEstimateChange = (index, field, value) => {
    const updated = [...estimateItems];
    updated[index][field] = value;
    setEstimateItems(updated);
  };

  // Save Notes & WorkBy to localStorage and database
  const saveJobSheet = async () => {
    try {
      const vehicleNo = jobCtx.vehicleNo || '';
      const date = jobCtx.date || new Date().toISOString().split('T')[0];
      
      // Save inspection items, extra work, and job context for carry-forward to ChalanStep
      localStorage.setItem("jobSheetEstimate", JSON.stringify(estimateItems));
      localStorage.setItem("extraWork", JSON.stringify(extraWork));
      localStorage.setItem('jobsContext', JSON.stringify({
        ...jobCtx,
        assignedManager: normalizeAssignedManager(jobCtx),
      }));

      // Save to Rate List Memory (Estimate prices as actual_price)
      const allItems = [...estimateItems, ...extraWork];
      const rateItems = allItems
        .filter(item => item.item && parseFloat(item.cost) > 0)
        .map(item => ({
          material_name: item.item,
          category_id: item.category || '',
          actual_price: parseFloat(item.cost) || 0,
          selling_price: parseFloat(item.cost) || 0  // Same as actual for estimate
        }));
      
      if (rateItems.length > 0) {
        await saveRateListMemory(rateItems, 'estimate');
      }

      // Check for existing record with same vehicle number and date
      const allRecords = await dbOperations.getAll('jobsheets');
      const existingRecord = allRecords.find(
        record => record.vehicle_no === vehicleNo && record.date === date
      );

      const jobSheetData = {
        vehicle_no: vehicleNo,
        party_name: jobCtx.partyName || '',
        wheeler: jobCtx.wheeler || '',
        date: date,
        inspection_items: estimateItems,
        extra_work: extraWork,
        subtotal_inspection: estimateSubTotal,
        subtotal_extra: extraWorkSubTotal,
        discount: discount,
        total: finalTotal,
        grand_total: finalTotal,
        ...getAssignedManagerFields(jobCtx),
        status: jobStatus
      };

      // Add ledger entries for vendors and labour
      const addLedgerEntries = async () => {
        try {
          // Combine inspection items and extra work
          const allItems = [...estimateItems, ...extraWork];
          
          console.log('[JobSheet] Processing items for ledger entries:', allItems);
          
          // Group items by vendor/labour
          const vendorGroups = {};
          const labourGroups = {};
          
          for (const item of allItems) {
            if (item.workOrder && item.assignedTo && calculateTotal(item) > 0) {
              const amount = calculateTotal(item);
              const workDescription = item.item || 'Work';
              
              if (item.workOrder === 'Vendor') {
                const vendor = vendors.find(v => v.name === item.assignedTo);
                if (vendor) {
                  if (!vendorGroups[vendor.id]) {
                    vendorGroups[vendor.id] = {
                      vendor: vendor,
                      works: [],
                      totalAmount: 0
                    };
                  }
                  vendorGroups[vendor.id].works.push(workDescription);
                  vendorGroups[vendor.id].totalAmount += amount;
                }
              } else if (item.workOrder === 'Labour') {
                const labour = labourers.find(l => l.name === item.assignedTo);
                if (labour) {
                  if (!labourGroups[labour.id]) {
                    labourGroups[labour.id] = {
                      labour: labour,
                      works: [],
                      totalAmount: 0
                    };
                  }
                  labourGroups[labour.id].works.push(workDescription);
                  labourGroups[labour.id].totalAmount += amount;
                }
              }
            }
          }
          
          console.log('[JobSheet] Vendor groups to create ledger entries:', vendorGroups);
          console.log('[JobSheet] Labour groups to create ledger entries:', labourGroups);

          // Create single ledger entry per vendor
          for (const vendorId in vendorGroups) {
            const group = vendorGroups[vendorId];
            const combinedWork = group.works.join(', ');
            
            // Calculate slab-based percentage of total amount for vendor
            const vendorPercentage = getVendorPercentageByAmount(group.totalAmount);
            const vendorAmount = parseFloat(((group.totalAmount * vendorPercentage) / 100).toFixed(2));
            
            try {
              await dbOperations.insert('vendor_ledger_entries', {
                id: `${group.vendor.id}_${vehicleNo}_${date}_${Date.now()}`,
                vendor_id: group.vendor.id,
                entry_date: date,
                particulars: combinedWork,
                category: 'Multiple Works',
                debit_amount: 0,
                credit_amount: vendorAmount,
                vehicle_no: vehicleNo,
                wheeler: jobCtx.wheeler || '',
                owner_name: jobCtx.partyName || '',
                work: combinedWork,
                reference_type: 'job_sheet',
                reference_no: vehicleNo,
                entry_type: 'job_sheet'
              });
              
              console.log(`[JobSheet] Created vendor ledger entry for ${group.vendor.name} - Base: ₹${group.totalAmount}, %: ${vendorPercentage}, Credit: ₹${vendorAmount}`);
              
              // Broadcast change for real-time updates
              broadcastDataChange('vendor_ledger_entries', 'add', { vendor_id: group.vendor.id });
              
              // Update vendor balance
              const entries = await dbOperations.getByIndex('vendor_ledger_entries', 'vendor_id', group.vendor.id);
              const balance = entries.reduce((sum, entry) => sum + (entry.credit_amount || 0) - (entry.debit_amount || 0), 0);
              await dbOperations.update('vendors', group.vendor.id, {
                current_balance: (group.vendor.opening_balance || 0) + balance
              });
            } catch (err) {
              console.error('Error adding vendor ledger entry:', err);
            }
          }
          
          // Create single ledger entry per labour
          for (const labourId in labourGroups) {
            const group = labourGroups[labourId];
            const combinedWork = group.works.join(', ');
            
            try {
              await dbOperations.insert('labour_ledger_entries', {
                id: `${group.labour.id}_${vehicleNo}_${date}_${Date.now()}`,
                labour_id: group.labour.id,
                entry_date: date,
                particulars: combinedWork,
                category: 'Multiple Works',
                debit_amount: 0,
                credit_amount: group.totalAmount,
                vehicle_no: vehicleNo,
                owner_name: jobCtx.partyName || '',
                reference_type: 'job_sheet',
                reference_no: vehicleNo,
                entry_type: 'job_sheet'
              });
              
              // Broadcast change for real-time updates
              broadcastDataChange('labour_ledger_entries', 'add', { labour_id: group.labour.id });
              
              // Update labour balance
              const entries = await dbOperations.getByIndex('labour_ledger_entries', 'labour_id', group.labour.id);
              const balance = entries.reduce((sum, entry) => sum + (entry.credit_amount || 0) - (entry.debit_amount || 0), 0);
              await dbOperations.update('labour', group.labour.id, {
                current_balance: (group.labour.opening_balance || 0) + balance
              });
            } catch (err) {
              console.error('Error adding labour ledger entry:', err);
            }
          }
        } catch (err) {
          console.error('Error in addLedgerEntries:', err);
          // Don't throw - allow job sheet to save even if ledger entries fail
        }
      };

      // Helper function to delete old ledger entries for this job sheet
      const deleteOldLedgerEntries = async () => {
        try {
          // Delete vendor ledger entries
          const vendorEntries = await dbOperations.getAll('vendor_ledger_entries');
          const oldVendorEntries = vendorEntries.filter(
            entry => entry.reference_type === 'job_sheet' && entry.reference_no === vehicleNo && entry.entry_date === date
          );
          for (const entry of oldVendorEntries) {
            await dbOperations.delete('vendor_ledger_entries', entry.id);
            broadcastDataChange('vendor_ledger_entries', 'delete', { vendor_id: entry.vendor_id });
          }
          
          // Delete labour ledger entries
          const labourEntries = await dbOperations.getAll('labour_ledger_entries');
          const oldLabourEntries = labourEntries.filter(
            entry => entry.reference_type === 'job_sheet' && entry.reference_no === vehicleNo && entry.entry_date === date
          );
          for (const entry of oldLabourEntries) {
            await dbOperations.delete('labour_ledger_entries', entry.id);
            broadcastDataChange('labour_ledger_entries', 'delete', { labour_id: entry.labour_id });
          }
        } catch (err) {
          console.error('Error deleting old ledger entries:', err);
        }
      };

      // Map jobsheet status → estimate status
      const estimateStatusMap = {
        'in-progress': 'pending-confirmation',
        'on-hold':     'deal-not-done',
        'completed':   'completed',
      };
      const propagatedEstimateStatus = estimateStatusMap[jobStatus] || 'pending-confirmation';

      const propagateToEstimates = async () => {
        try {
          const vNo   = vehicleNo?.trim().toLowerCase();
          const pName = jobCtx.partyName?.trim().toLowerCase();
          if (!vNo && !pName) return;
          const allEstimates = await dbOperations.getAll('estimates');
          const toUpdate = allEstimates.filter(r =>
            (vNo   ? (r.vehicle_no  || '').trim().toLowerCase() === vNo   : true) &&
            (pName ? (r.party_name  || '').trim().toLowerCase() === pName : true)
          );
          await Promise.all(
            toUpdate.map(r => dbOperations.update('estimates', r.id, { status: propagatedEstimateStatus }))
          );
          if (toUpdate.length) {
            console.log(`✅ Propagated jobsheet status "${jobStatus}" → estimate "${propagatedEstimateStatus}" for ${toUpdate.length} record(s)`);
            broadcastDataChange('estimates', 'updated', { vehicleNo: vNo, partyName: pName });
          }
        } catch (err) {
          console.error('⚠️ Estimate status propagation failed:', err);
        }
      };

      if (existingRecord) {
        // Show confirmation for update
        const confirmed = window.confirm(
          `A job sheet already exists for Vehicle: ${vehicleNo} on Date: ${date}.\n\nDo you want to UPDATE the existing record?`
        );

        if (confirmed) {
          await deleteOldLedgerEntries();
          await dbOperations.update('jobsheets', existingRecord.id, jobSheetData);
          await addLedgerEntries();
          await saveJobSheetsToBackend();
          await propagateToEstimates();
          toast.success('Job Sheet updated successfully!');
          await loadRecords();
        }
      } else {
        const newRecord = await dbOperations.insert('jobsheets', jobSheetData);
        if (newRecord?.id) setCurrentJobId(newRecord.id);
        await addLedgerEntries();
        await saveJobSheetsToBackend();
        await propagateToEstimates();
        toast.success('Job Sheet saved successfully!');
        await loadRecords();
      }
    } catch (error) {
      console.error('Error saving job sheet:', error);
      toast.error('Failed to save job sheet: ' + error.message);
    }
  };

  // Register auto-save for global Next navigation to Challan
  useEffect(() => {
    if (typeof registerOnNext === 'function') {
      registerOnNext(async () => {
        await saveJobSheet();
      });
    }
  }, [registerOnNext, estimateItems, extraWork, jobStatus, discount, currentJobId, jobCtx.vehicleNo, jobCtx.partyName, jobCtx.wheeler, jobCtx.date, jobCtx.assignedManager]);

  const addExtraWork = () => {
    setExtraWork([
      ...extraWork,
      {
        category: "",
        item: "",
        condition: "OK",
        cost: 0,
        multiplier: 1,
        workOrder: "",
        assignedTo: "",
        workBy: "Labour",
        notes: "",
      },
    ]);
  };

  const handleExtraWorkChange = (index, field, value) => {
    const updated = [...extraWork];
    updated[index][field] = value;
    setExtraWork(updated);
  };

  const deleteExtraWork = (index) => {
    setExtraWork((prev) => prev.filter((_, i) => i !== index));
  };

  // Total Calculation
  const calculateTotal = (item) => {
    const cost = parseFloat(item.cost) || 0;
    const multiplier = parseFloat(item.multiplier) || 1; // static multiplier
    return cost * multiplier;
  };

  const estimateSubTotal = estimateItems.reduce((acc, item) => acc + calculateTotal(item), 0);
  const extraWorkSubTotal = extraWork.reduce((acc, item) => acc + calculateTotal(item), 0);
  const grandTotal = estimateSubTotal + extraWorkSubTotal;

  useEffect(() => {
    try {
      const estimateContext = localStorage.getItem("estimateContext");
      if (estimateContext) {
        const ctx = JSON.parse(estimateContext);
        setDiscount(ctx.discount || 0);
        setAdvancePayment(ctx.advancePayment || 0);
        setRoundOff(ctx.roundOff || 0);
      } else {
        // Fallback to old method
        setDiscount(parseFloat(localStorage.getItem("estimateDiscount")) || 0);
        setAdvancePayment(parseFloat(localStorage.getItem("estimateAdvancePayment")) || 0);
        setRoundOff(parseFloat(localStorage.getItem("estimateRoundOff")) || 0);
      }
    } catch (e) {
      console.error('Failed to load estimate context:', e);
    }
  }, []);
  
  const finalTotal = grandTotal - discount + roundOff;
  const balanceDue = finalTotal - advancePayment;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('jobsContext');
      if (raw) {
        const parsed = JSON.parse(raw);
        setJobCtx({
          ...parsed,
          assignedManager: normalizeAssignedManager(parsed),
        });
      }
    } catch {}
  }, []);

  return (
    <div className="space-y-6 p-4">
      <h3 className="text-xl font-bold">Job Sheet</h3>

      {/* Context Header */}
      {(jobCtx.vehicleNo || jobCtx.partyName) && (
        <div className="border rounded-lg p-3 shadow bg-gray-50">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-sm font-medium">Vehicle: <span className="font-semibold">{jobCtx.vehicleNo}</span></div>
            <div className="text-sm font-medium">Party: <span className="font-semibold">{jobCtx.partyName}</span></div>
            <div className="text-sm font-medium">Contact: <span className="font-semibold">{jobCtx.contactNo}</span></div>
            <div className="text-sm font-medium">
              Status: 
              <select
                value={jobStatus}
                onChange={(e) => setJobStatus(e.target.value)}
                className="ml-2 p-1 border rounded font-semibold"
              >
                <option value="in-progress">Work in Progress</option>
                <option value="on-hold">Hold for Material</option>
              </select>
            </div>
          </div>
          <AssignedManagerLine manager={jobCtx.assignedManager} className="mt-3" />
        </div>
      )}

      {/* Tasks from Inspection */}
      <div className="border rounded-lg p-4 shadow">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold">Tasks from Inspection</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border dark:border-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                <th className="p-1 border dark:border-gray-700" style={{width: '30%'}}>Work</th>
                <th className="p-1 border dark:border-gray-700" style={{width: '10%'}}>Category</th>
                <th className="p-1 border dark:border-gray-700" style={{width: '10%'}}>Cost</th>
                <th className="p-1 border dark:border-gray-700" style={{width: '8%'}}>Qty</th>
                <th className="p-1 border dark:border-gray-700" style={{width: '10%'}}>Total</th>
                <th className="p-1 border dark:border-gray-700" style={{width: '10%'}}>Work Order</th>
                <th className="p-1 border dark:border-gray-700" style={{width: '12%'}}>Assigned To</th>
                <th className="p-1 border dark:border-gray-700" style={{width: '10%'}}>Actions</th>
              </tr>
            </thead>
            <tbody>

              {estimateItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-1 px-2 text-gray-500">
                    No items in Inspection.
                  </td>
                </tr>
              ) : (
                estimateItems.map((item, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="p-1">
                      <input
                        type="text"
                        value={item.item || ''}
                        onChange={(e) => handleEstimateChange(index, "item", e.target.value)}
                        className="w-full bg-transparent border-none outline-none focus:outline-none dark:text-white"
                        placeholder="Work description"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={item.category || ''}
                        onChange={(e) => handleEstimateChange(index, "category", e.target.value)}
                        list="categories-list-extra"
                        placeholder="Category"
                        className="w-full bg-transparent border-none outline-none focus:outline-none dark:text-white"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        value={item.cost}
                        onChange={(e) => handleEstimateChange(index, "cost", e.target.value)}
                        className="w-full bg-transparent border-none outline-none focus:outline-none dark:text-white"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        value={item.multiplier}
                        onChange={(e) => handleEstimateChange(index, "multiplier", e.target.value)}
                        className="w-full bg-transparent border-none outline-none focus:outline-none dark:text-white"
                      />
                    </td>
                    <td className="p-1">{calculateTotal(item).toFixed(2)}</td>
                    <td className="p-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            handleEstimateChange(index, "workOrder", 'Vendor');
                            handleEstimateChange(index, "assignedTo", '');
                          }}
                          className={`px-2 py-1 rounded text-xs font-semibold transition-all duration-150 ${
                            item.workOrder === 'Vendor'
                              ? 'bg-blue-600 text-white shadow-md scale-105'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:shadow-sm'
                          }`}
                        >
                          Vendor
                        </button>
                        <button
                          onClick={() => {
                            handleEstimateChange(index, "workOrder", 'Labour');
                            handleEstimateChange(index, "assignedTo", '');
                          }}
                          className={`px-2 py-1 rounded text-xs font-semibold transition-all duration-150 ${
                            item.workOrder === 'Labour'
                              ? 'bg-blue-600 text-white shadow-md scale-105'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:shadow-sm'
                          }`}
                        >
                          Labour
                        </button>
                      </div>
                    </td>
                    <td className="p-1">
                      {!item.workOrder ? (
                        <span className="text-gray-400 text-xs italic">Pick above first</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {item.workOrder === 'Vendor' && (item.assignedTo
                            ? vendors.filter(v => v.name === item.assignedTo).map(v => (
                              <button
                                key={v.id}
                                onClick={() => handleEstimateChange(index, "assignedTo", '')}
                                className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white shadow-md ring-2 ring-blue-400 hover:ring-blue-300 transition-all duration-150"
                              >
                                {v.name} ✕
                              </button>
                            ))
                            : vendors.map(v => (
                              <button
                                key={v.id}
                                onClick={() => handleEstimateChange(index, "assignedTo", v.name)}
                                className="px-2 py-1 rounded text-xs font-medium transition-all duration-150 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:shadow-md active:scale-95"
                              >
                                {v.name}
                              </button>
                            ))
                          )}
                          {item.workOrder === 'Labour' && (item.assignedTo
                            ? labourers.filter(l => l.name === item.assignedTo).map(l => (
                              <button
                                key={l.id}
                                onClick={() => handleEstimateChange(index, "assignedTo", '')}
                                className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white shadow-md ring-2 ring-blue-400 hover:ring-blue-300 transition-all duration-150"
                              >
                                {l.name} ✕
                              </button>
                            ))
                            : labourers.map(l => (
                              <button
                                key={l.id}
                                onClick={() => handleEstimateChange(index, "assignedTo", l.name)}
                                className="px-2 py-1 rounded text-xs font-medium transition-all duration-150 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:shadow-md active:scale-95"
                              >
                                {l.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) =>
                          handleEstimateChange(index, "notes", e.target.value)
                        }
                        placeholder="Notes..."
                        className="w-full bg-transparent border-none outline-none focus:outline-none dark:text-white"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-3 text-right font-semibold">
            Subtotal (Inspection): ₹{estimateSubTotal.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Extra Work Section */}
      <div className="border rounded-lg p-4 shadow">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold">Extra Work</h4>
          <div className="flex gap-2">
            <button
              onClick={addExtraWork}
              className="flex items-center gap-1 bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
            >
              ➕ Add Extra Work
            </button>
          </div>
        </div>

        <div className="overflow-visible">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-1 border" style={{width: '30%'}}>Work</th>
                <th className="p-1 border" style={{width: '10%'}}>Category</th>
                <th className="p-1 border" style={{width: '10%'}}>Cost (₹)</th>
                <th className="p-1 border" style={{width: '8%'}}>Qty</th>
                <th className="p-1 border" style={{width: '10%'}}>Total (₹)</th>
                <th className="p-1 border" style={{width: '10%'}}>Work Order</th>
                <th className="p-1 border" style={{width: '12%'}}>Assigned To</th>
                <th className="p-1 border" style={{width: '10%'}}>Actions</th>
              </tr>
            </thead>
            <tbody className="relative">

              {extraWork.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-1 px-2 text-gray-500">
                    No extra work added.
                  </td>
                </tr>
              ) : (
                extraWork.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-1 relative">
                      <ComboBox
                        value={item.item}
                        onChange={(value) =>
                          handleExtraWorkChange(index, "item", value)
                        }
                        onSelect={(suggestion) => {
                          if (suggestion) {
                            const sellingPrice = parseFloat(suggestion.selling_price) || 0;
                            const categoryName = suggestion.category_name || '';

                            handleExtraWorkChange(index, "item", suggestion.name);
                            handleExtraWorkChange(index, "category", categoryName);
                            handleExtraWorkChange(index, "cost", sellingPrice.toFixed(2));
                          }
                        }}
                        suggestions={inventoryItems}
                        placeholder="Select or type work item..."
                        displayKey="name"
                        className="w-full text-sm bg-transparent border-none outline-none focus:outline-none dark:text-white"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={item.category || ''}
                        onChange={(e) => handleExtraWorkChange(index, "category", e.target.value)}
                        list="categories-list-extra"
                        placeholder="Category"
                        className="w-full bg-transparent border-none outline-none focus:outline-none dark:text-white"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        value={item.cost}
                        onChange={(e) =>
                          handleExtraWorkChange(index, "cost", e.target.value)
                        }
                        className="w-full bg-transparent border-none outline-none focus:outline-none"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        value={item.multiplier}
                        onChange={(e) =>
                          handleExtraWorkChange(index, "multiplier", e.target.value)
                        }
                        className="w-full bg-transparent border-none outline-none focus:outline-none"
                      />
                    </td>
                    <td className="p-1">{calculateTotal(item).toFixed(2)}</td>
                    <td className="p-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            handleExtraWorkChange(index, "workOrder", 'Vendor');
                            handleExtraWorkChange(index, "assignedTo", '');
                          }}
                          className={`px-2 py-1 rounded text-xs font-semibold transition-all duration-150 ${
                            item.workOrder === 'Vendor'
                              ? 'bg-blue-600 text-white shadow-md scale-105'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:shadow-sm'
                          }`}
                        >
                          Vendor
                        </button>
                        <button
                          onClick={() => {
                            handleExtraWorkChange(index, "workOrder", 'Labour');
                            handleExtraWorkChange(index, "assignedTo", '');
                          }}
                          className={`px-2 py-1 rounded text-xs font-semibold transition-all duration-150 ${
                            item.workOrder === 'Labour'
                              ? 'bg-blue-600 text-white shadow-md scale-105'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:shadow-sm'
                          }`}
                        >
                          Labour
                        </button>
                      </div>
                    </td>
                    <td className="p-1">
                      {!item.workOrder ? (
                        <span className="text-gray-400 text-xs italic">Pick above first</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {item.workOrder === 'Vendor' && (item.assignedTo
                            ? vendors.filter(v => v.name === item.assignedTo).map(v => (
                              <button
                                key={v.id}
                                onClick={() => handleExtraWorkChange(index, "assignedTo", '')}
                                className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white shadow-md ring-2 ring-blue-400 hover:ring-blue-300 transition-all duration-150"
                              >
                                {v.name} ✕
                              </button>
                            ))
                            : vendors.map(v => (
                              <button
                                key={v.id}
                                onClick={() => handleExtraWorkChange(index, "assignedTo", v.name)}
                                className="px-2 py-1 rounded text-xs font-medium transition-all duration-150 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:shadow-md active:scale-95"
                              >
                                {v.name}
                              </button>
                            ))
                          )}
                          {item.workOrder === 'Labour' && (item.assignedTo
                            ? labourers.filter(l => l.name === item.assignedTo).map(l => (
                              <button
                                key={l.id}
                                onClick={() => handleExtraWorkChange(index, "assignedTo", '')}
                                className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white shadow-md ring-2 ring-blue-400 hover:ring-blue-300 transition-all duration-150"
                              >
                                {l.name} ✕
                              </button>
                            ))
                            : labourers.map(l => (
                              <button
                                key={l.id}
                                onClick={() => handleExtraWorkChange(index, "assignedTo", l.name)}
                                className="px-2 py-1 rounded text-xs font-medium transition-all duration-150 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-800 hover:shadow-md active:scale-95"
                              >
                                {l.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-1">
                      <button
                        onClick={() => deleteExtraWork(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-right font-semibold">
          Subtotal (Extra Work): ₹{extraWorkSubTotal.toFixed(2)}
        </div>
      </div>

      {/* Totals */}
      <div className="text-right font-bold text-lg space-y-2">
        <div>Grand Total: ₹{grandTotal.toFixed(2)}</div>
        <div>Estimate Discount: ₹{discount.toFixed(2)}</div>
        <div>Round Off: ₹{roundOff.toFixed(2)}</div>
        <div className="text-xl border-t-2 pt-2">Final Total: ₹{finalTotal.toFixed(2)}</div>
        <div className="text-green-600">Advance Payment: ₹{advancePayment.toFixed(2)}</div>
        <div className="text-xl text-red-600 border-t-2 pt-2">Balance Due: ₹{balanceDue.toFixed(2)}</div>
      </div>

      {/* Save Job Sheet Button */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={() => setIsWorkOrderModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-md transition-colors"
        >
          <FileText className="w-5 h-5" />
          Work Order Generate
        </button>
        <button
          onClick={saveJobSheet}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-md transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save Job Sheet
        </button>
      </div>
      {/* Job Search Bar */}
      <div>
        <JobSearchBar
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </div>

      <JobReportList
        records={filteredRecords}
        onEdit={handleEditRecord}
        onDelete={(id) => setDeleteConfirmId(id)}
        stepName="Job Sheet"
      />

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => handleDeleteRecord(deleteConfirmId)}
        title="Delete Job Sheet"
        message="Are you sure you want to delete this job sheet record? This action cannot be undone."
      />

      {/* Work Order Modal */}
      <Modal
        isOpen={isWorkOrderModalOpen}
        onClose={() => setIsWorkOrderModalOpen(false)}
        title="Work Order"
        size="xxl"
      >
        <div className="space-y-6">
          {(() => {
            // Combine inspection items and extra work
            const allItems = [...estimateItems, ...extraWork];
            
            // Group items by assignedTo person
            const groupedByPerson = {};
            
            allItems.forEach(item => {
              if (item.assignedTo && item.workOrder) {
                if (!groupedByPerson[item.assignedTo]) {
                  groupedByPerson[item.assignedTo] = {
                    workOrder: item.workOrder,
                    items: []
                  };
                }
                groupedByPerson[item.assignedTo].items.push(item);
              }
            });

            // If no items assigned
            if (Object.keys(groupedByPerson).length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  No work orders assigned yet. Please assign work to Labour or Vendor in the job sheet.
                </div>
              );
            }



            const handlePrintWorkOrders = () => {
              const input = document.getElementById('all-work-orders');
              if (!input) {
                toast.error('Work orders not found. Please try again.');
                return;
              }

              const success = openPrintPreview({
                elementId: 'all-work-orders',
                title: 'Work Orders',
                ...PRINT_PRESETS.jobSheet
              });

              if (!success) {
                toast.error('Failed to open print preview');
              }
            };

            const handleSaveAllPDF = async () => {
              try {
                const input = document.getElementById('all-work-orders');
                if (!input) {
                  toast.error('Work order content not found');
                  return;
                }
                
                toast.info('Generating PDF... Please wait');
                
                // Add padding wrapper for PDF
                const wrapper = document.createElement('div');
                wrapper.style.padding = '40px';
                wrapper.style.backgroundColor = '#ffffff';
                wrapper.style.position = 'fixed';
                wrapper.style.left = '-9999px';
                wrapper.style.top = '0';
                const clonedContent = input.cloneNode(true);
                wrapper.appendChild(clonedContent);
                document.body.appendChild(wrapper);
                
                const canvas = await html2canvas(wrapper, {
                  scale: 3,
                  useCORS: true,
                  allowTaint: true,
                  backgroundColor: '#ffffff',
                  logging: false,
                  width: wrapper.scrollWidth,
                  height: wrapper.scrollHeight
                });
                
                // Remove temporary wrapper
                document.body.removeChild(wrapper);
                
                const imgData = canvas.toDataURL("image/jpeg", 0.95);
                const pdf = new jsPDF({
                  orientation: 'portrait',
                  unit: 'mm',
                  format: 'a4',
                  compress: true
                });
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = pdfWidth;
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;
                
                let heightLeft = imgHeight;
                let position = 0;
                
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= pdfHeight;
                
                while (heightLeft >= 0) {
                  position = heightLeft - imgHeight;
                  pdf.addPage();
                  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                  heightLeft -= pdfHeight;
                }
                
                const fileName = `WorkOrders_${jobCtx.vehicleNo || 'NA'}_${new Date().toISOString().split('T')[0]}.pdf`;
                pdf.save(fileName);
                toast.success('Work Orders PDF saved successfully!');
              } catch (error) {
                console.error('Error generating PDF:', error);
                toast.error('Failed to save PDF: ' + error.message);
              }
            };

            // Display work orders grouped by person
            return (
              <>
                <div id="all-work-orders" className="bg-white" style={{fontSize: '16px'}}>
                  {Object.entries(groupedByPerson).map(([personName, data], personIdx) => (
                    <div key={personName} className="work-order-section mb-6">
                      <div className="header mb-3 pb-2 border-b-2 border-black">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-bold text-gray-800 uppercase" style={{fontSize: '24px'}}>
                              {personName}
                            </h3>
                            <p className="subtitle text-gray-600" style={{fontSize: '16px', marginTop: '4px'}}>
                              {data.workOrder} Work Order
                            </p>
                          </div>
                          <div className="info text-right">
                            <p className="text-gray-600" style={{fontSize: '16px'}}><strong>Vehicle:</strong> {jobCtx.vehicleNo || 'N/A'}</p>
                            {jobCtx.assignedManager && (
                              <p className="text-gray-600" style={{fontSize: '16px'}}>
                                <strong>Assigned Manager:</strong> {jobCtx.assignedManager.name || '--'} {jobCtx.assignedManager.phone ? `| Number: ${jobCtx.assignedManager.phone}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <table className="w-full border border-black border-collapse" style={{fontSize: '16px'}}>
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-black text-left" style={{width: '6%', padding: '6px 8px'}}>S.No</th>
                            <th className="border border-black text-left" style={{width: '40%', padding: '6px 8px'}}>Work Description</th>
                            <th className="border border-black text-left" style={{width: '12%', padding: '6px 8px'}}>Category</th>
                            <th className="border border-black text-center" style={{width: '8%', padding: '6px 8px'}}>Qty</th>
                            <th className="border border-black text-left" style={{width: '12%', padding: '6px 8px'}}>Extra Work</th>
                            <th className="border border-black text-left" style={{width: '15%', padding: '6px 8px'}}>Time Line</th>
                            <th className="border border-black text-center" style={{width: '7%', padding: '6px 8px'}}>होगा</th>
                          </tr>
                        </thead>
                        <tbody>
                          {toItemsArray(data.items).map((item, idx) => (
                            <tr key={idx}>
                              <td className="border border-black" style={{padding: '6px 8px', fontSize: '16px'}}>{idx + 1}</td>
                              <td className="border border-black" style={{padding: '6px 8px', fontSize: '16px'}}>{item.item || 'N/A'}</td>
                              <td className="border border-black" style={{padding: '6px 8px', fontSize: '16px'}}>{item.category || 'N/A'}</td>
                              <td className="border border-black text-center" style={{padding: '6px 8px', fontSize: '16px'}}>{item.multiplier || 1}</td>
                              <td className="border border-black" style={{padding: '6px 8px', fontSize: '16px'}}>&nbsp;</td>
                              <td className="border border-black" style={{padding: '4px 6px', fontSize: '14px'}}>
                                {idx === 0 ? (
                                  <input
                                    type="text"
                                    value={workOrderTimelines[personName]?.deadline || ''}
                                    onChange={(e) => {
                                      setWorkOrderTimelines(prev => ({
                                        ...prev,
                                        [personName]: {
                                          ...prev[personName],
                                          deadline: e.target.value
                                        }
                                      }));
                                    }}
                                    placeholder="Enter deadline"
                                    className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-2 py-1"
                                    style={{fontSize: '14px', minHeight: '24px'}}
                                  />
                                ) : (
                                  <span style={{fontSize: '14px'}}>{workOrderTimelines[personName]?.deadline || ''}</span>
                                )}
                              </td>
                              <td className="border border-black text-center" style={{padding: '4px 6px'}}>
                                {idx === 0 ? (
                                  <div className="flex items-center justify-center gap-3" style={{fontSize: '14px'}}>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={workOrderTimelines[personName]?.canComplete === true}
                                        onChange={(e) => {
                                          setWorkOrderTimelines(prev => ({
                                            ...prev,
                                            [personName]: {
                                              ...prev[personName],
                                              canComplete: e.target.checked ? true : false
                                            }
                                          }));
                                        }}
                                        className="w-4 h-4"
                                      />
                                      <span>Yes</span>
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={workOrderTimelines[personName]?.canComplete === false}
                                        onChange={(e) => {
                                          setWorkOrderTimelines(prev => ({
                                            ...prev,
                                            [personName]: {
                                              ...prev[personName],
                                              canComplete: e.target.checked ? false : undefined
                                            }
                                          }));
                                        }}
                                        className="w-4 h-4"
                                      />
                                      <span>No</span>
                                    </label>
                                  </div>
                                ) : (
                                  <span style={{fontSize: '14px'}}>
                                    {workOrderTimelines[personName]?.canComplete === true ? '✓ Yes' : 
                                     workOrderTimelines[personName]?.canComplete === false ? '✗ No' : ''}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>

                {/* Print and Save PDF buttons */}
                <div className="mt-6 flex gap-3 justify-between border-t pt-4">
                  <button
                    onClick={() => setShowPrintPreview(!showPrintPreview)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-md transition-colors"
                  >
                    <FileText className="w-5 h-5" />
                    {showPrintPreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={handlePrintWorkOrders}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-md transition-colors"
                    >
                      <Printer className="w-5 h-5" />
                      Print Work Orders
                    </button>
                    <button
                      onClick={handleSaveAllPDF}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-md transition-colors"
                    >
                      <Save className="w-5 h-5" />
                      Save PDF
                    </button>
                  </div>
                </div>

                {/* Print Preview Section */}
                {showPrintPreview && (
                  <div className="mt-6 border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                    <h4 className="text-lg font-semibold mb-3 text-gray-700">Print Preview:</h4>
                    <div className="bg-white shadow-lg p-6 rounded" style={{maxHeight: '600px', overflow: 'auto'}}>
                      <div dangerouslySetInnerHTML={{ __html: document.getElementById('all-work-orders')?.innerHTML || '<p>No preview available</p>' }} />
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </Modal>

      <datalist id="categories-list-extra">
        {categories.map((cat) => <option key={cat.id} value={cat.name} />)}
      </datalist>
    </div>
  );
};

export default JobSheetStep;
