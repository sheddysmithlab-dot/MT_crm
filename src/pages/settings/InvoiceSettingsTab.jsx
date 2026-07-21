import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import useSettingsStore from '@/store/settingsStore';
import { FileText, Hash, Percent, Image, Save } from 'lucide-react';
import { toast } from 'sonner';

const InvoiceSettingsTab = () => {
  const { invoiceSettings, updateInvoiceSettings } = useSettingsStore();
  const [settings, setSettings] = useState(invoiceSettings);

  const handleSave = () => {
    updateInvoiceSettings(settings);
    toast.success('Invoice settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Hash className="text-blue-600" size={24} />
          <h3 className="text-xl font-bold">Document Numbering</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Invoice Prefix</label>
            <input
              type="text"
              value={settings.invoicePrefix}
              onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="INV"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Invoice Suffix</label>
            <input
              type="text"
              value={settings.invoiceSuffix}
              onChange={(e) => setSettings({ ...settings, invoiceSuffix: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Challan Prefix</label>
            <input
              type="text"
              value={settings.challanPrefix}
              onChange={(e) => setSettings({ ...settings, challanPrefix: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="CH"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Receipt Prefix</label>
            <input
              type="text"
              value={settings.receiptPrefix}
              onChange={(e) => setSettings({ ...settings, receiptPrefix: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="RCP"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.autoNumbering}
              onChange={(e) => setSettings({ ...settings, autoNumbering: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="font-medium">Enable Auto Numbering</span>
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Percent className="text-green-600" size={24} />
          <h3 className="text-xl font-bold">GST & Tax Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">GST Mode</label>
            <select
              value={settings.gstMode}
              onChange={(e) => setSettings({ ...settings, gstMode: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option>Regular</option>
              <option>Composition</option>
              <option>None</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Default Tax Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={settings.defaultTaxRate}
              onChange={(e) => setSettings({ ...settings, defaultTaxRate: parseFloat(e.target.value) })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="text-purple-600" size={24} />
          <h3 className="text-xl font-bold">Print & Display Options</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Terms & Conditions</label>
            <textarea
              value={settings.termsAndConditions}
              onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
              rows={3}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Enter default terms and conditions..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Default Print Template</label>
            <select
              value={settings.defaultPrintTemplate}
              onChange={(e) => setSettings({ ...settings, defaultPrintTemplate: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option>Standard</option>
              <option>Professional</option>
              <option>Minimal</option>
              <option>Detailed</option>
            </select>
          </div>

          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <div className="flex items-center gap-2">
              <Image size={18} />
              <span className="font-medium">Show Company Logo on Print</span>
            </div>
            <input
              type="checkbox"
              checked={settings.showCompanyLogo}
              onChange={(e) => setSettings({ ...settings, showCompanyLogo: e.target.checked })}
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

export default InvoiceSettingsTab;

