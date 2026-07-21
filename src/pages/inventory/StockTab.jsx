import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2, Download, FileText, Search, AlertTriangle, Package, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { exportToCSV as exportCSV, exportToPDF, formatCurrency, formatDate } from '@/utils/exportHelpers';
import { saveRateListMemory } from '@/utils/rateListMemory';

const StockItemForm = ({ item, categories, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    item || {
      code: '',
      name: '',
      category_id: '',
      unit: 'pcs',
      initial_stock: 0,
      reorder_level: 0,
      cost_price: 0,
      selling_price: 0,
      location: '',
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    
    // Auto-calculate selling price when cost price changes
    if (name === 'cost_price') {
      const costPrice = parseFloat(value) || 0;
      newFormData.selling_price = (costPrice * 1.5).toFixed(2);
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Item name is required.');
      return;
    }
    if (!formData.category_id) {
      toast.error('Category is required.');
      return;
    }
    if (!formData.unit) {
      toast.error('Unit is required.');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Item Code
          </label>
          <input
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder="Auto-generated if empty"
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Item Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Category *
          </label>
          <select
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            required
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Unit *
          </label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            required
          >
            <option value="pcs">Pieces (pcs)</option>
            <option value="kg">Kilogram (kg)</option>
            <option value="ltr">Liter (ltr)</option>
            <option value="mtr">Meter (mtr)</option>
            <option value="box">Box</option>
            <option value="set">Set</option>
          </select>
        </div>
      </div>

      {!item && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Initial Stock Quantity
          </label>
          <input
            type="number"
            name="initial_stock"
            value={formData.initial_stock}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Opening stock quantity (will create a stock movement record)
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Reorder Level
          </label>
          <input
            type="number"
            name="reorder_level"
            value={formData.reorder_level}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Location
          </label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., Warehouse A, Shelf 3"
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Cost Price (₹)
          </label>
          <input
            type="number"
            name="cost_price"
            value={formData.cost_price}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Selling Price (₹)
          </label>
          <input
            type="number"
            name="selling_price"
            value={formData.selling_price}
            readOnly
            step="0.01"
            min="0"
            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-dark-card dark:border-gray-600 dark:text-dark-text cursor-not-allowed"
            title="Auto-calculated as Cost Price × 1.5"
          />
          <p className="text-xs text-gray-500 mt-1">Auto-calculated (Cost × 1.5)</p>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{item ? 'Update Item' : 'Add Item'}</Button>
      </div>
    </form>
  );
};

const StockAdjustmentForm = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    adjustment_quantity: 0,
    adjustment_type: 'add',
    notes: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (parseFloat(formData.adjustment_quantity) === 0) {
      toast.error('Adjustment quantity must be greater than 0.');
      return;
    }
    onSave(formData);
  };

  const newStock =
    formData.adjustment_type === 'add'
      ? parseFloat(item.current_stock || 0) + parseFloat(formData.adjustment_quantity || 0)
      : parseFloat(item.current_stock || 0) - parseFloat(formData.adjustment_quantity || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
          Current Stock: <span className="font-bold text-gray-900 dark:text-dark-text">{item.current_stock} {item.unit}</span>
        </p>
        <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mt-1">
          Item: <span className="font-bold text-gray-900 dark:text-dark-text">{item.name}</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Adjustment Type *
        </label>
        <select
          name="adjustment_type"
          value={formData.adjustment_type}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
          required
        >
          <option value="add">Add Stock (Increase)</option>
          <option value="subtract">Remove Stock (Decrease)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Adjustment Quantity *
        </label>
        <input
          type="number"
          name="adjustment_quantity"
          value={formData.adjustment_quantity}
          onChange={handleChange}
          step="0.01"
          min="0.01"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Notes/Reason
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="2"
          placeholder="e.g., Stock take adjustment, Damaged items"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
        />
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
          New Stock After Adjustment: <span className={`font-bold ${newStock >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {newStock.toFixed(2)} {item.unit}
          </span>
        </p>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Apply Adjustment</Button>
      </div>
    </form>
  );
};

const StockTab = () => {
  const [stockItems, setStockItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [stats, setStats] = useState({
    totalItems: 0,
    totalStockByUnit: {},
    lowStockItems: 0,
    totalValuation: 0,
  });

  useEffect(() => {
    fetchCategories();
    fetchStockItems();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await dbOperations.getAll('inventory_categories');
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchStockItems = async () => {
    setLoading(true);
    try {
      // Get all data
      const allMovements = await dbOperations.getAll('stock_movements') || [];
      const categories = await dbOperations.getAll('inventory_categories') || [];
      const rateHistory = await dbOperations.getAll('rate_history') || [];
      const inventoryItems = await dbOperations.getAll('inventory_items') || [];
      
      // Create a map to store all items (from both inventory_items and movements)
      const itemsMap = new Map();
      
      // First, add all manually created inventory items
      inventoryItems.forEach(invItem => {
        const key = invItem.id;
        itemsMap.set(key, {
          id: invItem.id,
          code: invItem.code,
          name: invItem.name,
          category_id: invItem.category_id,
          unit: invItem.unit || 'pcs',
          current_stock: 0,
          reorder_level: parseFloat(invItem.reorder_level || 0),
          cost_price: parseFloat(invItem.cost_price || 0),
          selling_price: parseFloat(invItem.selling_price || 0),
          location: invItem.location || '',
          movements: [],
          fromInventory: true
        });
      });
      
      // Calculate stock from movements
      allMovements.forEach(movement => {
        // For movements with item_id, add to that item
        if (movement.item_id) {
          if (itemsMap.has(movement.item_id)) {
            const item = itemsMap.get(movement.item_id);
            const quantity = parseFloat(movement.quantity) || 0;
            
            if (movement.movement_type === 'in') {
              item.current_stock += quantity;
            } else if (movement.movement_type === 'out') {
              item.current_stock -= quantity;
            }
            
            item.movements.push(movement);
          }
        }
      });
      
      // Filter movements from purchase and purchase_challan for display
      const validMovements = allMovements.filter(m => 
        m.reference_type && 
        m.reference_id && 
        ['purchase', 'purchase_challan'].includes(m.reference_type) &&
        !m.item_id // Only include movements not linked to inventory items
      );
      
      // Group movements by material_name and category_id for items not in inventory_items
      validMovements.forEach(movement => {
        const key = `movement_${movement.material_name}_${movement.category_id}`;
        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            id: key,
            name: movement.material_name,
            category_id: movement.category_id,
            unit: movement.unit,
            current_stock: 0,
            reorder_level: 0,
            cost_price: 0,
            selling_price: 0,
            movements: [],
            fromMovements: true
          });
        }
        
        const item = itemsMap.get(key);
        const quantity = parseFloat(movement.quantity) || 0;
        
        if (movement.movement_type === 'in') {
          item.current_stock += quantity;
        } else if (movement.movement_type === 'out') {
          item.current_stock -= quantity;
        }
        
        item.movements.push(movement);
      });
      
      // Convert map to array and enrich with category names and rates
      const stockArray = Array.from(itemsMap.values()).map((item, index) => {
        const category = categories.find(cat => cat.id === item.category_id);
        
        // Find latest rate from rate_history for this item
        const itemRates = rateHistory.filter(r => 
          r.item_name?.toLowerCase() === item.name?.toLowerCase() && 
          r.category_id === item.category_id
        ).sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
        
        const latestRate = itemRates.length > 0 ? parseFloat(itemRates[0].rate || 0) : 0;
        
        // Use cost_price from item or latest rate
        const costPrice = item.cost_price || latestRate;
        const sellingPrice = item.selling_price || (costPrice * 1.5);
        const valuation = item.current_stock * costPrice;
        
        return {
          ...item,
          code: item.code || `ITEM-${String(index + 1).padStart(4, '0')}`,
          category: category ? { id: category.id, name: category.name } : null,
          cost_price: costPrice,
          selling_price: sellingPrice,
          valuation: valuation
        };
      });
      
      // Sort by name
      stockArray.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      setStockItems(stockArray);
      calculateStats(stockArray);
    } catch (error) {
      console.error('Error fetching stock items:', error);
      toast.error('Failed to load stock items');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (items) => {
    const totalItems = items.length;
    
    // Group stock by unit
    const stockByUnit = {};
    items.forEach(item => {
      const unit = item.unit || 'pcs';
      const qty = parseFloat(item.current_stock || 0);
      stockByUnit[unit] = (stockByUnit[unit] || 0) + qty;
    });
    
    // Count low stock items (only red indicator items - out of stock)
    const lowStockItems = items.filter(item => 
      parseFloat(item.current_stock || 0) === 0
    ).length;
    
    // Calculate total valuation
    const totalValuation = items.reduce(
      (sum, item) => sum + parseFloat(item.current_stock || 0) * parseFloat(item.cost_price || 0),
      0
    );
    
    setStats({
      totalItems,
      totalStockByUnit: stockByUnit,
      lowStockItems,
      totalValuation,
    });
  };

  const handleAddItem = async (itemData) => {
    try {
      const initialStock = parseFloat(itemData.initial_stock || 0);
      delete itemData.initial_stock;

      const newItem = await dbOperations.insert('inventory_items', itemData);

      if (initialStock > 0) {
        await dbOperations.insert('stock_movements', {
          item_id: newItem.id,
          movement_type: 'in',
          quantity: initialStock,
          movement_date: new Date().toISOString().split('T')[0],
          reference_type: 'opening',
          reference_no: 'OPENING',
          notes: 'Opening stock',
          created_at: new Date().toISOString(),
        });
      }

      // Save to Rate List Memory (cost_price as actual, selling_price as selling)
      await saveRateListMemory([{
        material_name: itemData.name,
        category_id: itemData.category_id,
        actual_price: parseFloat(itemData.cost_price || 0),
        selling_price: parseFloat(itemData.selling_price || 0)
      }], 'stock');

      toast.success('Stock item added successfully!');
      setIsModalOpen(false);
      fetchStockItems();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add stock item');
    }
  };

  const handleUpdateItem = async (itemData) => {
    try {
      await dbOperations.update('inventory_items', editingItem.id, itemData);

      // Save to Rate List Memory (cost_price as actual, selling_price as selling)
      await saveRateListMemory([{
        material_name: itemData.name || editingItem.name,
        category_id: itemData.category_id || editingItem.category_id,
        actual_price: parseFloat(itemData.cost_price || 0),
        selling_price: parseFloat(itemData.selling_price || 0)
      }], 'stock');

      toast.success('Stock item updated successfully!');
      setIsModalOpen(false);
      setEditingItem(null);
      fetchStockItems();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update stock item');
    }
  };

  const handleStockAdjustment = async (adjustmentData) => {
    try {
      const quantity = parseFloat(adjustmentData.adjustment_quantity);
      const movementType = adjustmentData.adjustment_type === 'add' ? 'in' : 'out';

      await dbOperations.insert('stock_movements', {
        item_id: adjustingItem.id,
        movement_type: movementType,
        quantity: quantity,
        movement_date: new Date().toISOString().split('T')[0],
        reference_type: 'adjustment',
        reference_no: `ADJ-${Date.now()}`,
        notes: adjustmentData.notes || 'Manual stock adjustment',
        created_at: new Date().toISOString(),
      });

      toast.success('Stock adjustment applied successfully!');
      setIsAdjustmentModalOpen(false);
      setAdjustingItem(null);
      fetchStockItems();
    } catch (error) {
      console.error('Error applying adjustment:', error);
      toast.error('Failed to apply stock adjustment');
    }
  };

  const handleDeleteItem = async () => {
    try {
      await dbOperations.delete('inventory_items', itemToDelete.id);

      toast.success(`"${itemToDelete.name}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchStockItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item. It may be referenced in transactions.');
    }
  };

  const handleExportCSV = () => {
    try {
      if (filteredItems.length === 0) {
        toast.warning('No data to export');
        return;
      }

      const headers = ['Item Code', 'Item Name', 'Category', 'Current Stock', 'Unit', 'Reorder Level', 'Cost Price', 'Selling Price', 'Valuation', 'Location'];
      const rows = filteredItems.map((item) => [
        item.code || '',
        item.name,
        item.category?.name || '',
        item.current_stock || 0,
        item.unit,
        item.reorder_level || 0,
        formatCurrency(item.cost_price || 0),
        formatCurrency(item.selling_price || 0),
        formatCurrency(parseFloat(item.current_stock || 0) * parseFloat(item.cost_price || 0)),
        item.location || '',
      ]);

      const success = exportCSV(headers, rows, `stock_list_${new Date().toISOString().split('T')[0]}.csv`);
      
      if (success) {
        toast.success('Stock list exported to CSV');
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
      if (filteredItems.length === 0) {
        toast.warning('No data to save');
        return;
      }

      const tableData = filteredItems.map((item) => [
        item.code || '',
        item.name,
        item.category?.name || '',
        `${item.current_stock || 0} ${item.unit}`,
        item.reorder_level || 0,
        formatCurrency(item.cost_price || 0),
        formatCurrency(parseFloat(item.current_stock || 0) * parseFloat(item.cost_price || 0)),
      ]);

      const success = exportToPDF({
        title: 'Stock List Report',
        subtitle: `Generated on ${formatDate(new Date())}`,
        headerInfo: [
          { label: 'Total Items', value: filteredItems.length },
          { label: 'Low Stock Items', value: stats.lowStockItems },
          { label: 'Total Valuation', value: formatCurrency(totalValuation) },
        ],
        summaryCards: [
          { label: 'Total Items', value: filteredItems.length },
          { label: 'Low Stock Items', value: stats.lowStockItems },
          { label: 'Total Valuation', value: formatCurrency(totalValuation) },
        ],
        tableHeaders: ['Code', 'Item Name', 'Category', 'Stock', 'Reorder', 'Cost Price', 'Valuation'],
        tableData,
        filename: `stock_list_${new Date().toISOString().split('T')[0]}.pdf`,
        orientation: 'l'
      });

      if (success) {
        toast.success('Stock list saved as PDF');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Failed to generate PDF');
    }
  };



  const filteredItems = stockItems.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || item.category_id === categoryFilter;
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && parseFloat(item.current_stock || 0) <= parseFloat(item.reorder_level || 0)) ||
      (stockFilter === 'zero' && parseFloat(item.current_stock || 0) === 0);
    return matchesSearch && matchesCategory && matchesStock;
  });

  const totalValuation = filteredItems.reduce(
    (sum, item) => sum + parseFloat(item.current_stock || 0) * parseFloat(item.cost_price || 0),
    0
  );

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
          <span className="ml-3 text-gray-600 dark:text-dark-text-secondary">Loading stock items...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? 'Edit Stock Item' : 'Add Stock Item'}
      >
        <StockItemForm
          item={editingItem}
          categories={categories}
          onSave={editingItem ? handleUpdateItem : handleAddItem}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
        />
      </Modal>

      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => {
          setIsAdjustmentModalOpen(false);
          setAdjustingItem(null);
        }}
        title="Stock Adjustment"
      >
        {adjustingItem && (
          <StockAdjustmentForm
            item={adjustingItem}
            onSave={handleStockAdjustment}
            onCancel={() => {
              setIsAdjustmentModalOpen(false);
              setAdjustingItem(null);
            }}
          />
        )}
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteItem}
        title="Delete Stock Item"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
      />

      {/* Filters and Actions */}
      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Stock List</h3>
            <Button
              onClick={() => {
                if (categories.length === 0) {
                  toast.error('Please add categories first in the "Manage Categories" tab');
                  return;
                }
                setIsModalOpen(true);
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Stock Item
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by item name, code, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            >
              <option value="all">All Stock</option>
              <option value="low">Low Stock (Below Reorder)</option>
              <option value="zero">Out of Stock</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-2">
            <Button variant="secondary" onClick={handleSavePDF}>
              <FileText className="h-4 w-4 mr-2" />
              Save PDF
            </Button>
            <Button variant="secondary" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

          </div>
        </div>
      </Card>

      {/* Colorful Metric Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Items */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Items</p>
              <p className="text-3xl font-bold">{stats.totalItems}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Package className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Total Stock by Unit */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
          <div className="flex items-start justify-between mb-3">
            <p className="text-green-100 text-sm font-medium">Total Stock</p>
            <div className="bg-white/20 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          {Object.keys(stats.totalStockByUnit).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.totalStockByUnit).map(([unit, qty]) => (
                <div key={unit} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
                  <span className="text-sm font-bold">{qty.toFixed(2)}</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded uppercase font-medium">{unit}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-lg font-bold">0</p>
          )}
        </div>

        {/* Low Stock Items */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium mb-1">Low Stock Items</p>
              <p className="text-3xl font-bold">{stats.lowStockItems}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingDown className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Total Valuation */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Total Valuation</p>
              <p className="text-2xl font-bold">₹{(stats.totalValuation / 1000).toFixed(1)}K</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <DollarSign className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Stock Items Table */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
            Stock Items Details
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr>
                <th className="px-2 py-0.5 font-semibold text-gray-700 dark:text-gray-300">Item Code</th>
                <th className="px-2 py-0.5 font-semibold text-gray-700 dark:text-gray-300">Item Name</th>
                <th className="px-2 py-0.5 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                <th className="px-2 py-0.5 font-semibold text-gray-700 dark:text-gray-300 text-right">Current Stock</th>
                <th className="px-2 py-0.5 font-semibold text-gray-700 dark:text-gray-300 text-right">Reorder Level</th>
                <th className="px-2 py-0.5 font-semibold text-gray-700 dark:text-gray-300 text-right">Cost Price</th>
                <th className="px-2 py-0.5 font-semibold text-gray-700 dark:text-gray-300 text-right">Selling Price</th>
                <th className="px-2 py-0.5 font-semibold text-gray-700 dark:text-gray-300 text-right">Valuation</th>
                <th className="px-2 py-0.5 font-semibold text-gray-700 dark:text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isLowStock = parseFloat(item.current_stock || 0) <= parseFloat(item.reorder_level || 0);
                  const isOutOfStock = parseFloat(item.current_stock || 0) === 0;
                  const valuation = parseFloat(item.current_stock || 0) * parseFloat(item.cost_price || 0);

                  return (
                    <tr
                      key={item.id}
                      className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-2 py-0.5 text-gray-700 dark:text-dark-text-secondary">
                        {item.code || '-'}
                      </td>
                      <td className="px-2 py-0.5 font-medium text-gray-900 dark:text-dark-text">
                        {item.name}
                        {isOutOfStock && (
                          <AlertTriangle className="inline h-4 w-4 ml-2 text-red-500" title="Out of Stock" />
                        )}
                        {!isOutOfStock && isLowStock && (
                          <AlertTriangle className="inline h-4 w-4 ml-2 text-orange-500" title="Low Stock" />
                        )}
                      </td>
                      <td className="px-2 py-0.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {item.category?.name || '-'}
                        </span>
                      </td>
                      <td className={`px-3 py-1.5 text-right font-medium ${isOutOfStock ? 'text-red-600 dark:text-red-400' : isLowStock ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-dark-text'}`}>
                        {parseFloat(item.current_stock || 0).toFixed(2)} {item.unit}
                      </td>
                      <td className="px-2 py-0.5 text-right text-gray-700 dark:text-dark-text-secondary">
                        {parseFloat(item.reorder_level || 0).toFixed(2)} {item.unit}
                      </td>
                      <td className="px-2 py-0.5 text-right text-gray-700 dark:text-dark-text-secondary">
                        ₹{parseFloat(item.cost_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-0.5 text-right text-gray-700 dark:text-dark-text-secondary">
                        ₹{(parseFloat(item.selling_price || 0) || (parseFloat(item.cost_price || 0) * 1.5)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-0.5 text-right font-medium text-green-600 dark:text-green-400">
                        ₹{valuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-0.5 text-right">
                        <div className="flex justify-end items-center space-x-2">
                          <Button
                            variant="ghost"
                            className="p-2 h-auto"
                            onClick={() => {
                              setAdjustingItem(item);
                              setIsAdjustmentModalOpen(true);
                            }}
                            title="Adjust Stock"
                          >
                            <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">Adjust</span>
                          </Button>
                          <Button
                            variant="ghost"
                            className="p-2 h-auto"
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            className="p-2 h-auto"
                            onClick={() => {
                              setItemToDelete(item);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    <div className="flex flex-col items-center text-gray-500 dark:text-dark-text-secondary">
                      <p className="text-lg font-medium">No stock items found</p>
                      <p className="text-sm mt-1">
                        {searchTerm || categoryFilter || stockFilter !== 'all'
                          ? 'Try adjusting your filters'
                          : 'Add your first stock item to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {filteredItems.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Showing {filteredItems.length} of {stockItems.length} item(s)
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StockTab;
