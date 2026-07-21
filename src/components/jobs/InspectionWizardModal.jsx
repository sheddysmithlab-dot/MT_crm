import { useState, useEffect, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ComboBox from "@/components/ui/ComboBox";
import TYRE_WORK_RATES_SEED from "@/data/tyreWorkRates";
import { loadTyreWorkRates } from "@/utils/tyreWorkMemory";
import {
  User, Truck, ListChecks, ChevronLeft, ChevronRight, Check,
  Search, Languages, CheckCircle2,
} from "lucide-react";

// Tyre-work categories available in memory (must match TyreWorkRatesMemory)
const CATEGORIES = [
  { key: "6", label: "6 TYRE WORK" },
  { key: "10", label: "10 TYRE WORK" },
  { key: "12", label: "12 TYRE WORK" },
  { key: "16", label: "16 TYRE WORK" },
];
const CONDITIONS = [
  { key: "accidental", label: "Accidental" },
  { key: "new", label: "New" },
  { key: "old", label: "Old" },
];

const WHEELER_OPTIONS = [
  "4 wheel", "6 wheel", "10 wheel", "12 wheel",
  "14 wheel", "16 wheel", "18 wheel", "22 wheel",
];

// Map a wheeler value to the closest tyre-work category key
const wheelerToCategory = (wheeler) => {
  const n = parseInt(String(wheeler).replace(/\D/g, ""), 10);
  if (!n) return "6";
  if (n <= 6) return "6";
  if (n <= 10) return "10";
  if (n <= 12) return "12";
  return "16";
};

const clone = (o) => JSON.parse(JSON.stringify(o));

const STEPS = [
  { id: 1, label: "Customer", icon: User },
  { id: 2, label: "Vehicle", icon: Truck },
  { id: 3, label: "Rate List", icon: ListChecks },
];

const InspectionWizardModal = ({ isOpen, onClose, onFinish, customers = [], teamMembers = [] }) => {
  const [step, setStep] = useState(1);

  // Collected data
  const [customer, setCustomer] = useState({ ownerName: "", contactNo: "", address: "", gstNumber: "" });
  const [vehicle, setVehicle] = useState({
    vehicleNo: "",
    wheeler: "",
    inspectionDate: new Date().toISOString().split("T")[0],
    assignedId: "",
  });

  // Rate list memory + selection
  const [rateData, setRateData] = useState(() => clone(TYRE_WORK_RATES_SEED));
  const [activeCategory, setActiveCategory] = useState("6");
  const [activeCondition, setActiveCondition] = useState("accidental");
  const [lang, setLang] = useState("en");
  const [search, setSearch] = useState("");
  // selected: { uniqueKey -> { description, category, cost } }
  const [selected, setSelected] = useState({});

  // Reset wizard each time it opens
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setCustomer({ ownerName: "", contactNo: "", address: "", gstNumber: "" });
    setVehicle({
      vehicleNo: "",
      wheeler: "",
      inspectionDate: new Date().toISOString().split("T")[0],
      assignedId: "",
    });
    setSelected({});
    setSearch("");
    setLang("en");
    (async () => {
      try {
        setRateData(await loadTyreWorkRates());
      } catch {
        setRateData(clone(TYRE_WORK_RATES_SEED));
      }
    })();
  }, [isOpen]);

  // When we reach the rate step, default the category from the chosen wheeler
  useEffect(() => {
    if (step === 3) {
      setActiveCategory(wheelerToCategory(vehicle.wheeler));
      setActiveCondition("accidental");
    }
  }, [step, vehicle.wheeler]);

  const phoneError = customer.contactNo.length > 0 && customer.contactNo.length !== 10;

  const currentRows = useMemo(
    () => rateData?.[activeCategory]?.[activeCondition] || [],
    [rateData, activeCategory, activeCondition]
  );

  const filteredRows = useMemo(() => {
    return currentRows
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (r.description || "").toLowerCase().includes(q) ||
          (r.description_hi || "").toLowerCase().includes(q)
        );
      });
  }, [currentRows, search]);

  const keyFor = (cat, cond, idx) => `${cat}|${cond}|${idx}`;

  const toggleRow = (idx) => {
    const row = currentRows[idx];
    if (!row) return;
    const k = keyFor(activeCategory, activeCondition, idx);
    setSelected((prev) => {
      const next = { ...prev };
      if (next[k]) {
        delete next[k];
      } else {
        const desc = lang === "hi"
          ? (row.description_hi || row.description)
          : (row.description || row.description_hi);
        next[k] = {
          description: desc,
          category: `${activeCategory} Tyre - ${CONDITIONS.find((c) => c.key === activeCondition)?.label}`,
          cost: parseFloat(row.rate) || 0,
        };
      }
      return next;
    });
  };

  const selectedCount = Object.keys(selected).length;
  const selectedTotal = Object.values(selected).reduce((s, it) => s + (it.cost || 0), 0);

  const canNext = step === 1 ? (!!customer.ownerName && !phoneError) : true;

  const handleFinish = () => {
    const assigned = teamMembers.find((m) => m.id === vehicle.assignedId) || null;
    const details = {
      vehicleNo: vehicle.vehicleNo,
      ownerName: customer.ownerName,
      contactNo: customer.contactNo,
      address: customer.address,
      gstNumber: customer.gstNumber,
      wheeler: vehicle.wheeler,
      inspectionDate: vehicle.inspectionDate,
    };
    const items = Object.values(selected).map((it) => ({
      item: it.description,
      category: it.category,
      condition: "OK",
      cost: it.cost,
      multiplier: 1,
      workOrder: "",
      assignedTo: "",
    }));
    onFinish({ details, items, assignedPerson: assigned });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Inspection Setup" size="3xl">
      {/* Step indicator */}
      <div className="mb-5 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-all
                ${active ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
                  : done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                {done ? <Check size={16} /> : <Icon size={16} />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 w-8 ${step > s.id ? "bg-emerald-400" : "bg-gray-200 dark:bg-gray-700"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1 — Customer details */}
      {step === 1 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="font-medium text-sm text-gray-700 dark:text-gray-300">Owner Name: *</label>
            <ComboBox
              value={customer.ownerName}
              onChange={(value) => setCustomer((c) => ({ ...c, ownerName: value }))}
              onSelect={(cust) => {
                if (cust) {
                  setCustomer({
                    ownerName: cust.name || "",
                    contactNo: cust.phone || "",
                    address: cust.address || "",
                    gstNumber: cust.gstin || cust.gst_number || "",
                  });
                }
              }}
              suggestions={customers}
              placeholder="Select or type customer name..."
              displayKey="name"
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="font-medium text-sm text-gray-700 dark:text-gray-300">Contact Number:</label>
            <input
              type="tel"
              value={customer.contactNo}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                if (v.length <= 10) setCustomer((c) => ({ ...c, contactNo: v }));
              }}
              placeholder="10 digit mobile number"
              maxLength="10"
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {phoneError && <p className="text-xs text-red-500 mt-1">Phone must be 10 digits</p>}
          </div>
          <div>
            <label className="font-medium text-sm text-gray-700 dark:text-gray-300">GST Number (Optional):</label>
            <input
              type="text"
              value={customer.gstNumber}
              onChange={(e) => {
                const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                if (v.length <= 15) setCustomer((c) => ({ ...c, gstNumber: v }));
              }}
              placeholder="15 characters"
              maxLength="15"
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="font-medium text-sm text-gray-700 dark:text-gray-300">Address:</label>
            <input
              type="text"
              value={customer.address}
              onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* Step 2 — Vehicle details */}
      {step === 2 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="font-medium text-sm text-gray-700 dark:text-gray-300">Vehicle No:</label>
            <input
              type="text"
              value={vehicle.vehicleNo}
              onChange={(e) => setVehicle((v) => ({ ...v, vehicleNo: e.target.value }))}
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="font-medium text-sm text-gray-700 dark:text-gray-300">Wheeler:</label>
            <select
              value={vehicle.wheeler}
              onChange={(e) => setVehicle((v) => ({ ...v, wheeler: e.target.value }))}
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select Wheeler</option>
              {WHEELER_OPTIONS.map((w) => (
                <option key={w} value={w}>{w.replace("wheel", "Wheel")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-medium text-sm text-gray-700 dark:text-gray-300">Inspection Date:</label>
            <input
              type="date"
              value={vehicle.inspectionDate}
              onChange={(e) => setVehicle((v) => ({ ...v, inspectionDate: e.target.value }))}
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="font-medium text-sm text-gray-700 dark:text-gray-300">Assign Person to Inspection:</label>
            <select
              value={vehicle.assignedId}
              onChange={(e) => setVehicle((v) => ({ ...v, assignedId: e.target.value }))}
              className="w-full mt-1 p-2 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">-- Select a team member --</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name} - {m.phone}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Step 3 — Rate list selection */}
      {step === 3 && (
        <div className="space-y-3">
          {/* Category + condition selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="p-2 text-sm border rounded font-semibold dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <div className="flex gap-1">
              {CONDITIONS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setActiveCondition(c.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all
                    ${activeCondition === c.key
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setLang((l) => (l === "en" ? "hi" : "en"))}
              className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            >
              <Languages size={14} />
              {lang === "en" ? "English" : "हिंदी"}
            </button>
            <div className="relative ml-auto">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 pl-7 pr-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* Selected summary */}
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 text-sm">
            <span className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={15} /> {selectedCount} item(s) selected
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              Total ₹{selectedTotal.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Rate table */}
          <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-2 py-2 text-center w-12">Pick</th>
                  <th className="px-2 py-2 text-left w-12">#</th>
                  <th className="px-2 py-2 text-left">Description {lang === "hi" ? "(हिंदी)" : ""}</th>
                  <th className="px-2 py-2 text-right w-28">Rate (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-500">No items found.</td></tr>
                ) : (
                  filteredRows.map(({ r, idx }, displayIdx) => {
                    const k = keyFor(activeCategory, activeCondition, idx);
                    const checked = !!selected[k];
                    const desc = lang === "hi" ? (r.description_hi || r.description) : (r.description || r.description_hi);
                    return (
                      <tr
                        key={k}
                        onClick={() => toggleRow(idx)}
                        className={`cursor-pointer transition-colors ${checked
                          ? "bg-blue-50 dark:bg-blue-900/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
                      >
                        <td className="px-2 py-1.5 text-center">
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded border-2 transition-colors
                              ${checked
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-gray-300 dark:border-gray-600"}`}
                          >
                            {checked && <Check size={14} strokeWidth={3} />}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-gray-500">{displayIdx + 1}</td>
                        <td className="px-2 py-1.5 text-gray-900 dark:text-gray-100">{desc}</td>
                        <td className="px-2 py-1.5 text-right font-semibold text-blue-600 dark:text-blue-400">
                          ₹{(parseFloat(r.rate) || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer navigation */}
      <div className="mt-6 flex items-center justify-between border-t pt-4 dark:border-gray-700">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => canNext && setStep((s) => s + 1)}
              disabled={!canNext}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700 text-white">
              <Check className="h-4 w-4 mr-1" /> Finish &amp; Fill Form
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default InspectionWizardModal;
