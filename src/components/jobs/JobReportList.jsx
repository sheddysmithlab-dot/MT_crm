import { Edit, Trash2, Eye } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import AssignedManagerLine from '@/components/jobs/AssignedManagerLine';
import { normalizeAssignedManager } from '@/utils/jobAssignment';
import { useState } from 'react';

const STATUS_COLORS = {
  'in-progress': 'bg-yellow-400',
  'pending-confirmation': 'bg-orange-400',
  'approve-next-step': 'bg-green-400',
  'deal-not-done': 'bg-gray-500',
  'complete': 'bg-blue-500',
  'hold': 'bg-red-500',
};

const STATUS_LABELS = {
  'in-progress': 'Work in Progress',
  'pending-confirmation': 'Pending for Customer Confirmation',
  'approve-next-step': 'Approve for Next Step',
  'deal-not-done': 'Deal Not Done',
  'complete': 'Complete',
  'hold': 'Hold for Material',
};

const formatAssignedManager = (record) => {
  const manager = normalizeAssignedManager(record);
  if (!manager) return 'N/A';
  return `${manager.name || '--'}${manager.phone ? ` | ${manager.phone}` : ''}`;
};

// Helper function to get total amount from record (handles different field names)
const getTotalAmount = (record) => {
  // Prefer the settled/payable amount when it was recorded, so the list matches
  // what the edit screen shows. Falls back to the computed total for records
  // (estimates, older challans, …) that never stored a settled amount.
  const settled = parseFloat(record.final_settled_amount);
  if (!isNaN(settled) && settled > 0) return settled;
  const total = record.total || record.total_amount || record.grand_total || 0;
  return parseFloat(total) || 0;
};

const PAGE_SIZE = 15;

const JobReportList = ({ records, onEdit, onDelete, stepName, showStatus = true }) => {
  const [viewRecord, setViewRecord] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const showAssignedManager = stepName !== 'Invoice';

  // Sort records by date descending (latest first)
  const sortedRecords = [...records].sort((a, b) => {
    const da = new Date(a.date || 0);
    const db = new Date(b.date || 0);
    return db - da;
  });
  const visibleRecords = sortedRecords.slice(0, visibleCount);

  const handleView = (record) => {
    console.log('View Record:', record);
    console.log('Items:', record.items);
    console.log('Items length:', record.items?.length);
    setViewRecord(record);
    setIsViewModalOpen(true);
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No {stepName} records found
      </div>
    );
  }

  return (
    <div className="mt-6 border-t pt-6 dark:border-gray-700">
      <h4 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">
        {stepName} Reports
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-800 text-left">
            <tr>
              {showStatus && (
                <th className="py-0.5 px-2 border-b dark:border-gray-700">Status</th>
              )}
              <th className="py-0.5 px-2 border-b dark:border-gray-700">Vehicle No</th>
              <th className="py-0.5 px-2 border-b dark:border-gray-700">Party Name</th>
              {showAssignedManager && (
                <th className="py-0.5 px-2 border-b dark:border-gray-700">Assigned Manager</th>
              )}
              <th className="py-0.5 px-2 border-b dark:border-gray-700">Invoice No</th>
              <th className="py-0.5 px-2 border-b dark:border-gray-700">Challan No</th>
              <th className="py-0.5 px-2 border-b dark:border-gray-700">Date</th>
              <th className="py-0.5 px-2 border-b dark:border-gray-700 text-right">Total Amount</th>
              <th className="py-0.5 px-2 border-b dark:border-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRecords.map((record) => (
              <tr
                key={record.id}
                className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {showStatus && (
                  <td className="py-0.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[record.status] || 'bg-gray-400'}`}
                        title={STATUS_LABELS[record.status] || record.status}
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {STATUS_LABELS[record.status] || record.status || 'N/A'}
                      </span>
                    </div>
                  </td>
                )}
                <td className="py-0.5 px-2 font-medium text-gray-900 dark:text-white">
                  {record.vehicleNo || record.vehicle_no || record.vehicleNumber || record.vehicle_number || '-'}
                </td>
                <td className="py-0.5 px-2 text-gray-700 dark:text-gray-300">
                  {record.partyName || record.party_name || record.ownerName || record.owner_name || record.customerName || record.customer_name || '-'}
                </td>
                {showAssignedManager && (
                  <td className="py-0.5 px-2 text-blue-700 dark:text-blue-300">
                    {formatAssignedManager(record)}
                  </td>
                )}
                <td className="py-0.5 px-2 font-medium text-blue-600 dark:text-blue-400">
                  {record.invoice_no || 'N/A'}
                </td>
                <td className="py-0.5 px-2 font-medium text-green-600 dark:text-green-400">
                  {record.challan_no || 'N/A'}
                </td>
                <td className="py-0.5 px-2 text-gray-700 dark:text-gray-300">
                  {new Date(record.date).toLocaleDateString()}
                </td>
                <td className="py-0.5 px-2 text-right font-semibold text-gray-900 dark:text-white">
                  ₹{getTotalAmount(record).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-0.5 px-2">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(record)}
                      className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(record)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(record.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show More / Show Less */}
      {sortedRecords.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Showing {Math.min(visibleCount, sortedRecords.length)} of {sortedRecords.length} records</span>
          <div className="flex gap-2">
            {visibleCount < sortedRecords.length && (
              <button
                onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                Show More ({sortedRecords.length - visibleCount} remaining)
              </button>
            )}
            {visibleCount > PAGE_SIZE && (
              <button
                onClick={() => setVisibleCount(PAGE_SIZE)}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                Show Less
              </button>
            )}
          </div>
        </div>
      )}

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={stepName + " Details"}
        size="2xl"
      >
        {viewRecord && (
          <div className="pdf-style-view bg-white dark:bg-gray-900">
            {/* Company Header for Estimate/Invoice */}
            {(stepName === 'Estimate' || stepName === 'Invoice') && (
              <div className="mb-4 pb-4 border-b-2 border-gray-400 dark:border-gray-500">
                <h1 className="text-3xl font-bold text-red-600 dark:text-red-500 mb-1">Malwa Trolley</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">122/1, Bypass Road, Behind Gurudwara & Wine Shop, Nayta Mundla, Nemawar Road, Indore</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">www.malwatrolley.com</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">Contact :- +91 8224000822</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">GST : 23CLKPM9473J1ZI</p>
              </div>
            )}

            {/* Header Section */}
            <div className="mb-4 pb-4 border-b-2 border-gray-300 dark:border-gray-600">
              {(stepName === 'Estimate' || stepName === 'Invoice') ? (
                <>
                  <h2 className="text-xl font-bold mb-3 uppercase">{stepName === 'Estimate' ? 'ESTIMATE FOR:' : 'INVOICE'}</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm"><span className="font-bold">Vehicle No:</span> {viewRecord.vehicleNo || viewRecord.vehicle_no || viewRecord.vehicleNumber || viewRecord.vehicle_number || 'N/A'}</p>
                      <p className="text-sm"><span className="font-bold">Party Name:</span> {viewRecord.partyName || viewRecord.party_name || viewRecord.ownerName || viewRecord.owner_name || viewRecord.customerName || 'N/A'}</p>
                      <p className="text-sm"><span className="font-bold">Status:</span> {viewRecord.status || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm"><span className="font-bold">{stepName} Date:</span> {viewRecord.date ? new Date(viewRecord.date).toLocaleDateString('en-GB') : 'N/A'}</p>
                      {viewRecord.invoice_no && (
                        <p className="text-sm"><span className="font-bold">Invoice No:</span> {viewRecord.invoice_no}</p>
                      )}
                      {viewRecord.challan_no && (
                        <p className="text-sm"><span className="font-bold">Challan No:</span> {viewRecord.challan_no}</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-center mb-4 uppercase">{stepName}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {stepName === 'Challan' ? 'Challan No:' : stepName === 'Invoice' ? 'Invoice No:' : 'Job No:'}
                      </span>
                      <p className="font-bold text-lg">{viewRecord.challan_no || viewRecord.invoice_no || viewRecord.job_no || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Date:</span>
                      <p className="font-bold text-lg">
                        {viewRecord.date ? new Date(viewRecord.date).toLocaleDateString('en-IN') : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Party Name:</span>
                      <p className="font-semibold">{viewRecord.partyName || viewRecord.party_name || viewRecord.ownerName || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Phone Number:</span>
                      <p className="font-semibold">{viewRecord.contactNo || viewRecord.phone || '--'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded col-span-2">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Vehicle Number:</span>
                      <p className="font-bold text-lg">{viewRecord.vehicleNo || viewRecord.vehicle_no || 'N/A'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {showAssignedManager && (
              <AssignedManagerLine manager={viewRecord} className="mb-4" />
            )}

            {/* Items Table Section */}
            <div className="mb-4">
              <h3 className="text-base font-bold mb-2 uppercase">
                {stepName === 'Estimate' ? 'ITEMS' : 
                 stepName === 'Invoice' ? 'ITEMS' : 
                 stepName === 'Challan' ? 'Tasks from Job Sheet' : 
                 stepName === 'Job Sheet' ? 'Job Tasks' : 
                 'Items'}
              </h3>
              
              {/* Debug info */}
              <div className="text-xs text-gray-500 mb-2">
                Items: {viewRecord.items ? `Array with ${viewRecord.items.length} items` : 'undefined/null'}
              </div>
              
              {viewRecord.items && viewRecord.items.length > 0 ? (
                <div className="border border-gray-300 dark:border-gray-600 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        {(stepName === 'Estimate' || stepName === 'Invoice') ? (
                          <>
                            <th className="p-2 text-center border border-gray-300 dark:border-gray-600 font-bold">S.No</th>
                            <th className="p-2 text-left border border-gray-300 dark:border-gray-600 font-bold">Work</th>
                            <th className="p-2 text-right border border-gray-300 dark:border-gray-600 font-bold">Cost (₹)</th>
                            <th className="p-2 text-right border border-gray-300 dark:border-gray-600 font-bold">Qty.</th>
                            <th className="p-2 text-right border border-gray-300 dark:border-gray-600 font-bold">Total (₹)</th>
                          </>
                        ) : (
                          <>
                            <th className="p-2 text-left border border-gray-300 dark:border-gray-600 font-bold">Work</th>
                            <th className="p-2 text-left border border-gray-300 dark:border-gray-600 font-bold">Extra Work</th>
                            <th className="p-2 text-left border border-gray-300 dark:border-gray-600 font-bold">Category</th>
                            <th className="p-2 text-right border border-gray-300 dark:border-gray-600 font-bold">Cost (₹)</th>
                            <th className="p-2 text-right border border-gray-300 dark:border-gray-600 font-bold">Qty</th>
                            <th className="p-2 text-right border border-gray-300 dark:border-gray-600 font-bold">Total (₹)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900">
                      {viewRecord.items.map((item, idx) => (
                        <tr key={idx}>
                          {(stepName === 'Estimate' || stepName === 'Invoice') ? (
                            <>
                              <td className="p-2 text-center border border-gray-300 dark:border-gray-600">{idx + 1}</td>
                              <td className="p-2 border border-gray-300 dark:border-gray-600">
                                {item.item || item.name || item.description || item.productName || '--'}
                                {item.category && item.category !== 'Uncategorized' && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 block">({item.category})</span>
                                )}
                              </td>
                              <td className="p-2 text-right border border-gray-300 dark:border-gray-600">{parseFloat(item.cost || item.rate || 0)}</td>
                              <td className="p-2 text-right border border-gray-300 dark:border-gray-600">
                                {item.condition || item.qty || item.quantity || item.multiplier || 0}
                              </td>
                              <td className="p-2 text-right border border-gray-300 dark:border-gray-600 font-semibold">
                                {parseFloat(item.total || item.amount || 0).toFixed(2)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-2 border border-gray-300 dark:border-gray-600">
                                {item.work || item.productName || item.description || item.name || item.item || '--'}
                              </td>
                              <td className="p-2 border border-gray-300 dark:border-gray-600">{item.extraWork || '--'}</td>
                              <td className="p-2 border border-gray-300 dark:border-gray-600">{item.category || 'Uncategorized'}</td>
                              <td className="p-2 text-right border border-gray-300 dark:border-gray-600">{parseFloat(item.rate || item.cost || 0)}</td>
                              <td className="p-2 text-right border border-gray-300 dark:border-gray-600">{parseFloat(item.qty || item.quantity || item.multiplier || 0)}</td>
                              <td className="p-2 text-right border border-gray-300 dark:border-gray-600 font-semibold">
                                {parseFloat(item.total || item.amount || 0).toFixed(2)}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded">
                  No items found
                </div>
              )}
            </div>

            {/* Totals Section */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left side - Amount in Words & Account Details (for Estimate/Invoice) */}
              {(stepName === 'Estimate' || stepName === 'Invoice') && (
                <div className="space-y-3">
                  <div>
                    <p className="font-bold text-sm mb-1">Amount in Words:</p>
                    <p className="text-sm italic text-gray-700 dark:text-gray-300">
                      {/* Amount in words would be calculated here */}
                      {viewRecord.amount_in_words || 'To be calculated'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-bold text-sm mb-1">Account Details:</p>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <p className="font-semibold">Malwa Trolley</p>
                      <p>ACC. NO.: 917020005504917</p>
                      <p>IFSC: UTIB0002512</p>
                      <p>AXIS BANK PALDA INDORE</p>
                      <p className="text-xs italic mt-1">*GST Extra on above amount</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Right side - Totals */}
              <div className="space-y-2">
                <div className="flex justify-between border-b border-gray-300 dark:border-gray-600 pb-1">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-bold">₹{parseFloat(viewRecord.subtotal || 0).toFixed(2)}</span>
                </div>

                {stepName === 'Invoice' && viewRecord.gst_type && (
                  <>
                    {viewRecord.cgst > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>CGST (9%):</span>
                        <span>₹{parseFloat(viewRecord.cgst || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {viewRecord.sgst > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>SGST (9%):</span>
                        <span>₹{parseFloat(viewRecord.sgst || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {viewRecord.igst > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>IGST (18%):</span>
                        <span>₹{parseFloat(viewRecord.igst || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}

                {viewRecord.discount !== undefined && (
                  <div className="flex justify-between border-b border-gray-300 dark:border-gray-600 pb-1">
                    <span className="font-semibold">Discount:</span>
                    <span className="font-bold">{parseFloat(viewRecord.discount || 0)}</span>
                  </div>
                )}

                {viewRecord.round_off !== undefined && (
                  <div className="flex justify-between border-b border-gray-300 dark:border-gray-600 pb-1">
                    <span className="font-semibold">Round Off:</span>
                    <span className="font-bold">{parseFloat(viewRecord.round_off || 0)}</span>
                  </div>
                )}

                <div className="flex justify-between border-b-2 border-gray-400 dark:border-gray-500 pb-1 text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold">₹{parseFloat(viewRecord.total || 0).toFixed(2)}</span>
                </div>

                {(viewRecord.advancePayment || viewRecord.advance_payment) && (
                  <div className="flex justify-between border-b border-gray-300 dark:border-gray-600 pb-1">
                    <span className="font-semibold flex items-center gap-1">
                      <span className="text-blue-600 dark:text-blue-400">₹</span> Advance Payment:
                    </span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      ₹{parseFloat(viewRecord.advancePayment || viewRecord.advance_payment || 0).toFixed(2)}
                    </span>
                  </div>
                )}

                {(viewRecord.advancePayment || viewRecord.advance_payment || viewRecord.balance_due) && (
                  <div className="flex justify-between text-xl pt-1">
                    <span className="font-bold">Balance Due:</span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      ₹{parseFloat(
                        viewRecord.balance_due || 
                        ((viewRecord.total || 0) - (viewRecord.advancePayment || viewRecord.advance_payment || 0))
                      ).toFixed(2)}
                    </span>
                  </div>
                )}

                {stepName === 'Invoice' && viewRecord.payment_received !== undefined && (
                  <div className="flex justify-between text-xl pt-1 border-t-2 border-gray-400 dark:border-gray-500">
                    <span className="font-bold">Payment Received:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      ₹{parseFloat(viewRecord.payment_received || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Status and Additional Info */}
            {(viewRecord.status || viewRecord.completionStatus || viewRecord.completionRemark) && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                <h3 className="font-bold mb-2">Deal Completion Status</h3>
                {viewRecord.status && (
                  <div className="mb-2">
                    <span className="font-semibold">Completion Status: </span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      viewRecord.status === 'complete' || viewRecord.status === 'approve-next-step'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : viewRecord.status === 'in-progress'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {STATUS_LABELS[viewRecord.status] || viewRecord.status}
                    </span>
                  </div>
                )}
                {viewRecord.completionStatus && (
                  <div className="mb-2">
                    <span className="font-semibold">Status: </span>
                    <span>{viewRecord.completionStatus}</span>
                  </div>
                )}
                {viewRecord.completionRemark && (
                  <div>
                    <span className="font-semibold">Completion Remark: </span>
                    <span>{viewRecord.completionRemark}</span>
                  </div>
                )}
              </div>
            )}

            {/* Payment Details */}
            {(viewRecord.paymentStatus || viewRecord.paymentAmount) && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                <h3 className="font-bold mb-2">Payment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  {viewRecord.paymentStatus && (
                    <div>
                      <span className="font-semibold">Payment Status: </span>
                      <span>{viewRecord.paymentStatus}</span>
                    </div>
                  )}
                  {viewRecord.paymentAmount && (
                    <div>
                      <span className="font-semibold">Payment Amount (₹): </span>
                      <span className="font-bold">₹{parseFloat(viewRecord.paymentAmount || 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                {viewRecord.paymentReceived !== undefined && (
                  <div className="mt-4 text-right space-y-1">
                    <div className="flex justify-between text-lg">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold">₹{parseFloat(viewRecord.total || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Payment Received:</span>
                      <span className="font-semibold">₹{parseFloat(viewRecord.paymentReceived || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl text-red-600 dark:text-red-400 border-t-2 border-gray-400 pt-2">
                      <span className="font-bold">Balance Due:</span>
                      <span className="font-bold">₹{parseFloat((viewRecord.total || 0) - (viewRecord.paymentReceived || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default JobReportList;
