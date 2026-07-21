import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Eye, Edit, Download, Printer } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { jsPDF } from 'jspdf';
import { openPrintPreview, PRINT_PRESETS } from '@/utils/printHelpers';

const SellChallan = () => {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingChallan, setViewingChallan] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    vehicle_no: '',
    party_name: '',
    date_from: '',
    date_to: '',
  });

  useEffect(() => {
    loadChallans();
  }, []);

  const loadChallans = async () => {
    setLoading(true);
    try {
      const data = await dbOperations.getAll('sell_challans');
      const sorted = (data || []).sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
      setChallans(sorted);
    } catch (error) {
      console.error('Error loading challans:', error);
      toast.error('Failed to load challans');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (challan) => {
    setViewingChallan(challan);
    setIsViewModalOpen(true);
  };



  const handlePrint = () => {
    if (!viewingChallan) {
      toast.error('No challan selected for printing');
      return;
    }
    
    // Note: Sellchallan uses jsPDF generation, we'll print that view
    toast.info('Print will open in browser print dialog');
    window.print();
  };

  const handleSavePDF = () => {
    if (!viewingChallan) return;
    
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Sell Challan', 14, 15);
    doc.setFontSize(10);
    doc.text(`Challan No: ${viewingChallan.challan_no || 'N/A'}`, 14, 25);
    doc.text(`Date: ${new Date(viewingChallan.date).toLocaleDateString('en-GB')}`, 14, 32);
    doc.text(`Vehicle No: ${viewingChallan.vehicle_no || 'N/A'}`, 14, 39);
    doc.text(`Party Name: ${viewingChallan.party_name || 'N/A'}`, 14, 46);
    doc.text(`Total: ₹${viewingChallan.total?.toFixed(2) || '0.00'}`, 14, 53);
    
    // Generate filename with party name and vehicle number
    const partyName = (viewingChallan.party_name || 'unknown').replace(/[^a-zA-Z0-9]/g, '-');
    const vehicleNo = (viewingChallan.vehicle_no || 'no-vehicle').replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `sell-challan-${partyName}-${vehicleNo}.pdf`;
    
    doc.save(filename);
    toast.success('PDF saved successfully');
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this challan?')) return;

    try {
      // Get challan details before deleting
      const challan = await dbOperations.getById('sell_challans', id);
      
      // Delete the challan
      await dbOperations.delete('sell_challans', id);
      
      // Delete related customer ledger entries
      if (challan && challan.customer_id) {
        try {
          const allLedgerEntries = await dbOperations.getAll('customer_ledger_entries');
          
          // Find and delete ledger entries for this challan
          const ledgerEntriesToDelete = allLedgerEntries.filter(entry => 
            entry.customer_id === challan.customer_id &&
            entry.reference_type === 'challan' &&
            (
              (challan.challan_no && entry.challan_no === challan.challan_no && entry.vehicle_no === challan.vehicle_no) ||
              entry.reference_id === id
            )
          );
          
          console.log('Deleting customer ledger entries for challan:', ledgerEntriesToDelete.length);
          
          for (const entry of ledgerEntriesToDelete) {
            await dbOperations.delete('customer_ledger_entries', entry.id);
            broadcastDataChange('customer_ledger_entries', 'delete', { id: entry.id, customer_id: entry.customer_id });
          }
          
          // Save ledger to backend
          if (window.electron?.fs?.writeFile) {
            const updatedLedger = await dbOperations.getAll('customer_ledger_entries');
            await window.electron.fs.writeFile(
              'C:/malwa-crm/Data_base/customer/Ledger.json',
              JSON.stringify(updatedLedger, null, 2)
            );
            console.log('✅ Customer ledger entries deleted and saved to backend');
          }
        } catch (ledgerError) {
          console.error('Failed to delete customer ledger entries:', ledgerError);
        }
      }
      
      toast.success('Challan deleted successfully');
      loadChallans();
    } catch (error) {
      console.error('Error deleting challan:', error);
      toast.error('Failed to delete challan');
    }
  };

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchFilters({ ...searchFilters, [name]: value });
  };

  const handleSearch = () => {
    // Filtering is done in filteredChallans
  };

  const handleReset = () => {
    setSearchFilters({
      vehicle_no: '',
      party_name: '',
      date_from: '',
      date_to: '',
    });
  };

  const filteredChallans = challans.filter((challan) => {
    if (searchFilters.vehicle_no && !challan.vehicle_no?.toLowerCase().includes(searchFilters.vehicle_no.toLowerCase())) {
      return false;
    }
    if (searchFilters.party_name && !challan.party_name?.toLowerCase().includes(searchFilters.party_name.toLowerCase())) {
      return false;
    }
    if (searchFilters.date_from && challan.date < searchFilters.date_from) {
      return false;
    }
    if (searchFilters.date_to && challan.date > searchFilters.date_to) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Sell Challans
          </h2>
        </div>

        {/* Search Filters */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <input
                type="text"
                name="vehicle_no"
                value={searchFilters.vehicle_no}
                onChange={handleSearchChange}
                placeholder="Search by vehicle no"
                className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <div>
              <input
                type="text"
                name="party_name"
                value={searchFilters.party_name}
                onChange={handleSearchChange}
                placeholder="Search by party name"
                className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <div>
              <input
                type="date"
                name="date_from"
                value={searchFilters.date_from}
                onChange={handleSearchChange}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <div>
              <input
                type="date"
                name="date_to"
                value={searchFilters.date_to}
                onChange={handleSearchChange}
                className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} variant="primary" size="sm">
              Search
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm">
              Reset
            </Button>
          </div>
        </div>

        {/* Challans Table */}
        {loading ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : filteredChallans.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">
              No sell challans found
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Create challans from Jobs &gt; Challan section
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800 text-left">
                <tr>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Status</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Vehicle No</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Party Name</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Date</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Total</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChallans.map((challan) => (
                  <tr
                    key={challan.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            challan.status === 'issued' ? 'bg-green-500' : 
                            challan.status === 'invoiced' ? 'bg-blue-500' : 'bg-yellow-400'
                          }`}
                          title={challan.status}
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                          {challan.status || 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="py-1 px-2 font-medium text-gray-900 dark:text-white">
                      {challan.vehicle_no || 'N/A'}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {challan.party_name || challan.customer_name || 'N/A'}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {challan.date ? new Date(challan.date).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      ₹{challan.total?.toFixed(2) || '0.00'}
                    </td>
                    <td className="py-1 px-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(challan)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(challan.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                          title="Delete"
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
        )}
      </Card>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingChallan(null);
        }}
        title="Sell Challan Details"
        size="xl"
      >
        {viewingChallan && (
          <div className="space-y-6">
            {/* Header with Actions */}
            <div className="flex justify-end gap-2 pb-4 border-b dark:border-gray-700">
              <Button variant="outline" size="sm" onClick={() => toast.info('Edit functionality coming soon')}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>

              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>

              <Button variant="outline" size="sm" onClick={handleSavePDF}>
                <Download className="h-4 w-4 mr-1" />
                Save PDF
              </Button>
            </div>

            {/* Challan Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Status</label>
                <p className="text-gray-900 dark:text-white capitalize">{viewingChallan.payment_status || 'Pending'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Create Invoice</label>
                <p className="text-gray-900 dark:text-white">{viewingChallan.create_invoice ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {/* Items Table */}
            {viewingChallan.items && viewingChallan.items.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items</h3>
                <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="p-2 text-left border-b dark:border-gray-700">Product Name</th>
                      <th className="p-2 text-right border-b dark:border-gray-700">Quantity</th>
                      <th className="p-2 text-right border-b dark:border-gray-700">Rate</th>
                      <th className="p-2 text-right border-b dark:border-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingChallan.items.map((item, index) => (
                      <tr key={index} className="border-b dark:border-gray-700">
                        <td className="p-2">{item.productName || item.item_name || item.name || 'N/A'}</td>
                        <td className="p-2 text-right">{item.qty || item.quantity || 0}</td>
                        <td className="p-2 text-right">₹{item.rate || 0}</td>
                        <td className="p-2 text-right">₹{((item.qty || item.quantity || 0) * (item.rate || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Financial Details */}
            <div className="flex justify-end">
              <div className="w-96 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal</label>
                    <p className="text-gray-900 dark:text-white">₹{viewingChallan.subtotal?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Tax</label>
                    <p className="text-gray-900 dark:text-white">₹{viewingChallan.tax?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Discount</label>
                    <p className="text-gray-900 dark:text-white">₹{viewingChallan.discount?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Advance Payment</label>
                    <p className="text-gray-900 dark:text-white">₹{viewingChallan.advance_payment?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</label>
                    <p className="text-gray-900 dark:text-white font-bold text-lg">₹{viewingChallan.total?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Payment Received</label>
                    <p className="text-gray-900 dark:text-white font-medium">₹{viewingChallan.payment_received?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Balance Due</label>
                    <p className="font-bold text-red-600 dark:text-red-400">₹{viewingChallan.balance_due?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SellChallan;
