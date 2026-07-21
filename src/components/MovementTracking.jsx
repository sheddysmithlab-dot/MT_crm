import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  FileText,
  Truck,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Package,
  Receipt,
  ClipboardList,
} from 'lucide-react';
import { dbOperations } from '@/lib/db';

const MovementTracking = ({ dateRange }) => {
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState([]);
  const [filteredMovements, setFilteredMovements] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    movementType: 'all',
    employee: 'all',
    status: 'all',
  });
  const [employees, setEmployees] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);

  useEffect(() => {
    fetchMovements();
  }, [dateRange]);

  useEffect(() => {
    applyFilters();
  }, [movements, searchTerm, filters]);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = dateRange;

      const [
        invoices,
        challans,
        jobs,
        jobsheets,
        inspections,
        estimates,
        payments,
        vouchers,
        profiles,
        customers,
      ] = await Promise.all([
        dbOperations.getAll('invoices').catch(() => []),
        dbOperations.getAll('sell_challans').catch(() => []),
        dbOperations.getAll('jobs').catch(() => []),
        dbOperations.getAll('jobsheets').catch(() => []),
        dbOperations.getAll('inspections').catch(() => []),
        dbOperations.getAll('estimates').catch(() => []),
        dbOperations.getAll('payments').catch(() => []),
        dbOperations.getAll('vouchers').catch(() => []),
        dbOperations.getAll('profiles').catch(() => []),
        dbOperations.getAll('customers').catch(() => []),
      ]);

      // Build employee list
      const employeeList = profiles.map((p) => ({
        id: p.id,
        name: p.name || p.email,
      }));
      setEmployees(employeeList);

      const inRange = (d) => {
        if (!d) return false;
        const ds = String(d).slice(0, 10);
        return ds >= startDate && ds <= endDate;
      };

      const getEmployeeId = (record) => {
        return (
          record.profile_id ||
          record.created_by ||
          record.user_id ||
          record.assigned_to ||
          'system'
        );
      };

      const getEmployeeName = (empId) => {
        const profile = profiles.find((p) => p.id === empId);
        return profile ? profile.name || profile.email : 'System';
      };

      const movementList = [];

      // Build comprehensive movement timeline for each vehicle/customer
      const vehicleMap = new Map();

      // Process Inspections (Entry Point)
      (inspections || [])
        .filter((ins) => inRange(ins.date || ins.created_at))
        .forEach((ins) => {
          const vehicleNo = ins.vehicle_no || 'N/A';
          const empId = getEmployeeId(ins);

          if (!vehicleMap.has(vehicleNo)) {
            vehicleMap.set(vehicleNo, {
              vehicleNo,
              customerName: ins.party_name || 'N/A',
              timeline: [],
            });
          }

          vehicleMap.get(vehicleNo).timeline.push({
            stage: 'Inspection',
            date: ins.date || ins.created_at,
            reference: ins.inspection_no || ins.id,
            employeeId: empId,
            employeeName: getEmployeeName(empId),
            status: ins.status || 'Completed',
            amount: 0,
            data: ins,
          });
        });

      // Process Estimates
      (estimates || [])
        .filter((est) => inRange(est.date || est.created_at))
        .forEach((est) => {
          const vehicleNo = est.vehicle_no || 'N/A';
          const empId = getEmployeeId(est);

          if (!vehicleMap.has(vehicleNo)) {
            vehicleMap.set(vehicleNo, {
              vehicleNo,
              customerName: est.party_name || 'N/A',
              timeline: [],
            });
          }

          vehicleMap.get(vehicleNo).timeline.push({
            stage: 'Estimate',
            date: est.date || est.created_at,
            reference: est.estimate_no || est.id,
            employeeId: empId,
            employeeName: getEmployeeName(empId),
            status: est.status || 'Completed',
            amount: parseFloat(est.grand_total || est.total_amount || 0),
            data: est,
          });
        });

      // Process Jobsheets
      (jobsheets || [])
        .filter((js) => inRange(js.date || js.created_at))
        .forEach((js) => {
          const vehicleNo = js.vehicle_no || 'N/A';
          const empId = getEmployeeId(js);

          if (!vehicleMap.has(vehicleNo)) {
            vehicleMap.set(vehicleNo, {
              vehicleNo,
              customerName: js.party_name || 'N/A',
              timeline: [],
            });
          }

          vehicleMap.get(vehicleNo).timeline.push({
            stage: 'JobSheet',
            date: js.date || js.created_at,
            reference: js.job_no || js.id,
            employeeId: empId,
            employeeName: getEmployeeName(empId),
            status: js.status || 'Completed',
            amount: parseFloat(js.grand_total || js.total_amount || 0),
            data: js,
          });
        });

      // Process Challans
      (challans || [])
        .filter((ch) => inRange(ch.challan_date || ch.date || ch.created_at))
        .forEach((ch) => {
          const vehicleNo = ch.vehicle_no || 'N/A';
          const empId = getEmployeeId(ch);

          if (!vehicleMap.has(vehicleNo)) {
            vehicleMap.set(vehicleNo, {
              vehicleNo,
              customerName: ch.party_name || ch.customer_name || 'N/A',
              timeline: [],
            });
          }

          vehicleMap.get(vehicleNo).timeline.push({
            stage: 'Challan',
            date: ch.challan_date || ch.date || ch.created_at,
            reference: ch.challan_no || ch.id,
            employeeId: empId,
            employeeName: getEmployeeName(empId),
            status: ch.status || 'Issued',
            amount: parseFloat(ch.total_amount || ch.grand_total || 0),
            data: ch,
          });
        });

      // Process Invoices
      (invoices || [])
        .filter((inv) => inRange(inv.invoice_date || inv.date || inv.created_at))
        .forEach((inv) => {
          const vehicleNo = inv.vehicle_no || 'N/A';
          const empId = getEmployeeId(inv);

          if (!vehicleMap.has(vehicleNo)) {
            vehicleMap.set(vehicleNo, {
              vehicleNo,
              customerName: inv.party_name || inv.customer_name || 'N/A',
              timeline: [],
            });
          }

          vehicleMap.get(vehicleNo).timeline.push({
            stage: 'Invoice',
            date: inv.invoice_date || inv.date || inv.created_at,
            reference: inv.invoice_no || inv.id,
            employeeId: empId,
            employeeName: getEmployeeName(empId),
            status: inv.status || 'Pending',
            amount: parseFloat(inv.total_amount || inv.grand_total || 0),
            paymentReceived: parseFloat(inv.payment_received || 0),
            balanceDue: parseFloat(inv.balance_due || 0),
            data: inv,
          });
        });

      // Process Payments
      (payments || [])
        .filter((pay) => inRange(pay.payment_date || pay.date || pay.created_at))
        .forEach((pay) => {
          const vehicleNo = pay.vehicle_no || 'N/A';
          const empId = getEmployeeId(pay);

          if (vehicleMap.has(vehicleNo)) {
            vehicleMap.get(vehicleNo).timeline.push({
              stage: 'Payment',
              date: pay.payment_date || pay.date || pay.created_at,
              reference: pay.payment_no || pay.receipt_no || pay.id,
              employeeId: empId,
              employeeName: getEmployeeName(empId),
              status: 'Received',
              amount: parseFloat(pay.amount || 0),
              data: pay,
            });
          }
        });

      // Convert map to array and create movement records
      vehicleMap.forEach((vehicle) => {
        // Sort timeline by date
        vehicle.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Determine overall status
        const hasInvoice = vehicle.timeline.some((t) => t.stage === 'Invoice');
        const hasPayment = vehicle.timeline.some((t) => t.stage === 'Payment');
        const lastInvoice = vehicle.timeline
          .filter((t) => t.stage === 'Invoice')
          .slice(-1)[0];

        let overallStatus = 'In Progress';
        if (hasPayment) {
          overallStatus = 'Complete';
        } else if (hasInvoice) {
          if (lastInvoice && lastInvoice.balanceDue === 0) {
            overallStatus = 'Complete';
          } else {
            overallStatus = 'Payment Pending';
          }
        }

        // Calculate total amount (from last invoice or estimate)
        const lastInv = vehicle.timeline
          .filter((t) => t.stage === 'Invoice' || t.stage === 'Estimate')
          .slice(-1)[0];
        const totalAmount = lastInv ? lastInv.amount : 0;

        // Get primary employee (most involved)
        const employeeCounts = {};
        vehicle.timeline.forEach((t) => {
          employeeCounts[t.employeeId] = (employeeCounts[t.employeeId] || 0) + 1;
        });
        const primaryEmpId = Object.keys(employeeCounts).reduce((a, b) =>
          employeeCounts[a] > employeeCounts[b] ? a : b
        );

        movementList.push({
          id: vehicle.vehicleNo + '-' + Date.now(),
          vehicleNo: vehicle.vehicleNo,
          customerName: vehicle.customerName,
          timeline: vehicle.timeline,
          latestStage: vehicle.timeline[vehicle.timeline.length - 1].stage,
          latestDate: vehicle.timeline[vehicle.timeline.length - 1].date,
          totalAmount,
          status: overallStatus,
          employeeId: primaryEmpId,
          employeeName: getEmployeeName(primaryEmpId),
          stageCount: vehicle.timeline.length,
        });
      });

      // Sort by latest date descending
      movementList.sort((a, b) => new Date(b.latestDate) - new Date(a.latestDate));

      setMovements(movementList);
      setFilteredMovements(movementList);
    } catch (error) {
      console.error('Error fetching movements:', error);
      toast.error('Failed to load movement data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...movements];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.vehicleNo.toLowerCase().includes(term) ||
          m.customerName.toLowerCase().includes(term) ||
          m.timeline.some((t) => t.reference.toLowerCase().includes(term))
      );
    }

    // Apply movement type filter
    if (filters.movementType !== 'all') {
      filtered = filtered.filter((m) => m.latestStage === filters.movementType);
    }

    // Apply employee filter
    if (filters.employee !== 'all') {
      filtered = filtered.filter((m) => m.employeeId === filters.employee);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((m) => m.status === filters.status);
    }

    setFilteredMovements(filtered);
  };

  const exportToCSV = () => {
    const headers = [
      'Vehicle No',
      'Customer',
      'Latest Stage',
      'Date',
      'Status',
      'Amount',
      'Employee',
      'Timeline Stages',
    ];

    const rows = filteredMovements.map((m) => [
      m.vehicleNo,
      m.customerName,
      m.latestStage,
      new Date(m.latestDate).toLocaleDateString('en-IN'),
      m.status,
      `₹${m.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      m.employeeName,
      m.timeline.map((t) => t.stage).join(' → '),
    ]);

    const csvContent = [
      `Movement Tracking Report`,
      `Period: ${new Date(dateRange.startDate).toLocaleDateString('en-IN')} to ${new Date(
        dateRange.endDate
      ).toLocaleDateString('en-IN')}`,
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      '',
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      '',
      '--- Detailed Timeline ---',
      '',
    ].join('\n');

    // Add detailed timeline for each movement
    let detailedContent = csvContent;
    filteredMovements.forEach((m) => {
      detailedContent += `\nVehicle: ${m.vehicleNo} | Customer: ${m.customerName}\n`;
      detailedContent += 'Stage,Date,Reference,Employee,Status,Amount\n';
      m.timeline.forEach((t) => {
        detailedContent += `${t.stage},${new Date(t.date).toLocaleDateString('en-IN')},${
          t.reference
        },${t.employeeName},${t.status},₹${t.amount.toLocaleString('en-IN')}\n`;
      });
      detailedContent += '\n';
    });

    const blob = new Blob([detailedContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movement_tracking_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Movement data exported to CSV');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Complete: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      'Payment Pending': {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: AlertCircle,
      },
      'In Progress': { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      Cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig['In Progress'];
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  const getStageBadge = (stage) => {
    const stageConfig = {
      Inspection: { icon: ClipboardList, color: 'text-blue-500' },
      Estimate: { icon: FileText, color: 'text-indigo-500' },
      JobSheet: { icon: Package, color: 'text-purple-500' },
      Challan: { icon: Truck, color: 'text-orange-500' },
      Invoice: { icon: Receipt, color: 'text-green-500' },
      Payment: { icon: DollarSign, color: 'text-emerald-500' },
    };

    const config = stageConfig[stage] || { icon: FileText, color: 'text-gray-500' };
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 ${config.color}`}
      >
        <Icon className="h-3 w-3" />
        {stage}
      </span>
    );
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
          <span className="ml-3 text-gray-600 dark:text-dark-text-secondary">
            Loading movement data...
          </span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
              <Truck className="h-5 w-5 text-brand-red" />
              Movement Tracking
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Complete business activity timeline from Inspection to Payment
            </p>
          </div>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400">Total Movements</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
              {movements.length}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <p className="text-xs text-green-600 dark:text-green-400">Complete</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
              {movements.filter((m) => m.status === 'Complete').length}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Payment Pending</p>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
              {movements.filter((m) => m.status === 'Payment Pending').length}
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <p className="text-xs text-purple-600 dark:text-purple-400">Total Value</p>
            <p className="text-xl font-bold text-purple-900 dark:text-purple-300">
              ₹
              {movements
                .reduce((sum, m) => sum + m.totalAmount, 0)
                .toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by vehicle, customer, or document number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-transparent dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
                />
              </div>
            </div>
            <Button onClick={fetchMovements} variant="secondary">
              <Filter className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-dark-text-secondary mb-1 block">
                Latest Stage
              </label>
              <select
                value={filters.movementType}
                onChange={(e) => setFilters({ ...filters, movementType: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-red dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
              >
                <option value="all">All Stages</option>
                <option value="Inspection">Inspection</option>
                <option value="Estimate">Estimate</option>
                <option value="JobSheet">Job Sheet</option>
                <option value="Challan">Challan</option>
                <option value="Invoice">Invoice</option>
                <option value="Payment">Payment</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-dark-text-secondary mb-1 block">
                Employee
              </label>
              <select
                value={filters.employee}
                onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-red dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
              >
                <option value="all">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-dark-text-secondary mb-1 block">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-red dark:bg-dark-card dark:border-gray-600 dark:text-dark-text"
              >
                <option value="all">All Status</option>
                <option value="Complete">Complete</option>
                <option value="Payment Pending">Payment Pending</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Movement Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
              <tr>
                <th className="py-3 px-4 text-left font-semibold">Vehicle No</th>
                <th className="py-3 px-4 text-left font-semibold">Customer</th>
                <th className="py-3 px-4 text-left font-semibold">Latest Stage</th>
                <th className="py-3 px-4 text-left font-semibold">Date</th>
                <th className="py-3 px-4 text-center font-semibold">Status</th>
                <th className="py-3 px-4 text-right font-semibold">Amount</th>
                <th className="py-3 px-4 text-left font-semibold">Employee</th>
                <th className="py-3 px-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    No movements found for the selected filters
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement) => (
                  <>
                    <tr
                      key={movement.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-dark-text">
                        {movement.vehicleNo}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-dark-text-secondary">
                        {movement.customerName}
                      </td>
                      <td className="py-3 px-4">{getStageBadge(movement.latestStage)}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-dark-text-secondary">
                        {new Date(movement.latestDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(movement.status)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-dark-text">
                        ₹
                        {movement.totalAmount.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-dark-text-secondary">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {movement.employeeName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() =>
                            setExpandedRow(expandedRow === movement.id ? null : movement.id)
                          }
                          className="text-brand-red hover:text-brand-red-dark transition-colors"
                        >
                          {expandedRow === movement.id ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Timeline Row */}
                    {expandedRow === movement.id && (
                      <tr className="bg-gray-50 dark:bg-gray-800/30">
                        <td colSpan={8} className="py-1 px-2">
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-900 dark:text-dark-text flex items-center gap-2">
                              <Clock className="h-4 w-4 text-brand-red" />
                              Complete Timeline
                            </h4>

                            <div className="relative">
                              {/* Timeline */}
                              <div className="space-y-4">
                                {movement.timeline.map((stage, idx) => (
                                  <div key={idx} className="flex items-start gap-4">
                                    {/* Timeline Dot */}
                                    <div className="flex flex-col items-center">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-red to-red-600 flex items-center justify-center text-white font-bold text-xs">
                                        {idx + 1}
                                      </div>
                                      {idx < movement.timeline.length - 1 && (
                                        <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-600 my-1"></div>
                                      )}
                                    </div>

                                    {/* Stage Details */}
                                    <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                        <div>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Stage
                                          </p>
                                          {getStageBadge(stage.stage)}
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Date
                                          </p>
                                          <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                            {new Date(stage.date).toLocaleDateString('en-IN')}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Reference
                                          </p>
                                          <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                            {stage.reference}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Employee
                                          </p>
                                          <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                            {stage.employeeName}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Status
                                          </p>
                                          <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                            {stage.status}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Amount
                                          </p>
                                          <p className="text-sm font-bold text-gray-900 dark:text-dark-text">
                                            {stage.amount > 0
                                              ? `₹${stage.amount.toLocaleString('en-IN', {
                                                  minimumFractionDigits: 2,
                                                })}`
                                              : '-'}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Payment Details for Invoice Stage */}
                                      {stage.stage === 'Invoice' &&
                                        (stage.paymentReceived > 0 || stage.balanceDue > 0) && (
                                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-3">
                                            <div>
                                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Payment Received
                                              </p>
                                              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                                ₹
                                                {stage.paymentReceived.toLocaleString('en-IN', {
                                                  minimumFractionDigits: 2,
                                                })}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Balance Due
                                              </p>
                                              <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                                                ₹
                                                {stage.balanceDue.toLocaleString('en-IN', {
                                                  minimumFractionDigits: 2,
                                                })}
                                              </p>
                                            </div>
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Summary */}
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                                    Total Stages
                                  </p>
                                  <p className="text-lg font-bold text-blue-900 dark:text-blue-300">
                                    {movement.timeline.length}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                                    Duration
                                  </p>
                                  <p className="text-lg font-bold text-blue-900 dark:text-blue-300">
                                    {Math.ceil(
                                      (new Date(movement.latestDate) -
                                        new Date(movement.timeline[0].date)) /
                                        (1000 * 60 * 60 * 24)
                                    )}{' '}
                                    days
                                  </p>
                                </div>
                                <div>
                                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                                    Status
                                  </p>
                                  <p className="text-lg font-bold text-blue-900 dark:text-blue-300">
                                    {movement.status}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default MovementTracking;
