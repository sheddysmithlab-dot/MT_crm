import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Database, Server, Eye, EyeOff, Shield, AlertTriangle,
  Wifi, WifiOff, Save, FlaskConical, Lock, CheckCircle2, Clock,
  Globe, Info, Copy,
} from 'lucide-react';
import { toast } from 'sonner';

// ── constants ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  host:           'localhost',
  port:           '3306',
  database:       '',
  username:       '',
  password:       '',
  ssl:            false,
  connectTimeout: 10000,   // ms — clamped 3 000–30 000 in main process
};

// Fields sent to the renderer — internal keys (_pwEnc, _savedAt) are stripped
const ALLOWED_FIELDS = new Set([
  'host', 'port', 'database', 'username', 'password', 'ssl', 'connectTimeout',
]);

const sanitize = (raw) => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONFIG };
  const out = { ...DEFAULT_CONFIG };
  for (const key of ALLOWED_FIELDS) {
    if (key in raw) out[key] = raw[key];
  }
  return out;
};

// Validate all config fields. Returns {} if clean, else { field: message }.
const validate = (cfg) => {
  const errs = {};
  if (!String(cfg.host || '').trim())
    errs.host = 'Host is required';

  const portNum = parseInt(cfg.port, 10);
  if (!cfg.port || isNaN(portNum) || portNum < 1 || portNum > 65535)
    errs.port = 'Must be a number between 1 and 65535';

  if (!String(cfg.database || '').trim())
    errs.database = 'Database name is required';

  if (!String(cfg.username || '').trim())
    errs.username = 'Username is required';

  return errs;
};

const isRootUser = (u) =>
  ['root', 'admin'].includes(String(u || '').trim().toLowerCase());

// Detect Hostinger credentials pattern: u123456789_xxx
const isHostinger = (u) => /^u\d{5,}_/i.test(String(u || '').trim());

// Hostinger hint panel
const HostingerHint = ({ host, onCopy }) => (
  <div className="flex flex-col gap-2 px-3 py-2.5 rounded-lg
    bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700">
    <div className="flex items-center gap-1.5">
      <Globe className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
      <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
        Hostinger Remote MySQL
      </span>
    </div>
    <ol className="text-xs text-orange-700 dark:text-orange-300 space-y-1 list-decimal pl-4 leading-relaxed">
      <li>
        <strong>hPanel</strong> → Hosting → Manage →{' '}
        <strong>Databases → Remote MySQL</strong>
      </li>
      <li>Apna PC ka IP allow karo (ya <code className="bg-orange-100 dark:bg-orange-900/40 px-1 rounded">%</code> sabko allow)</li>
      <li>
        <strong>Host</strong> = hPanel mein &ldquo;MySQL Host&rdquo; ya server IP
        {host === '127.0.0.1' || host === 'localhost' ? (
          <span className="ml-1 text-red-600 dark:text-red-400 font-semibold">
            ← localhost galat hai!
          </span>
        ) : null}
      </li>
    </ol>
    <div className="flex items-center gap-2 mt-0.5">
      <Info className="h-3 w-3 text-orange-400 flex-shrink-0" />
      <p className="text-xs text-orange-500 dark:text-orange-400">
        Hostinger hPanel → Overview → Server &ldquo;Shared IP Address&rdquo; copy karo
      </p>
    </div>
  </div>
);

// ── IPC helpers (gracefully degrade in browser mode) ─────────────────────────

const IS_ELECTRON = typeof window !== 'undefined' && !!window.backendSettings;

const ipcGetConfig = async () => {
  if (!IS_ELECTRON) return null;
  try {
    const res = await window.backendSettings.getConfig();
    if (res?.success) return { config: res.config, isEncrypted: res.isEncrypted };
  } catch (err) {
    console.error('[BackendSettings] getConfig IPC error:', err.message);
  }
  return null;
};

// SECURITY: password is sent to main process via IPC; main process encrypts it.
// This helper deliberately does NOT log `cfg` to avoid password exposure.
const ipcSaveConfig = async (cfg) => {
  if (!IS_ELECTRON)
    return { success: false, error: 'Electron not available — cannot save credentials' };
  try {
    return await window.backendSettings.saveConfig(cfg);
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const ipcTestConnection = async (cfg) => {
  if (!IS_ELECTRON)
    return { success: false, error: 'Electron IPC not available (browser mode)' };
  try {
    return await window.backendSettings.testConnection(cfg);
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ── sub-components ────────────────────────────────────────────────────────────

const Field = ({ label, icon: Icon, children }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold
      text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </label>
    {children}
  </div>
);

const inputBase =
  'w-full px-3 py-2 text-sm rounded-lg border ' +
  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ' +
  'placeholder-gray-400 dark:placeholder-gray-500 ' +
  'focus:outline-none focus:ring-2 transition-all duration-150';

const inputOk  = `${inputBase} border-gray-200 dark:border-gray-600 focus:ring-brand-red/40 focus:border-brand-red`;
const inputErr = `${inputBase} border-red-400 dark:border-red-500 focus:ring-red-400/40 focus:border-red-400`;

const getInputCls = (errors, field) => (errors[field] ? inputErr : inputOk);

const FieldError = ({ msg }) =>
  msg ? <p className="mt-1 text-xs text-red-500 dark:text-red-400">{msg}</p> : null;

const StatusBadge = ({ status }) => {
  const map = {
    idle: {
      cls:   'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
      icon:  <Wifi className="h-3.5 w-3.5" />,
      label: 'Not tested',
    },
    testing: {
      cls:   'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      icon:  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />,
      label: 'Testing…',
    },
    success: {
      cls:   'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      icon:  <Wifi className="h-3.5 w-3.5" />,
      label: 'Connected',
    },
    failed: {
      cls:   'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      icon:  <WifiOff className="h-3.5 w-3.5" />,
      label: 'Failed',
    },
  };
  const { cls, icon, label } = map[status] || map.idle;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {icon}{label}
    </span>
  );
};

const Spinner = ({ size = 'h-4 w-4', color = 'border-gray-400' }) => (
  <span className={`inline-block ${size} animate-spin rounded-full border-2 ${color} border-t-transparent`} />
);

// ── main component ────────────────────────────────────────────────────────────

const BackendSettingsModal = () => {
  const [isOpen,      setIsOpen]      = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);
  const [config,      setConfig]      = useState({ ...DEFAULT_CONFIG });
  const [errors,      setErrors]      = useState({});
  const [showPass,    setShowPass]    = useState(false);
  const [connStatus,  setConnStatus]  = useState('idle');
  const [connDetail,  setConnDetail]  = useState(null);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [hasStored,   setHasStored]   = useState(false);

  const timerRef = useRef(null);

  // ── keyboard shortcut: Shift+Alt held, press D then B within 2 s ─────────
  useEffect(() => {
    // Triggered by Electron main process via before-input-event (works on all PCs)
    const onElectronShortcut = () => setIsOpen(prev => !prev);
    window.addEventListener('malwa:open-backend-settings', onElectronShortcut);

    // Fallback: DOM keydown (dev mode / browser)
    const onKeyDown = (e) => {
      if (e.shiftKey && e.altKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('malwa:open-backend-settings', onElectronShortcut);
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(timerRef.current);
    };
  }, []);

  // ── load config via IPC every time modal opens ────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    setConnStatus('idle');
    setConnDetail(null);
    setShowPass(false);
    setErrors({});
    setIsLoading(true);

    ipcGetConfig().then((result) => {
      if (result?.config) {
        setConfig(sanitize(result.config));
        setHasStored(true);
        setIsEncrypted(result.isEncrypted ?? false);
      } else {
        setConfig({ ...DEFAULT_CONFIG });
        setHasStored(false);
        setIsEncrypted(result?.isEncrypted ?? false);
      }
    }).catch(() => {
      setConfig({ ...DEFAULT_CONFIG });
      setHasStored(false);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [isOpen]);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    // Clear the error for the field as soon as the user starts fixing it
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    // Revert connection status if credentials change
    if (['host', 'port', 'database', 'username', 'password'].includes(field)) {
      setConnStatus('idle');
      setConnDetail(null);
    }
  };

  // ── Test Connection ───────────────────────────────────────────────────────
  const handleTestConnection = async () => {
    const errs = validate(config);
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Fix the highlighted fields before testing');
      return;
    }

    setConnStatus('testing');
    setConnDetail(null);

    const res = await ipcTestConnection(config);

    if (res?.success) {
      setConnStatus('success');
      setConnDetail({
        message:       res.message || 'Connection successful',
        latencyMs:     res.latencyMs,
        serverVersion: res.serverVersion,
      });
      toast.success(`${res.message} (${res.latencyMs}ms)`);
    } else {
      setConnStatus('failed');
      setConnDetail({
        message:   res?.error || 'Connection failed',
        latencyMs: res?.latencyMs,
        code:      res?.code,
      });
      toast.error(res?.error || 'Connection failed');
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const errs = validate(config);
    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Fix the highlighted fields before saving');
      return;
    }

    setIsSaving(true);
    // SECURITY: ipcSaveConfig does NOT log the config object
    const res = await ipcSaveConfig(config);
    setIsSaving(false);

    if (res?.success) {
      setIsEncrypted(res.isEncrypted ?? false);
      setHasStored(true);
      toast.success(
        res.isEncrypted
          ? 'Settings saved — password encrypted via OS keychain'
          : 'Settings saved (OS encryption unavailable — password not persisted)'
      );
      setIsOpen(false);
    } else {
      toast.error('Save failed: ' + (res?.error || 'Unknown error'));
    }
  };

  const handleClose = () => setIsOpen(false);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backend-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={handleClose}
        >
          <motion.div
            key="backend-card"
            initial={{ y: -40, opacity: 0, scale: 0.94 }}
            animate={{ y: 0,   opacity: 1, scale: 1    }}
            exit={{    y: -40, opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-brand-red via-red-400 to-orange-400" />

            {/* ── header ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-50 dark:bg-red-900/30">
                  <Database className="h-4 w-4 text-brand-red" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-none">
                    Backend Settings
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    MySQL / MariaDB connection
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {IS_ELECTRON ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                    bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700
                    text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />Secure Store
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                    bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700
                    text-amber-600 dark:text-amber-400">
                    <Lock className="h-3 w-3" />Browser Mode
                  </span>
                )}
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white
                    hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── body ─────────────────────────────────────────────────────── */}
            {isLoading ? (
              <div className="px-5 py-10 flex flex-col items-center gap-3">
                <Spinner size="h-7 w-7" color="border-brand-red" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Loading saved config…</p>
              </div>
            ) : (
              <div className="px-5 py-5 space-y-4">

                {/* ── loaded-from banner ──────────────────────────────────── */}
                {hasStored && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                    bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {IS_ELECTRON
                        ? `Config loaded from Electron secure store${isEncrypted ? ' (password encrypted)' : ''}`
                        : 'Config loaded from browser storage'}
                    </p>
                  </div>
                )}

                {/* ── Hostinger hint (auto-detect) ────────────────────────── */}
                {isHostinger(config.username) && (
                  <HostingerHint host={config.host} />
                )}

                {/* ── Host + Port ─────────────────────────────────────────── */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Field label="Host" icon={Server}>
                      <input
                        type="text"
                        value={config.host}
                        onChange={e => handleChange('host', e.target.value)}
                        placeholder={isHostinger(config.username) ? "Hostinger server IP (e.g. 31.220.x.x)" : "localhost or 192.168.1.10"}
                        className={getInputCls(errors, 'host')}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      {(config.host === '127.0.0.1' || config.host === 'localhost') && isHostinger(config.username) && (
                        <p className="mt-1 text-xs text-red-500 dark:text-red-400 font-medium">
                          ⚠ Hostinger ke liye localhost nahi chalega — server IP daalo
                        </p>
                      )}
                      <FieldError msg={errors.host} />
                    </Field>
                  </div>
                  <div>
                    <Field label="Port">
                      <input
                        type="number"
                        value={config.port}
                        onChange={e => handleChange('port', e.target.value)}
                        placeholder="3306"
                        className={getInputCls(errors, 'port')}
                        min="1"
                        max="65535"
                      />
                      <FieldError msg={errors.port} />
                    </Field>
                  </div>
                </div>

                {/* ── Database Name ───────────────────────────────────────── */}
                <Field label="Database Name" icon={Database}>
                  <input
                    type="text"
                    value={config.database}
                    onChange={e => handleChange('database', e.target.value)}
                    placeholder="malwa_crm"
                    className={getInputCls(errors, 'database')}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <FieldError msg={errors.database} />
                </Field>

                {/* ── Username ────────────────────────────────────────────── */}
                <Field label="Username">
                  <input
                    type="text"
                    value={config.username}
                    onChange={e => handleChange('username', e.target.value)}
                    placeholder="crm_user"
                    className={getInputCls(errors, 'username')}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <FieldError msg={errors.username} />
                  {/* Root / admin user warning — visible but non-blocking */}
                  {config.username && isRootUser(config.username) && (
                    <div className="flex items-start gap-2 mt-2 px-2.5 py-2 rounded-lg
                      bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        Using <strong>{config.username}</strong> is not recommended in production.
                        Create a dedicated DB user with only the privileges this app needs.
                      </p>
                    </div>
                  )}
                </Field>

                {/* ── Password ────────────────────────────────────────────── */}
                <Field label="Password">
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={config.password}
                      onChange={e => handleChange('password', e.target.value)}
                      placeholder="••••••••"
                      className={`${inputOk} pr-10`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2
                        text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      tabIndex={-1}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {IS_ELECTRON && (
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {isEncrypted
                        ? '🔒 Stored encrypted via OS keychain (safeStorage)'
                        : '⚠️ OS encryption unavailable — password will not be persisted'}
                    </p>
                  )}
                </Field>

                {/* ── SSL + Timeout row ────────────────────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                  {/* SSL toggle */}
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg
                    bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">SSL / TLS</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Encrypt transit</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={config.ssl}
                      onClick={() => handleChange('ssl', !config.ssl)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full
                        transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-red/40
                        ${config.ssl ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md
                        transition-transform duration-200 ${config.ssl ? 'translate-x-4' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </div>

                  {/* Timeout select */}
                  <div className="flex flex-col justify-center px-3 py-2.5 rounded-lg
                    bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <label className="flex items-center gap-1.5 text-xs font-semibold
                      text-gray-500 dark:text-gray-400 mb-1.5">
                      <Clock className="h-3.5 w-3.5" />Timeout
                    </label>
                    <select
                      value={config.connectTimeout}
                      onChange={e => handleChange('connectTimeout', Number(e.target.value))}
                      className="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-gray-600
                        bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                        focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red"
                    >
                      <option value={5000}>5 seconds</option>
                      <option value={10000}>10 seconds</option>
                      <option value={15000}>15 seconds</option>
                      <option value={30000}>30 seconds</option>
                    </select>
                  </div>
                </div>

                {/* ── Connection test result ───────────────────────────────── */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Status:</span>
                    <StatusBadge status={connStatus} />
                    {connDetail?.latencyMs != null && connStatus !== 'testing' && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {connDetail.latencyMs}ms
                      </span>
                    )}
                  </div>

                  {connDetail && connStatus !== 'testing' && (
                    <div className={`px-3 py-2.5 rounded-lg text-xs border ${
                      connStatus === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    }`}>
                      {connStatus === 'success' ? (
                        <div className="space-y-0.5">
                          <div className="font-semibold">{connDetail.message}</div>
                          {connDetail.serverVersion && (
                            <div className="text-green-600 dark:text-green-400">
                              Server: MySQL {connDetail.serverVersion}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="font-semibold">{connDetail.message}</div>
                          {connDetail.code && (
                            <div className="font-mono opacity-70">Code: {connDetail.code}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ── footer ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-2 px-5 py-4
              border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">

              <motion.button
                whileHover={connStatus === 'testing' ? {} : { y: -1, scale: 1.02 }}
                whileTap={connStatus === 'testing' ? {} : { scale: 0.97 }}
                type="button"
                onClick={handleTestConnection}
                disabled={connStatus === 'testing' || isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg
                  border border-gray-200 dark:border-gray-600
                  bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200
                  hover:bg-gray-100 dark:hover:bg-gray-600
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              >
                {connStatus === 'testing'
                  ? <Spinner color="border-gray-500" />
                  : <FlaskConical className="h-4 w-4" />}
                Test Connection
              </motion.button>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ y: -1, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg
                    border border-gray-200 dark:border-gray-600
                    bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200
                    hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-150"
                >
                  <X className="h-4 w-4" />Close
                </motion.button>

                <motion.button
                  whileHover={isSaving ? {} : { y: -1, scale: 1.02 }}
                  whileTap={isSaving ? {} : { scale: 0.97 }}
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg
                    bg-brand-red hover:bg-brand-red-dark text-white
                    focus:outline-none focus:ring-2 focus:ring-red-300
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                >
                  {isSaving ? <Spinner color="border-white" /> : <Save className="h-4 w-4" />}
                  {isSaving ? 'Saving…' : 'Save'}
                </motion.button>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BackendSettingsModal;
