import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Plus, Eye, Download, Edit } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { broadcastDataChange } from '@/utils/dataSync';
import { saveRateListMemory } from '@/utils/rateListMemory';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { openPrintPreview, PRINT_PRESETS } from '@/utils/printHelpers';
import useCompanyStore from '@/store/companyStore';
import ComboBox from '@/components/ui/ComboBox';

// Form Component for Add/Edit
const ChallanForm = ({ initialData, onClose, onSave }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  // Generate challan number in format: CR/YY-YY/XXXX
  const generateChallanNo = async () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    let yearStart, yearEnd;
    if (currentMonth >= 3) {
      yearStart = currentYear.toString().slice(-2);
      yearEnd = (currentYear + 1).toString().slice(-2);
    } else {
      yearStart = (currentYear - 1).toString().slice(-2);
      yearEnd = currentYear.toString().slice(-2);
    }
    // Get all challans for this financial year
    let sequence = 1;
    try {
      const allChallans = await dbOperations.getAll('purchase_challans');
      const fyChallans = allChallans.filter(c => {
        if (!c.challan_no) return false;
        return c.challan_no.startsWith(`CR/${yearStart}-${yearEnd}/`);
      });
      sequence = fyChallans.length + 1;
    } catch (e) {}
    const seqStr = sequence.toString().padStart(4, '0');
    return `CR/${yearStart}-${yearEnd}/${seqStr}`;
  };

  const [formData, setFormData] = useState({
    challan_no: '',
    challan_date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    payment_mode: 'pending',
    payment_amount: 0,
    payment_status: 'pending',
  });
  const [materials, setMaterials] = useState([
    {
      id: Date.now(),
      material_name: '',
      category_id: '',
      quantity: '',
      unit: 'pcs',
      rate: '',
    }
  ]);

  useEffect(() => {
    loadSuppliers();
    loadCategories();
    loadInventoryItems();
    
    // If initialData is provided (edit mode), load it
    if (initialData) {
      console.log('Loading initial data for edit:', initialData);
      setFormData({
        challan_no: initialData.challan_no || '',
        challan_date: initialData.challan_date || new Date().toISOString().split('T')[0],
        supplier_id: initialData.supplier_id || '',
        payment_mode: initialData.payment_mode || 'pending',
        payment_amount: initialData.payment_amount || 0,
        payment_status: initialData.payment_status || 'pending',
      });
      
      if (initialData.materials && initialData.materials.length > 0) {
        setMaterials(initialData.materials);
      }
    } else {
      // Generate challan number only for new challan
      generateChallanNo().then(challanNo => {
        setFormData(prev => ({ ...prev, challan_no: challanNo }));
      });
    }
  }, [initialData]);

  const loadSuppliers = async () => {
    try {
      const data = await dbOperations.getAll('suppliers');
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await dbOperations.getAll('inventory_categories');
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadInventoryItems = async () => {
    try {
      const data = await dbOperations.getAll('inventory_items');
      setInventoryItems(data || []);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleMaterialChange = (id, field, value) => {
    setMaterials(prevMaterials => 
      prevMaterials.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleItemSelect = (id, selectedItem) => {
    if (selectedItem) {
      setMaterials(prevMaterials => 
        prevMaterials.map(item => 
          item.id === id ? { 
            ...item, 
            material_name: selectedItem.material_name,
            category_id: selectedItem.category_id,
            rate: selectedItem.selling_rate || selectedItem.rate || 0
          } : item
        )
      );
    }
  };

  const addMaterialRow = () => {
    setMaterials(prevMaterials => [...prevMaterials, {
      id: Date.now() + Math.random(), // Better unique ID
      material_name: '',
      category_id: '',
      quantity: '',
      unit: 'pcs',
      rate: '',
    }]);
  };

  const removeMaterialRow = (id) => {
    if (materials.length > 1) {
      setMaterials(materials.filter(item => item.id !== id));
    }
  };

  const calculateMaterialTotal = (quantity, rate) => {
    return (parseFloat(quantity) || 0) * (parseFloat(rate) || 0);
  };

  const calculateTotals = () => {
    const total = materials.reduce((sum, item) => 
      sum + calculateMaterialTotal(item.quantity, item.rate), 0
    );

    return {
      total: total.toFixed(2),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Use existing challan number from formData
    const challanNo = formData.challan_no;

    if (!challanNo) {
      toast.error('Challan number is required');
      return;
    }
    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }

    // Check for duplicate challan number
    try {
      const existingChallans = await dbOperations.getAll('purchase_challans');
      const duplicate = existingChallans.find(
        challan => challan.challan_no === challanNo
      );
      if (duplicate) {
        toast.error(`Duplicate challan number found! Challan ${challanNo} already exists.`);
        return;
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
    }

    // Validate materials
    const validMaterials = materials.filter(m => m.material_name && m.category_id && m.quantity && m.rate);
    if (validMaterials.length === 0) {
      toast.error('Please add at least one material with all required fields');
      return;
    }

    const amounts = calculateTotals();
    const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);
    const totalAmount = parseFloat(amounts.total);
    const paymentAmount = parseFloat(formData.payment_amount) || 0;
    // Determine payment status
    let paymentStatus = 'pending';
    if (paymentAmount >= totalAmount) {
      paymentStatus = 'paid';
    } else if (paymentAmount > 0) {
      paymentStatus = 'partial';
    }
    const challanData = {
      ...formData,
      challan_no: challanNo,
      supplier_name: selectedSupplier?.name || '',
      materials: validMaterials,
      total_amount: totalAmount,
      payment_amount: paymentAmount,
      payment_status: paymentStatus,
      balance_due: totalAmount - paymentAmount,
      created_at: new Date().toISOString(),
    };
    onSave(challanData);
  };

  const totals = calculateTotals();
  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

  return (
    <div className="max-h-[85vh] overflow-y-auto">
      <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-4">
        Add Purchase Challan
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Challan Header */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Challan No *
            </label>
            <input
              type="text"
              name="challan_no"
              value={formData.challan_no}
              onChange={handleChange}
              placeholder="Auto-generated"
              className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-dark-text"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Date *
            </label>
            <input
              type="date"
              name="challan_date"
              value={formData.challan_date}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Supplier *
            </label>
            <select
              name="supplier_id"
              value={formData.supplier_id}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              required
            >
              <option value="">Select Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} {supplier.company && `- ${supplier.company}`}
                </option>
              ))}
            </select>
            {selectedSupplier?.gstin && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                GSTIN: {selectedSupplier.gstin}
              </p>
            )}
          </div>
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Payment Mode
            </label>
            <select
              name="payment_mode"
              value={formData.payment_mode}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            >
              <option value="pending">Pending</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="upi">UPI</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Payment Amount (₹)
            </label>
            <input
              type="number"
              name="payment_amount"
              value={formData.payment_amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              max={totals.total}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Balance Due: ₹{(parseFloat(totals.total) - parseFloat(formData.payment_amount || 0)).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Materials Table */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase" style={{width: '25%'}}>Material Name *</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase" style={{width: '20%'}}>Category *</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase" style={{width: '12%'}}>Quantity *</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase" style={{width: '12%'}}>Unit</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase" style={{width: '15%'}}>Rate *</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase" style={{width: '13%'}}>Total</th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase" style={{width: '3%'}}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {materials.map((material) => (
                  <tr key={material.id} className="bg-white dark:bg-dark-card">
                    <td className="px-2 py-1">
                      <ComboBox
                        value={material.material_name}
                        onChange={(value) => handleMaterialChange(material.id, 'material_name', value)}
                        onSelect={(selectedItem) => handleItemSelect(material.id, selectedItem)}
                        suggestions={inventoryItems}
                        displayKey="material_name"
                        placeholder="Select or type material name..."
                        className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-1 focus:ring-brand-red"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={material.category_id}
                        onChange={(e) => handleMaterialChange(material.id, 'category_id', e.target.value)}
                        className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-1 focus:ring-brand-red"
                      >
                        <option value="">Select</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={material.quantity}
                        onChange={(e) => handleMaterialChange(material.id, 'quantity', e.target.value)}
                        placeholder=""
                        step="0.01"
                        min="0"
                        className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-1 focus:ring-brand-red"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={material.unit}
                        onChange={(e) => handleMaterialChange(material.id, 'unit', e.target.value)}
                        className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-1 focus:ring-brand-red"
                      >
                        <option value="pcs">Pieces</option>
                        <option value="kg">Kg</option>
                        <option value="ltr">Liters</option>
                        <option value="mtr">Meters</option>
                        <option value="box">Box</option>
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={material.rate}
                        onChange={(e) => handleMaterialChange(material.id, 'rate', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full p-1.5 text-sm border border-gray-300 rounded bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-1 focus:ring-brand-red"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-dark-text">
                        ₹{calculateMaterialTotal(material.quantity, material.rate).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeMaterialRow(material.id)}
                        disabled={materials.length === 1}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Button
          type="button"
          onClick={addMaterialRow}
          variant="outline"
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Material
        </Button>

        {/* Amount Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-lg font-bold border-t border-gray-300 dark:border-gray-600 pt-2">
            <span className="text-gray-900 dark:text-dark-text">Total Amount:</span>
            <span className="text-brand-red">₹{totals.total}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save Purchase Challan
          </Button>
        </div>
      </form>
    </div>
  );
};

const Challan = () => {
  const [challans, setChallans] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingChallan, setViewingChallan] = useState(null);
  const [challanItems, setChallanItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingChallan, setEditingChallan] = useState(null);
  const { companyDetails } = useCompanyStore();

  useEffect(() => {
    // Removed aggressive database health check that showed false positives
    // Health diagnostics should be run manually from admin tools, not on every page load
    
    fetchChallans();
    loadSuppliers();
  }, []);

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const data = await dbOperations.getAll('purchase_challans');
      // Sort by date descending (recent first)
      const sorted = (data || []).sort((a, b) => new Date(b.challan_date || b.created_at) - new Date(a.challan_date || a.created_at));
      setChallans(sorted);
    } catch (error) {
      console.error('Error loading challans:', error);
      toast.error('Failed to load challans');
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await dbOperations.getAll('suppliers');
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleSave = async (challanData) => {
    let challanId = null;
    let errorOccurred = false;
    let errorMsg = '';
    try {
      console.log('=== Starting Purchase Challan Save ===' );
      console.log('Challan data:', challanData);
      
      // Verify database is ready
      const db = await dbOperations.getAll('purchase_challans').catch(() => []);
      console.log('Database connection verified');
      
      // Save main challan record
      const challanRecord = await dbOperations.insert('purchase_challans', {
        challan_no: challanData.challan_no,
        challan_date: challanData.challan_date,
        supplier_id: challanData.supplier_id,
        supplier_name: challanData.supplier_name,
        total_amount: challanData.total_amount,
        payment_mode: challanData.payment_mode,
        payment_amount: challanData.payment_amount,
        payment_status: challanData.payment_status,
        balance_due: challanData.balance_due,
        created_at: challanData.created_at,
      });
      challanId = challanRecord.id || challanRecord;
      console.log('✅ Challan saved with ID:', challanId);

      // Save to Rate List Memory
      await saveRateListMemory(challanData.materials);

      // Save challan items and create stock movements
      console.log(`=== Saving ${challanData.materials.length} materials for challan ID: ${challanId} ===`);
      let savedItemsCount = 0;
      let failedItems = [];
      
      for (let i = 0; i < challanData.materials.length; i++) {
        const material = challanData.materials[i];
        const itemTotal = parseFloat(material.quantity) * parseFloat(material.rate);
        
        try {
          const itemData = {
            challan_id: challanId,
            material_name: material.material_name,
            category_id: material.category_id,
            quantity: parseFloat(material.quantity),
            unit: material.unit,
            rate: parseFloat(material.rate),
            total: itemTotal,
            created_at: new Date().toISOString(),
          };
          console.log(`[${i + 1}/${challanData.materials.length}] Saving material:`, itemData);
          
          const savedItem = await dbOperations.insert('purchase_challan_items', itemData);
          console.log(`✅ Material saved successfully:`, savedItem.id);
          savedItemsCount++;
        } catch (itemError) {
          console.error(`❌ Failed to save material ${i + 1}:`, itemError);
          failedItems.push({ index: i + 1, name: material.material_name, error: itemError.message });
        }

        // Update inventory stock - find or create inventory item
        try {
          const allInventory = await dbOperations.getAll('inventory_items');
          const existingItem = allInventory.find(inv => 
            inv.material_name?.toLowerCase() === material.material_name.toLowerCase()
          );
          if (existingItem) {
            // Update existing item - add quantity, update rate
            const newQuantity = (parseFloat(existingItem.stock_quantity) || 0) + parseFloat(material.quantity);
            await dbOperations.update('inventory_items', existingItem.id, {
              stock_quantity: newQuantity,
              rate: parseFloat(material.rate), // Update to latest rate
              selling_rate: parseFloat(material.rate),
              category_id: material.category_id,
              unit: material.unit,
              updated_at: new Date().toISOString(),
            });
            console.log(`✅ Updated inventory for ${material.material_name}`);
          } else {
            // Insert new item
            await dbOperations.insert('inventory_items', {
              id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              material_name: material.material_name,
              category_id: material.category_id,
              stock_quantity: parseFloat(material.quantity),
              unit: material.unit,
              rate: parseFloat(material.rate),
              selling_rate: parseFloat(material.rate),
              created_at: new Date().toISOString(),
            });
            console.log(`✅ Created new inventory item for ${material.material_name}`);
          }
        } catch (invError) {
          console.error(`⚠️  Inventory update error for ${material.material_name}:`, invError);
        }

        // Create stock movement (IN)
        try {
          await dbOperations.insert('stock_movements', {
            material_name: material.material_name,
            category_id: material.category_id,
            movement_type: 'in',
            quantity: parseFloat(material.quantity),
            unit: material.unit,
            reference_type: 'purchase_challan',
            reference_id: challanId,
            reference_no: challanData.challan_no,
            movement_date: challanData.challan_date,
            created_at: new Date().toISOString(),
          });
        } catch (moveError) {
          errorOccurred = true;
          errorMsg += `Stock movement error: ${moveError?.message || moveError}\n`;
        }
        
        // Save rate history
        try {
          const rateId = `rate_challan_${challanId}_${material.id || Date.now()}_${Math.random()}`;
          await dbOperations.insert('rate_history', {
            id: rateId,
            item_name: material.material_name,
            category_id: material.category_id,
            rate: parseFloat(material.rate),
            vendor_name: challanData.supplier_name,
            source: 'purchase_challan',
            reference_no: challanData.challan_no,
            reference_id: challanId,
            date: challanData.challan_date,
            created_at: new Date().toISOString(),
          });
        } catch (rateError) {
          errorOccurred = true;
          errorMsg += `Rate history error: ${rateError?.message || rateError}\n`;
        }
      }
      
      // Log summary
      console.log('=== Save Summary ===');
      console.log(`Materials saved: ${savedItemsCount}/${challanData.materials.length}`);
      if (failedItems.length > 0) {
        console.error('Failed items:', failedItems);
        toast.error(`Some materials failed to save: ${failedItems.map(f => f.name).join(', ')}`);
      }

      // Verify the save was successful
      try {
        const savedChallan = await dbOperations.getById('purchase_challans', challanId);
        console.log('Verification - Saved challan:', savedChallan);
        
        const savedItems = await dbOperations.getAll('purchase_challan_items');
        const thisChallanItems = savedItems.filter(item => item.challan_id === challanId);
        console.log(`Verification - Found ${thisChallanItems.length} items for this challan`);
        
        if (thisChallanItems.length !== challanData.materials.length) {
          console.warn(`⚠️  Expected ${challanData.materials.length} items, but found ${thisChallanItems.length}`);
        }
      } catch (verifyError) {
        console.error('Verification error:', verifyError);
      }

      // Create supplier ledger entry (CREDIT - liability)
      try {
        const category = challanData.materials && challanData.materials.length > 0 ? challanData.materials[0].category_id : '';
        await dbOperations.insert('supplier_ledger_entries', {
          supplier_id: challanData.supplier_id,
          entry_date: challanData.challan_date,
          particulars: `Purchase Challan - ${challanData.challan_no}`,
          reference_no: challanData.challan_no,
          reference_type: 'purchase_challan',
          reference_id: challanId,
          debit_amount: 0,
          credit_amount: challanData.total_amount,
          entry_type: 'purchase',
          category,
          created_at: new Date().toISOString(),
        });

        // If payment made, create voucher entry (category-wise payment tracking)
        if (challanData.payment_amount > 0) {
          // Create voucher for payment
          const voucherNo = `VCH/PC/${challanData.challan_no}`;
          await dbOperations.insert('vouchers', {
            id: `voucher_${challanId}_${Date.now()}`,
            voucher_no: voucherNo,
            entry_date: challanData.challan_date,
            voucher_type: 'payment',
            payment_to: 'supplier',
            supplier_id: challanData.supplier_id,
            supplier_name: challanData.supplier_name,
            amount: challanData.payment_amount,
            payment_mode: challanData.payment_mode,
            category_id: category,
            reference_type: 'purchase_challan',
            reference_no: challanData.challan_no,
            reference_id: challanId,
            remarks: `Payment for Purchase Challan - ${challanData.challan_no}`,
            created_at: new Date().toISOString(),
          });

          // Also create supplier ledger entry (DEBIT - reduces liability)
          await dbOperations.insert('supplier_ledger_entries', {
            supplier_id: challanData.supplier_id,
            entry_date: challanData.challan_date,
            particulars: `Payment for Challan - ${challanData.challan_no} (${challanData.payment_mode})`,
            reference_no: voucherNo,
            reference_type: 'voucher',
            reference_id: challanId,
            debit_amount: challanData.payment_amount,
            credit_amount: 0,
            entry_type: 'payment',
            category,
            created_at: new Date().toISOString(),
          });
        }
      } catch (ledgerError) {
        console.error('⚠️ Ledger entry error:', ledgerError);
        toast.warning('Challan saved but ledger update failed');
      }

      // Success - show appropriate message
      if (failedItems.length === 0) {
        toast.success(`✅ Purchase Challan saved successfully with ${challanData.materials.length} material(s)`);
      } else {
        toast.warning(`Challan saved but ${failedItems.length} material(s) failed to save`);
      }
      
      // Broadcast data change to supplier ledger
      broadcastDataChange('purchase_challan', 'created', {
        challan_id: challanId,
        supplier_id: challanData.supplier_id,
        challan_no: challanData.challan_no,
        amount: challanData.total_amount
      });
      
      setShowForm(false);
      fetchChallans();
      
    } catch (error) {
      console.error('❌ Critical error saving challan:', error);
      toast.error(`Failed to save challan: ${error?.message || 'Unknown error'}`);
      
      // If challan was partially saved, try to clean up
      if (challanId) {
        console.log('Attempting cleanup of partially saved challan...');
        try {
          await dbOperations.delete('purchase_challans', challanId);
          console.log('✅ Cleanup successful');
        } catch (cleanupError) {
          console.error('⚠️ Cleanup failed:', cleanupError);
        }
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this challan?')) return;

    try {
      // Get challan details before deleting
      const challan = await dbOperations.getById('purchase_challans', id);
      
      // Delete the challan
      await dbOperations.delete('purchase_challans', id);
      
      // Delete related supplier ledger entries
      if (challan && challan.supplier_id) {
        try {
          const allLedgerEntries = await dbOperations.getAll('supplier_ledger_entries');
          
          // Find and delete ledger entries for this challan
          const ledgerEntriesToDelete = allLedgerEntries.filter(entry => 
            entry.supplier_id === challan.supplier_id &&
            (entry.reference_id === id || 
             (entry.reference_type === 'challan' && challan.challan_no && entry.description?.includes(challan.challan_no)))
          );
          
          console.log('Deleting supplier ledger entries for challan:', ledgerEntriesToDelete.length);
          
          for (const entry of ledgerEntriesToDelete) {
            await dbOperations.delete('supplier_ledger_entries', entry.id);
            broadcastDataChange('supplier_ledger_entries', 'delete', { id: entry.id, supplier_id: entry.supplier_id });
          }
          
          // Save ledger to backend
          if (window.electron?.fs?.writeFile) {
            const updatedLedger = await dbOperations.getAll('supplier_ledger_entries');
            await window.electron.fs.writeFile(
              'C:/malwa-crm/Data_base/supplier/Ledger.json',
              JSON.stringify(updatedLedger, null, 2)
            );
            console.log('✅ Supplier ledger entries deleted and saved to backend');
          }
        } catch (ledgerError) {
          console.error('Failed to delete supplier ledger entries:', ledgerError);
        }
      }
      
      toast.success('Challan deleted successfully');
      fetchChallans();
    } catch (error) {
      console.error('Error deleting challan:', error);
      toast.error('Failed to delete challan');
    }
  };

  const handleView = async (challan) => {
    setViewingChallan(challan);
    // Load challan items
    try {
      const allItems = await dbOperations.getAll('purchase_challan_items');
      console.log('All items:', allItems);
      console.log('Looking for challan ID:', challan.id);
      
      // Match by challan_id (which should be the challan's database ID)
      let items = allItems.filter(item => {
        const match = item.challan_id === challan.id;
        console.log(`Item ${item.id} challan_id=${item.challan_id}, matches=${match}`);
        return match;
      });
      
      console.log('Filtered items:', items);
      setChallanItems(items || []);
      
      if (items.length === 0) {
        console.warn('No items found for challan:', challan);
      }
    } catch (error) {
      console.error('Error loading challan items:', error);
      toast.error('Failed to load challan items');
      setChallanItems([]);
    }
  };

  const handleEdit = async () => {
    try {
      console.log('Starting edit for challan:', viewingChallan);
      
      // Load materials for this challan
      const allItems = await dbOperations.getAll('purchase_challan_items');
      console.log('All purchase_challan_items:', allItems);
      
      const items = allItems.filter(item => item.challan_id === viewingChallan.id);
      console.log(`Found ${items.length} items for challan ${viewingChallan.id}:`, items);
      
      if (items.length === 0) {
        toast.warning('No materials found for this challan');
      }
      
      // Prepare edit data with materials
      const editData = {
        ...viewingChallan,
        materials: items.map(item => ({
          id: item.id || Date.now() + Math.random(),
          material_name: item.material_name || '',
          category_id: item.category_id || '',
          quantity: item.quantity || '',
          unit: item.unit || 'pcs',
          rate: item.rate || '',
        }))
      };
      
      // If no materials found, add a blank row
      if (editData.materials.length === 0) {
        editData.materials = [{
          id: Date.now(),
          material_name: '',
          category_id: '',
          quantity: '',
          unit: 'pcs',
          rate: '',
        }];
      }
      
      console.log('Edit data prepared:', editData);
      
      // Close view and open edit form
      setViewingChallan(null);
      setChallanItems([]);
      setEditingChallan(editData);
      setShowForm(true);
      toast.success('Challan loaded for editing');
    } catch (error) {
      console.error('Error preparing edit:', error);
      toast.error(`Failed to load challan for editing: ${error.message}`);
    }
  };



  const handlePrint = () => {
    if (!viewingChallan) {
      toast.error('No challan selected for printing');
      return;
    }
    
    const success = openPrintPreview({
      elementId: 'challan-print-view',
      title: `Purchase Challan - ${viewingChallan.challan_no || 'N/A'}`,
      ...PRINT_PRESETS.invoice
    });
    
    if (!success) {
      toast.error('Print failed. Please try again.');
    }
  };

  const handleSavePDF = () => {
    if (!viewingChallan) return;
    
    const input = document.getElementById('challan-print-view');
    if (!input) {
      toast.error('Challan view not found');
      return;
    }
    
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Generate filename with supplier name and challan number
      const supplierName = (viewingChallan.supplier_name || 'unknown').replace(/[^a-zA-Z0-9]/g, '-');
      const challanNo = (viewingChallan.challan_no || 'no-number').replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `purchase-challan-${supplierName}-${challanNo}.pdf`;
      
      pdf.save(filename);
      toast.success('PDF saved successfully');
    });
  };

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchTerm(value);
  };

  const filteredChallans = challans.filter((challan) => {
    return (
      challan.challan_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      challan.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Purchase Challan
          </h2>
          <Button
            onClick={() => setShowForm(true)}
            variant="primary"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Challan
          </Button>
        </div>

        {/* Purchase Challan Content */}
            {/* Search Filters */}
            <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <input
                  type="text"
                  name="challan_no"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search by challan no..."
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
              </div>
              <div>
                <select
                  name="supplier_id"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                >
                  <option value="">All Suppliers</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="date"
                  name="date_from"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Date From"
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
              </div>
              <div>
                <input
                  type="date"
                  name="date_to"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Date To"
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
              </div>
            </div>

            {/* Challans Table */}
            {loading ? (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400">Loading...</p>
              </div>
            ) : filteredChallans.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400">No purchase challans found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Add your first purchase challan to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Challan No
                      </th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Materials
                      </th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Total Amount
                      </th>
                      <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Payment Status
                      </th>
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredChallans.map((challan) => (
                      <tr key={challan.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-2 py-1 text-sm text-gray-900 dark:text-dark-text">
                          {challan.challan_no}
                        </td>
                        <td className="px-2 py-1 text-sm text-gray-900 dark:text-dark-text">
                          {new Date(challan.challan_date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-2 py-1 text-sm text-gray-900 dark:text-dark-text">
                          {challan.supplier_name}
                        </td>
                        <td className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">
                          Multiple items
                        </td>
                        <td className="px-2 py-1 text-sm font-medium text-gray-900 dark:text-dark-text">
                          ₹{Number(challan.total_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-2 py-1 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            challan.payment_status === 'paid' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : challan.payment_status === 'partial'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {challan.payment_status === 'paid' ? 'Paid' : challan.payment_status === 'partial' ? 'Partial' : 'Pending'}
                          </span>
                          {challan.balance_due > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Due: ₹{Number(challan.balance_due || 0).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleView(challan)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title="View Challan"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(challan.id)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete Challan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </Card>

      {/* Add Form Modal */}
      <Modal isOpen={showForm} onClose={() => {
        setShowForm(false);
        setEditingChallan(null);
      }} size="xl">
        <ChallanForm
          initialData={editingChallan}
          onClose={() => {
            setShowForm(false);
            setEditingChallan(null);
          }}
          onSave={handleSave}
        />
      </Modal>

      {/* View Challan Modal */}
      <Modal
        isOpen={!!viewingChallan}
        onClose={() => {
          setViewingChallan(null);
          setChallanItems([]);
        }}
        title="Purchase Challan Details"
        size="xl"
      >
        {viewingChallan && (
          <div className="space-y-4">
            {/* Header with Actions */}
            <div className="flex justify-end gap-2 pb-4 border-b dark:border-gray-700">
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>

              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>

              <Button variant="outline" size="sm" onClick={handleSavePDF}>
                <Download className="h-4 w-4 mr-1" />
                Save PDF
              </Button>
            </div>

            {/* Challan Print View */}
            <div id="challan-print-view" className="bg-white text-black p-6">
              {/* Header */}
              <div className="text-center mb-6 border-b-2 border-black pb-4">
                <h1 className="text-3xl font-bold">PURCHASE CHALLAN</h1>
                <p className="text-lg mt-2">{companyDetails.name || "Malwa Trolley"}</p>
              </div>

              {/* Challan Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Challan No:</p>
                  <p className="font-bold text-lg">{viewingChallan.challan_no || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date:</p>
                  <p className="font-bold text-lg">{viewingChallan.challan_date ? new Date(viewingChallan.challan_date).toLocaleDateString('en-GB') : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Supplier:</p>
                  <p className="font-bold text-lg">{viewingChallan.supplier_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Mode:</p>
                  <p className="font-bold text-lg capitalize">{viewingChallan.payment_mode || 'N/A'}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3 border-b border-black pb-2">MATERIALS</h3>
                <table className="w-full border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-black p-2 text-left">S.No</th>
                      <th className="border border-black p-2 text-left">Material Name</th>
                      <th className="border border-black p-2 text-center">Quantity</th>
                      <th className="border border-black p-2 text-center">Unit</th>
                      <th className="border border-black p-2 text-right">Rate (₹)</th>
                      <th className="border border-black p-2 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challanItems.length > 0 ? (
                      challanItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="border border-black p-2">{idx + 1}</td>
                          <td className="border border-black p-2">{item.material_name || 'N/A'}</td>
                          <td className="border border-black p-2 text-center">{item.quantity || 0}</td>
                          <td className="border border-black p-2 text-center capitalize">{item.unit || 'pcs'}</td>
                          <td className="border border-black p-2 text-right">₹{(item.rate || 0).toFixed(2)}</td>
                          <td className="border border-black p-2 text-right">₹{(item.total || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="border border-black py-1 px-2 text-center">No materials found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <h3 className="font-bold text-lg border-b border-black pb-2">PAYMENT DETAILS</h3>
                  <div className="flex justify-between">
                    <span>Payment Mode:</span>
                    <span className="font-semibold capitalize">{viewingChallan.payment_mode || 'Pending'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Status:</span>
                    <span className={`font-semibold capitalize ${
                      viewingChallan.payment_status === 'paid' ? 'text-green-600' :
                      viewingChallan.payment_status === 'partial' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {viewingChallan.payment_status || 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-lg border-b border-black pb-2">AMOUNT SUMMARY</h3>
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-semibold">₹{(viewingChallan.total_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Received:</span>
                    <span className="font-semibold">₹{(viewingChallan.payment_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-black pt-2">
                    <span className="font-bold">Balance Due:</span>
                    <span className="font-bold text-red-600">₹{(viewingChallan.balance_due || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-6 border-t-2 border-black">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Received By</p>
                    <div className="mt-8 border-t border-black pt-2 w-48">
                      <p className="text-sm text-center">Signature</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Authorized By</p>
                    <div className="mt-8 border-t border-black pt-2 w-48">
                      <p className="text-sm text-center">Signature</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Challan;
