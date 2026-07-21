import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import useSettingsStore from '@/store/settingsStore';
import { Package, TrendingDown, Hash, Warehouse, Save } from 'lucide-react';
import { toast } from 'sonner';

const InventorySettingsTab = () => {
  const { inventorySettings, updateInventorySettings } = useSettingsStore();
  const [settings, setSettings] = useState(inventorySettings);

  const handleSave = () => {
    updateInventorySettings(settings);
    toast.success('Inventory settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Package className="text-blue-600" size={24} />
          <h3 className="text-xl font-bold">Stock Management</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Stock Valuation Method</label>
            <select
              value={settings.stockValuationMethod}
              onChange={(e) => setSettings({ ...settings, stockValuationMethod: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option>FIFO</option>
              <option>LIFO</option>
              <option>Average</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Default Unit</label>
            <select
              value={settings.defaultUnit}
              onChange={(e) => setSettings({ ...settings, defaultUnit: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="pcs">Pieces (pcs)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="mtr">Meters (mtr)</option>
              <option value="ltr">Liters (ltr)</option>
              <option value="box">Box</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Warehouse className="inline mr-2" size={16} />
              Default Warehouse
            </label>
            <input
              type="text"
              value={settings.defaultWarehouse}
              onChange={(e) => setSettings({ ...settings, defaultWarehouse: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <TrendingDown className="inline mr-2" size={16} />
              Low Stock Alert Level
            </label>
            <input
              type="number"
              min="0"
              value={settings.lowStockAlertLevel}
              onChange={(e) => setSettings({ ...settings, lowStockAlertLevel: parseInt(e.target.value) })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Hash className="text-green-600" size={24} />
          <h3 className="text-xl font-bold">Item Configuration</h3>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <div>
              <span className="font-medium block">Auto-generate Item Code</span>
              <span className="text-sm text-gray-500">Automatically create unique item codes</span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoGenerateItemCode}
              onChange={(e) => setSettings({ ...settings, autoGenerateItemCode: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <div>
              <span className="font-medium block">Allow Negative Stock</span>
              <span className="text-sm text-gray-500">Permit stock levels to go below zero</span>
            </div>
            <input
              type="checkbox"
              checked={settings.allowNegativeStock}
              onChange={(e) => setSettings({ ...settings, allowNegativeStock: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <div>
              <span className="font-medium block">Auto Update Stock on Invoice</span>
              <span className="text-sm text-gray-500">Update inventory when invoice is created</span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoUpdateStockOnInvoice}
              onChange={(e) => setSettings({ ...settings, autoUpdateStockOnInvoice: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </label>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          <Save size={18} /> Save Changes
        </Button>
      </div>
    </div>
  );
};

export default InventorySettingsTab;

