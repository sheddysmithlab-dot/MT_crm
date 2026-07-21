import { useState, useEffect } from 'react';
import useSupplierStore from '@/store/supplierStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import { PlusCircle, Download, FileText, Edit, Trash2, Search, ExternalLink, Receipt } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { exportToCSV, exportToPDF, formatCurrency, formatDate } from '@/utils/exportHelpers';
import { subscribeToEntity, broadcastDataChange } from '@/utils/dataSync';

// VoucherForm component - same as in Voucher.jsx
const VoucherForm = ({ voucher, onSave, onCancel, preselectedPayee }) => {
  const [formData, setFormData] = useState(
    voucher || {
      voucher_date: new Date().toISOString().split('T')[0],
      voucher_no: '',
      payee_type: preselectedPayee?.payee_type || 'supplier',
      payee_id: preselectedPayee?.payee_id || '',
      payee_name: '',
      amount: 0,
      payment_mode: 'cash',
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
            placeholder="Auto-generated if empty"
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Payee Type *
        </label>
        <select
          name="payee_type"
          value={formData.payee_type}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
          required
        >
          <option value="vendor">Vendor</option>
          <option value="labour">Employee</option>
          <option value="supplier">Supplier</option>
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
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
            required
          >
            <option value="">-- Select {formData.payee_type.charAt(0).toUpperCase() + formData.payee_type.slice(1)} --</option>
            {getPayeeOptions().map((payee) => (
              <option key={payee.id} value={payee.id}>
                {payee.name}
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
          placeholder="0.00"
          step="0.01"
          min="0"
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Cheque No
            </label>
            <input
              type="text"
              name="cheque_no"
              value={formData.cheque_no}
              onChange={handleChange}
              placeholder="Enter cheque number"
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
              placeholder="Enter bank name"
              className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Particulars
        </label>
        <textarea
          name="particulars"
          value={formData.particulars}
          onChange={handleChange}
          placeholder="Payment for..."
          rows="2"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
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
          placeholder="Additional notes..."
          rows="2"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Voucher</Button>
      </div>
    </form>
  );
};

const ManualEntryForm = ({ supplierId, entry, onSave, onCancel }) => {
  const [categories, setCategories] = useState([]);
  const [documentType, setDocumentType] = useState('invoice'); // 'invoice' or 'challan'
  const [formData, setFormData] = useState(
    entry || {
      entry_date: new Date().toISOString().split('T')[0],
      document_no: '',
      gst_type: 'cgst_sgst',
      cgst: 9,
      sgst: 9,
      igst: 18,
    }
  );
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
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await dbOperations.getAll('inventory_categories');
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
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

  const addMaterialRow = () => {
    setMaterials(prevMaterials => [...prevMaterials, {
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
      setMaterials(prevMaterials => prevMaterials.filter(item => item.id !== id));
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
    if (documentType === 'invoice') {
      if (formData.gst_type === 'igst') {
        gstAmount = (subtotal * parseFloat(formData.igst)) / 100;
      } else {
        const cgstAmount = (subtotal * parseFloat(formData.cgst)) / 100;
        const sgstAmount = (subtotal * parseFloat(formData.sgst)) / 100;
        gstAmount = cgstAmount + sgstAmount;
      }
    }

    const total = subtotal + gstAmount;

    return {
      subtotal: subtotal.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      total: total.toFixed(2),
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.document_no) {
      toast.error('Document number is required');
      return;
    }

    const validMaterials = materials.filter(m => m.material_name && m.category_id && m.quantity && m.rate);
    if (validMaterials.length === 0) {
      toast.error('Please add at least one material with all required fields');
      return;
    }

    const amounts = calculateTotals();
    
    const entryData = {
      supplier_id: supplierId,
      entry_date: formData.entry_date,
      document_type: documentType,
      document_no: formData.document_no,
      gst_type: documentType === 'invoice' ? formData.gst_type : null,
      igst: documentType === 'invoice' ? formData.igst : 0,
      cgst: documentType === 'invoice' ? formData.cgst : 0,
      sgst: documentType === 'invoice' ? formData.sgst : 0,
      materials: validMaterials,
      subtotal: parseFloat(amounts.subtotal),
      gst_amount: parseFloat(amounts.gstAmount),
      total_amount: parseFloat(amounts.total),
      particulars: `${documentType === 'invoice' ? 'Invoice' : 'Challan'} - ${formData.document_no}`,
      debit_amount: 0,
      credit_amount: parseFloat(amounts.total),
    };

    onSave(entryData);
  };

  const totals = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[85vh] overflow-y-auto">
      {/* Document Type Selection */}
      <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="documentType"
            value="invoice"
            checked={documentType === 'invoice'}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-4 h-4 text-brand-red focus:ring-brand-red"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-dark-text">Invoice (with GST)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="documentType"
            value="challan"
            checked={documentType === 'challan'}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-4 h-4 text-brand-red focus:ring-brand-red"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-dark-text">Challan (without GST)</span>
        </label>
      </div>

      {/* Document Header */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            {documentType === 'invoice' ? 'Invoice No' : 'Challan No'} *
          </label>
          <input
            type="text"
            name="document_no"
            value={formData.document_no}
            onChange={handleChange}
            placeholder={`Enter ${documentType} number`}
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
            name="entry_date"
            value={formData.entry_date}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            required
          />
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
                <tr key={material.id}>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={material.material_name || ''}
                      onChange={(e) => handleMaterialChange(material.id, 'material_name', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Enter material name"
                      className="w-full p-1 border border-gray-300 rounded bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text text-sm focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                      required
                      autoComplete="off"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={material.category_id || ''}
                      onChange={(e) => handleMaterialChange(material.id, 'category_id', e.target.value)}
                      className="w-full p-1 border border-gray-300 rounded bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text text-sm focus:ring-2 focus:ring-brand-red"
                      required
                    >
                      <option value="">Select</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      value={material.quantity || ''}
                      onChange={(e) => handleMaterialChange(material.id, 'quantity', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder=""
                      step="0.01"
                      min="0"
                      className="w-full p-1 border border-gray-300 rounded bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text text-sm focus:ring-2 focus:ring-brand-red"
                      required
                      autoComplete="off"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={material.unit || 'pcs'}
                      onChange={(e) => handleMaterialChange(material.id, 'unit', e.target.value)}
                      className="w-full p-1 border border-gray-300 rounded bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text text-sm focus:ring-2 focus:ring-brand-red"
                    >
                      <option value="pcs">Pcs</option>
                      <option value="kg">Kg</option>
                      <option value="liter">Liter</option>
                      <option value="meter">Meter</option>
                      <option value="box">Box</option>
                      <option value="dozen">Dozen</option>
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      value={material.rate || ''}
                      onChange={(e) => handleMaterialChange(material.id, 'rate', e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full p-1 border border-gray-300 rounded bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text text-sm focus:ring-2 focus:ring-brand-red"
                      required
                      autoComplete="off"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={`₹${calculateMaterialTotal(material.quantity, material.rate).toFixed(2)}`}
                      readOnly
                      className="w-full p-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-right font-medium"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeMaterialRow(material.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      disabled={materials.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-2 border-t border-gray-200 dark:border-gray-600">
          <button
            type="button"
            onClick={addMaterialRow}
            className="text-sm text-brand-red hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium flex items-center gap-1"
          >
            <PlusCircle className="w-4 h-4" />
            Add Material
          </button>
        </div>
      </div>

      {/* GST Section - Only for Invoice */}
      {documentType === 'invoice' && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              GST Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gst_type"
                  value="igst"
                  checked={formData.gst_type === 'igst'}
                  onChange={handleChange}
                  className="w-4 h-4 text-brand-red focus:ring-brand-red"
                />
                <span className="text-sm text-gray-700 dark:text-dark-text">IGST</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gst_type"
                  value="cgst_sgst"
                  checked={formData.gst_type === 'cgst_sgst'}
                  onChange={handleChange}
                  className="w-4 h-4 text-brand-red focus:ring-brand-red"
                />
                <span className="text-sm text-gray-700 dark:text-dark-text">CGST + SGST</span>
              </label>
            </div>
          </div>

          {formData.gst_type === 'cgst_sgst' ? (
            <>
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
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                IGST (%)
              </label>
              <input
                type="number"
                name="igst"
                value={formData.igst}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              />
            </div>
          )}
        </div>
      )}

      {/* Totals */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-dark-text-secondary">Subtotal:</span>
            <span className="font-medium text-gray-900 dark:text-dark-text">₹{totals.subtotal}</span>
          </div>
          {documentType === 'invoice' && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-dark-text-secondary">
                GST ({formData.gst_type === 'igst' ? 'IGST' : 'CGST + SGST'} {formData.gst_type === 'igst' ? formData.igst : (parseFloat(formData.cgst) + parseFloat(formData.sgst))}%):
              </span>
              <span className="font-medium text-gray-900 dark:text-dark-text">₹{totals.gstAmount}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300 dark:border-gray-600">
            <span className="text-gray-900 dark:text-dark-text">Total Amount:</span>
            <span className="text-brand-red">₹{totals.total}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save {documentType === 'invoice' ? 'Invoice' : 'Challan'}</Button>
      </div>
    </form>
  );
};

const DocumentDetailsModal = ({ documentId, documentType, onClose }) => {
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocumentDetails();
  }, [documentId, documentType]);

  const fetchDocumentDetails = async () => {
    if (!documentId || !documentType) return;

    setLoading(true);
    try {
      let storeName = '';
      if (documentType === 'purchase') storeName = 'purchases';
      else if (documentType === 'purchase_challan') storeName = 'purchase_challans';
      else if (documentType === 'voucher') storeName = 'vouchers';

      if (!storeName) {
        toast.error('Invalid document type');
        return;
      }

      const rec = await dbOperations.getById(storeName, documentId);
      setDocumentData(rec);
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('Failed to load document details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
        <span className="ml-3">Loading document...</span>
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="text-center py-8 text-gray-500">
        Document not found or has been deleted.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-2">
          {documentType === 'purchase' && 'Purchase Invoice'}
          {documentType === 'purchase_challan' && 'Purchase Challan'}
          {documentType === 'voucher' && 'Payment Voucher'}
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600 dark:text-dark-text-secondary">Document No:</span>
            <span className="ml-2 font-medium">{documentData.invoice_no || documentData.challan_no || documentData.voucher_no}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-dark-text-secondary">Date:</span>
            <span className="ml-2 font-medium">
              {new Date(documentData.invoice_date || documentData.challan_date || documentData.voucher_date).toLocaleDateString('en-GB')}
            </span>
          </div>
          {documentData.total_amount !== undefined && (
            <div>
              <span className="text-gray-600 dark:text-dark-text-secondary">Amount:</span>
              <span className="ml-2 font-medium text-green-600">
                ₹{parseFloat(documentData.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {documentData.payment_amount !== undefined && (
            <div>
              <span className="text-gray-600 dark:text-dark-text-secondary">Payment:</span>
              <span className="ml-2 font-medium text-red-600">
                ₹{parseFloat(documentData.payment_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>

      {documentData.notes && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Notes
          </label>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary bg-gray-50 dark:bg-gray-800 p-3 rounded">
            {documentData.notes}
          </p>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

const SupplierLedgerTab = () => {
  const { suppliers, fetchSuppliers } = useSupplierStore();
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState({ id: null, type: null });
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    categorySearch: '',
  });

  useEffect(() => {
    fetchSuppliers();
    loadCategories();
  }, [fetchSuppliers]);

  const loadCategories = async () => {
    try {
      const data = await dbOperations.getAll('inventory_categories') || [];
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    if (selectedSupplierId) {
      fetchLedgerEntries();
    } else {
      setLedgerEntries([]);
    }
  }, [selectedSupplierId, filters]);

  // Auto-refresh when page becomes visible or focused
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedSupplierId) {
        fetchLedgerEntries();
      }
    };

    const handleFocus = () => {
      if (selectedSupplierId) {
        fetchLedgerEntries();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedSupplierId, filters]);

  // Listen for voucher changes from Accounts module
  useEffect(() => {
    const unsubscribe = subscribeToEntity('voucher', ({ action, data }) => {
      console.log('[SupplierLedger] Voucher event received:', action, data);
      if (data?.payee_type === 'supplier' && data?.payee_id === selectedSupplierId) {
        console.log('[SupplierLedger] Voucher change detected for current supplier, refreshing...');
        // Immediate refresh
        setTimeout(() => fetchLedgerEntries(), 100);
      }
    });

    return () => unsubscribe();
  }, [selectedSupplierId]);

  // Listen for purchase changes
  useEffect(() => {
    const unsubscribe = subscribeToEntity('purchase', ({ action, data }) => {
      console.log('[SupplierLedger] Purchase event received:', action, data);
      if (data?.supplier_id === selectedSupplierId) {
        console.log('[SupplierLedger] Purchase change detected for current supplier, refreshing...');
        // Immediate refresh
        setTimeout(() => fetchLedgerEntries(), 100);
      }
    });

    return () => unsubscribe();
  }, [selectedSupplierId]);

  // Listen for supplier_ledger_entries changes
  useEffect(() => {
    const unsubscribe = subscribeToEntity('supplier_ledger_entries', ({ action, data }) => {
      console.log('[SupplierLedger] Ledger entry event received:', action, data);
      if (data?.supplier_id === selectedSupplierId) {
        console.log('[SupplierLedger] Ledger entry change detected for current supplier, refreshing...');
        setTimeout(() => fetchLedgerEntries(), 100);
      }
    });

    return () => unsubscribe();
  }, [selectedSupplierId]);

  // Listen for purchase challan changes
  useEffect(() => {
    const unsubscribe = subscribeToEntity('purchase_challans', ({ action, data }) => {
      console.log('[SupplierLedger] Purchase challan event received:', action, data);
      if (data?.supplier_id === selectedSupplierId) {
        console.log('[SupplierLedger] Challan change detected for current supplier, refreshing...');
        setTimeout(() => fetchLedgerEntries(), 100);
      }
    });

    return () => unsubscribe();
  }, [selectedSupplierId]);

  // Listen for supplier changes
  useEffect(() => {
    const unsubscribe = subscribeToEntity('suppliers', ({ action, data }) => {
      console.log('[SupplierLedger] Supplier event received:', action, data);
      if (data?.id === selectedSupplierId && action === 'update') {
        console.log('[SupplierLedger] Current supplier updated, refreshing...');
        setTimeout(() => fetchLedgerEntries(), 100);
      }
    });

    return () => unsubscribe();
  }, [selectedSupplierId]);

  // Add polling for real-time updates every 3 seconds
  useEffect(() => {
    if (!selectedSupplierId) return;

    const pollInterval = setInterval(() => {
      fetchLedgerEntries();
    }, 3000); // Faster polling for real-time feel

    return () => clearInterval(pollInterval);
  }, [selectedSupplierId, filters]);

  const fetchLedgerEntries = async () => {
    setLoading(true);
    try {
      // Fetch supplier ledger entries
      let data = [];
      try {
        data = await dbOperations.getByIndex('supplier_ledger_entries', 'supplier_id', selectedSupplierId);
        data = Array.isArray(data) ? data : [];
      } catch (ledgerError) {
        console.warn('Error fetching supplier ledger entries:', ledgerError);
        data = [];
      }

      // Fetch purchases from Accounts Management
      let supplierPurchases = [];
      try {
        const allPurchases = await dbOperations.getAll('purchases');
        supplierPurchases = Array.isArray(allPurchases) ? allPurchases.filter(p => p.supplier_id === selectedSupplierId) : [];
      } catch (purchaseError) {
        console.warn('Error fetching purchases:', purchaseError);
      }
      
      // Fetch purchase challans from Accounts Management
      let supplierChallans = [];
      try {
        const allChallans = await dbOperations.getAll('purchase_challans');
        supplierChallans = Array.isArray(allChallans) ? allChallans.filter(c => c.supplier_id === selectedSupplierId) : [];
      } catch (challanError) {
        console.warn('Error fetching challans:', challanError);
      }
      
      // Fetch vouchers from Accounts Management
      let supplierVouchers = [];
      try {
        const allVouchers = await dbOperations.getAll('vouchers');
        supplierVouchers = Array.isArray(allVouchers) ? allVouchers.filter(v => v.payee_type === 'supplier' && v.payee_id === selectedSupplierId) : [];
      } catch (voucherError) {
        console.warn('Error fetching vouchers:', voucherError);
      }

      // Merge all entries: existing ledger + purchases + challans + vouchers
      const mergedEntries = [...data];
      
      // Add purchase entries if not already in ledger
      for (const purchase of supplierPurchases) {
        const exists = data.find(e => e.reference_type === 'purchase' && e.reference_id === purchase.id);
        if (!exists) {
          mergedEntries.push({
            id: `purchase_${purchase.id}`,
            supplier_id: selectedSupplierId,
            entry_date: purchase.invoice_date,
            particulars: `Purchase Invoice - ${purchase.invoice_no}`,
            reference_no: purchase.invoice_no,
            reference_type: 'purchase',
            reference_id: purchase.id,
            debit_amount: 0,
            credit_amount: purchase.total_amount || 0,
            entry_type: 'purchase',
            category: purchase.materials?.[0]?.category_id || '',
            created_at: purchase.created_at,
          });
        }
      }
      
      // Add challan entries if not already in ledger
      for (const challan of supplierChallans) {
        const exists = data.find(e => e.reference_type === 'purchase_challan' && e.reference_id === challan.id);
        if (!exists) {
          mergedEntries.push({
            id: `challan_${challan.id}`,
            supplier_id: selectedSupplierId,
            entry_date: challan.challan_date,
            particulars: `Purchase Challan - ${challan.challan_no}`,
            reference_no: challan.challan_no,
            reference_type: 'purchase_challan',
            reference_id: challan.id,
            debit_amount: 0,
            credit_amount: challan.total_amount || 0,
            entry_type: 'purchase_challan',
            category: challan.materials?.[0]?.category_id || '',
            created_at: challan.created_at,
          });
        }
      }
      
      // Add voucher entries if not already in ledger
      for (const voucher of supplierVouchers) {
        const exists = data.find(e => e.reference_type === 'voucher' && e.reference_id === voucher.id);
        if (!exists) {
          mergedEntries.push({
            id: `voucher_${voucher.id}`,
            supplier_id: selectedSupplierId,
            entry_date: voucher.voucher_date,
            particulars: `Payment Voucher - ${voucher.voucher_no}`,
            reference_no: voucher.voucher_no,
            reference_type: 'voucher',
            reference_id: voucher.id,
            debit_amount: parseFloat(voucher.amount || 0),
            credit_amount: 0,
            entry_type: 'voucher',
            category: '',
            created_at: voucher.created_at,
          });
        }
      }

      // Sort by date
      let filteredData = mergedEntries.sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)));
      
      // Apply filters
      if (filters.startDate) {
        filteredData = filteredData.filter(e => String(e.entry_date) >= filters.startDate);
      }
      if (filters.endDate) {
        filteredData = filteredData.filter(e => String(e.entry_date) <= filters.endDate);
      }
      if (filters.categorySearch) {
        filteredData = filteredData.filter((entry) =>
          entry.category?.toLowerCase().includes(filters.categorySearch.toLowerCase())
        );
      }

      setLedgerEntries(filteredData);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      setLedgerEntries([]);
      // Don't show error toast if there are just no entries
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (entryData) => {
    try {
      // Check if this is a purchase/challan entry with materials
      if (entryData.materials && entryData.materials.length > 0) {
        const entryId = `entry_${Date.now()}`;
        const purchaseId = `purchase_${Date.now()}`;
        
        // Get supplier details
        const supplier = suppliers.find(s => s.id === selectedSupplierId);
        
        // Save to purchases or purchase_challans table
        if (entryData.document_type === 'invoice') {
          await dbOperations.insert('purchases', {
            id: purchaseId,
            invoice_no: entryData.document_no,
            invoice_date: entryData.entry_date,
            supplier_id: selectedSupplierId,
            supplier_name: supplier?.name || '',
            gst_type: entryData.gst_type,
            igst: entryData.igst,
            cgst: entryData.cgst,
            sgst: entryData.sgst,
            subtotal: entryData.subtotal,
            gst_amount: entryData.gst_amount,
            total_amount: entryData.total_amount,
            materials: entryData.materials,
            created_at: new Date().toISOString(),
          });

          // Save individual purchase items
          for (const material of entryData.materials) {
            const materialId = `${purchaseId}_${material.id}`;
            
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
              reference_no: entryData.document_no,
              movement_date: entryData.entry_date,
              created_at: new Date().toISOString(),
            });
            
            // Save rate history
            await dbOperations.insert('rate_history', {
              id: `rate_${materialId}_${Date.now()}`,
              item_name: material.material_name,
              category_id: material.category_id,
              rate: parseFloat(material.rate),
              vendor_name: supplier?.name || '',
              source: 'purchase',
              reference_no: entryData.document_no,
              reference_id: purchaseId,
              date: entryData.entry_date,
              created_at: new Date().toISOString(),
            });
          }

          // Add to GST Ledger
          await dbOperations.insert('gst_ledger', {
            id: `${purchaseId}_gst`,
            transaction_type: 'purchase',
            transaction_date: entryData.entry_date,
            document_no: entryData.document_no,
            party_name: supplier?.name || '',
            gst_type: entryData.gst_type,
            igst: entryData.gst_type === 'igst' ? entryData.gst_amount : 0,
            cgst: entryData.gst_type === 'cgst_sgst' ? entryData.gst_amount / 2 : 0,
            sgst: entryData.gst_type === 'cgst_sgst' ? entryData.gst_amount / 2 : 0,
            total_gst: entryData.gst_amount,
            taxable_amount: entryData.subtotal,
            entry_type: 'input',
            created_at: new Date().toISOString(),
          });
        } else {
          // Save as challan
          await dbOperations.insert('purchase_challans', {
            id: purchaseId,
            challan_no: entryData.document_no,
            challan_date: entryData.entry_date,
            supplier_id: selectedSupplierId,
            supplier_name: supplier?.name || '',
            subtotal: entryData.subtotal,
            total_amount: entryData.total_amount,
            materials: entryData.materials,
            created_at: new Date().toISOString(),
          });

          // Save stock movements for challan
          for (const material of entryData.materials) {
            const materialId = `${purchaseId}_${material.id}`;
            
            await dbOperations.insert('stock_movements', {
              id: `stock_${materialId}`,
              material_name: material.material_name,
              category_id: material.category_id,
              movement_type: 'in',
              quantity: parseFloat(material.quantity),
              unit: material.unit,
              reference_type: 'purchase_challan',
              reference_id: purchaseId,
              reference_no: entryData.document_no,
              movement_date: entryData.entry_date,
              created_at: new Date().toISOString(),
            });
            
            // Save rate history
            await dbOperations.insert('rate_history', {
              id: `rate_${materialId}_${Date.now()}`,
              item_name: material.material_name,
              category_id: material.category_id,
              rate: parseFloat(material.rate),
              vendor_name: supplier?.name || '',
              source: 'purchase_challan',
              reference_no: entryData.document_no,
              reference_id: purchaseId,
              date: entryData.entry_date,
              created_at: new Date().toISOString(),
            });
          }
        }

        // Create supplier ledger entry
        const category = entryData.materials && entryData.materials.length > 0 ? entryData.materials[0].category_id : '';
        await dbOperations.insert('supplier_ledger_entries', {
          id: entryId,
          supplier_id: selectedSupplierId,
          entry_date: entryData.entry_date,
          particulars: entryData.particulars,
          reference_no: entryData.document_no,
          reference_type: entryData.document_type === 'invoice' ? 'purchase' : 'purchase_challan',
          reference_id: purchaseId,
          debit_amount: entryData.debit_amount,
          credit_amount: entryData.credit_amount,
          entry_type: entryData.document_type === 'invoice' ? 'purchase' : 'purchase_challan',
          category,
          created_at: new Date().toISOString(),
        });

        toast.success(`${entryData.document_type === 'invoice' ? 'Invoice' : 'Challan'} saved successfully! ${entryData.materials.length} materials added to stock.`);
      } else {
        // Simple manual entry
        await dbOperations.insert('supplier_ledger_entries', {
          ...entryData,
          entry_type: 'manual',
          created_at: new Date().toISOString(),
        });

        toast.success('Manual entry added successfully!');
      }

      setIsModalOpen(false);
      fetchLedgerEntries();
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('Failed to add entry');
    }
  };

  const handleEditEntry = async (entryData) => {
    try {
      if (editingEntry.entry_type && editingEntry.entry_type !== 'manual') {
        throw new Error('Only manual entries can be edited.');
      }
      await dbOperations.update('supplier_ledger_entries', editingEntry.id, entryData);

      // Broadcast change for real-time updates
      broadcastDataChange('supplier_ledger_entries', 'update', { ...entryData, id: editingEntry.id, supplier_id: selectedSupplierId });

      toast.success('Entry updated successfully!');
      setIsModalOpen(false);
      setEditingEntry(null);
      fetchLedgerEntries();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Failed to update entry. Only manual entries can be edited.');
    }
  };

  const handleDeleteEntry = async () => {
    try {
      if (entryToDelete.entry_type && entryToDelete.entry_type !== 'manual') {
        throw new Error('Only manual entries can be deleted.');
      }
      await dbOperations.delete('supplier_ledger_entries', entryToDelete.id);

      // Broadcast change for real-time updates
      broadcastDataChange('supplier_ledger_entries', 'delete', { id: entryToDelete.id, supplier_id: selectedSupplierId });

      toast.success('Entry deleted successfully!');
      setIsDeleteModalOpen(false);
      setEntryToDelete(null);
      fetchLedgerEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error('Failed to delete entry. Only manual entries can be deleted.');
    }
  };

  const openEditModal = (entry) => {
    if (entry.entry_type !== 'manual') {
      toast.error('Only manual entries can be edited');
      return;
    }
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const openDeleteModal = (entry) => {
    if (entry.entry_type !== 'manual') {
      toast.error('Only manual entries can be deleted');
      return;
    }
    setEntryToDelete(entry);
    setIsDeleteModalOpen(true);
  };

  const openDocumentModal = (entry) => {
    if (entry.reference_id && entry.reference_type) {
      setSelectedDocument({
        id: entry.reference_id,
        type: entry.reference_type,
      });
      setIsDocumentModalOpen(true);
    } else {
      toast.error('No linked document found');
    }
  };

  const handleSaveVoucher = async (voucherData) => {
    try {
      const generateVoucherNo = async () => {
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
        let sequence = 1;
        try {
          const allVouchers = await dbOperations.getAll('vouchers');
          const fyVouchers = allVouchers.filter(v => {
            if (!v.voucher_no) return false;
            return v.voucher_no.startsWith(`VCH/${yearStart}-${yearEnd}/`);
          });
          sequence = fyVouchers.length + 1;
        } catch (e) {}
        const seqStr = sequence.toString().padStart(4, '0');
        return `VCH/${yearStart}-${yearEnd}/${seqStr}`;
      };

      const voucherNo = voucherData.voucher_no || await generateVoucherNo();

      const voucherRecord = {
        ...voucherData,
        voucher_no: voucherNo,
        amount: parseFloat(voucherData.amount),
        created_at: new Date().toISOString(),
        id: `v_${Date.now()}`,
      };

      await dbOperations.insert('vouchers', voucherRecord);

      // Create ledger entry for supplier
      if (voucherData.payee_type === 'supplier' && voucherData.payee_id) {
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
      } else if (voucherData.payee_type === 'vendor' && voucherData.payee_id) {
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
      }

      toast.success('Voucher saved successfully');
      
      // Broadcast data change
      broadcastDataChange('voucher', 'created', {
        voucher: voucherRecord,
        payee_type: voucherData.payee_type,
        payee_id: voucherData.payee_id
      });

      setIsVoucherModalOpen(false);
      fetchLedgerEntries();
    } catch (error) {
      console.error('Error saving voucher:', error);
      toast.error('Failed to save voucher');
    }
  };

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const calculateRunningBalance = () => {
    // Start with opening balance from supplier record
    const openingBalance = parseFloat(selectedSupplier?.opening_balance || 0);
    let balance = openingBalance;
    return ledgerEntries.map((entry) => {
      balance += parseFloat(entry.credit_amount || 0) - parseFloat(entry.debit_amount || 0);
      return { ...entry, running_balance: balance };
    });
  };

  const entriesWithBalance = calculateRunningBalance();
  const currentBalance = entriesWithBalance.length > 0
    ? entriesWithBalance[entriesWithBalance.length - 1].running_balance
    : parseFloat(selectedSupplier?.opening_balance || 0);

  // ============ SUMMARY CARDS CALCULATION ============
  // Opening Balance from supplier record
  const openingBalance = parseFloat(selectedSupplier?.opening_balance || 0);
  
  // Calculate totals from ALL entries
  const totalDebit = ledgerEntries.reduce((sum, e) => sum + (parseFloat(e.debit_amount) || 0), 0);
  const totalCredit = ledgerEntries.reduce((sum, e) => sum + (parseFloat(e.credit_amount) || 0), 0);
  
  // Net Balance = Opening + Total Credits - Total Debits
  // Positive = We owe supplier, Negative = Supplier owes us
  const netBalance = openingBalance + totalCredit - totalDebit;

  const handleExportCSV = () => {
    try {
      if (!selectedSupplier) {
        toast.error('Please select a supplier first');
        return;
      }

      if (entriesWithBalance.length === 0) {
        toast.warning('No data to export');
        return;
      }

      const headers = ['Date', 'Particulars', 'Category', 'Ref No', 'Debit', 'Credit', 'Balance'];
      const rows = entriesWithBalance.map((e) => [
        formatDate(e.entry_date),
        e.particulars || '',
        e.category || '',
        e.reference_no || '',
        formatCurrency(e.debit_amount || 0),
        formatCurrency(e.credit_amount || 0),
        formatCurrency(e.running_balance || 0),
      ]);

      const success = exportToCSV(
        headers,
        rows,
        `supplier_ledger_${selectedSupplier.name}_${new Date().toISOString().split('T')[0]}.csv`
      );

      if (success) {
        toast.success('Ledger exported to CSV');
      } else {
        toast.error('Failed to export CSV');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handleSavePDF = () => {
    try {
      if (!selectedSupplier) {
        toast.error('Please select a supplier first');
        return;
      }

      if (entriesWithBalance.length === 0) {
        toast.warning('No data to save');
        return;
      }

      const tableData = entriesWithBalance.map((e) => [
        formatDate(e.entry_date),
        e.particulars || '',
        e.category || '',
        e.reference_no || '',
        formatCurrency(e.debit_amount || 0),
        formatCurrency(e.credit_amount || 0),
        formatCurrency(e.running_balance || 0),
      ]);

      const success = exportToPDF({
        title: `Supplier Ledger - ${selectedSupplier.name}`,
        subtitle: `Period: ${filters.startDate ? formatDate(filters.startDate) : 'All'} to ${filters.endDate ? formatDate(filters.endDate) : 'All'}`,
        headerInfo: [
          { label: 'Category', value: selectedSupplier.category || 'N/A' },
          { label: 'Current Balance', value: formatCurrency(currentBalance) },
          { label: 'Total Entries', value: entriesWithBalance.length },
        ],
        summaryCards: [
          { label: 'Current Balance', value: formatCurrency(currentBalance) },
          { label: 'Total Payments', value: formatCurrency(totalPayments) },
          { label: 'Total Entries', value: entriesWithBalance.length },
        ],
        tableHeaders: ['Date', 'Particulars', 'Category', 'Ref No', 'Debit', 'Credit', 'Balance'],
        tableData,
        filename: `supplier_ledger_${selectedSupplier.name}_${new Date().toISOString().split('T')[0]}.pdf`,
        orientation: 'l'
      });

      if (success) {
        toast.success('Ledger saved as PDF');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Failed to generate PDF');
    }
  };



  return (
    <div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEntry(null);
        }}
        title={editingEntry ? 'Edit Entry' : 'Add Purchase Entry'}
        size="xxl"
      >
        <ManualEntryForm
          supplierId={selectedSupplierId}
          entry={editingEntry}
          onSave={editingEntry ? handleEditEntry : handleAddEntry}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingEntry(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={isDocumentModalOpen}
        onClose={() => {
          setIsDocumentModalOpen(false);
          setSelectedDocument({ id: null, type: null });
        }}
        title="Document Details"
      >
        <DocumentDetailsModal
          documentId={selectedDocument.id}
          documentType={selectedDocument.type}
          onClose={() => {
            setIsDocumentModalOpen(false);
            setSelectedDocument({ id: null, type: null });
          }}
        />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteEntry}
        title="Delete Entry"
        message="Are you sure you want to delete this manual entry? This action cannot be undone."
      />

      {/* Voucher Modal */}
      <Modal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title="Add Payment Voucher"
      >
        <VoucherForm
          onSave={handleSaveVoucher}
          onCancel={() => setIsVoucherModalOpen(false)}
          preselectedPayee={{
            payee_type: 'supplier',
            payee_id: selectedSupplierId
          }}
        />
      </Modal>

      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Select Supplier *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.category ? `(${s.category})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              />
            </div>

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
                  placeholder="e.g., Hardware"
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                if (!selectedSupplierId) {
                  toast.error('Please select a supplier first');
                  return;
                }
                setIsModalOpen(true);
              }}
              disabled={!selectedSupplierId}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Purchase Entry
            </Button>

            <Button
              onClick={() => {
                if (!selectedSupplierId) {
                  toast.error('Please select a supplier first');
                  return;
                }
                setIsVoucherModalOpen(true);
              }}
              disabled={!selectedSupplierId}
              variant="outline"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Add Voucher
            </Button>

            <Button variant="secondary" onClick={handleExportCSV} disabled={!selectedSupplierId}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

            <Button variant="secondary" onClick={handleSavePDF} disabled={!selectedSupplierId}>
              <FileText className="h-4 w-4 mr-2" />
              Save PDF
            </Button>


          </div>

          {selectedSupplier && (
            <>
              {/* Supplier Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Supplier</p>
                    <p className="font-semibold text-gray-900 dark:text-dark-text">{selectedSupplier.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Phone</p>
                    <p className="font-semibold text-gray-900 dark:text-dark-text">{selectedSupplier.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Category</p>
                    <p className="font-semibold text-gray-900 dark:text-dark-text">
                      {selectedSupplier.category || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-dark-text-secondary">Company</p>
                    <p className="font-semibold text-gray-900 dark:text-dark-text">
                      {selectedSupplier.company || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Balance Blocks */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">Opening Balance</p>
                  <p className="text-xl font-bold text-yellow-900 dark:text-yellow-300">
                    ₹{Math.abs(openingBalance).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-600 dark:text-green-400">Total Credit (Purchases)</p>
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
                    ₹{Math.abs(netBalance).toLocaleString('en-IN')}
                    <span className="text-xs ml-1">{netBalance > 0 ? '(Payable)' : netBalance < 0 ? '(Receivable)' : ''}</span>
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
          ) : !selectedSupplierId ? (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-dark-text-secondary">
                Please select a supplier to view their ledger entries
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-left">
                    <tr>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Ref No</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Particulars</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right">Debit (₹)</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right">Credit (₹)</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right">Balance (₹)</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entriesWithBalance.length > 0 ? (
                      entriesWithBalance.map((entry) => {
                        const categoryName = entry.category_id 
                          ? categories.find(c => c.id === entry.category_id)?.name 
                          : entry.category;
                        
                        return (
                        <tr
                          key={entry.id}
                          className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary whitespace-nowrap">
                            {new Date(entry.entry_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-1 px-2">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              entry.entry_type === 'purchase' || entry.reference_type === 'purchase' 
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                : entry.entry_type === 'purchase_challan' || entry.reference_type === 'purchase_challan'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : entry.entry_type === 'payment' || entry.reference_type === 'voucher'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {(entry.reference_type || entry.entry_type || '').replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-1 px-2">
                            {entry.reference_no ? (
                              <button
                                onClick={() => openDocumentModal(entry)}
                                className="flex items-center text-blue-600 dark:text-blue-400 hover:underline font-medium"
                              >
                                {entry.reference_no}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-1 px-2 text-gray-900 dark:text-dark-text">{entry.particulars || '—'}</td>
                          <td className="py-1 px-2 text-right text-red-600 dark:text-red-400 font-semibold">
                            {parseFloat(entry.debit_amount || 0) > 0
                              ? `₹${parseFloat(entry.debit_amount).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                })}`
                              : '—'}
                          </td>
                          <td className="py-1 px-2 text-right text-green-600 dark:text-green-400 font-semibold">
                            {parseFloat(entry.credit_amount || 0) > 0
                              ? `₹${parseFloat(entry.credit_amount).toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                })}`
                              : '—'}
                          </td>
                          <td className="py-1 px-2 text-right font-bold text-gray-900 dark:text-dark-text">
                            ₹{Math.abs(entry.running_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            <span className="text-xs ml-1 text-gray-500">
                              {entry.running_balance > 0 ? '(Dr)' : entry.running_balance < 0 ? '(Cr)' : ''}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-center">
                            <div className="flex justify-center items-center space-x-2">
                              {entry.reference_no && (
                                <Button
                                  variant="ghost"
                                  className="p-2 h-auto"
                                  onClick={() => openDocumentModal(entry)}
                                  title="View Document"
                                >
                                  <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </Button>
                              )}
                              {entry.entry_type === 'manual' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    className="p-2 h-auto"
                                    onClick={() => openEditModal(entry)}
                                  >
                                    <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="p-2 h-auto"
                                    onClick={() => openDeleteModal(entry)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <p className="text-gray-500 dark:text-dark-text-secondary">
                            No entries found for the selected filters
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {entriesWithBalance.length > 0 && (
                    <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold">
                      <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                        <td colSpan="4" className="py-1 px-2 text-right text-gray-900 dark:text-dark-text font-bold">
                          Totals:
                        </td>
                        <td className="py-1 px-2 text-right text-red-600 dark:text-red-400 font-bold text-lg">
                          ₹{entriesWithBalance.reduce((sum, e) => sum + (parseFloat(e.debit_amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1 px-2 text-right text-green-600 dark:text-green-400 font-bold text-lg">
                          ₹{entriesWithBalance.reduce((sum, e) => sum + (parseFloat(e.credit_amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td colSpan="2" className="py-1 px-2"></td>
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

export default SupplierLedgerTab;
