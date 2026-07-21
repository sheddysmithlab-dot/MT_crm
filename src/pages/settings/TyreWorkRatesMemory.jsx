import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { toast } from 'sonner';
import {
  Truck, ChevronLeft, Plus, Trash2, Save, Search, Languages,
  RotateCcw, FileText, Wrench, Sparkles, History,
} from 'lucide-react';
import TYRE_WORK_RATES_SEED from '@/data/tyreWorkRates';
import { loadTyreWorkRates, saveTyreWorkRates } from '@/utils/tyreWorkMemory';

// Display order + labels for the category cards (matches the reference layout)
const CATEGORIES = [
  { key: '6', label: '6 TYRE WORK' },
  { key: '10', label: '10 TYRE WORK' },
  { key: '12', label: '12 TYRE WORK' },
  { key: '16', label: '16 TYRE WORK' },
];

// The three work conditions for every category
const CONDITIONS = [
  { key: 'accidental', label: 'Accidental', icon: Wrench, accent: 'from-rose-500 to-red-600' },
  { key: 'new', label: 'New', icon: Sparkles, accent: 'from-emerald-500 to-green-600' },
  { key: 'old', label: 'Old', icon: History, accent: 'from-amber-500 to-orange-600' },
];

const clone = (obj) => JSON.parse(JSON.stringify(obj));

const TyreWorkRatesMemory = ({ onBack }) => {
  const [data, setData] = useState(() => clone(TYRE_WORK_RATES_SEED));
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { category, condition }
  const [rows, setRows] = useState([]);
  const [lang, setLang] = useState('en'); // 'en' | 'hi'
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setData(await loadTyreWorkRates());
      } catch {
        /* keep seed */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = (nextData) => saveTyreWorkRates(nextData);

  const openList = (category, condition) => {
    setSelected({ category, condition });
    setRows(clone(data?.[category]?.[condition] || []));
    setSearch('');
    setDirty(false);
  };

  const closeList = () => {
    if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
    setSelected(null);
    setRows([]);
  };

  const updateRow = (idx, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    setDirty(true);
  };

  const addRow = () => {
    setRows((prev) => [...prev, { description: '', description_hi: '', rate: 0 }]);
    setDirty(true);
  };

  const deleteRow = (idx) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const handleSave = async () => {
    const cleaned = rows
      .map((r) => ({
        description: (r.description || '').trim(),
        description_hi: (r.description_hi || '').trim(),
        rate: parseFloat(r.rate) || 0,
      }))
      .filter((r) => r.description || r.description_hi);

    const next = clone(data);
    if (!next[selected.category]) next[selected.category] = {};
    next[selected.category][selected.condition] = cleaned;

    try {
      await persist(next);
      setData(next);
      setRows(cleaned);
      setDirty(false);
      toast.success('Rate list saved to memory');
    } catch (err) {
      console.error('Error saving tyre work rates:', err);
      toast.error('Failed to save rate list');
    }
  };

  const handleResetToDefault = async () => {
    if (!confirm('Reset this list back to the original default rates? Your edits to this list will be lost.')) return;
    const seedRows = clone(TYRE_WORK_RATES_SEED?.[selected.category]?.[selected.condition] || []);
    const next = clone(data);
    if (!next[selected.category]) next[selected.category] = {};
    next[selected.category][selected.condition] = seedRows;
    try {
      await persist(next);
      setData(next);
      setRows(seedRows);
      setDirty(false);
      toast.success('List reset to default rates');
    } catch (err) {
      console.error('Error resetting tyre work rates:', err);
      toast.error('Failed to reset list');
    }
  };

  const filteredRows = rows
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (r.description || '').toLowerCase().includes(q) ||
        (r.description_hi || '').toLowerCase().includes(q)
      );
    });

  const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.rate) || 0), 0);

  // ── Detail (editable price list) view ──────────────────────────────────────
  if (selected) {
    const condMeta = CONDITIONS.find((c) => c.key === selected.condition);
    const catMeta = CATEGORIES.find((c) => c.key === selected.category);
    const CondIcon = condMeta?.icon || FileText;

    return (
      <div className="space-y-2">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-2 text-white shadow-xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={closeList}
                className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1.5 font-medium text-sm backdrop-blur-sm transition-all hover:bg-white/30"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <div className="rounded-lg bg-white/20 p-1.5 backdrop-blur-sm">
                <CondIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold tracking-tight text-white">
                  {catMeta?.label} — {condMeta?.label}
                </div>
                <p className="text-blue-100 text-xs">{rows.length} items · Total ₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={() => setLang((l) => (l === 'en' ? 'hi' : 'en'))}
                className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1.5 font-medium text-sm backdrop-blur-sm transition-all hover:bg-white/30"
                title="Toggle language"
              >
                <Languages size={14} />
                {lang === 'en' ? 'English' : 'हिंदी'}
              </button>
              <button
                onClick={handleResetToDefault}
                className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1.5 font-medium text-sm backdrop-blur-sm transition-all hover:bg-white/30"
                title="Reset to default rates"
              >
                <RotateCcw size={14} />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty}
                className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 font-semibold text-sm text-blue-600 shadow transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <Card className="border-0 shadow-lg">
          <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative group flex-1 max-w-md">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
              />
            </div>
            <button
              onClick={addRow}
              className="flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow transition-all hover:shadow-lg"
            >
              <Plus size={16} />
              Add Item
            </button>
          </div>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <th className="px-2 py-1.5 text-left text-xs font-semibold w-12">S.No</th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold">
                    Description {lang === 'hi' ? '(हिंदी)' : '(English)'}
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-semibold w-40">Rate (₹)</th>
                  <th className="px-2 py-1.5 text-center text-xs font-semibold w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      {rows.length === 0 ? 'No items yet — click "Add Item" to start.' : 'No items match your search.'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(({ r, idx }, displayIdx) => {
                    const rowColor = displayIdx % 2 === 0
                      ? 'bg-white dark:bg-gray-900'
                      : 'bg-gray-50 dark:bg-gray-800/50';
                    return (
                      <tr key={idx} className={`${rowColor} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all`}>
                        <td className="px-2 py-1">
                          <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-xs shadow">
                            {displayIdx + 1}
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={lang === 'hi' ? (r.description_hi || '') : (r.description || '')}
                            onChange={(e) => updateRow(idx, lang === 'hi' ? 'description_hi' : 'description', e.target.value)}
                            placeholder={lang === 'hi' ? 'विवरण दर्ज करें' : 'Enter description'}
                            className="w-full px-2 py-1 text-sm border border-transparent rounded-lg bg-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                          />
                        </td>
                        <td className="px-2 py-1 text-right">
                          <input
                            type="number"
                            value={r.rate}
                            onChange={(e) => updateRow(idx, 'rate', e.target.value)}
                            className="w-32 px-2 py-1 text-sm text-right font-semibold text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={handleSave}
                              className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all"
                              title="Save"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteRow(idx)}
                              className="p-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  // ── Grid (category buttons) view ───────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-2 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1.5 font-medium text-sm backdrop-blur-sm transition-all hover:bg-white/30"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            <div className="rounded-lg bg-white/20 p-1.5 backdrop-blur-sm">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-white">Work Estimate Rates</div>
              <p className="text-blue-100 text-xs">Saved rate lists by work &amp; condition — fully editable</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <Card key={cat.key} className="border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-center">
              <div className="text-base font-bold tracking-wide text-white">{cat.label}</div>
            </div>
            <div className="space-y-2 p-3">
              {CONDITIONS.map((cond) => {
                const CondIcon = cond.icon;
                const count = data?.[cat.key]?.[cond.key]?.length || 0;
                return (
                  <button
                    key={cond.key}
                    onClick={() => openList(cat.key, cond.key)}
                    disabled={loading}
                    className={`group flex w-full items-center justify-between gap-2 rounded-xl bg-gradient-to-r ${cond.accent} px-3 py-2.5 text-white shadow transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-60`}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <CondIcon size={16} />
                      {cond.label}
                    </span>
                    <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card className="border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 shadow-lg">
        <div className="flex items-start gap-2 p-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 shadow-lg">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-0.5">Tyre Work Rate Memory</h4>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              Pick a tyre work category and condition to open its price list. Every rate and description can be
              edited, added, or removed and is saved as memory in the CRM. Use the language toggle to maintain
              both English and Hindi descriptions, or reset any list back to the original rates.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TyreWorkRatesMemory;
