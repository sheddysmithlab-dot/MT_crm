import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import useSettingsStore from '@/store/settingsStore';
import useAppStateStore from '@/store/appStateStore';
import { Sun, Moon, Monitor, Globe, Calendar, Clock, Layout, Bell, Save, RotateCcw, Palette } from 'lucide-react';
import { toast } from 'sonner';

// Sidebar navigation items for startup page dropdown
const sidebarNavItems = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Jobs", href: "/jobs" },
  { title: "Customer", href: "/customer" },
  { title: "Vendors", href: "/vendors" },
  { title: "Employee", href: "/labour" },
  { title: "Supplier", href: "/supplier" },
  { title: "Inventory", href: "/inventory" },
  { title: "Accounts", href: "/accounts" },
  { title: "Summary", href: "/summary" },
  { title: "Daily Tasks", href: "/daily-tasks" },
];

const themeOptions = [
  { value: 'theme1', label: 'Matalic Theme' },
  { value: 'theme2', label: 'Default Theme' },
  { value: 'theme3', label: 'Serene Aurora 🌊' },
  { value: 'theme4', label: 'Evergreen 🌿' },
];

const GeneralSettingsTab = () => {
  const { generalSettings, updateGeneralSettings, saveGeneralSetting, loadGeneralSetting } = useSettingsStore();
  const { theme, setTheme } = useAppStateStore();
  const [settings, setSettings] = useState(generalSettings);
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from new backend structure on mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      const result = await loadGeneralSetting();
      if (result.success && result.data) {
        setSettings(result.data);
        updateGeneralSettings(result.data);
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  // Real-time theme sync
  useEffect(() => {
    if (settings.themeMode !== theme) {
      setTheme(settings.themeMode);
    }
  }, [settings.themeMode, theme, setTheme]);

  // Auto-save to new backend structure on any change
  useEffect(() => {
    const timer = setTimeout(async () => {
      updateGeneralSettings(settings);
      await saveGeneralSetting(settings);
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [settings]);

  const handleThemeChange = (themeMode) => {
    setSettings({ ...settings, themeMode });
    setTheme(themeMode);
    toast.success(`Theme changed to ${themeMode}`);
  };

  const handleSave = async () => {
    updateGeneralSettings(settings);
    const result = await saveGeneralSetting(settings);
    if (result.success) {
      toast.success('General settings saved successfully!');
    } else {
      toast.error('Failed to save settings: ' + result.error);
    }
  };

  const handleReset = () => {
    const defaults = {
      themeMode: 'system',
      selectedTheme: 'theme2',
      language: 'English',
      financialYear: 'Apr-Mar',
      autoLogoutTime: 30,
      startupPage: 'Dashboard',
      notificationsEnabled: true,
      soundAlerts: true,
      autoSaveInterval: 5,
    };
    setSettings(defaults);
    updateGeneralSettings(defaults);
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="space-y-2">
      {/* Theme & Appearance Card */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-500 p-1.5 text-white">
          <div className="flex items-center gap-1.5">
            <div className="rounded-lg bg-white/20 backdrop-blur-sm p-1.5 shadow-lg">
              <Sun className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Theme & Appearance</h3>
              <p className="text-xs text-white/90">Customize your visual experience</p>
            </div>
          </div>
        </div>

        <div className="p-2 space-y-1.5">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Theme Mode</label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { value: 'light', label: 'Light', icon: Sun, gradient: 'from-yellow-400 to-orange-400' },
                { value: 'dark', label: 'Dark', icon: Moon, gradient: 'from-indigo-500 to-purple-600' },
                { value: 'system', label: 'System', icon: Monitor, gradient: 'from-blue-500 to-cyan-500' },
              ].map(({ value, label, icon: Icon, gradient }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value)}
                  className={`relative p-1.5 rounded-xl flex flex-col items-center gap-1 transition-all transform hover:scale-105 ${
                    settings.themeMode === value
                      ? `bg-gradient-to-br ${gradient} text-white shadow-2xl border-2 border-white`
                      : 'border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  {settings.themeMode === value && (
                    <div className="absolute top-1 right-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                  <Icon size={24} className={settings.themeMode === value ? 'text-white' : 'text-gray-600 dark:text-gray-400'} />
                  <span className={`text-sm font-semibold ${settings.themeMode === value ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-1.5 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-2 border-yellow-200 dark:border-yellow-800">
            <label className="flex items-center gap-1 text-sm font-semibold mb-1 text-orange-700 dark:text-orange-400">
              <Palette size={14} />
              Select Theme
            </label>
            <select
              value={settings.selectedTheme || 'theme2'}
              onChange={(e) => {
                setSettings({ ...settings, selectedTheme: e.target.value });
                toast.success(`Theme selected: ${themeOptions.find((option) => option.value === e.target.value)?.label}`);
              }}
              className="w-full px-2 py-1.5 text-sm font-medium border-2 border-orange-300 dark:border-orange-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            >
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Language & Regional Card */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 p-1.5 text-white">
          <div className="flex items-center gap-1.5">
            <div className="rounded-lg bg-white/20 backdrop-blur-sm p-1.5 shadow-lg">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Language & Regional</h3>
              <p className="text-xs text-white/90">Set your preferred language and formats</p>
            </div>
          </div>
        </div>

        <div className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-2 border-emerald-200 dark:border-emerald-800">
              <label className="flex items-center gap-1 text-sm font-semibold mb-1 text-emerald-700 dark:text-emerald-400">
                <Globe size={14} />
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => {
                  setSettings({ ...settings, language: e.target.value });
                  toast.success(`Language changed to ${e.target.value}`);
                }}
                className="w-full px-2 py-1.5 text-sm font-medium border-2 border-emerald-300 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              >
                <option>English</option>
                <option>Hindi</option>
                <option>Punjabi</option>
              </select>
            </div>

            <div className="p-1.5 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 border-2 border-cyan-200 dark:border-cyan-800">
              <label className="flex items-center gap-1 text-sm font-semibold mb-1 text-cyan-700 dark:text-cyan-400">
                <Calendar size={14} />
                Financial Year Format
              </label>
              <select
                value={settings.financialYear}
                onChange={(e) => {
                  setSettings({ ...settings, financialYear: e.target.value });
                  toast.success(`Financial year format changed to ${e.target.value}`);
                }}
                className="w-full px-2 py-1.5 text-sm font-medium border-2 border-cyan-300 dark:border-cyan-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
              >
                <option>Apr-Mar</option>
                <option>Jan-Dec</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Application Behavior Card */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 p-1.5 text-white">
          <div className="flex items-center gap-1.5">
            <div className="rounded-lg bg-white/20 backdrop-blur-sm p-1.5 shadow-lg">
              <Layout className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Application Behavior</h3>
              <p className="text-xs text-white/90">Configure system preferences</p>
            </div>
          </div>
        </div>

        <div className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800">
              <label className="flex items-center gap-1 text-sm font-semibold mb-1 text-purple-700 dark:text-purple-400">
                <Clock size={14} />
                Auto-logout Time
              </label>
              <select
                value={settings.autoLogoutTime}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setSettings({ ...settings, autoLogoutTime: value });
                  toast.success(value === 0 ? 'Auto-logout disabled' : `Auto-logout set to ${value} minutes`);
                }}
                className="w-full px-2 py-1.5 text-sm font-medium border-2 border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={0}>Never</option>
              </select>
            </div>

            <div className="p-1.5 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border-2 border-pink-200 dark:border-pink-800">
              <label className="flex items-center gap-1 text-sm font-semibold mb-1 text-pink-700 dark:text-pink-400">
                <Layout size={14} />
                Startup Page
              </label>
              <select
                value={settings.startupPage}
                onChange={(e) => {
                  setSettings({ ...settings, startupPage: e.target.value });
                  toast.success(`Startup page set to ${e.target.value}`);
                }}
                className="w-full px-2 py-1.5 text-sm font-medium border-2 border-pink-300 dark:border-pink-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
              >
                {sidebarNavItems.map((item) => (
                  <option key={item.href} value={item.title}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-1.5 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-2 border-indigo-200 dark:border-indigo-800 md:col-span-2">
              <label className="flex items-center gap-1 text-sm font-semibold mb-1 text-indigo-700 dark:text-indigo-400">
                <Save size={14} />
                Auto Save Interval (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.autoSaveInterval}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1 && value <= 30) {
                    setSettings({ ...settings, autoSaveInterval: value });
                    toast.success(`Auto-save interval set to ${value} minutes`);
                  }
                }}
                className="w-full px-2 py-1.5 text-sm font-medium border-2 border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Notifications Card */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 p-1.5 text-white">
          <div className="flex items-center gap-1.5">
            <div className="rounded-lg bg-white/20 backdrop-blur-sm p-1.5 shadow-lg">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Notifications</h3>
              <p className="text-xs text-white/90">Manage your alert preferences</p>
            </div>
          </div>
        </div>

        <div className="p-2 space-y-1.5">
          <label className="flex items-center justify-between p-1.5 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800 cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.02]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Bell size={16} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 block">Enable Desktop Notifications</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">Get notified about important updates</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(e) => {
                setSettings({ ...settings, notificationsEnabled: e.target.checked });
                toast.success(e.target.checked ? 'Notifications enabled' : 'Notifications disabled');
              }}
              className="w-5 h-5 rounded-lg text-orange-600 focus:ring-2 focus:ring-orange-500 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded-xl bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-2 border-red-200 dark:border-red-800 cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.02]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Bell size={16} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 block">Sound Alerts</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">Play sound for notifications</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.soundAlerts}
              onChange={(e) => {
                setSettings({ ...settings, soundAlerts: e.target.checked });
                toast.success(e.target.checked ? 'Sound alerts enabled' : 'Sound alerts disabled');
              }}
              className="w-5 h-5 rounded-lg text-red-600 focus:ring-2 focus:ring-red-500 cursor-pointer"
            />
          </label>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-1 p-2 rounded-xl bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          💡 All changes are saved automatically
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleReset} 
            variant="outline"
            className="px-3 py-1.5 border-2 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg font-semibold transition-all flex items-center gap-1.5 text-sm"
          >
            <RotateCcw size={14} />
            Reset to Defaults
          </Button>
          <Button 
            onClick={handleSave} 
            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold shadow-lg transition-all flex items-center gap-1.5 text-sm"
          >
            <Save size={14} />
            Save Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettingsTab;

