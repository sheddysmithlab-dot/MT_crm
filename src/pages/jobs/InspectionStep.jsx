import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toItemsArray } from "@/utils/jsonField";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AutocompleteInput from "@/components/ui/AutocompleteInput";
import ComboBox from "@/components/ui/ComboBox";
import { PlusCircle, Trash2, Edit, Save, X, ListChecks } from "lucide-react";
import JobSearchBar from "@/components/jobs/JobSearchBar";
import JobReportList from "@/components/jobs/JobReportList";
import InspectionWizardModal from "@/components/jobs/InspectionWizardModal";
import AssignedManagerLine, { AssignedManagerTableRow } from "@/components/jobs/AssignedManagerLine";
import { useAuthStore } from '@/store/authManagementStore';
import useCustomerStore from '@/store/customerStore';
import useCompanyStore from '@/store/companyStore';
import { dbOperations } from "@/lib/db";
import useMultiplierStore from "@/store/multiplierStore";
import { toast } from "sonner";
import { broadcastDataChange, SYNC_TYPES } from '@/utils/dataSync';
import useDeleteHistoryStore from '@/store/deleteHistoryStore';
import { getAssignedManagerFields, normalizeAssignedManager } from "@/utils/jobAssignment";

const InspectionStep = ({ registerOnNext }) => {
  const { user } = useAuthStore();
  const { fetchCustomers } = useCustomerStore();
  const navigate = useNavigate();
  const [details, setDetails] = useState({
    vehicleNo: "",
    ownerName: "",
    contactNo: "",
    inspectionDate: new Date().toISOString().split('T')[0],
    address: "",
    gstNumber: "",
    wheeler: "",
    status: "in-progress",
  });

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [labourers, setLabourers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [assignedPerson, setAssignedPerson] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  // Quick-setup wizard opens automatically when a fresh inspection page loads.
  const [showWizard, setShowWizard] = useState(true);

  const { getCategoryMultiplier } = useMultiplierStore();
  const { companyDetails } = useCompanyStore();

  // Load team members from company store
  useEffect(() => {
    const members = [];
    if (companyDetails?.director?.name && companyDetails?.director?.phone) {
      members.push({
        id: 'director',
        name: companyDetails.director.name,
        phone: companyDetails.director.phone,
        email: companyDetails.director.email,
        role: 'Director'
      });
    }
    if (companyDetails?.projectManager?.name && companyDetails?.projectManager?.phone) {
      members.push({
        id: 'projectManager',
        name: companyDetails.projectManager.name,
        phone: companyDetails.projectManager.phone,
        email: companyDetails.projectManager.email,
        role: 'Project Manager'
      });
    }
    if (companyDetails?.marketingManager?.name && companyDetails?.marketingManager?.phone) {
      members.push({
        id: 'marketingManager',
        name: companyDetails.marketingManager.name,
        phone: companyDetails.marketingManager.phone,
        email: companyDetails.marketingManager.email,
        role: 'Marketing Manager'
      });
    }
    if (companyDetails?.headEngineer?.name && companyDetails?.headEngineer?.phone) {
      members.push({
        id: 'headEngineer',
        name: companyDetails.headEngineer.name,
        phone: companyDetails.headEngineer.phone,
        email: companyDetails.headEngineer.email,
        role: 'Head Engineer'
      });
    }
    setTeamMembers(members);
  }, [companyDetails]);

  useEffect(() => {
    const loadCats = async () => {
      try {
        const data = await dbOperations.getAll('inventory_categories');
        const sorted = (data || []).sort((a,b) => String(a.name).localeCompare(String(b.name)));
        setCategories(sorted);
      } catch {
        setCategories([]);
      }
    };
    loadCats();

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
      } catch {
        setInventoryItems([]);
      }
    };
    loadInventoryItems();

    const loadCustomers = async () => {
      try {
        const data = await dbOperations.getAll('customers');
        setCustomers(data || []);
      } catch {
        setCustomers([]);
      }
    };
    loadCustomers();

    const loadVendors = async () => {
      try {
        const data = await dbOperations.getAll('vendors');
        setVendors(data || []);
      } catch {
        setVendors([]);
      }
    };
    loadVendors();

    const loadLabourers = async () => {
      try {
        const data = await dbOperations.getAll('labour');
        setLabourers(data || []);
      } catch {
        setLabourers([]);
      }
    };
    loadLabourers();
  }, []);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const data = await dbOperations.getAll('inspections');
      // Filter: only standalone inspection reports (have vehicle_no or party_name)
      // Exclude job-linked inspection items saved via jobsStore (only have jobId + item fields)
      const reports = (data || []).filter(r =>
        r.vehicle_no || r.party_name || r.vehicleNo || r.partyName || r.ownerName
      );
      const sorted = reports.sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
      setRecords(sorted);
      setFilteredRecords(sorted);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load inspection records');
    }
  };

  // Save inspections to backend JSON file
  const saveInspectionsToBackend = async () => {
    try {
      if (!window.electron?.fs?.writeFile) {
        console.log('⚠️ Electron not available - skipping backend save');
        return;
      }

      const allInspections = await dbOperations.getAll('inspections');
      const filePath = 'C:/malwa-crm/Data_base/jobs/InspectionStep.json';
      
      await window.electron.fs.writeFile(filePath, JSON.stringify(allInspections, null, 2));
      console.log('✅ Inspections saved to backend:', filePath);
    } catch (error) {
      console.error('❌ Failed to save inspections to backend:', error);
      // Don't show error to user as this is a background operation
    }
  };

  const handleSearch = (filters) => {
    let filtered = [...records];

    if (filters.vehicleNo) {
      filtered = filtered.filter(r =>
        r.vehicle_no && r.vehicle_no.toLowerCase().includes(filters.vehicleNo.toLowerCase())
      );
    }

    if (filters.partyName) {
      filtered = filtered.filter(r =>
        r.party_name && r.party_name.toLowerCase().includes(filters.partyName.toLowerCase())
      );
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

  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    
    // Phone validation - only numbers, max 10 digits
    if (name === 'contactNo') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length <= 10) {
        setDetails({ ...details, [name]: numericValue });
      }
      return;
    }
    
    // GSTIN validation - uppercase alphanumeric, max 15 characters
    if (name === 'gstNumber') {
      const upperValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (upperValue.length <= 15) {
        setDetails({ ...details, [name]: upperValue });
      }
      return;
    }
    
    setDetails({ ...details, [name]: value });
  };

  const saveDetails = async (itemsOverride = null) => {
    if (!details.vehicleNo || !details.ownerName) {
      toast.error('Vehicle No and Owner Name are required');
      return;
    }
    const workingItems = Array.isArray(itemsOverride) ? itemsOverride : (Array.isArray(items) ? items : []);
    // Normalize items with computed totals for a single save
    const normalizedItems = workingItems.map((it) => {
      const cat = (it.category || '').trim();
      const mult = parseFloat(it.multiplier ?? getCategoryMultiplier(cat)) || 1;
      const cost = parseFloat(it.cost) || 0;
      const total = parseFloat((cost * mult).toFixed(2));
      return {
        name: it.item ?? it.name ?? '',
        item: it.item ?? it.name ?? '',
        category: cat,
        condition: it.condition,
        cost,
        multiplier: mult,
        total,
        workOrder: it.workOrder || '',
        assignedTo: it.assignedTo || '',
      };
    });

    // Calculate total amount from all items
    const totalAmount = normalizedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const assignedManagerFields = getAssignedManagerFields(assignedPerson);

    const payload = {
      vehicle_no: details.vehicleNo,
      party_name: details.ownerName,
      phone: details.contactNo || '',
      date: details.inspectionDate,
      address: details.address,
      gst_number: details.gstNumber || '',
      wheeler: details.wheeler || '',
      status: details.status,
      items: normalizedItems,
      total: totalAmount,
      total_amount: totalAmount,
      ...assignedManagerFields,
      user_id: user?.id,
    };

    try {
      localStorage.setItem('jobsContext', JSON.stringify(buildJobsContext()));

      if (currentRecordId) {
        await dbOperations.update('inspections', currentRecordId, payload);
        toast.success('Inspection updated successfully');
      } else {
        const rec = await dbOperations.insert('inspections', payload);
        setCurrentRecordId(rec.id);
        toast.success('Inspection saved successfully');
      }

      // Save to backend JSON file
      await saveInspectionsToBackend();

      // Create/Update customer in Customer module
      if (details.contactNo && details.contactNo.length === 10) {
        const existing = await dbOperations.getByIndex('customers', 'phone', details.contactNo);
        
        if (existing && existing.length > 0) {
          // Update existing customer with new details while preserving existing data
          const c = existing[0];
          const updatedCustomerData = {
            name: details.ownerName,
            phone: details.contactNo,
            address: details.address || c.address || '',
            gstin: details.gstNumber || c.gstin || '',
            company: c.company || '',
            type: c.type || 'customer',
            credit_limit: c.credit_limit || 0,
            credit_days: c.credit_days || 30,
            opening_balance: c.opening_balance || 0,
            vehicles: c.vehicles || [],
            created_at: c.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Add vehicle number if not already in the list
          if (details.vehicleNo && details.vehicleNo.trim()) {
            const vehicleExists = (updatedCustomerData.vehicles || []).some(
              v => v.toUpperCase() === details.vehicleNo.toUpperCase()
            );
            if (!vehicleExists) {
              updatedCustomerData.vehicles = [...(updatedCustomerData.vehicles || []), details.vehicleNo.trim()];
            }
          }
          
          await dbOperations.update('customers', c.id, updatedCustomerData);
          console.log('✅ Customer updated:', updatedCustomerData);
          toast.success('Customer details updated');
        } else {
          // Create new customer with complete data
          const newCustomerData = {
            name: details.ownerName,
            phone: details.contactNo,
            address: details.address || '',
            gstin: details.gstNumber || '',
            company: '',
            type: 'customer',
            credit_limit: 0,
            credit_days: 30,
            opening_balance: 0,
            vehicles: details.vehicleNo && details.vehicleNo.trim() ? [details.vehicleNo.trim()] : [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          await dbOperations.insert('customers', newCustomerData);
          console.log('✅ New customer created:', newCustomerData);
          toast.success('New customer added');
        }
        
        // Refresh customer store and broadcast change
        try {
          await fetchCustomers();
          broadcastDataChange(SYNC_TYPES.CUSTOMER, { action: 'save', phone: details.contactNo });
          console.log('✅ Customer store refreshed and change broadcasted');
        } catch (err) {
          console.error('Failed to refresh customer store:', err);
        }
        
        // Save customers to backend
        if (window.electron?.fs?.writeFile) {
          try {
            const allCustomers = await dbOperations.getAll('customers');
            await window.electron.fs.writeFile(
              'C:/malwa-crm/Data_base/customer/Details.json',
              JSON.stringify(allCustomers, null, 2)
            );
            console.log('✅ Customers saved to backend file');
          } catch (err) {
            console.error('❌ Failed to save customers to backend:', err);
          }
        }
      }

      await loadRecords();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save inspection');
    }
  };

  const deleteRow = (index) => {
    const nextItems = items.filter((_, i) => i !== index);
    setItems(nextItems);
  };

  const handleItemChange = (index, field, value) => {
    const copy = [...items];
    copy[index] = { ...copy[index], [field]: value };
    setItems(copy);
  };

  const handleItemMultipleChange = (index, updates) => {
    const copy = [...items];
    copy[index] = { ...copy[index], ...updates };
    setItems(copy);
  };

  const addRow = () => {
    setItems([
      ...items,
      {
        item: '',
        category: '',
        cost: 0,
        multiplier: 1,
        workOrder: '',
        assignedTo: '',
      },
    ]);
  };

  const calculateTotal = (item) => {
    const cost = parseFloat(item?.cost) || 0;
    const mult = parseFloat(item?.multiplier ?? getCategoryMultiplier(item?.category?.trim() || '')) || 1;
    return (cost * mult).toFixed(2);
  };

  const buildJobsContext = () => ({
    vehicleNo: details.vehicleNo,
    partyName: details.ownerName,
    contactNo: details.contactNo || '',
    address: details.address || '',
    gstNumber: details.gstNumber || '',
    wheeler: details.wheeler || '',
    date: details.inspectionDate,
    assignedManager: normalizeAssignedManager(assignedPerson),
  });

  // Always points at the latest builder so the unmount handoff never writes a
  // stale/empty context (which previously blanked party details downstream).
  const buildJobsContextRef = useRef(buildJobsContext);
  buildJobsContextRef.current = buildJobsContext;

  const handleEditRecord = (record) => {
    const recordAssignedManager = normalizeAssignedManager(record);
    setCurrentRecordId(record.id);
    setDetails({
      vehicleNo: record.vehicle_no,
      ownerName: record.party_name,
      contactNo: record.phone || '',
      inspectionDate: record.date,
      address: record.address || '',
      gstNumber: record.gst_number || '',
      wheeler: record.wheeler || '',
      status: record.status,
    });
    const uiItems = toItemsArray(record.items).map((it) => ({
      item: it.item ?? it.name ?? '',
      category: it.category ?? '',
      condition: it.condition ?? 'OK',
      cost: it.cost ?? 0,
      multiplier: it.multiplier ?? getCategoryMultiplier((it.category ?? '').trim()) ?? 1,
      workOrder: it.workOrder ?? '',
      assignedTo: it.assignedTo ?? '',
    }));
    setItems(uiItems);
    setAssignedPerson(recordAssignedManager);
    localStorage.setItem('jobsContext', JSON.stringify({
      vehicleNo: record.vehicle_no,
      partyName: record.party_name,
      contactNo: record.phone || '',
      address: record.address || '',
      gstNumber: record.gst_number || '',
      wheeler: record.wheeler || '',
      date: record.date,
      assignedManager: recordAssignedManager,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info('Record loaded for editing');
  };

  const handleDeleteRecord = async (id) => {
    try {
      const { addDeletedItem } = useDeleteHistoryStore.getState();
      
      // Get the inspection before deleting
      const inspection = await dbOperations.getById('inspections', id);
      if (inspection) {
        addDeletedItem('inspections', inspection);
      }
      
      await dbOperations.delete('inspections', id);
      toast.success('Inspection deleted successfully');
      await loadRecords();
      
      // Save to backend JSON file after deletion
      await saveInspectionsToBackend();
      
      setDeleteConfirmId(null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete inspection');
    }

    if (currentRecordId === id) {
      setCurrentRecordId(null);
      setDetails({
        vehicleNo: "",
        ownerName: "",
        contactNo: "",
        inspectionDate: new Date().toISOString().split('T')[0],
        address: "",
        gstNumber: "",
        wheeler: "",
        status: "in-progress",
      });
      setItems([]);
      setAssignedPerson(null);
    }
  };

  const handleNewRecord = () => {
    setCurrentRecordId(null);
    setDetails({
      vehicleNo: "",
      ownerName: "",
      contactNo: "",
      inspectionDate: new Date().toISOString().split('T')[0],
      address: "",
      gstNumber: "",
      wheeler: "",
      status: "in-progress",
    });
    setItems([]);
    setAssignedPerson(null);
    toast.info('Ready for new inspection');
  };

  // Auto-fill the inspection form from the quick-setup wizard
  const handleWizardFinish = ({ details: wizDetails, items: wizItems, assignedPerson: wizAssigned }) => {
    setCurrentRecordId(null);
    setDetails((prev) => ({
      ...prev,
      vehicleNo: wizDetails.vehicleNo || prev.vehicleNo,
      ownerName: wizDetails.ownerName || prev.ownerName,
      contactNo: wizDetails.contactNo || prev.contactNo,
      address: wizDetails.address || prev.address,
      gstNumber: wizDetails.gstNumber || prev.gstNumber,
      wheeler: wizDetails.wheeler || prev.wheeler,
      inspectionDate: wizDetails.inspectionDate || prev.inspectionDate,
      status: "in-progress",
    }));
    if (Array.isArray(wizItems) && wizItems.length > 0) {
      setItems((prev) => [...prev, ...wizItems]);
    }
    if (wizAssigned) setAssignedPerson(wizAssigned);
    // Persist header context immediately so Estimate / Job Sheet / Labour Bill
    // pick up party & vehicle details even before an explicit save.
    try {
      localStorage.setItem('jobsContext', JSON.stringify({
        vehicleNo: wizDetails.vehicleNo || '',
        partyName: wizDetails.ownerName || '',
        contactNo: wizDetails.contactNo || '',
        address: wizDetails.address || '',
        gstNumber: wizDetails.gstNumber || '',
        wheeler: wizDetails.wheeler || '',
        date: wizDetails.inspectionDate || '',
        assignedManager: normalizeAssignedManager(wizAssigned),
      }));
    } catch {}
    setShowWizard(false);
    toast.success("Inspection form filled from memory");
  };

  const handleNext = async () => {
    if (!details.vehicleNo || !details.ownerName) {
      toast.error('Vehicle No and Owner Name are required before proceeding to Estimate');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one inspection item before proceeding to Estimate');
      return;
    }
    
    // Save the inspection first to ensure customer data is saved
    await saveDetails();
    
    // Normalize items for localStorage in the shape Estimate expects
    const estimateItems = items.map((it) => ({
      item: it.item || it.name || '',
      category: (it.category || '').trim(),
      condition: it.condition || 'OK',
      cost: parseFloat(it.cost) || 0,
      multiplier: parseFloat(it.multiplier ?? getCategoryMultiplier((it.category || '').trim())) || 1,
      workOrder: it.workOrder || '',
      assignedTo: it.assignedTo || '',
    }));
    
    // Persist meta so downstream job steps can prefill header/details
    try {
      localStorage.setItem('jobsContext', JSON.stringify(buildJobsContext()));
    } catch {}

    // Clear old estimate context so new estimate starts with default values
    localStorage.removeItem('estimateContext');
    localStorage.removeItem('estimateAdvancePayment');
    localStorage.removeItem('estimateDiscount');
    localStorage.removeItem('estimateRoundOff');

    localStorage.setItem('inspectionItems', JSON.stringify(estimateItems));
    navigate('/jobs?step=estimate');
  };

  // Register auto-save for global Next navigation
  useEffect(() => {
    if (typeof registerOnNext === 'function') {
      registerOnNext(async () => {
        // Persist inspection details and prepare estimate items without navigating
        await saveDetails();
        const estimateItems = items.map((it) => ({
          item: it.item || it.name || '',
          category: (it.category || '').trim(),
          condition: it.condition || 'OK',
          cost: parseFloat(it.cost) || 0,
          multiplier: parseFloat(it.multiplier ?? getCategoryMultiplier((it.category || '').trim())) || 1,
          workOrder: it.workOrder || '',
          assignedTo: it.assignedTo || '',
        }));
        try {
          localStorage.setItem('jobsContext', JSON.stringify(buildJobsContext()));
        } catch {}
        localStorage.setItem('inspectionItems', JSON.stringify(estimateItems));
      });
    }
  }, [registerOnNext, items, details.vehicleNo, details.ownerName, details.contactNo, details.address, details.gstNumber, details.wheeler, details.inspectionDate, assignedPerson]);

  // On unmount, persist only the header context (party/vehicle/manager) so the
  // next step inherits it. Empty deps + a ref means this fires exactly once on
  // real unmount with the LATEST values — no stale/empty writes mid-edit.
  // Inspection ITEMS are intentionally NOT carried here; they propagate only
  // when the user explicitly clicks "Next".
  useEffect(() => {
    return () => {
      try {
        localStorage.setItem('jobsContext', JSON.stringify(buildJobsContextRef.current()));
      } catch {}
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Vehicle Inspection</h3>
        <div className="flex gap-2">
          <Button onClick={() => setShowWizard(true)} variant="secondary" size="sm">
            <ListChecks className="h-4 w-4 mr-2" />
            Quick Setup
          </Button>
          <Button onClick={handleNewRecord} variant="secondary" size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Inspection
          </Button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm items-end">
          <div>
            <label className="font-medium text-sm">Vehicle No:</label>
            <input
              type="text"
              name="vehicleNo"
              value={details.vehicleNo}
              onChange={handleDetailChange}
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="font-medium text-sm">Wheeler:</label>
            <select
              name="wheeler"
              value={details.wheeler || ''}
              onChange={handleDetailChange}
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select Wheeler</option>
              <option value="4 wheel">4 Wheel</option>
              <option value="6 wheel">6 Wheel</option>
              <option value="10 wheel">10 Wheel</option>
              <option value="12 wheel">12 Wheel</option>
              <option value="14 wheel">14 Wheel</option>
              <option value="16 wheel">16 Wheel</option>
              <option value="18 wheel">18 Wheel</option>
              <option value="22 wheel">22 Wheel</option>
            </select>
          </div>
          <div>
            <label className="font-medium text-sm">Owner Name: *</label>
            <ComboBox
              value={details.ownerName}
              onChange={(value) => setDetails({ ...details, ownerName: value })}
              onSelect={(customer) => {
                if (customer) {
                  setDetails({
                    ...details,
                    ownerName: customer.name,
                    contactNo: customer.phone || '',
                    address: customer.address || '',
                    gstNumber: customer.gst_number || ''
                  });
                }
              }}
              suggestions={customers}
              placeholder="Select or type customer name..."
              displayKey="name"
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="font-medium text-sm">Contact Number:</label>
            <input
              type="tel"
              name="contactNo"
              value={details.contactNo}
              onChange={handleDetailChange}
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="10 digit mobile number"
              maxLength="10"
            />
          </div>
          <div className="col-span-2">
            <label className="font-medium text-sm">Address:</label>
            <input
              type="text"
              name="address"
              value={details.address}
              onChange={handleDetailChange}
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="col-span-2">
            <label className="font-medium text-sm">Assign Person to Inspection:</label>
            <select
              value={assignedPerson?.id || ''}
              onChange={(e) => {
                const selected = teamMembers.find(m => m.id === e.target.value);
                setAssignedPerson(selected || null);
              }}
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">-- Select a team member --</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} - {member.phone}
                </option>
              ))}
            </select>
          </div>

          {assignedPerson && (
            <AssignedManagerLine manager={assignedPerson} className="col-span-4 mt-2" />
          )}

          {teamMembers.length === 0 && (
            <div className="col-span-4 mt-2">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                No team members configured. Please add team members in Company Master settings.
              </p>
            </div>
          )}

          <div>
            <label className="font-medium text-sm">GST Number (Optional):</label>
            <input
              type="text"
              name="gstNumber"
              value={details.gstNumber}
              onChange={handleDetailChange}
              placeholder="15 characters"
              maxLength="15"
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="font-medium text-sm">Inspection Date:</label>
            <input
              type="date"
              name="inspectionDate"
              value={details.inspectionDate}
              onChange={handleDetailChange}
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
        {details.contactNo && details.contactNo.length > 0 && details.contactNo.length !== 10 && (
          <p className="text-xs text-red-500 mt-1">Phone must be 10 digits</p>
        )}
        {details.gstNumber && details.gstNumber.length > 0 && details.gstNumber.length !== 15 && (
          <p className="text-xs text-red-500 mt-1">GST must be 15 characters</p>
        )}
      </Card>

      <Card title="Inspection Items">
        <div className="overflow-visible">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-left">
              <tr>
                <th className="p-2" style={{width: '30%'}}>Work</th>
                <th className="p-2" style={{width: '10%'}}>Category</th>
                <th className="p-2" style={{width: '10%'}}>Cost</th>
                <th className="p-2" style={{width: '8%'}}>Qty</th>
                <th className="p-2" style={{width: '10%'}}>Total</th>
                <th className="p-2 text-center" style={{width: '12%'}}>Actions</th>
              </tr>
            </thead>
            <tbody className="relative">

              {items.length === 0 ? (
                <tr>
                    <td colSpan={6} className="text-center py-1 px-2 text-gray-500">
                      No inspection items added.
                    </td>
                </tr>
              ) : (
                items.map((it, index) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="p-2 relative">
                      <ComboBox
                        value={it.item}
                        onChange={(value) => handleItemChange(index, 'item', value)}
                        onSelect={(suggestion) => {
                          if (suggestion) {
                            const sellingPrice = parseFloat(suggestion.selling_price) || 0;
                            const categoryName = suggestion.category_name || '';
                            const mult = getCategoryMultiplier(categoryName.trim());
                            
                            handleItemMultipleChange(index, {
                              item: suggestion.name,
                              category: categoryName,
                              cost: sellingPrice.toFixed(2),
                              multiplier: mult
                            });
                          }
                        }}
                        suggestions={inventoryItems}
                        placeholder="Select or type work item..."
                        displayKey="name"
                        className="w-full p-1 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={it.category}
                        onChange={(e) => {
                          const cat = e.target.value;
                          const mult = getCategoryMultiplier(cat.trim());
                          handleItemMultipleChange(index, {
                            category: cat,
                            multiplier: mult
                          });
                        }}
                        list="categories-list"
                        placeholder="Select category"
                        className="w-full p-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={it.cost}
                        onChange={(e) => handleItemChange(index, 'cost', e.target.value)}
                        className="w-24 p-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={it.multiplier ?? getCategoryMultiplier(it.category?.trim() || '') ?? 1}
                        onChange={(e) => handleItemChange(index, 'multiplier', parseFloat(e.target.value) || 1)}
                        className="w-24 p-1 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Multiplier"
                      />
                    </td>
                    <td className="p-2">{calculateTotal(it)}</td>
                    <td className="p-2 text-center">
                      <Button variant="ghost" onClick={() => deleteRow(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <Button variant="secondary" onClick={addRow}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add Item
          </Button>

          <Button onClick={() => saveDetails()} className="bg-green-600 hover:bg-green-700 text-white">
            <Save className="h-4 w-4 mr-2" /> Save Inspection
          </Button>
        </div>
      </Card>



      <JobSearchBar onSearch={handleSearch} onReset={handleReset} />

      <JobReportList
        records={filteredRecords}
        onEdit={handleEditRecord}
        onDelete={(id) => setDeleteConfirmId(id)}
        stepName="Inspection"
        showStatus={false}
      />

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => handleDeleteRecord(deleteConfirmId)}
        title="Delete Inspection"
        message="Are you sure you want to delete this inspection record? This action cannot be undone."
      />

      <InspectionWizardModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onFinish={handleWizardFinish}
        customers={customers}
        teamMembers={teamMembers}
      />

      <datalist id="items-list">
        {/* keep for future item suggestions if needed */}
      </datalist>
      <datalist id="categories-list">
        {categories.map((cat) => <option key={cat.id} value={cat.name} />)}
      </datalist>
    </div>
  );
};

export default InspectionStep;
