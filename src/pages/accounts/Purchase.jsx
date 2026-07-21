import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Plus, Eye, Edit, Download, Printer } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { broadcastDataChange } from '@/utils/dataSync';
import { saveRateListMemory } from '@/utils/rateListMemory';
import { openPrintPreview, PRINT_PRESETS } from '@/utils/printHelpers';
import ComboBox from '@/components/ui/ComboBox';

const PurchaseInvoiceForm = ({ onClose, onSave, editData }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [formData, setFormData] = useState({
    invoice_no: '',
    invoice_date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    gst_type: 'cgst_sgst',
    igst: 18,
    cgst: 9,
    sgst: 9,
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
  const [extras, setExtras] = useState([
    { id: Date.now(), description: '', amount: '' }
  ]);

  useEffect(() => {
    loadSuppliers();
    loadCategories();
    loadInventoryItems();
    
    // Populate form if editing
    if (editData) {
      setFormData({
        id: editData.id,
        invoice_no: editData.invoice_no,
        invoice_date: editData.invoice_date,
        supplier_id: editData.supplier_id,
        gst_type: editData.gst_type,
        igst: editData.igst || 18,
        cgst: editData.cgst || 9,
        sgst: editData.sgst || 9,
      });
      
      if (editData.materials && editData.materials.length > 0) {
        setMaterials(editData.materials.map(m => ({
          id: m.id || Date.now() + Math.random(),
          material_name: m.material_name,
          category_id: m.category_id,
          quantity: m.quantity,
          unit: m.unit,
          rate: m.rate,
        })));
      }
      if (editData.extras && editData.extras.length > 0) {
        setExtras(editData.extras.map(e => ({
          id: e.id || Date.now() + Math.random(),
          description: e.description,
          amount: e.amount,
        })));
      }
    } else {
      // Reset form for new entry
      setFormData({
        invoice_no: '',
        invoice_date: new Date().toISOString().split('T')[0],
        supplier_id: '',
        gst_type: 'cgst_sgst',
        igst: 18,
        cgst: 9,
        sgst: 9,
      });
      setMaterials([
        {
          id: Date.now(),
          material_name: '',
          category_id: '',
          quantity: '',
          unit: 'pcs',
          rate: '',
        }
      ]);
      setExtras([{ id: Date.now(), description: '', amount: '' }]);
    }
  }, [editData]);

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
      const items = await dbOperations.getAll('inventory_items');
      const cats = await dbOperations.getAll('inventory_categories');
      const rateMemory = await dbOperations.getAll('rate_list_memory') || [];
      
      // Enrich items with category names for dropdown display
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
      console.error('Error loading inventory items:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleMaterialChange = (id, field, value) => {
    setMaterials(materials.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleItemSelect = (id, selectedItem) => {
    if (selectedItem) {
      setMaterials(materials.map(item => 
        item.id === id ? { 
          ...item, 
          material_name: selectedItem.name,
          category_id: selectedItem.category_id,
          rate: selectedItem.selling_price || selectedItem.cost_price || selectedItem.rate || 0
        } : item
      ));
    }
  };

  const addMaterialRow = () => {
    setMaterials([...materials, {
      id: Date.now(),
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
    const subtotal = materials.reduce((sum, item) => 
      sum + calculateMaterialTotal(item.quantity, item.rate), 0
    );

    let gstAmount = 0;
    if (formData.gst_type === 'igst') {
      gstAmount = (subtotal * parseFloat(formData.igst)) / 100;
    } else {
      const cgstAmount = (subtotal * parseFloat(formData.cgst)) / 100;
      const sgstAmount = (subtotal * parseFloat(formData.sgst)) / 100;
      gstAmount = cgstAmount + sgstAmount;
    }

    const extrasTotal = extras.reduce((sum, item) => 
      sum + (parseFloat(item.amount) || 0), 0
    );

    const total = subtotal + gstAmount + extrasTotal;

    return {
      subtotal: subtotal.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      extrasTotal: extrasTotal.toFixed(2),
      total: total.toFixed(2),
    };
  };

  // Extras handlers
  const addExtraRow = () => {
    setExtras([...extras, { id: Date.now(), description: '', amount: '' }]);
  };

  const removeExtraRow = (id) => {
    if (extras.length > 1) {
      setExtras(extras.filter(item => item.id !== id));
    } else {
      setExtras([{ id: Date.now(), description: '', amount: '' }]);
    }
  };

  const handleExtraChange = (id, field, value) => {
    setExtras(extras.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.invoice_no) {
      toast.error('Invoice number is required');
      return;
    }
    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }

    // Validate materials
    const validMaterials = materials.filter(m => m.material_name && m.category_id && m.quantity && m.rate);
    if (validMaterials.length === 0) {
      toast.error('Please add at least one material with all required fields');
      return;
    }

    const amounts = calculateTotals();
    const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

    const validExtras = extras.filter(e => e.description && e.amount);
    
    const purchaseData = {
      ...formData,
      supplier_name: selectedSupplier?.name || '',
      materials: validMaterials,
      extras: validExtras,
      subtotal: parseFloat(amounts.subtotal),
      gst_amount: parseFloat(amounts.gstAmount),
      extras_total: parseFloat(amounts.extrasTotal),
      total_amount: parseFloat(amounts.total),
      created_at: new Date().toISOString(),
    };

    onSave(purchaseData);
  };

  const totals = calculateTotals();
  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);

  return (
    <div className="max-h-[85vh] overflow-y-auto">
      <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-4">
        {editData ? 'Edit Purchase Invoice' : 'Add Purchase Invoice'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Invoice Header */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Invoice No *
            </label>
            <input
              type="text"
              name="invoice_no"
              value={formData.invoice_no}
              onChange={handleChange}
              placeholder="Enter invoice number"
              className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Date *
            </label>
            <input
              type="date"
              name="invoice_date"
              value={formData.invoice_date}
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

        {/* Materials Table */}
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-visible">
          <div className="overflow-visible">
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
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600 relative">
                {materials.map((material) => (
                  <tr key={material.id} className="bg-white dark:bg-dark-card">
                    <td className="px-2 py-1 relative">
                      <ComboBox
                        value={material.material_name}
                        onChange={(value) => handleMaterialChange(material.id, 'material_name', value)}
                        onSelect={(selectedItem) => handleItemSelect(material.id, selectedItem)}
                        suggestions={inventoryItems}
                        displayKey="name"
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

        {/* GST Section */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              GST Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gst_type"
                  value="igst"
                  checked={formData.gst_type === 'igst'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-dark-text">IGST</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gst_type"
                  value="cgst_sgst"
                  checked={formData.gst_type === 'cgst_sgst'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-dark-text">CGST + SGST</span>
              </label>
            </div>
          </div>
          <div>
            {formData.gst_type === 'igst' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  IGST Rate (%)
                </label>
                <input
                  type="number"
                  name="igst"
                  value={formData.igst}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    CGST (%)
                  </label>
                  <input
                    type="number"
                    name="cgst"
                    value={formData.cgst}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    SGST (%)
                  </label>
                  <input
                    type="number"
                    name="sgst"
                    value={formData.sgst}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Extra Charges Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text">
              Extra Charges
            </h3>
            <button
              type="button"
              onClick={addExtraRow}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <PlusCircle className="w-4 h-4" />
              Add Extra
            </button>
          </div>
          
          <div className="space-y-2">
            {extras.map((extra) => (
              <div key={extra.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={extra.description}
                  onChange={(e) => handleExtraChange(extra.id, 'description', e.target.value)}
                  placeholder="Description (e.g. Hamali, Freight)"
                  className="flex-1 p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-1 focus:ring-brand-red"
                />
                <input
                  type="number"
                  value={extra.amount}
                  onChange={(e) => handleExtraChange(extra.id, 'amount', e.target.value)}
                  placeholder="Amount (+/-)"
                  step="0.01"
                  className="w-32 p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-1 focus:ring-brand-red"
                />
                <button
                  type="button"
                  onClick={() => removeExtraRow(extra.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
            💡 Extra charges: Hamali, Freight, Round Off, Cartage, Loading/Unloading, Transport etc.
          </p>
        </div>

        {/* Amount Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <span className="font-medium text-gray-900 dark:text-dark-text">₹{totals.subtotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              GST ({formData.gst_type === 'igst' ? `IGST ${formData.igst}%` : `CGST ${formData.cgst}% + SGST ${formData.sgst}%`}):
            </span>
            <span className="font-medium text-gray-900 dark:text-dark-text">₹{totals.gstAmount}</span>
          </div>
          {parseFloat(totals.extrasTotal) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Extra Charges:</span>
              <span className="font-medium text-gray-900 dark:text-dark-text">₹{totals.extrasTotal}</span>
            </div>
          )}
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
            {editData ? 'Update Purchase Invoice' : 'Save Purchase Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
};

const Purchase = () => {
  const [purchases, setPurchases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    invoice_no: '',
    supplier_id: '',
    date_from: '',
    date_to: '',
  });

  useEffect(() => {
    loadPurchases();
    loadSuppliers();
  }, []);

  // Auto-refresh when page becomes visible or focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadPurchases();
      }
    };

    const handleFocus = () => {
      loadPurchases();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await dbOperations.getAll('suppliers');
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const data = await dbOperations.getAll('purchases');
      
      // Load categories to get category names
      const categories = await dbOperations.getAll('inventory_categories');
      
      // Enhance purchase data with category name
      const enhancedData = data.map(purchase => {
        if (purchase.materials && purchase.materials.length > 0) {
          const firstMaterial = purchase.materials[0];
          const category = categories.find(c => c.id === firstMaterial.category_id);
          return {
            ...purchase,
            category_name: category?.name || 'Unknown'
          };
        }
        return purchase;
      });
      
      // Sort by date descending (recent first)
      const sorted = enhancedData.sort((a, b) => new Date(b.invoice_date || b.created_at) - new Date(a.invoice_date || a.created_at));
      setPurchases(sorted || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchFilters({ ...searchFilters, [name]: value });
  };

  const filteredPurchases = purchases.filter((purchase) => {
    const matchesInvoiceNo = !searchFilters.invoice_no || 
      purchase.invoice_no?.toLowerCase().includes(searchFilters.invoice_no.toLowerCase());
    
    const matchesSupplier = !searchFilters.supplier_id || 
      purchase.supplier_id === searchFilters.supplier_id;
    
    const matchesDateFrom = !searchFilters.date_from || 
      purchase.invoice_date >= searchFilters.date_from;
    
    const matchesDateTo = !searchFilters.date_to || 
      purchase.invoice_date <= searchFilters.date_to;
    
    return matchesInvoiceNo && matchesSupplier && matchesDateFrom && matchesDateTo;
  });

  const handleSave = async (purchaseData) => {
    try {
      const isEditing = purchaseData.id;
      const purchaseId = isEditing ? purchaseData.id : Date.now().toString();
      
      // Check for duplicate invoice number (only for new invoices)
      if (!isEditing) {
        const allPurchases = await dbOperations.getAll('purchases');
        const duplicate = allPurchases.find(p => 
          p.invoice_no === purchaseData.invoice_no && p.id !== purchaseId
        );
        
        if (duplicate) {
          const confirmed = window.confirm(
            `A purchase invoice with number "${purchaseData.invoice_no}" already exists.\n\nDo you want to UPDATE the existing record?`
          );
          
          if (!confirmed) {
            return; // User chose not to update
          }
          
          // Switch to edit mode
          purchaseData.id = duplicate.id;
          await handleSave(purchaseData); // Recursive call with edit mode
          return;
        }
      }
      
      if (isEditing) {
        // Update existing purchase
        await dbOperations.update('purchases', purchaseId, {
          invoice_no: purchaseData.invoice_no,
          invoice_date: purchaseData.invoice_date,
          supplier_id: purchaseData.supplier_id,
          supplier_name: purchaseData.supplier_name,
          gst_type: purchaseData.gst_type,
          igst: purchaseData.igst,
          cgst: purchaseData.cgst,
          sgst: purchaseData.sgst,
          subtotal: purchaseData.subtotal,
          gst_amount: purchaseData.gst_amount,
          total_amount: purchaseData.total_amount,
          materials: purchaseData.materials,
          updated_at: new Date().toISOString(),
        });
        
        // Delete old purchase items and stock movements
        const oldItems = await dbOperations.getAll('purchase_items');
        const itemsToDelete = oldItems.filter(item => item.purchase_id === purchaseId);
        for (const item of itemsToDelete) {
          await dbOperations.delete('purchase_items', item.id);
          await dbOperations.delete('stock_movements', `stock_${item.id}`);
        }
        
        // Delete old GST ledger entry
        await dbOperations.delete('gst_ledger', `${purchaseId}_gst`);
        
        // Delete old rate history
        const oldRates = await dbOperations.getAll('rate_history');
        const ratesToDelete = oldRates.filter(r => 
          r.reference_id === purchaseId && r.source === 'purchase'
        );
        for (const rate of ratesToDelete) {
          await dbOperations.delete('rate_history', rate.id);
        }
        
        // Delete old supplier ledger entries
        const oldLedgerEntries = await dbOperations.getAll('supplier_ledger_entries');
        const ledgerEntriesToDelete = oldLedgerEntries.filter(e => 
          e.reference_id === purchaseId && e.reference_type === 'purchase'
        );
        for (const entry of ledgerEntriesToDelete) {
          await dbOperations.delete('supplier_ledger_entries', entry.id);
        }
      } else {
        // Create new purchase
        await dbOperations.insert('purchases', {
          id: purchaseId,
          invoice_no: purchaseData.invoice_no,
          invoice_date: purchaseData.invoice_date,
          supplier_id: purchaseData.supplier_id,
          supplier_name: purchaseData.supplier_name,
          gst_type: purchaseData.gst_type,
          igst: purchaseData.igst,
          cgst: purchaseData.cgst,
          sgst: purchaseData.sgst,
          subtotal: purchaseData.subtotal,
          gst_amount: purchaseData.gst_amount,
          total_amount: purchaseData.total_amount,
          materials: purchaseData.materials,
          created_at: purchaseData.created_at,
        });
      }

      // 2. Save each material and update stock
      for (const material of purchaseData.materials) {
        const materialId = `${purchaseId}_${material.id}`;
        
        // Save purchase item
        await dbOperations.insert('purchase_items', {
          id: materialId,
          purchase_id: purchaseId,
          material_name: material.material_name,
          category_id: material.category_id,
          quantity: parseFloat(material.quantity),
          unit: material.unit,
          rate: parseFloat(material.rate),
          total: parseFloat(material.quantity) * parseFloat(material.rate),
          created_at: new Date().toISOString(),
        });

        // Update stock movement
        await dbOperations.insert('stock_movements', {
          id: `stock_${materialId}`,
          material_name: material.material_name,
          category_id: material.category_id,
          movement_type: 'in',
          quantity: parseFloat(material.quantity),
          unit: material.unit,
          reference_type: 'purchase',
          reference_id: purchaseId,
          reference_no: purchaseData.invoice_no,
          movement_date: purchaseData.invoice_date,
          created_at: new Date().toISOString(),
        });

        // Update or insert inventory_items (duplicate detection by material_name)
        try {
          const existingItems = await dbOperations.getAll('inventory_items');
          const existingItem = existingItems.find(item => 
            item.material_name?.toLowerCase() === material.material_name?.toLowerCase()
          );

          if (existingItem) {
            // Update existing item - add quantity, update rate
            const newQuantity = (parseFloat(existingItem.stock_quantity) || 0) + parseFloat(material.quantity);
            await dbOperations.update('inventory_items', existingItem.id, {
              stock_quantity: newQuantity,
              rate: parseFloat(material.rate), // Update to latest rate
              selling_rate: parseFloat(material.rate), // Update selling rate too
              category_id: material.category_id,
              unit: material.unit,
              updated_at: new Date().toISOString(),
            });
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
          }
        } catch (error) {
          console.error('Error updating inventory_items:', error);
        }
        
        // Save rate history
        await dbOperations.insert('rate_history', {
          id: `rate_${materialId}_${Date.now()}`,
          item_name: material.material_name,
          category_id: material.category_id,
          rate: parseFloat(material.rate),
          vendor_name: purchaseData.supplier_name,
          source: 'purchase',
          reference_no: purchaseData.invoice_no,
          reference_id: purchaseId,
          date: purchaseData.invoice_date,
          created_at: new Date().toISOString(),
        });
      }

      // Save to Rate List Memory
      await saveRateListMemory(purchaseData.materials);

      // 3. Create supplier ledger entry (CREDIT - liability)
      const category = purchaseData.materials && purchaseData.materials.length > 0 ? purchaseData.materials[0].category_id : '';
      await dbOperations.insert('supplier_ledger_entries', {
        supplier_id: purchaseData.supplier_id,
        entry_date: purchaseData.invoice_date,
        particulars: `Purchase Invoice - ${purchaseData.invoice_no}`,
        reference_no: purchaseData.invoice_no,
        reference_type: 'purchase',
        reference_id: purchaseId,
        debit_amount: 0,
        credit_amount: purchaseData.total_amount,
        entry_type: 'purchase',
        category,
        created_at: new Date().toISOString(),
      });

      // 4. Add to GST Ledger
      try {
        const gstId = `${purchaseId}_gst`;
        await dbOperations.insert('gst_ledger', {
          id: gstId,
          transaction_type: 'purchase',
          transaction_date: purchaseData.invoice_date,
          document_no: purchaseData.invoice_no,
          party_name: purchaseData.supplier_name,
          gst_type: purchaseData.gst_type,
          igst: purchaseData.gst_type === 'igst' ? purchaseData.gst_amount : 0,
          cgst: purchaseData.gst_type === 'cgst_sgst' ? purchaseData.gst_amount / 2 : 0,
          sgst: purchaseData.gst_type === 'cgst_sgst' ? purchaseData.gst_amount / 2 : 0,
          total_gst: purchaseData.gst_amount,
          taxable_amount: purchaseData.subtotal,
          entry_type: 'input',
          created_at: new Date().toISOString(),
        });
        console.log('GST Ledger entry created:', gstId);
      } catch (gstError) {
        console.error('Error creating GST ledger entry:', gstError);
        toast.warning('Purchase saved but GST ledger update failed');
      }

      // Success message and close form
      if (isEditing) {
        toast.success('Purchase invoice updated successfully!');
      } else {
        toast.success(`Purchase invoice saved successfully! ${purchaseData.materials.length} materials added to stock.`);
      }
      
      // Broadcast data change to supplier ledger
      broadcastDataChange('purchase', isEditing ? 'updated' : 'created', {
        purchase_id: purchaseId,
        supplier_id: purchaseData.supplier_id,
        invoice_no: purchaseData.invoice_no,
        amount: purchaseData.total_amount
      });
      
      setShowForm(false);
      setEditingInvoice(null);
      loadPurchases();
    } catch (error) {
      console.error('Error saving purchase:', error);
      toast.error('Failed to save purchase invoice');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase invoice?')) {
      return;
    }

    try {
      // Get purchase details before deleting
      const purchase = await dbOperations.getById('purchases', id);
      
      // Delete the purchase
      await dbOperations.delete('purchases', id);
      
      // Delete related supplier ledger entries
      if (purchase && purchase.supplier_id) {
        try {
          const allLedgerEntries = await dbOperations.getAll('supplier_ledger_entries');
          
          // Find and delete ledger entries for this purchase
          const ledgerEntriesToDelete = allLedgerEntries.filter(entry => 
            entry.supplier_id === purchase.supplier_id &&
            (entry.reference_id === id || 
             (entry.reference_type === 'purchase' && purchase.invoice_no && entry.description?.includes(purchase.invoice_no)))
          );
          
          console.log('Deleting supplier ledger entries for purchase:', ledgerEntriesToDelete.length);
          
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
      
      toast.success('Purchase invoice deleted');
      loadPurchases();
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast.error('Failed to delete purchase invoice');
    }
  };

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  const handleView = async (purchase) => {
    try {
      // Fetch materials for this purchase
      const allPurchaseItems = await dbOperations.getAll('purchase_items');
      const materials = allPurchaseItems.filter(item => item.purchase_id === purchase.id);
      
      // Fetch category names for materials
      const categories = await dbOperations.getAll('inventory_categories');
      const materialsWithCategories = materials.map(material => {
        const category = categories.find(cat => cat.id === material.category_id);
        return {
          ...material,
          category_name: category?.name || 'N/A'
        };
      });
      
      setViewingInvoice({
        ...purchase,
        materials: materialsWithCategories
      });
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error loading purchase details:', error);
      toast.error('Failed to load purchase details');
    }
  };

  const handleEditFromView = async () => {
    if (viewingInvoice) {
      setEditingInvoice(viewingInvoice);
      setIsViewModalOpen(false);
      setShowForm(true);
    }
  };



  const handlePrint = () => {
    if (!viewingInvoice) {
      toast.error('No invoice selected for printing');
      return;
    }
    
    const success = openPrintPreview({
      elementId: 'purchase-invoice-print-view',
      title: `Purchase Invoice - ${viewingInvoice.invoice_no || 'N/A'}`,
      ...PRINT_PRESETS.invoice
    });
    
    if (!success) {
      toast.error('Print failed. Please try again.');
    }
  };

  const handleSavePDF = () => {
    const input = document.getElementById('purchase-invoice-print-view');
    import('html2canvas').then(html2canvas => {
      import('jspdf').then(({ default: jsPDF }) => {
        html2canvas.default(input, { scale: 2 }).then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          const filename = viewingInvoice?.invoice_no ? `purchase_${viewingInvoice.invoice_no}.pdf` : 'purchase_invoice.pdf';
          pdf.save(filename);
        });
      });
    });
  };

  return (
    <div className="p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Purchase Invoices
          </h2>
          <Button
            onClick={() => setShowForm(true)}
            variant="primary"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Purchase Invoice
          </Button>
        </div>

        {/* Search Filters */}
        <div className="grid grid-cols-4 gap-3 mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <input
              type="text"
              name="invoice_no"
              value={searchFilters.invoice_no}
              onChange={handleSearchChange}
              placeholder="Search by Invoice No..."
              className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div>
            <select
              name="supplier_id"
              value={searchFilters.supplier_id}
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
              value={searchFilters.date_from}
              onChange={handleSearchChange}
              placeholder="From Date"
              className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            />
          </div>
          <div>
            <input
              type="date"
              name="date_to"
              value={searchFilters.date_to}
              onChange={handleSearchChange}
              placeholder="To Date"
              className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">
              {purchases.length === 0 ? 'No purchase invoices found' : 'No matching purchase invoices found'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {purchases.length === 0 ? 'Add your first purchase invoice to get started' : 'Try adjusting your search filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Invoice No</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Supplier</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Category</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">GST</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Total</th>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-2 py-1 text-sm text-gray-900 dark:text-dark-text">{purchase.invoice_no}</td>
                    <td className="px-2 py-1 text-sm text-gray-900 dark:text-dark-text">
                      {new Date(purchase.invoice_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-2 py-1 text-sm text-gray-900 dark:text-dark-text">{purchase.supplier_name}</td>
                    <td className="px-2 py-1 text-sm text-gray-900 dark:text-dark-text">
                      {purchase.category_name || 'Multiple items'}
                    </td>
                    <td className="px-2 py-1 text-sm text-gray-900 dark:text-dark-text">₹{Number(purchase.gst_amount || 0).toFixed(2)}</td>
                    <td className="px-2 py-1 text-sm font-medium text-gray-900 dark:text-dark-text">
                      ₹{Number(purchase.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-2 py-1 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(purchase)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(purchase.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
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

      <Modal isOpen={showForm} onClose={() => {
        setShowForm(false);
        setEditingInvoice(null);
      }} size="xl">
        <PurchaseInvoiceForm
          key={editingInvoice?.id || 'new'}
          onClose={() => {
            setShowForm(false);
            setEditingInvoice(null);
          }}
          onSave={handleSave}
          editData={editingInvoice}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingInvoice(null);
        }}
        title="Purchase Invoice Details"
        size="xl"
      >
        {viewingInvoice && (
          <div className="space-y-4">
            {/* Header with Actions */}
            <div className="flex justify-end gap-2 pb-4 border-b dark:border-gray-700">
              <Button variant="outline" size="sm" onClick={handleEditFromView}>
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

            {/* Invoice Print View */}
            <div id="purchase-invoice-print-view" className="bg-white text-black p-6">
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Purchase Invoice</h1>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Invoice No:</p>
                  <p className="font-semibold">{viewingInvoice.invoice_no}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date:</p>
                  <p className="font-semibold">{new Date(viewingInvoice.invoice_date).toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Supplier:</p>
                  <p className="font-semibold">{viewingInvoice.supplier_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">GST Type:</p>
                  <p className="font-semibold uppercase">{viewingInvoice.gst_type}</p>
                </div>
              </div>

              {/* Materials Table */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Materials</h3>
                <table className="w-full border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left">Material</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Category</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Quantity</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Unit</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Rate</th>
                      <th className="border border-gray-300 px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingInvoice.materials && viewingInvoice.materials.length > 0 ? (
                      viewingInvoice.materials.map((material, idx) => (
                        <tr key={idx}>
                          <td className="border border-gray-300 px-3 py-2">{material.material_name}</td>
                          <td className="border border-gray-300 px-3 py-2">{material.category_name || 'N/A'}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right">{material.quantity}</td>
                          <td className="border border-gray-300 px-3 py-2">{material.unit}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right">₹{material.rate}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right">₹{(material.quantity * material.rate).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="border border-gray-300 px-3 py-2 text-center text-gray-500">
                          No materials available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2 border-b">
                    <span>Subtotal:</span>
                    <span>₹{Number(viewingInvoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>GST:</span>
                    <span>₹{Number(viewingInvoice.gst_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-lg">
                    <span>Total:</span>
                    <span>₹{Number(viewingInvoice.total_amount || 0).toFixed(2)}</span>
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

export default Purchase;
