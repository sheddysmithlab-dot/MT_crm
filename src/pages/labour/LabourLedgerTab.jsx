import { useState, useEffect, useRef } from 'react';
import useLabourStore from '@/store/labourStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Calendar, Receipt, FileText, CheckCircle, XCircle, AlertCircle, Edit, X, Save, DollarSign, Printer } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { subscribeToEntity } from '@/utils/dataSync';
import { broadcastDataChange } from '@/utils/dataSync';
import { handlePaymentFocus, handlePaymentBlur, validateDecimalInput } from '@/utils/inputValidation';
import { openPrintPreview, PRINT_PRESETS } from '@/utils/printHelpers';

const getWeekDates = (date) => {
  const curr = new Date(date);
  const first = curr.getDate() - curr.getDay();
  const weekDates = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(curr);
    day.setDate(first + i);
    weekDates.push(day.toISOString().split('T')[0]);
  }
  
  return weekDates;
};

const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `Week ${weekNo}, ${d.getFullYear()}`;
};

const PAYMENT_MODE_LABELS = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
};

const normalizePaymentModeValue = (value) => {
  if (value === null || value === undefined) return '';

  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized === '0' || normalized === 'null' || normalized === 'undefined' || normalized === '-') {
    return '';
  }

  return normalized;
};

const getPaymentModeLabel = (value) => {
  const normalized = normalizePaymentModeValue(value);
  return normalized ? (PAYMENT_MODE_LABELS[normalized] || normalized.toUpperCase()) : '';
};

const formatSignedCurrency = (amount) => {
  const absoluteValue = Math.abs(parseFloat(amount || 0));
  return `₹${absoluteValue.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const VoucherPaymentModal = ({ employee, weekData, onSave, onCancel }) => {
  const weekTotal = weekData.reduce((sum, day) => sum + (parseFloat(day.payment_amount) || 0), 0);
  const [amount, setAmount] = useState(String(weekTotal));
  const [paymentMode, setPaymentMode] = useState('cash');
  const [notes, setNotes] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const amountRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ amount: parseFloat(amount), paymentMode, notes, voucherDate });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-gray-600 dark:text-gray-400">Week Total Payable</p>
        <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
          ₹{weekTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 dark:text-dark-text">
          Voucher Date *
        </label>
        <input
          type="date"
          value={voucherDate}
          onChange={(e) => setVoucherDate(e.target.value)}
          className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 dark:text-dark-text">
          Payment Amount (₹) *
        </label>
        <input
          ref={amountRef}
          type="text"
          value={amount}
          onChange={(e) => setAmount(validateDecimalInput(e.target.value))}
          onFocus={() => handlePaymentFocus(amountRef)}
          onBlur={() => handlePaymentBlur(amountRef)}
          placeholder=""
          className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 dark:text-dark-text">
          Payment Mode *
        </label>
        <select
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
          className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text"
          required
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 dark:text-dark-text">
          Notes/Voucher Details
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="2"
          className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text"
          placeholder="Voucher number, payment details..."
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          <DollarSign className="h-4 w-4 mr-1" />
          Process Payment
        </Button>
      </div>
    </form>
  );
};

const LabourLedgerTab = () => {
  const { labour: employees, fetchLabour } = useLabourStore();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date().toISOString().split('T')[0]);
  const [weekAttendance, setWeekAttendance] = useState([]);
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [labourVouchers, setLabourVouchers] = useState([]);
  const [ledgerPaymentModes, setLedgerPaymentModes] = useState({});
  const [dateRangeMode, setDateRangeMode] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [editingRowDate, setEditingRowDate] = useState(null);
  const [editingRowData, setEditingRowData] = useState(null);
  const [historicalOpeningBalance, setHistoricalOpeningBalance] = useState(0);
  const [hasPreviousBalanceHistory, setHasPreviousBalanceHistory] = useState(false);

  const weekDates = getWeekDates(currentWeekStart);
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const hourlyRate = parseFloat(
    selectedEmployee?.hourly_rate || (parseFloat(selectedEmployee?.daily_rate || 0) / 9) || 0
  );

  const getDefaultAttendanceValues = (status = 'present') => {
    if (status === 'present') {
      return {
        status,
        hours_worked: '9',
        overtime_hours: '0',
        payment_amount: String(parseFloat(selectedEmployee?.daily_rate || 0)),
        notes: '',
      };
    }

    if (status === 'half_day') {
      return {
        status,
        hours_worked: '4.5',
        overtime_hours: '0',
        payment_amount: String(parseFloat((selectedEmployee?.daily_rate || 0) / 2)),
        notes: '',
      };
    }

    return {
      status,
      hours_worked: '0',
      overtime_hours: '0',
      payment_amount: '0',
      notes: '',
    };
  };

  const buildEditingRowData = (attendance) => {
    if (!attendance) return getDefaultAttendanceValues('present');

    return {
      status: attendance.status || 'present',
      hours_worked: String(attendance.hours_worked ?? 0),
      overtime_hours: String(attendance.overtime_hours ?? 0),
      payment_amount: String(attendance.payment_amount ?? 0),
      notes: attendance.notes || '',
    };
  };

  const getActiveDateRange = () => {
    if (dateRangeMode === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const dates = [];
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
      return dates;
    }
    if (dateRangeMode === 'custom') {
      const dates = [];
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      if (start > end) return [];
      const current = new Date(start);
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      return dates;
    }
    return weekDates;
  };

  const activeDates = getActiveDateRange();
  const periodStartDate = activeDates[0] || '';

  useEffect(() => {
    fetchLabour();
  }, [fetchLabour]);

  const fetchWeekAttendance = async () => {
    try {
      const allAttendance = await dbOperations.getAll('labour_attendance');
      const periodAttendance = allAttendance.filter(
        (attendance) => attendance.labour_id === selectedEmployeeId && activeDates.includes(attendance.attendance_date)
      );
      setWeekAttendance(periodAttendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchLabourVouchers = async () => {
    try {
      const allVouchers = await dbOperations.getAll('vouchers');
      const filteredVouchers = allVouchers.filter(
        (voucher) =>
          voucher.payee_type === 'labour' &&
          voucher.payee_id === selectedEmployeeId &&
          activeDates.includes(voucher.voucher_date)
      );
      setLabourVouchers(filteredVouchers);
    } catch (error) {
      console.error('Error fetching labour vouchers:', error);
    }
  };

  const refreshLedgerData = async () => {
    const baseOpeningBalance = parseFloat(selectedEmployee?.opening_balance || 0);

    if (!selectedEmployeeId || activeDates.length === 0 || !periodStartDate) {
      setWeekAttendance([]);
      setLabourVouchers([]);
      setLedgerPaymentModes({});
      setHistoricalOpeningBalance(baseOpeningBalance);
      setHasPreviousBalanceHistory(false);
      setEditingRowDate(null);
      setEditingRowData(null);
      return;
    }

    try {
      const [allAttendance, allVouchers, allLedgerEntries] = await Promise.all([
        dbOperations.getAll('labour_attendance'),
        dbOperations.getAll('vouchers'),
        dbOperations.getAll('labour_ledger_entries'),
      ]);

      const employeeAttendance = allAttendance.filter(
        (attendance) => attendance.labour_id === selectedEmployeeId
      );
      const employeeVouchers = allVouchers.filter(
        (voucher) =>
          voucher.payee_type === 'labour' &&
          voucher.payee_id === selectedEmployeeId
      );

      const periodAttendance = employeeAttendance.filter((attendance) =>
        activeDates.includes(attendance.attendance_date)
      );
      const periodVouchers = employeeVouchers.filter((voucher) =>
        activeDates.includes(voucher.voucher_date)
      );

      const previousEarnings = employeeAttendance
        .filter((attendance) => String(attendance.attendance_date || '') < periodStartDate)
        .reduce((sum, attendance) => sum + (parseFloat(attendance.payment_amount) || 0), 0);

      const previousPayments = employeeVouchers
        .filter((voucher) => String(voucher.voucher_date || '') < periodStartDate)
        .reduce((sum, voucher) => sum + (parseFloat(voucher.amount) || 0), 0);

      setWeekAttendance(periodAttendance);
      setLabourVouchers(periodVouchers);
      setHistoricalOpeningBalance(baseOpeningBalance + previousEarnings - previousPayments);
      setHasPreviousBalanceHistory(previousEarnings > 0 || previousPayments > 0);

      const paymentModeMap = {};

      allLedgerEntries
        .filter((entry) => entry.labour_id === selectedEmployeeId && entry.reference_type === 'voucher' && entry.reference_id)
        .forEach((entry) => {
          const mode = normalizePaymentModeValue(entry.payment_mode);
          if (mode) {
            paymentModeMap[entry.reference_id] = mode;
          }
        });

      setLedgerPaymentModes(paymentModeMap);
    } catch (error) {
      console.error('Error loading labour ledger payment modes:', error);
      setLedgerPaymentModes({});
    }
  };

  useEffect(() => {
    refreshLedgerData();
  }, [selectedEmployeeId, currentWeekStart, dateRangeMode, customStartDate, customEndDate, selectedMonth]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedEmployeeId) {
        refreshLedgerData();
      }
    };

    const handleFocus = () => {
      if (selectedEmployeeId) {
        refreshLedgerData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedEmployeeId, currentWeekStart, dateRangeMode, customStartDate, customEndDate, selectedMonth]);

  useEffect(() => {
    const unsubscribe = subscribeToEntity('voucher', ({ action, data }) => {
      console.log('[LabourLedger] Voucher event received:', action, data);
      if (data?.payee_type === 'labour' && (data?.payee_id === selectedEmployeeId || !data?.payee_id)) {
        setTimeout(() => refreshLedgerData(), 50);
      }
    });

    return () => unsubscribe();
  }, [selectedEmployeeId]);

  useEffect(() => {
    const unsubscribe = subscribeToEntity('labour_ledger_entries', ({ action, data }) => {
      console.log('[LabourLedger] Ledger entry event received:', action, data);
      if (data?.labour_id === selectedEmployeeId) {
        setTimeout(() => refreshLedgerData(), 100);
      }
    });

    return () => unsubscribe();
  }, [selectedEmployeeId]);

  useEffect(() => {
    const unsubscribe = subscribeToEntity('labour_attendance', ({ action, data }) => {
      console.log('[LabourLedger] Attendance event received:', action, data);
      if (data?.labour_id === selectedEmployeeId) {
        setTimeout(() => refreshLedgerData(), 100);
      }
    });

    return () => unsubscribe();
  }, [selectedEmployeeId]);

  useEffect(() => {
    const unsubscribe = subscribeToEntity('labour', ({ action, data }) => {
      console.log('[LabourLedger] Labour event received:', action, data);
      if (data?.id === selectedEmployeeId && action === 'update') {
        setTimeout(() => refreshLedgerData(), 100);
      }
    });

    return () => unsubscribe();
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployeeId) return;

    const pollInterval = setInterval(() => {
      refreshLedgerData();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [selectedEmployeeId, currentWeekStart, dateRangeMode, customStartDate, customEndDate, selectedMonth]);

  const getVoucherForDate = (date) => {
    return labourVouchers.filter((voucher) => voucher.voucher_date === date);
  };

  const getAttendanceStatus = (date) => {
    return weekAttendance.find((attendance) => attendance.attendance_date === date);
  };

  const getVoucherDisplayMode = (voucher) => {
    const voucherMode = normalizePaymentModeValue(voucher?.payment_mode);
    if (voucherMode) return getPaymentModeLabel(voucherMode);

    const ledgerMode = normalizePaymentModeValue(voucher?.id ? ledgerPaymentModes[voucher.id] : '');
    return getPaymentModeLabel(ledgerMode);
  };

  const upsertDailyLedgerEntry = async (date, normalizedData) => {
    const allLedgerEntries = await dbOperations.getAll('labour_ledger_entries');
    const existingLedgerEntry = allLedgerEntries.find(
      (entry) =>
        entry.labour_id === selectedEmployeeId &&
        entry.entry_date === date &&
        entry.entry_type === 'daily_earning'
    );

    const paymentAmount = parseFloat(normalizedData.payment_amount || 0);
    const particulars = `Daily Earning - ${
      normalizedData.status === 'present' || normalizedData.status === 'half_day'
        ? `${normalizedData.hours_worked}h`
        : normalizedData.status
    }`;

    if (existingLedgerEntry && paymentAmount > 0) {
      const updatedLedgerEntry = {
        ...existingLedgerEntry,
        particulars,
        debit_amount: paymentAmount,
        notes: normalizedData.notes || '',
      };
      await dbOperations.update('labour_ledger_entries', existingLedgerEntry.id, updatedLedgerEntry);
      broadcastDataChange('labour_ledger_entries', 'update', {
        ...updatedLedgerEntry,
        id: existingLedgerEntry.id,
        labour_id: selectedEmployeeId,
      });
      return;
    }

    if (existingLedgerEntry && paymentAmount === 0) {
      await dbOperations.delete('labour_ledger_entries', existingLedgerEntry.id);
      broadcastDataChange('labour_ledger_entries', 'delete', {
        id: existingLedgerEntry.id,
        labour_id: selectedEmployeeId,
      });
      return;
    }

    if (!existingLedgerEntry && paymentAmount > 0) {
      const newLedgerEntry = await dbOperations.insert('labour_ledger_entries', {
        labour_id: selectedEmployeeId,
        entry_date: date,
        particulars,
        debit_amount: paymentAmount,
        credit_amount: 0,
        payment_mode: '',
        notes: normalizedData.notes || '',
        entry_type: 'daily_earning',
      });
      broadcastDataChange('labour_ledger_entries', 'add', {
        ...newLedgerEntry,
        labour_id: selectedEmployeeId,
      });
    }
  };

  const saveAttendanceForDate = async (date, rawData, successMessage) => {
    try {
      const existingAttendance = getAttendanceStatus(date);
      const normalizedData = {
        labour_id: selectedEmployeeId,
        attendance_date: date,
        status: rawData.status,
        hours_worked: parseFloat(rawData.hours_worked) || 0,
        overtime_hours: parseFloat(rawData.overtime_hours) || 0,
        payment_amount: parseFloat(rawData.payment_amount) || 0,
        notes: rawData.notes || '',
      };

      if (existingAttendance) {
        await dbOperations.update('labour_attendance', existingAttendance.id, normalizedData);
      } else {
        await dbOperations.insert('labour_attendance', normalizedData);
      }

      await upsertDailyLedgerEntry(date, normalizedData);

      broadcastDataChange('labour_attendance', existingAttendance ? 'updated' : 'created', {
        labour_id: selectedEmployeeId,
        attendance_date: date,
        payment_amount: normalizedData.payment_amount,
      });

      toast.success(successMessage);
      setEditingRowDate(null);
      setEditingRowData(null);
      await refreshLedgerData();
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  const handleQuickMarkAttendance = async (date, status) => {
    const quickData = {
      ...getDefaultAttendanceValues(status),
      notes: `Quick marked as ${status}`,
    };
    await saveAttendanceForDate(date, quickData, `Attendance marked as ${status}!`);
  };

  const handleStartInlineEdit = (date) => {
    const attendance = getAttendanceStatus(date);
    setEditingRowDate(date);
    setEditingRowData(buildEditingRowData(attendance));
  };

  const handleCancelInlineEdit = () => {
    setEditingRowDate(null);
    setEditingRowData(null);
  };

  const handleInlineStatusChange = (status) => {
    setEditingRowData((prev) => ({
      ...prev,
      ...getDefaultAttendanceValues(status),
      notes: prev?.notes || '',
    }));
  };

  const handleInlineHoursChange = (field, value) => {
    const parsedValue = value;
    setEditingRowData((prev) => {
      const next = { ...prev, [field]: parsedValue };
      const regularHours = parseFloat(field === 'hours_worked' ? parsedValue : next.hours_worked) || 0;
      const overtimeHours = parseFloat(field === 'overtime_hours' ? parsedValue : next.overtime_hours) || 0;
      next.payment_amount = String(parseFloat(((regularHours + overtimeHours) * hourlyRate).toFixed(2)));
      return next;
    });
  };

  const handleInlinePaymentChange = (value) => {
    setEditingRowData((prev) => ({
      ...prev,
      payment_amount: validateDecimalInput(value),
    }));
  };

  const handleSaveInlineEdit = async (date) => {
    await saveAttendanceForDate(date, editingRowData, 'Attendance updated successfully!');
  };

  const handleVoucherPayment = async (paymentData) => {
    try {
      const voucherDate = paymentData.voucherDate || new Date().toISOString().split('T')[0];
      const ledgerEntryId = `lle_${Date.now()}`;
      const voucherId = `lv_${Date.now()}`;
      
      // Generate voucher number
      const allVouchers = await dbOperations.getAll('vouchers');
      const date = new Date(voucherDate);
      const year = date.getFullYear().toString().substr(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const existing = allVouchers.filter(v => v.voucher_no?.startsWith(`V${year}${month}`));
      const sequence = existing.length + 1;
      const voucherNo = `V${year}${month}${sequence.toString().padStart(4, '0')}`;
      
      // 1. Create voucher record in vouchers table
      await dbOperations.insert('vouchers', {
        id: voucherId,
        voucher_date: voucherDate,
        voucher_no: voucherNo,
        payee_type: 'labour',
        payee_id: selectedEmployeeId,
        payee_name: selectedEmployee?.name || '',
        amount: parseFloat(paymentData.amount),
        payment_mode: paymentData.paymentMode,
        cheque_no: '',
        bank_name: '',
        particulars: `Employee Payment - ${selectedEmployee?.name} - ${paymentData.notes || 'Week Payment'}`,
        notes: paymentData.notes || `Week ${getWeekNumber(currentWeekStart)}`,
        created_at: new Date().toISOString(),
      });
      
      // 2. Save payment to labour ledger as credit (payment made)
      await dbOperations.insert('labour_ledger_entries', {
        id: ledgerEntryId,
        labour_id: selectedEmployeeId,
        entry_date: voucherDate,
        particulars: `Payment Voucher - ${voucherNo}`,
        debit_amount: 0,
        credit_amount: parseFloat(paymentData.amount),
        payment_mode: paymentData.paymentMode,
        notes: paymentData.notes || `Week ${getWeekNumber(currentWeekStart)}`,
        entry_type: 'payment',
        reference_type: 'voucher',
        reference_id: voucherId,
        reference_no: voucherNo,
      });

      toast.success(`Payment voucher ${voucherNo} created successfully!`);
      
      // Broadcast data change
      broadcastDataChange('voucher', 'created', {
        voucher_id: voucherId,
        payee_type: 'labour',
        payee_id: selectedEmployeeId,
        amount: parseFloat(paymentData.amount)
      });
      
      setIsVoucherModalOpen(false);
      await refreshLedgerData();
    } catch (error) {
      console.error('Error creating voucher:', error);
      toast.error('Failed to create payment voucher');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'absent': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'half_day': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'sick': return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'leave': return <AlertCircle className="h-5 w-5 text-blue-600" />;
      case 'holiday': return <Calendar className="h-5 w-5 text-purple-600" />;
      default: return null;
    }
  };

  const handlePrint = () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee first');
      return;
    }
    setIsCardPreviewOpen(true);
    setTimeout(() => {
      const success = openPrintPreview({
        elementId: 'attendance-card-preview',
        title: `Attendance Card - ${selectedEmployee.name}`,
        ...PRINT_PRESETS.ledger
      });
      if (!success) {
        toast.error('Failed to open print preview');
      }
    }, 300);
  };

  const openingBalance = historicalOpeningBalance;
  // Keep only one record per date (the same one the table renders via .find),
  // so duplicate attendance rows in the DB don't inflate the summary counts.
  const uniqueAttendance = Array.from(
    weekAttendance
      .reduce((map, attendance) => {
        if (!map.has(attendance.attendance_date)) map.set(attendance.attendance_date, attendance);
        return map;
      }, new Map())
      .values()
  );
  const weekTotal = uniqueAttendance.reduce((sum, day) => sum + (parseFloat(day.payment_amount) || 0), 0);
  const presentDays = uniqueAttendance.filter((attendance) => attendance.status === 'present').length;
  const totalHours = uniqueAttendance.reduce((sum, attendance) => sum + (parseFloat(attendance.hours_worked) || 0), 0);
  const totalOvertime = uniqueAttendance.reduce((sum, attendance) => sum + (parseFloat(attendance.overtime_hours) || 0), 0);
  const currentPeriodPayments = labourVouchers.reduce((sum, voucher) => sum + (parseFloat(voucher.amount) || 0), 0);
  const periodLabel = dateRangeMode === 'month' ? 'Month' : dateRangeMode === 'custom' ? 'Period' : 'Week';
  const netBalance = openingBalance + weekTotal - currentPeriodPayments;
  const openingBalanceTitle = hasPreviousBalanceHistory ? 'Net Previous Balance' : 'Opening Balance';
  const openingBalanceLabel = openingBalance > 0 ? 'Payable' : openingBalance < 0 ? 'Advance' : '';
  const netBalanceLabel = netBalance > 0 ? 'Payable' : netBalance < 0 ? 'Advance' : '';

  const summaryCards = (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
        <p className="text-xs text-green-600 dark:text-green-400">Present Days</p>
        <p className="text-2xl font-bold text-green-900 dark:text-green-300">{presentDays}</p>
      </div>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <p className="text-xs text-yellow-600 dark:text-yellow-400">{openingBalanceTitle}</p>
        <p className={`text-xl font-bold ${
          openingBalance > 0
            ? 'text-red-600 dark:text-red-400'
            : openingBalance < 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-yellow-900 dark:text-yellow-300'
        }`}>
          {formatSignedCurrency(openingBalance)}
          <span className="text-xs ml-1">{openingBalanceLabel ? `(${openingBalanceLabel})` : ''}</span>
        </p>
      </div>
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-600 dark:text-blue-400">{periodLabel} Earning</p>
        <p className="text-xl font-bold text-blue-900 dark:text-blue-300">
          ₹{weekTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-xs text-red-600 dark:text-red-400">{periodLabel} Paid</p>
        <p className="text-xl font-bold text-red-900 dark:text-red-300">
          ₹{currentPeriodPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <p className="text-xs text-indigo-600 dark:text-indigo-400">Net Balance</p>
        <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
          {formatSignedCurrency(netBalance)}
          <span className="text-xs ml-1">{netBalanceLabel ? `(${netBalanceLabel})` : ''}</span>
        </p>
      </div>
    </div>
  );

  const renderAttendanceRows = (isPreview = false) =>
    activeDates.map((date) => {
      const attendance = getAttendanceStatus(date);
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      const isEditing = editingRowDate === date;

      return (
        <tr key={date} className={isPreview ? 'border dark:border-gray-700' : 'border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}>
          <td className={`px-2 py-1 ${isPreview ? 'border dark:border-gray-600' : ''} dark:text-dark-text`}>
            {new Date(date).toLocaleDateString('en-GB')}
          </td>
          <td className={`px-2 py-1 ${isPreview ? 'border dark:border-gray-600' : ''} dark:text-dark-text`}>
            {dayName}
          </td>
          <td className={`px-2 py-1 text-center ${isPreview ? 'border dark:border-gray-600' : ''}`}>
            {isEditing && !isPreview ? (
              <select
                value={editingRowData?.status || 'present'}
                onChange={(e) => handleInlineStatusChange(e.target.value)}
                className="w-full p-1 text-xs border rounded bg-transparent dark:border-gray-600 dark:text-dark-text"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half Day</option>
                <option value="sick">Sick Leave</option>
                <option value="leave">Leave</option>
                <option value="holiday">Holiday</option>
              </select>
            ) : attendance ? (
              <div className="flex items-center justify-center gap-2">
                {getStatusIcon(attendance.status)}
                <span className="text-xs capitalize dark:text-dark-text">
                  {attendance.status.replace('_', ' ')}
                </span>
              </div>
            ) : (
              <span className="text-gray-400 text-xs">{isPreview ? '-' : 'Not Marked'}</span>
            )}
          </td>
          <td className={`px-2 py-1 text-right ${isPreview ? 'border dark:border-gray-600' : ''} dark:text-dark-text`}>
            {isEditing && !isPreview ? (
              <input
                type="number"
                value={editingRowData?.hours_worked || '0'}
                onChange={(e) => handleInlineHoursChange('hours_worked', e.target.value)}
                step="0.5"
                min="0"
                className="w-20 ml-auto p-1 text-sm border rounded bg-transparent dark:border-gray-600 dark:text-dark-text text-right"
              />
            ) : (
              attendance?.hours_worked || '-'
            )}
          </td>
          <td className={`px-2 py-1 text-right ${isPreview ? 'border dark:border-gray-600' : ''} dark:text-dark-text`}>
            {isEditing && !isPreview ? (
              <input
                type="number"
                value={editingRowData?.overtime_hours || '0'}
                onChange={(e) => handleInlineHoursChange('overtime_hours', e.target.value)}
                step="0.5"
                min="0"
                className="w-20 ml-auto p-1 text-sm border rounded bg-transparent dark:border-gray-600 dark:text-dark-text text-right"
              />
            ) : (
              attendance?.overtime_hours || '-'
            )}
          </td>
          <td className={`px-2 py-1 text-right font-semibold ${isPreview ? 'border dark:border-gray-600' : ''} dark:text-dark-text`}>
            {isEditing && !isPreview ? (
              <input
                type="text"
                value={editingRowData?.payment_amount || '0'}
                onChange={(e) => handleInlinePaymentChange(e.target.value)}
                className="w-24 ml-auto p-1 text-sm border rounded bg-transparent dark:border-gray-600 dark:text-dark-text text-right"
              />
            ) : attendance?.payment_amount ? (
              `₹${parseFloat(attendance.payment_amount).toLocaleString('en-IN')}`
            ) : (
              '-'
            )}
          </td>
          <td className={`px-2 py-1 text-right ${isPreview ? 'border dark:border-gray-600' : ''} dark:text-dark-text`}>
            {(() => {
              const dayVouchers = getVoucherForDate(date);
              if (dayVouchers.length === 0) return <span className="text-gray-400">-</span>;
              const total = dayVouchers.reduce((sum, voucher) => sum + parseFloat(voucher.amount || 0), 0);
              return (
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  ₹{total.toLocaleString('en-IN')}
                </span>
              );
            })()}
          </td>
          <td className={`px-2 py-1 text-left ${isPreview ? 'border dark:border-gray-600' : ''} dark:text-dark-text`}>
            {(() => {
              const dayVouchers = getVoucherForDate(date);
              if (dayVouchers.length === 0) return <span className="text-gray-400">-</span>;
              return dayVouchers.map((voucher, index) => (
                <span
                  key={index}
                  className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium mr-1 ${
                    normalizePaymentModeValue(voucher.payment_mode || ledgerPaymentModes[voucher.id]) === 'cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                    normalizePaymentModeValue(voucher.payment_mode || ledgerPaymentModes[voucher.id]) === 'upi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                    normalizePaymentModeValue(voucher.payment_mode || ledgerPaymentModes[voucher.id]) === 'bank_transfer' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' :
                    normalizePaymentModeValue(voucher.payment_mode || ledgerPaymentModes[voucher.id]) === 'cheque' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {getVoucherDisplayMode(voucher) || '-'}
                </span>
              ));
            })()}
          </td>
          {!isPreview && (
            <td className="px-2 py-1 text-center">
              {isEditing ? (
                <div className="flex gap-1 justify-center items-center flex-wrap">
                  <Button
                    variant="ghost"
                    className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                    title="Save"
                    onClick={() => handleSaveInlineEdit(date)}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/40"
                    title="Cancel"
                    onClick={handleCancelInlineEdit}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-1 justify-center items-center flex-wrap">
                  <Button
                    variant="ghost"
                    className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                    title="Mark Present"
                    onClick={() => handleQuickMarkAttendance(date, 'present')}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                    title="Mark Absent"
                    onClick={() => handleQuickMarkAttendance(date, 'absent')}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    title="Edit Inline"
                    onClick={() => handleStartInlineEdit(date)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </td>
          )}
        </tr>
      );
    });

  return (
    <div className="space-y-6">
      <Modal
        isOpen={isCardPreviewOpen}
        onClose={() => setIsCardPreviewOpen(false)}
        title=""
        size="xxl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-bold dark:text-dark-text">
              {dateRangeMode === 'month' ? 'Monthly' : dateRangeMode === 'week' ? 'Weekly' : 'Custom'} Attendance Card - {selectedEmployee?.name}
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    const html2canvas = (await import('html2canvas')).default;
                    const element = document.getElementById('attendance-card-preview');
                    if (!element) {
                      toast.error('Card content not found');
                      return;
                    }
                    const canvas = await html2canvas(element, {
                      scale: 2,
                      backgroundColor: '#ffffff',
                      logging: false,
                      useCORS: true,
                    });

                    // Convert to blob and download
                    canvas.toBlob((blob) => {
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      const rangePart = dateRangeMode === 'week' ? getWeekNumber(currentWeekStart).replace(/\s+/g, '_') : dateRangeMode === 'month' ? selectedMonth : `${activeDates[0]}_to_${activeDates[activeDates.length - 1]}`;
                      const fileName = `Attendance_Card_${selectedEmployee?.name?.replace(/\s+/g, '_')}_${rangePart}.png`;
                      link.href = url;
                      link.download = fileName;
                      link.click();
                      URL.revokeObjectURL(url);
                      toast.success('Card saved successfully!');
                    });
                  } catch (error) {
                    console.error('Error saving card:', error);
                    toast.error('Failed to save card');
                  }
                }}
                variant="primary"
                className="p-2"
              >
                <Save className="h-4 w-4" />
              </Button>
              <button
                onClick={() => {
                  setIsCardPreviewOpen(false);
                  setIsEditMode(false);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="h-5 w-5 dark:text-dark-text" />
              </button>
            </div>
          </div>

          <div id="attendance-card-preview" className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Name</p>
                  <p className="font-semibold dark:text-dark-text">{selectedEmployee?.name}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="font-semibold dark:text-dark-text">{selectedEmployee?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Aadhaar</p>
                  <p className="font-semibold dark:text-dark-text">{selectedEmployee?.aadhaar_number || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Daily Rate</p>
                  <p className="font-semibold dark:text-dark-text">
                    ₹{parseFloat(selectedEmployee?.daily_rate || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold dark:text-dark-text">
                {dateRangeMode === 'week'
                  ? getWeekNumber(currentWeekStart)
                  : dateRangeMode === 'month'
                  ? new Date(selectedMonth + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                  : `Attendance Card (${activeDates.length} days)`
                }
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {activeDates.length > 0 && (
                  <>
                    {new Date(activeDates[0]).toLocaleDateString('en-GB')} - {new Date(activeDates[activeDates.length - 1]).toLocaleDateString('en-GB')}
                  </>
                )}
              </p>
            </div>

            {summaryCards}

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold border dark:border-gray-600 dark:text-gray-300">Date</th>
                    <th className="px-2 py-1 text-left font-semibold border dark:border-gray-600 dark:text-gray-300">Day</th>
                    <th className="px-2 py-1 text-center font-semibold border dark:border-gray-600 dark:text-gray-300">Status</th>
                    <th className="px-2 py-1 text-right font-semibold border dark:border-gray-600 dark:text-gray-300">Hours</th>
                    <th className="px-2 py-1 text-right font-semibold border dark:border-gray-600 dark:text-gray-300">OT Hours</th>
                    <th className="px-2 py-1 text-right font-semibold border dark:border-gray-600 dark:text-gray-300">Payment</th>
                    <th className="px-2 py-1 text-right font-semibold border dark:border-gray-600 dark:text-gray-300">Voucher</th>
                    <th className="px-2 py-1 text-left font-semibold border dark:border-gray-600 dark:text-gray-300">Mode</th>
                  </tr>
                </thead>
                <tbody>{renderAttendanceRows(true)}</tbody>
                <tfoot className="bg-gray-100 dark:bg-gray-800 font-bold">
                  <tr>
                    <td colSpan="3" className="px-2 py-1 border dark:border-gray-600 dark:text-dark-text">Total</td>
                    <td className="px-2 py-1 border dark:border-gray-600 text-right dark:text-dark-text">
                      {totalHours}
                    </td>
                    <td className="px-2 py-1 border dark:border-gray-600 text-right dark:text-dark-text">
                      {totalOvertime}
                    </td>
                    <td className="px-2 py-1 border dark:border-gray-600 text-right text-green-600 dark:text-green-400">
                      ₹{weekTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1 border dark:border-gray-600 text-right font-bold text-purple-600 dark:text-purple-400">
                      ₹{labourVouchers.reduce((s, v) => s + (parseFloat(v.amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border dark:border-gray-600"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
              <p>Generated on {new Date().toLocaleDateString('en-GB')} at {new Date().toLocaleTimeString('en-GB')}</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Employee Selection */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Date Range Mode
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="week" checked={dateRangeMode === 'week'} onChange={(e) => setDateRangeMode(e.target.value)} className="w-4 h-4" />
                  <span className="text-sm dark:text-dark-text">Weekly View</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="month" checked={dateRangeMode === 'month'} onChange={(e) => setDateRangeMode(e.target.value)} className="w-4 h-4" />
                  <span className="text-sm dark:text-dark-text">Monthly View</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="custom" checked={dateRangeMode === 'custom'} onChange={(e) => setDateRangeMode(e.target.value)} className="w-4 h-4" />
                  <span className="text-sm dark:text-dark-text">Custom Date Range</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 dark:text-dark-text">
                Select Employee *
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.skill_type ? `(${emp.skill_type})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {dateRangeMode === 'week' ? (
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-dark-text">Week Starting</label>
                <input type="date" value={currentWeekStart} onChange={(e) => setCurrentWeekStart(e.target.value)} className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text" />
              </div>
            ) : dateRangeMode === 'month' ? (
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-dark-text">Select Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-dark-text">Start Date</label>
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 dark:text-dark-text">End Date</label>
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full p-2 border rounded-lg bg-transparent dark:border-gray-600 dark:text-dark-text" />
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedEmployee && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-semibold dark:text-dark-text">{selectedEmployee.name}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Phone</p>
                <p className="font-semibold dark:text-dark-text">{selectedEmployee.phone || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Aadhaar</p>
                <p className="font-semibold dark:text-dark-text">{selectedEmployee.aadhaar_number || '-'}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Daily Rate</p>
                <p className="font-semibold dark:text-dark-text">
                  ₹{parseFloat(selectedEmployee.daily_rate || 0).toLocaleString('en-IN')}
                  {selectedEmployee.hourly_rate && ` / ₹${selectedEmployee.hourly_rate}/hr`}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {selectedEmployeeId && (
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-dark-text">
                {dateRangeMode === 'week'
                  ? `${getWeekNumber(currentWeekStart)} - Weekly Attendance Card`
                  : dateRangeMode === 'month'
                  ? `Monthly Attendance Card - ${new Date(selectedMonth + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
                  : `Attendance Card (${new Date(customStartDate).toLocaleDateString('en-GB')} - ${new Date(customEndDate).toLocaleDateString('en-GB')})`
                }
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    if (!selectedEmployee) { toast.error('Please select an employee first'); return; }
                    setIsCardPreviewOpen(true);
                    setTimeout(async () => {
                      try {
                        const html2canvas = (await import('html2canvas')).default;
                        const element = document.getElementById('attendance-card-preview');
                        if (!element) { toast.error('Card content not found'); return; }
                        const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
                        canvas.toBlob((blob) => {
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          const rangeName = dateRangeMode === 'week'
                            ? getWeekNumber(currentWeekStart).replace(/\s+/g, '_')
                            : dateRangeMode === 'month'
                            ? selectedMonth
                            : `${activeDates[0]}_to_${activeDates[activeDates.length - 1]}`;
                          link.href = url;
                          link.download = `Attendance_Card_${selectedEmployee?.name?.replace(/\s+/g, '_')}_${rangeName}.png`;
                          link.click();
                          URL.revokeObjectURL(url);
                          toast.success('Card saved as PNG!');
                        });
                      } catch (err) {
                        console.error('Save error:', err);
                        toast.error('Failed to save card');
                      }
                    }, 300);
                  }}
                  variant="secondary"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Card Generate
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="secondary"
                  disabled={!selectedEmployee}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Card
                </Button>
                <Button
                  onClick={() => setIsVoucherModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Voucher
                </Button>
              </div>
            </div>

            {summaryCards}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold dark:text-gray-300">Date</th>
                    <th className="px-2 py-1 text-left font-semibold dark:text-gray-300">Day</th>
                    <th className="px-2 py-1 text-center font-semibold dark:text-gray-300">Status</th>
                    <th className="px-2 py-1 text-right font-semibold dark:text-gray-300">Hours</th>
                    <th className="px-2 py-1 text-right font-semibold dark:text-gray-300">OT Hours</th>
                    <th className="px-2 py-1 text-right font-semibold dark:text-gray-300">Payment</th>
                    <th className="px-2 py-1 text-right font-semibold dark:text-gray-300">Voucher</th>
                    <th className="px-2 py-1 text-left font-semibold dark:text-gray-300">Mode</th>
                    <th className="px-2 py-1 text-center font-semibold dark:text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody>{renderAttendanceRows(false)}</tbody>
                <tfoot className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <td colSpan="3" className="px-2 py-1 font-semibold dark:text-dark-text">Total</td>
                    <td className="px-2 py-1 text-right font-semibold dark:text-dark-text">
                      {totalHours}
                    </td>
                    <td className="px-2 py-1 text-right font-semibold dark:text-dark-text">
                      {totalOvertime}
                    </td>
                    <td className="px-2 py-1 text-right font-bold text-green-600 dark:text-green-400">
                      ₹{weekTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1 text-right font-bold text-purple-600 dark:text-purple-400">
                      ₹{labourVouchers.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0).toLocaleString('en-IN')}
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Card>
      )}

      {!selectedEmployeeId && (
        <Card>
          <div className="text-center py-4">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Select an employee to view their attendance ledger
            </p>
          </div>
        </Card>
      )}

      <Modal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title="Add Payment Voucher"
      >
        <VoucherPaymentModal
          employee={selectedEmployee}
          weekData={weekAttendance}
          onSave={handleVoucherPayment}
          onCancel={() => setIsVoucherModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default LabourLedgerTab;
