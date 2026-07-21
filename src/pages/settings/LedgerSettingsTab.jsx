import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import useSettingsStore from '@/store/settingsStore';
import { Calculator, AlertTriangle, Eye, FileText, Save } from 'lucide-react';
import { toast } from 'sonner';

const LedgerSettingsTab = () => {
  const { ledgerSettings, updateLedgerSettings } = useSettingsStore();
  const [settings, setSettings] = useState(ledgerSettings);

  const handleSave = () => {
    updateLedgerSettings(settings);
    toast.success('Ledger settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="text-blue-600" size={24} />
          <h3 className="text-xl font-bold">Ledger Calculation Settings</h3>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <div>
              <span className="font-medium block">Auto-calculate Running Balance</span>
              <span className="text-sm text-gray-500">Automatically update balance after each transaction</span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoCalculateBalance}
              onChange={(e) => setSettings({ ...settings, autoCalculateBalance: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </label>

          <div>
            <label className="block text-sm font-medium mb-2">Auto-rounding Rule</label>
            <select
              value={settings.autoRounding}
              onChange={(e) => setSettings({ ...settings, autoRounding: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="none">No Rounding</option>
              <option value="nearest">Nearest ₹1</option>
              <option value="up">Round Up</option>
              <option value="down">Round Down</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="text-orange-600" size={24} />
          <h3 className="text-xl font-bold">Alerts & Warnings</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Credit Limit Alert Threshold (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="50"
                max="100"
                value={settings.creditLimitAlert}
                onChange={(e) => setSettings({ ...settings, creditLimitAlert: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="font-bold text-lg min-w-[60px]">{settings.creditLimitAlert}%</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Show warning when customer reaches this percentage of credit limit
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Overdue Invoice Highlight Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.overdueHighlightColor}
                onChange={(e) => setSettings({ ...settings, overdueHighlightColor: e.target.value })}
                className="w-16 h-10 rounded border"
              />
              <input
                type="text"
                value={settings.overdueHighlightColor}
                onChange={(e) => setSettings({ ...settings, overdueHighlightColor: e.target.value })}
                className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                placeholder="#ef4444"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Eye className="text-green-600" size={24} />
          <h3 className="text-xl font-bold">Display Preferences</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Default Ledger View Range (days)</label>
            <select
              value={settings.defaultViewRange}
              onChange={(e) => setSettings({ ...settings, defaultViewRange: parseInt(e.target.value) })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Full Year</option>
              <option value={-1}>All Time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <FileText className="inline mr-2" size={16} />
              Default Print Format
            </label>
            <select
              value={settings.defaultPrintFormat}
              onChange={(e) => setSettings({ ...settings, defaultPrintFormat: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="A4-portrait">A4 Portrait</option>
              <option value="A4-landscape">A4 Landscape</option>
              <option value="letter-portrait">Letter Portrait</option>
              <option value="letter-landscape">Letter Landscape</option>
            </select>
          </div>
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

export default LedgerSettingsTab;

