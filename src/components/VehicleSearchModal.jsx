import { useState } from 'react';
import { X, Car, Calendar, User, FileText, IndianRupee, CheckCircle } from 'lucide-react';
import Button from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

const VehicleSearchModal = ({ isOpen, onClose, vehicleData }) => {
  if (!isOpen || !vehicleData) return null;

  const job = vehicleData;

  const calculateEstimateTotal = () => {
    if (!job.estimate?.items) return 0;
    const subtotal = job.estimate.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const discount = job.estimate.discountAmount || 0;
    const afterDiscount = subtotal - discount;
    const gst = afterDiscount * (job.estimate.gstRate / 100);
    return afterDiscount + gst;
  };

  const calculateInvoiceTotal = () => {
    if (!job.invoice?.items) return 0;
    const subtotal = job.invoice.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const discount = job.invoice.discountAmount || 0;
    const afterDiscount = subtotal - discount;
    const gst = afterDiscount * (job.invoice.gstRate / 100);
    return afterDiscount + gst;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Inspection': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Estimate': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'JobSheet': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Challan': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Invoice': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Completed': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-white dark:bg-dark-card rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
        >
          <div className="sticky top-0 bg-gradient-to-r from-brand-red to-red-600 text-white p-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Car className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">{job.vehicleNo}</h2>
                <p className="text-white/80 text-sm">Complete Vehicle Details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <User className="h-5 w-5" />
                  <span className="font-semibold">Owner Details</span>
                </div>
                <p className="text-lg font-medium dark:text-dark-text">{job.ownerName}</p>
                {job.contactNumber && <p className="text-sm text-gray-600 dark:text-gray-400">{job.contactNumber}</p>}
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <FileText className="h-5 w-5" />
                  <span className="font-semibold">Job Status</span>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(job.status)}`}>
                  {job.status}
                </span>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-semibold">Created Date</span>
                </div>
                <p className="text-lg font-medium dark:text-dark-text">
                  {new Date(job.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Branch</span>
                </div>
                <p className="text-lg font-medium dark:text-dark-text">{job.branch || 'N/A'}</p>
              </div>
            </div>

            {job.inspection?.items && job.inspection.items.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3 dark:text-dark-text flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-red" />
                  Inspection Items ({job.inspection.items.length})
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-200 dark:bg-gray-700">
                      <tr>
                        <th className="text-left py-1 px-2">Item</th>
                        <th className="text-left py-1 px-2">Category</th>
                        <th className="text-right py-1 px-2">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {job.inspection.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-1 px-2 dark:text-dark-text">{item.item}</td>
                          <td className="py-1 px-2 dark:text-dark-text-secondary">{item.category}</td>
                          <td className="py-1 px-2 text-right dark:text-dark-text">₹{item.cost?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {job.estimate?.items && job.estimate.items.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3 dark:text-dark-text flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-brand-red" />
                  Estimate Details
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Items:</span>
                    <span className="font-semibold dark:text-dark-text">{job.estimate.items.length}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                    <span className="font-semibold dark:text-dark-text">₹{job.estimate.discountAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-400">GST Rate:</span>
                    <span className="font-semibold dark:text-dark-text">{job.estimate.gstRate}%</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="font-bold text-lg dark:text-dark-text">Total Amount:</span>
                    <span className="font-bold text-xl text-brand-red">₹{calculateEstimateTotal().toFixed(2)}</span>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      job.estimate.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      job.estimate.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {job.estimate.status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {job.jobSheet?.items && job.jobSheet.items.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3 dark:text-dark-text flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-red" />
                  Job Sheet Items ({job.jobSheet.items.length})
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Finalized: {job.jobSheet.finalized ? '✓ Yes' : '✗ No'}
                  </p>
                  {job.jobSheet.extraWork && job.jobSheet.extraWork.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Extra Work Items: {job.jobSheet.extraWork.length}
                    </p>
                  )}
                </div>
              </div>
            )}

            {job.invoice && (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3 dark:text-dark-text flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-brand-red" />
                  Invoice Details
                </h3>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-2 border-green-200 dark:border-green-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Invoice No:</span>
                    <span className="font-semibold dark:text-dark-text">{job.invoice.invoiceNo || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Invoice Date:</span>
                    <span className="font-semibold dark:text-dark-text">
                      {job.invoice.invoiceDate ? new Date(job.invoice.invoiceDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  {job.invoice.items && (
                    <div className="flex justify-between items-center pt-2 border-t border-green-300 dark:border-green-700">
                      <span className="font-bold text-lg dark:text-dark-text">Final Amount:</span>
                      <span className="font-bold text-xl text-green-600 dark:text-green-400">₹{calculateInvoiceTotal().toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {job.chalan && (
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-3 dark:text-dark-text flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-red" />
                  Challan Information
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Challan No: {job.chalan.chalanNo || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Date: {job.chalan.date ? new Date(job.chalan.date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-gray-100 dark:bg-gray-800 p-4 flex justify-end border-t dark:border-gray-700">
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VehicleSearchModal;
