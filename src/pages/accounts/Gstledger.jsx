import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Download, Edit2, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { dbOperations } from '@/lib/db';
import { exportToCSV, exportToPDF, formatCurrency, formatDate } from '@/utils/exportHelpers';
import { openPrintPreview, PRINT_PRESETS } from '@/utils/printHelpers';

// Convert a "YYYY-MM" month string into the first and last calendar day of
// that month. Uses local date parts (no toISOString) so the last day is never
// shifted back by a timezone offset.
// Detect an IGST entry no matter how the source module stored it: sell invoices
// save "IGST" / "CGST+SGST" while purchases save "igst" / "cgst_sgst".
const isIgstType = (value) =>
  String(value || '').toLowerCase().replace(/[^a-z]/g, '') === 'igst';

const getMonthDateRange = (monthStr) => {
  const [year, month] = String(monthStr).split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
};

const Gstledger = () => {
  const [entries, setEntries] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const dateRange = getMonthDateRange(selectedMonth);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    inputGST: 0,
    outputGST: 0,
    netGST: 0
  });
  const [openingBalances, setOpeningBalances] = useState({ month: '', igst: 0, cgst: 0, sgst: 0 });
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [tempOpeningBalances, setTempOpeningBalances] = useState({ month: '', igst: 0, cgst: 0, sgst: 0 });

  // Carry-forward opening balance for the currently selected month: the anchor
  // month's base (IGST+CGST+SGST) plus the net GST of every month between the
  // anchor month and the selected month. Computed in loadGSTEntries.
  const [openingBalance, setOpeningBalance] = useState(0);

  useEffect(() => {
    loadGSTEntries();
    loadOpeningBalance();
  }, [selectedMonth]);

  const loadOpeningBalance = async () => {
    try {
      const settings = await dbOperations.getAll('settings') || [];
      const gstSetting = settings.find(s => s.key === 'gst_opening_balance');
      let parsed = { month: '', igst: 0, cgst: 0, sgst: 0 };
      if (gstSetting?.value !== undefined && gstSetting?.value !== null) {
        try {
          const obj = JSON.parse(gstSetting.value);
          if (obj && typeof obj === 'object') {
            parsed = {
              month: obj.month || '',
              igst: parseFloat(obj.igst) || 0,
              cgst: parseFloat(obj.cgst) || 0,
              sgst: parseFloat(obj.sgst) || 0,
            };
          }
        } catch {
          // Legacy single numeric value — keep it as the CGST component.
          parsed = { month: '', igst: 0, cgst: parseFloat(gstSetting.value) || 0, sgst: 0 };
        }
      }
      setOpeningBalances(parsed);
    } catch (error) {
      console.error('Error loading opening balance:', error);
      setOpeningBalances({ month: '', igst: 0, cgst: 0, sgst: 0 });
    }
  };

  const saveOpeningBalance = async () => {
    try {
      const settings = await dbOperations.getAll('settings') || [];
      const gstSetting = settings.find(s => s.key === 'gst_opening_balance');
      const normalized = {
        month: tempOpeningBalances.month || '',
        igst: parseFloat(tempOpeningBalances.igst) || 0,
        cgst: parseFloat(tempOpeningBalances.cgst) || 0,
        sgst: parseFloat(tempOpeningBalances.sgst) || 0,
      };
      const value = JSON.stringify(normalized);

      if (gstSetting) {
        await dbOperations.update('settings', gstSetting.id, {
          ...gstSetting,
          value
        });
      } else {
        await dbOperations.insert('settings', {
          key: 'gst_opening_balance',
          value,
          description: 'Opening GST Balance'
        });
      }

      setOpeningBalances(normalized);
      setIsBalanceModalOpen(false);
      toast.success('Opening balance updated successfully');
    } catch (error) {
      console.error('Error saving opening balance:', error);
      toast.error('Failed to save opening balance');
    }
  };

  const loadGSTEntries = async () => {
    try {
      setLoading(true);
      
      // Load Data
      const [purchases, invoices, customers, suppliers] = await Promise.all([
        dbOperations.getAll('purchases'),
        dbOperations.getAll('invoices'),
        dbOperations.getAll('customers'),
        dbOperations.getAll('suppliers')
      ]);

      // Settings is loaded separately/defensively: a failure here (e.g. missing
      // store) must NOT block the GST entries from rendering.
      let settingsRows = [];
      try {
        settingsRows = (await dbOperations.getAll('settings')) || [];
      } catch (settingsError) {
        console.warn('GST Ledger: failed to load settings, using empty opening balance', settingsError);
      }

      // Create Maps
      const customerMap = {};
      (customers || []).forEach(c => customerMap[c.id] = c);
      
      const supplierMap = {};
      (suppliers || []).forEach(s => supplierMap[s.id] = s);
      
      // Load Purchase Invoices (Input GST)
      const purchaseEntries = (purchases || [])
        .filter(p => {
          if (!p.invoice_date) return false;
          return p.invoice_date >= dateRange.from && p.invoice_date <= dateRange.to;
        })
        .map(p => {
          const taxableAmount = parseFloat(p.subtotal) || 0;
          const totalGST = parseFloat(p.gst_amount) || 0;
          const isIgst = isIgstType(p.gst_type);

          let cgst = 0;
          let sgst = 0;
          let igst = 0;

          if (isIgst) {
            igst = totalGST;
          } else {
            // CGST+SGST split
            cgst = totalGST / 2;
            sgst = totalGST / 2;
          }
          
          return {
            date: p.invoice_date,
            type: 'Purchase',
            partyName: p.supplier_name || 'N/A',
            invoiceNo: p.invoice_no || '-',
            taxableAmount,
            cgst,
            sgst,
            igst,
            totalGST,
            gstType: isIgst ? 'IGST' : 'CGST+SGST',
            gstNumber: supplierMap[p.supplier_id]?.gstin || '-',
            isInput: true
          };
        });

      // Load Sell Invoices (Output GST)
      const sellEntries = (invoices || [])
        .filter(inv => {
          if (!inv.invoice_date && !inv.date) return false;
          const invDate = inv.invoice_date || inv.date;
          return invDate >= dateRange.from && invDate <= dateRange.to;
        })
        .map(inv => {
          const taxableAmount = parseFloat(inv.subtotal) || 0;
          const totalGST = parseFloat(inv.tax) || 0;
          const isIgst = isIgstType(inv.gst_type);

          let cgst = 0;
          let sgst = 0;
          let igst = 0;

          if (isIgst) {
            igst = totalGST;
          } else {
            // CGST+SGST split
            cgst = totalGST / 2;
            sgst = totalGST / 2;
          }
          
          return {
            date: inv.invoice_date || inv.date,
            type: 'Sale',
            partyName: inv.party_name || inv.customer_name || 'N/A',
            invoiceNo: inv.invoice_no || inv.invoice_number || inv.vehicle_no || '-',
            taxableAmount,
            cgst,
            sgst,
            igst,
            totalGST,
            gstType: isIgst ? 'IGST' : 'CGST+SGST',
            gstNumber: customerMap[inv.customer_id]?.gstin || '-',
            isInput: false
          };
        });

      // Combine and sort by date
      const allEntries = [...purchaseEntries, ...sellEntries].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );

      setEntries(allEntries);

      // Calculate summary
      const inputGST = purchaseEntries.reduce((sum, e) => sum + (e.totalGST || 0), 0);
      const outputGST = sellEntries.reduce((sum, e) => sum + (e.totalGST || 0), 0);
      const netGST = outputGST - inputGST;

      setSummary({ inputGST, outputGST, netGST });

      // ----- Carry-forward opening balance for the selected month -----
      // Read the anchor config (month + IGST/CGST/SGST set by the user).
      const cfgRow = (settingsRows || []).find(s => s.key === 'gst_opening_balance');
      let cfg = { month: '', igst: 0, cgst: 0, sgst: 0 };
      if (cfgRow?.value) {
        try {
          const obj = JSON.parse(cfgRow.value);
          if (obj && typeof obj === 'object') {
            cfg = {
              month: obj.month || '',
              igst: parseFloat(obj.igst) || 0,
              cgst: parseFloat(obj.cgst) || 0,
              sgst: parseFloat(obj.sgst) || 0,
            };
          }
        } catch {
          cfg = { month: '', igst: 0, cgst: parseFloat(cfgRow.value) || 0, sgst: 0 };
        }
      }

      const anchorBase = cfg.igst + cfg.cgst + cfg.sgst;
      let effectiveOpening = anchorBase;
      if (cfg.month) {
        const anchorStart = `${cfg.month}-01`;
        const selStart = dateRange.from;
        if (selStart < anchorStart) {
          // Selected month is before the opening-balance month → nothing yet.
          effectiveOpening = 0;
        } else {
          // Net GST of every month from the anchor month up to (but not
          // including) the selected month, carried forward into the opening.
          const priorOutput = (invoices || []).reduce((sum, inv) => {
            const d = inv.invoice_date || inv.date;
            return d && d >= anchorStart && d < selStart ? sum + (parseFloat(inv.tax) || 0) : sum;
          }, 0);
          const priorInput = (purchases || []).reduce((sum, p) => {
            return p.invoice_date && p.invoice_date >= anchorStart && p.invoice_date < selStart
              ? sum + (parseFloat(p.gst_amount) || 0)
              : sum;
          }, 0);
          effectiveOpening = anchorBase + (priorOutput - priorInput);
        }
      }
      setOpeningBalance(effectiveOpening);

    } catch (error) {
      console.error('Error loading GST entries:', error);
      toast.error('Failed to load GST entries');
      setEntries([]);
      setSummary({ inputGST: 0, outputGST: 0, netGST: 0 });
      setOpeningBalance(0);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      if (entries.length === 0) {
        toast.warning('No data to export');
        return;
      }

      const headers = ['Date', 'Type', 'Party Name', 'Invoice No', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Total GST', 'GST Number'];
      const rows = entries.map(e => [
        formatDate(e.date),
        e.type || '',
        e.partyName || '',
        e.invoiceNo || '',
        formatCurrency(e.taxableAmount || 0),
        formatCurrency(e.cgst || 0),
        formatCurrency(e.sgst || 0),
        formatCurrency(e.igst || 0),
        formatCurrency(e.totalGST || 0),
        e.gstNumber || '-'
      ]);

      const success = exportToCSV(
        headers,
        rows,
        `GST_Ledger_${dateRange.from}_to_${dateRange.to}.csv`
      );

      if (success) {
        toast.success('GST Ledger exported to CSV');
      } else {
        toast.error('Failed to export CSV');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handlePrint = () => {
    if (entries.length === 0) {
      toast.warning('No data to print');
      return;
    }
    
    toast.info('Print will open in browser print dialog');
    window.print();
  };

  const handleSavePDF = () => {
    try {
      if (entries.length === 0) {
        toast.warning('No data to save');
        return;
      }

      const closingBalance = openingBalance + summary.netGST;
      
      const tableData = entries.map(e => [
        formatDate(e.date),
        e.type,
        e.partyName,
        e.invoiceNo,
        formatCurrency(e.taxableAmount || 0),
        formatCurrency(e.cgst || 0),
        formatCurrency(e.sgst || 0),
        formatCurrency(e.igst || 0),
        formatCurrency(e.totalGST || 0),
        e.gstNumber || '-'
      ]);

      // Calculate totals for footer
      const totalTaxable = entries.reduce((sum, e) => sum + (e.taxableAmount || 0), 0);
      const totalCGST = entries.reduce((sum, e) => sum + (e.cgst || 0), 0);
      const totalSGST = entries.reduce((sum, e) => sum + (e.sgst || 0), 0);
      const totalIGST = entries.reduce((sum, e) => sum + (e.igst || 0), 0);
      const totalGST = entries.reduce((sum, e) => sum + (e.totalGST || 0), 0);

      const success = exportToPDF({
        title: 'GST Ledger Report',
        subtitle: `Period: ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}`,
        headerInfo: [], // Removed header info as it's now in summary cards
        summaryCards: [
          { 
            label: 'Opening Balance', 
            value: formatCurrency(openingBalance),
            bgColor: [255, 253, 231], // Yellow-50
            textColor: [234, 179, 8] // Yellow-600
          },
          { 
            label: 'Input GST', 
            value: formatCurrency(summary.inputGST),
            bgColor: [239, 246, 255], // Blue-50
            textColor: [37, 99, 235] // Blue-600
          },
          { 
            label: 'Output GST', 
            value: formatCurrency(summary.outputGST),
            bgColor: [240, 253, 244], // Green-50
            textColor: [22, 163, 74] // Green-600
          },
          { 
            label: 'Net GST', 
            value: formatCurrency(summary.netGST),
            bgColor: [255, 241, 242], // Rose-50
            textColor: [225, 29, 72] // Rose-600
          },
          { 
            label: 'Closing Balance', 
            value: formatCurrency(closingBalance),
            bgColor: [238, 242, 255], // Indigo-50
            textColor: [220, 38, 38] // Red-600 (as per screenshot)
          },
        ],
        tableHeaders: ['Date', 'Type', 'Party Name', 'Invoice No', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Total GST', 'GST Number'],
        tableData,
        foot: [
          '', '', '', 'Total:', 
          formatCurrency(totalTaxable), 
          formatCurrency(totalCGST), 
          formatCurrency(totalSGST), 
          formatCurrency(totalIGST), 
          formatCurrency(totalGST), 
          ''
        ],
        filename: `GST_Ledger_${dateRange.from}_to_${dateRange.to}.pdf`,
        orientation: 'l',
        columnStyles: {
          0: { cellWidth: 25 }, // Date
          1: { cellWidth: 20 }, // Type
          2: { cellWidth: 40 }, // Party
          3: { cellWidth: 30 }, // Invoice No
          4: { halign: 'right', cellWidth: 25 }, // Taxable
          5: { halign: 'right', cellWidth: 20 }, // CGST
          6: { halign: 'right', cellWidth: 20 }, // SGST
          7: { halign: 'right', cellWidth: 20 }, // IGST
          8: { halign: 'right', cellWidth: 25 }, // Total GST
          9: { cellWidth: 52 }  // GST Number
        }
      });

      if (success) {
        toast.success('GST Ledger saved as PDF');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Failed to generate PDF');
    }
  };



  const closingBalance = openingBalance + summary.netGST;

  return (
    <div className="p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            GST Ledger
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setTempOpeningBalances({ ...openingBalances, month: openingBalances.month || selectedMonth });
                setIsBalanceModalOpen(true);
              }}
              variant="outline"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Opening Balance
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              disabled={entries.length === 0}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={handleSavePDF}
              variant="outline"
              disabled={entries.length === 0}
            >
              <FileText className="w-4 h-4 mr-2" />
              Save PDF
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              disabled={entries.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>

          </div>
        </div>

        {/* Month Filter */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Select Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">Opening Balance</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              ₹{openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">Input GST</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₹{summary.inputGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">Output GST</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₹{summary.outputGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">Net GST</p>
            <p className={`text-2xl font-bold ${summary.netGST >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}`}>
              ₹{summary.netGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">Closing Balance</p>
            <p className={`text-2xl font-bold ${closingBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}`}>
              ₹{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-4">Loading GST entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">
              No GST entries found
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              GST entries will appear here from your transactions
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="py-1 px-2 text-left font-semibold" style={{ width: '10%' }}>Date</th>
                  <th className="py-1 px-2 text-left font-semibold" style={{ width: '8%' }}>Type</th>
                  <th className="py-1 px-2 text-left font-semibold" style={{ width: '18%' }}>Party Name</th>
                  <th className="py-1 px-2 text-left font-semibold" style={{ width: '10%' }}>Invoice No</th>
                  <th className="py-1 px-2 text-right font-semibold" style={{ width: '10%' }}>Taxable Amount</th>
                  <th className="py-1 px-2 text-right font-semibold" style={{ width: '8%' }}>CGST</th>
                  <th className="py-1 px-2 text-right font-semibold" style={{ width: '8%' }}>SGST</th>
                  <th className="py-1 px-2 text-right font-semibold" style={{ width: '8%' }}>IGST</th>
                  <th className="py-1 px-2 text-right font-semibold" style={{ width: '10%' }}>Total GST</th>
                  <th className="py-1 px-2 text-center font-semibold" style={{ width: '15%' }}>GST Number</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-1 px-2">{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                    <td className="py-1 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        entry.type === 'Purchase' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="py-1 px-2">{entry.partyName}</td>
                    <td className="py-1 px-2">{entry.invoiceNo}</td>
                    <td className="py-1 px-2 text-right">₹{(entry.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-1 px-2 text-right">₹{(entry.cgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-1 px-2 text-right">₹{(entry.sgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-1 px-2 text-right">₹{(entry.igst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-1 px-2 text-right font-semibold">₹{(entry.totalGST || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-1 px-2 text-center">
                      <span className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700">
                        {entry.gstNumber || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold">
                <tr>
                  <td colSpan="4" className="py-1 px-2 text-right">Total:</td>
                  <td className="py-1 px-2 text-right">
                    ₹{entries.reduce((sum, e) => sum + (e.taxableAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 text-right">
                    ₹{entries.reduce((sum, e) => sum + (e.cgst || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 text-right">
                    ₹{entries.reduce((sum, e) => sum + (e.sgst || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 text-right">
                    ₹{entries.reduce((sum, e) => sum + (e.igst || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 text-right">
                    ₹{entries.reduce((sum, e) => sum + (e.totalGST || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>


      {/* Opening Balance Modal */}
      <Modal
        isOpen={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
        title="Edit Opening GST Balance"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Opening Balance Month
            </label>
            <input
              type="month"
              value={tempOpeningBalances.month || ''}
              onChange={(e) => setTempOpeningBalances({ ...tempOpeningBalances, month: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ye opening balance is month se shuru hoga aur har agle month mein carry-forward hoga.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                IGST (₹)
              </label>
              <input
                type="number"
                value={tempOpeningBalances.igst}
                onChange={(e) => setTempOpeningBalances({ ...tempOpeningBalances, igst: parseFloat(e.target.value) || 0 })}
                step="0.01"
                className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                CGST (₹)
              </label>
              <input
                type="number"
                value={tempOpeningBalances.cgst}
                onChange={(e) => setTempOpeningBalances({ ...tempOpeningBalances, cgst: parseFloat(e.target.value) || 0 })}
                step="0.01"
                className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                SGST (₹)
              </label>
              <input
                type="number"
                value={tempOpeningBalances.sgst}
                onChange={(e) => setTempOpeningBalances({ ...tempOpeningBalances, sgst: parseFloat(e.target.value) || 0 })}
                step="0.01"
                className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Total Opening Balance</span>
            <span className="text-base font-bold text-gray-900 dark:text-dark-text">
              ₹{((parseFloat(tempOpeningBalances.igst) || 0) + (parseFloat(tempOpeningBalances.cgst) || 0) + (parseFloat(tempOpeningBalances.sgst) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This represents the GST balance at the start of the period
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setIsBalanceModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveOpeningBalance}>
              Save Balance
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Gstledger;
