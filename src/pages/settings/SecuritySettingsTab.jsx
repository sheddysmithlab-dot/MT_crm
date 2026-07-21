import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import useSettingsStore from '@/store/settingsStore';
import { useAuthStore } from '@/store/authManagementStore';
import { Shield, Lock, Eye, EyeOff, Clock, FileCheck, AlertTriangle, CheckCircle, XCircle, LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';


// PIN Lock Popup Component
const PinLockPopup = ({ onUnlock, onLogout }) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const { securitySettings } = useSettingsStore();
  const maxAttempts = 5;

  const handlePinInput = (digit) => {
    if (enteredPin.length < 6) {
      setEnteredPin(enteredPin + digit);
    }
  };

  const handleDelete = () => {
    setEnteredPin(enteredPin.slice(0, -1));
  };

  const handleClear = () => {
    setEnteredPin('');
  };

  const handleSubmit = () => {
    if (enteredPin === securitySettings.appPinLock) {
      toast.success('PIN verified! Welcome back');
      onUnlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      
      if (newAttempts >= maxAttempts) {
        toast.error('Maximum attempts reached. Logging out...');
        setTimeout(() => onLogout(), 1000);
      } else {
        toast.error(`Incorrect PIN. ${maxAttempts - newAttempts} attempts remaining`);
        setEnteredPin('');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className={`relative ${isShaking ? 'animate-shake' : ''}`}>
        <Card className="w-96 p-4 shadow-2xl border-0 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950">
          {/* Lock Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
              <div className="relative rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-xl">
                <Lock className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Enter PIN to Unlock
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your session has been locked due to inactivity
            </p>
          </div>

          {/* PIN Display */}
          <div className="flex justify-center gap-3 mb-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`h-14 w-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                  i < enteredPin.length
                    ? 'border-blue-500 bg-blue-500 text-white shadow-lg scale-110'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                {i < enteredPin.length ? '●' : ''}
              </div>
            ))}
          </div>

          {/* Attempts Warning */}
          {attempts > 0 && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400 text-center font-medium">
                ⚠️ {maxAttempts - attempts} attempt{maxAttempts - attempts !== 1 ? 's' : ''} remaining
              </p>
            </div>
          )}

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handlePinInput(num.toString())}
                className="h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-blue-500 hover:to-indigo-500 hover:text-white font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-md"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-16 rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-700 dark:to-yellow-800 hover:from-yellow-500 hover:to-orange-500 hover:text-white font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md"
            >
              Clear
            </button>
            <button
              onClick={() => handlePinInput('0')}
              className="h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-blue-500 hover:to-indigo-500 hover:text-white font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-md"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-16 rounded-xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-700 dark:to-red-800 hover:from-red-500 hover:to-pink-500 hover:text-white font-bold transition-all transform hover:scale-105 active:scale-95 shadow-md"
            >
              ⌫
            </button>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={enteredPin.length === 0}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            Unlock
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full mt-3 h-10 rounded-xl border-2 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-all"
          >
            <LogOut className="inline mr-2" size={16} />
            Logout Instead
          </button>
        </Card>
      </div>
    </div>
  );
};

const SecuritySettingsTab = () => {
  const { securitySettings, updateSecuritySettings, savePinTime, loadPinTime } = useSettingsStore();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(securitySettings);
  const [showPin, setShowPin] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isLocked, setIsLocked] = useState(false);
  const [timeUntilLock, setTimeUntilLock] = useState(null);

  // Load security settings from new backend on mount
  useEffect(() => {
    const loadSecurityData = async () => {
      const result = await loadPinTime();
      if (result.success && result.data) {
        setSettings(result.data);
      }
    };
    loadSecurityData();
  }, []);

  // Real-time auto-save to both Zustand store and new backend
  useEffect(() => {
    const timer = setTimeout(async () => {
      updateSecuritySettings(settings);
      await savePinTime(settings);
    }, 500);
    return () => clearTimeout(timer);
  }, [settings, updateSecuritySettings]);

  // Track user activity
  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Setup activity listeners
  useEffect(() => {
    if (isLocked) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, resetActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetActivity, true);
      });
    };
  }, [resetActivity, isLocked]);

  // Auto-lock timer
  useEffect(() => {
    if (!settings.appPinLock || settings.autoLockMinutes === 0 || isLocked) {
      setTimeUntilLock(null);
      return;
    }

    const interval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      const lockTime = settings.autoLockMinutes * 60 * 1000;
      const remaining = lockTime - inactiveTime;

      if (remaining <= 0) {
        setIsLocked(true);
        setTimeUntilLock(null);
        toast.warning('Session locked due to inactivity');
      } else {
        setTimeUntilLock(Math.ceil(remaining / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, settings.appPinLock, settings.autoLockMinutes, isLocked]);

  const handleUnlock = () => {
    setIsLocked(false);
    resetActivity();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatTime = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* PIN Lock Popup */}
      {isLocked && <PinLockPopup onUnlock={handleUnlock} onLogout={handleLogout} />}

      <div className="space-y-6">
        {/* Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-4 text-white shadow-2xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
                  <Shield className="h-10 w-10" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
                  <p className="text-blue-100 mt-1">Protect your application with advanced security features</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timer Card */}
        {settings.appPinLock && settings.autoLockMinutes > 0 && timeUntilLock && (
          <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 shadow-lg">
                    <Clock className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Session Active</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Auto-lock in</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatTime(timeUntilLock)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">minutes remaining</p>
                </div>
              </div>
              <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000"
                  style={{ 
                    width: `${(timeUntilLock / (settings.autoLockMinutes * 60)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </Card>
        )}

        {/* PIN Lock Settings */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">App Security</h3>
            </div>

            <div className="space-y-6">
              {/* PIN Input */}
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                  <Lock className="inline mr-2" size={16} />
                  App PIN Lock (4-6 digits)
                </label>
                <div className="relative group">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={settings.appPinLock}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setSettings({ ...settings, appPinLock: value });
                      if (value) {
                        toast.success('PIN updated successfully');
                      } else {
                        toast.info('PIN lock disabled');
                      }
                    }}
                    className="w-full p-4 pr-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-lg tracking-widest"
                    placeholder="Enter 4-6 digit PIN"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                  {settings.appPinLock ? (
                    <>
                      <CheckCircle size={16} className="text-green-500" />
                      PIN lock enabled - Your app is protected
                    </>
                  ) : (
                    <>
                      <XCircle size={16} className="text-red-500" />
                      Leave empty to disable PIN lock
                    </>
                  )}
                </p>
              </div>

              {/* Auto-Lock Timer */}
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                  <Clock className="inline mr-2" size={16} />
                  Auto-lock After Inactivity
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { value: 5, label: '5 min' },
                    { value: 15, label: '15 min' },
                    { value: 30, label: '30 min' },
                    { value: 60, label: '1 hour' },
                    { value: 0, label: 'Never' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSettings({ ...settings, autoLockMinutes: option.value });
                        toast.success(option.value === 0 ? 'Auto-lock disabled' : `Auto-lock set to ${option.label}`);
                        resetActivity();
                      }}
                      className={`p-4 rounded-xl font-medium transition-all transform hover:scale-105 ${
                        settings.autoLockMinutes === option.value
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {settings.autoLockMinutes > 0 
                    ? `App will lock after ${settings.autoLockMinutes} minutes of inactivity`
                    : 'Auto-lock is disabled'
                  }
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Security Recommendations */}
        <Card className="border-0 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-yellow-950/30 shadow-lg">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 shadow-xl">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Security Best Practices
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { icon: '🔐', text: 'Enable PIN lock for sensitive data protection' },
                    { icon: '⏰', text: 'Use auto-lock when away from computer' },
                    { icon: '📝', text: 'Enable audit trail for accountability' },
                    { icon: '💾', text: 'Regular backups protect against data loss' },
                    { icon: '🔄', text: 'Keep your application updated' },
                    { icon: '🔒', text: 'Use strong passwords for user accounts' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
                      <span className="text-2xl">{item.icon}</span>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Auto-save indicator */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">All changes auto-saved</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </>
  );
};

export default SecuritySettingsTab;

