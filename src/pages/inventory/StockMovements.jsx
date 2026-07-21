import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Download, FileText, Search, ExternalLink, TrendingUp, TrendingDown, Package, AlertTriangle } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { exportToCSV as exportCSV, exportToPDF, formatCurrency, formatDate } from '@/utils/exportHelpers';

const DocumentDetailsModal = ({ documentId, documentType, onClose }) => {
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocumentDetails();
  }, [documentId, documentType]);

  const fetchDocumentDetails = async () => {
    if (!documentId || !documentType) return;

    setLoading(true);
    try {
      let tableName = '';
      if (documentType === 'purchase') tableName = 'purchases';
      else if (documentType === 'purchase_challan') tableName = 'purchase_challans';
      else if (documentType === 'job') tableName = 'jobs';

      if (!tableName) {
        toast.error('Invalid document type');
        return;
      }

      const allData = await dbOperations.getAll(tableName);
      const data = allData.find(item => item.id === documentId);
      
      setDocumentData(data);
    } catch (error) {
      console.error('Error fetching document:', error);
      toast.error('Failed to load document details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
        <span className="ml-3">Loading document...</span>
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="text-center py-8 text-gray-500">
        Document not found or has been deleted.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-2">
          {documentType === 'purchase' && 'Purchase Invoice'}
          {documentType === 'purchase_challan' && 'Purchase Challan'}
          {documentType === 'job' && 'Job Sheet'}
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600 dark:text-dark-text-secondary">Document No:</span>
            <span className="ml-2 font-medium">
              {documentData.invoice_no || documentData.challan_no || documentData.job_no}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-dark-text-secondary">Date:</span>
            <span className="ml-2 font-medium">
              {new Date(
                documentData.invoice_date || documentData.challan_date || documentData.created_at
              ).toLocaleDateString('en-GB')}
            </span>
          </div>
        </div>
      </div>

      {documentData.notes && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
            Notes
          </label>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary bg-gray-50 dark:bg-gray-800 p-3 rounded">
            {documentData.notes}
          </p>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

const StockMovements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState({ id: null, type: null });
  const [filters, setFilters] = useState({
    itemSearch: '',
    startDate: '',
    endDate: '',
    movementType: '',
    referenceType: '',
  });
  const [stats, setStats] = useState({
    totalMovements: 0,
    totalIn: {},
    totalOut: {},
    hangingStock: 0,
  });

  useEffect(() => {
    fetchMovements();
  }, [filters]);

  const calculateStats = (movementsData) => {
    const totalMovements = movementsData.length;
    
    // Group IN movements by unit
    const inByUnit = {};
    movementsData.filter(m => m.movement_type === 'in').forEach(m => {
      const unit = m.unit || 'pcs';
      const qty = parseFloat(m.quantity || 0);
      inByUnit[unit] = (inByUnit[unit] || 0) + qty;
    });
    
    // Group OUT movements by unit
    const outByUnit = {};
    movementsData.filter(m => m.movement_type === 'out').forEach(m => {
      const unit = m.unit || 'pcs';
      const qty = parseFloat(m.quantity || 0);
      outByUnit[unit] = (outByUnit[unit] || 0) + qty;
    });
    
    // Calculate hanging stock (movements older than 15 days with no OUT movement)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const hangingStock = movementsData.filter(m => {
      const movementDate = new Date(m.movement_date);
      return movementDate < fifteenDaysAgo && m.movement_type === 'in';
    }).length;

    setStats({
      totalMovements,
      totalIn: inByUnit,
      totalOut: outByUnit,
      hangingStock,
    });
  };

  useEffect(() => {
    fetchMovements();
  }, [filters]);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      let allMovements = await dbOperations.getAll('stock_movements') || [];
      console.log('All stock movements:', allMovements);
      
      const categories = await dbOperations.getAll('inventory_categories') || [];
      
      // Show all movements (purchase, purchase_challan, sell-challan, etc.)
      const validMovements = allMovements.filter(m => 
        m.material_name || m.productName
      );
      
      console.log('Valid movements after filter:', validMovements);
      
      // Enrich movements with category names and vehicle numbers
      const enrichedMovements = await Promise.all(validMovements.map(async (movement) => {
        const category = categories.find(cat => cat.id === movement.category_id);
        let vehicleNo = 'N/A';
        let documentNo = movement.reference_no || 'N/A';
        
        // Get vehicle number from purchase or purchase_challan
        if (movement.reference_type === 'purchase' && movement.reference_id) {
          const purchases = await dbOperations.getAll('purchases');
          const purchase = purchases.find(p => p.id === movement.reference_id);
          if (purchase) {
            vehicleNo = purchase.vehicle_no || 'N/A';
            documentNo = purchase.invoice_no || documentNo;
          }
        } else if (movement.reference_type === 'purchase_challan' && movement.reference_id) {
          const challans = await dbOperations.getAll('purchase_challans');
          const challan = challans.find(c => c.id === movement.reference_id);
          if (challan) {
            vehicleNo = challan.vehicle_no || 'N/A';
            documentNo = challan.challan_no || documentNo;
          }
        } else if (movement.reference_type === 'sell-challan' && movement.reference_id) {
          const sellChallans = await dbOperations.getAll('sell_challans');
          const challan = sellChallans.find(c => c.id === movement.reference_id);
          if (challan) {
            vehicleNo = challan.vehicle_no || 'N/A';
            documentNo = challan.challan_no || documentNo;
          }
        } else if (movement.reference && movement.reference.challanId) {
          // Handle old format where reference is an object
          const sellChallans = await dbOperations.getAll('sell_challans');
          const challan = sellChallans.find(c => c.id === movement.reference.challanId);
          if (challan) {
            vehicleNo = challan.vehicle_no || 'N/A';
            documentNo = challan.challan_no || documentNo;
          }
        }
        
        return {
          ...movement,
          category_name: category?.name || 'N/A',
          vehicle_no: vehicleNo,
          document_no: documentNo,
          item_name: movement.material_name || movement.productName || 'N/A',
          movement_date: movement.movement_date || movement.date || new Date().toISOString().split('T')[0]
        };
      }));
      
      console.log('Enriched movements:', enrichedMovements);

      // Apply filters
      let filtered = enrichedMovements.filter((movement) => {
        const itemName = movement.item_name || movement.material_name || movement.productName || '';
        const categoryName = movement.category_name || '';
        const searchTerm = filters.itemSearch.toLowerCase();
        
        const matchesSearch = !filters.itemSearch || 
          itemName.toLowerCase().includes(searchTerm) ||
          categoryName.toLowerCase().includes(searchTerm);
        
        const movementDate = movement.movement_date || movement.date;
        const matchesStartDate = !filters.startDate || !movementDate ||
          new Date(movementDate) >= new Date(filters.startDate);
        
        const matchesEndDate = !filters.endDate || !movementDate ||
          new Date(movementDate) <= new Date(filters.endDate);
        
        const matchesMovementType = !filters.movementType || 
          movement.movement_type === filters.movementType;
        
        const matchesReferenceType = !filters.referenceType || 
          movement.reference_type === filters.referenceType;
        
        return matchesSearch && matchesStartDate && matchesEndDate && 
               matchesMovementType && matchesReferenceType;
      });

      filtered.sort((a, b) => {
        const dateA = new Date(a.movement_date || a.date);
        const dateB = new Date(b.movement_date || b.date);
        return dateB - dateA;
      });
      
      console.log('Filtered movements:', filtered);
      
      setMovements(filtered);
      calculateStats(filtered);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDocumentModal = (movement) => {
    if (movement.reference_id && movement.reference_type) {
      if (['purchase', 'purchase_challan', 'job'].includes(movement.reference_type)) {
        setSelectedDocument({
          id: movement.reference_id,
          type: movement.reference_type,
        });
        setIsDocumentModalOpen(true);
      } else {
        toast.info('This is a manual entry or system-generated record');
      }
    } else {
      toast.error('No linked document found');
    }
  };

  const handleExportCSV = () => {
    try {
      if (movements.length === 0) {
        toast.warning('No data to export');
        return;
      }

      const headers = ['Date', 'Item Name', 'Category', 'Type', 'Quantity', 'Reference Type', 'Reference No', 'Notes'];
      const rows = movements.map((m) => [
        formatDate(m.movement_date),
        m.item?.name || '',
        m.item?.category?.name || '',
        m.movement_type?.toUpperCase(),
        `${m.quantity} ${m.item?.unit || ''}`,
        m.reference_type || '',
        m.reference_no || '',
        m.notes || '',
      ]);

      const success = exportCSV(headers, rows, `stock_movements_${new Date().toISOString().split('T')[0]}.csv`);
      
      if (success) {
        toast.success('Stock movements exported to CSV');
      } else {
        toast.error('Failed to export CSV');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handleSavePDF = () => {
    try {
      if (movements.length === 0) {
        toast.warning('No data to save');
        return;
      }

      const inCount = movements.filter(m => m.movement_type === 'in').length;
      const outCount = movements.filter(m => m.movement_type === 'out').length;

      const tableData = movements.map((m) => [
        formatDate(m.movement_date),
        m.item?.name || '',
        m.item?.category?.name || '',
        m.movement_type?.toUpperCase() || '',
        `${m.quantity} ${m.item?.unit || ''}`,
        m.reference_type || '',
        m.reference_no || '',
      ]);

      const success = exportToPDF({
        title: 'Stock Movements History',
        subtitle: `Period: ${filters.startDate ? formatDate(filters.startDate) : 'All'} to ${filters.endDate ? formatDate(filters.endDate) : 'All'}`,
        headerInfo: [
          { label: 'Total Movements', value: movements.length },
          { label: 'Stock In', value: inCount },
          { label: 'Stock Out', value: outCount },
        ],
        summaryCards: [
          { label: 'Total Movements', value: movements.length },
          { label: 'Stock In', value: inCount },
          { label: 'Stock Out', value: outCount },
        ],
        tableHeaders: ['Date', 'Item Name', 'Category', 'Type', 'Quantity', 'Ref Type', 'Ref No'],
        tableData,
        filename: `stock_movements_${new Date().toISOString().split('T')[0]}.pdf`,
        orientation: 'l'
      });

      if (success) {
        toast.success('Stock movements saved as PDF');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Failed to generate PDF');
    }
  };



  return (
    <div className="space-y-6">
      <Modal
        isOpen={isDocumentModalOpen}
        onClose={() => {
          setIsDocumentModalOpen(false);
          setSelectedDocument({ id: null, type: null });
        }}
        title="Document Details"
      >
        <DocumentDetailsModal
          documentId={selectedDocument.id}
          documentType={selectedDocument.type}
          onClose={() => {
            setIsDocumentModalOpen(false);
            setSelectedDocument({ id: null, type: null });
          }}
        />
      </Modal>

      {/* Filters and Actions */}
      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search item or category..."
                value={filters.itemSearch}
                onChange={(e) => setFilters({ ...filters, itemSearch: e.target.value })}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              />
            </div>

            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              placeholder="Start Date"
              className="p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            />

            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              placeholder="End Date"
              className="p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            />

            <select
              value={filters.movementType}
              onChange={(e) => setFilters({ ...filters, movementType: e.target.value })}
              className="p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            >
              <option value="">All Types</option>
              <option value="in">IN (Received)</option>
              <option value="out">OUT (Used)</option>
            </select>

            <select
              value={filters.referenceType}
              onChange={(e) => setFilters({ ...filters, referenceType: e.target.value })}
              className="p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
            >
              <option value="">All References</option>
              <option value="purchase">Purchase Invoice</option>
              <option value="purchase_challan">Purchase Challan</option>
              <option value="sell-challan">Sell Challan</option>
              <option value="job">Jobs</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-2">
            <Button variant="secondary" onClick={handleSavePDF}>
              <FileText className="h-4 w-4 mr-2" />
              Save PDF
            </Button>
            <Button variant="secondary" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>

          </div>
        </div>
      </Card>

      {/* Colorful Metric Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Movements */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Movements</p>
              <p className="text-3xl font-bold">{stats.totalMovements}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Package className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Total IN */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
          <div className="flex items-start justify-between mb-3">
            <p className="text-green-100 text-sm font-medium">Total Stock IN</p>
            <div className="bg-white/20 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          {Object.keys(stats.totalIn).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.totalIn).map(([unit, qty]) => (
                <div key={unit} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
                  <span className="text-sm font-bold">{qty.toFixed(2)}</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded uppercase font-medium">{unit}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-lg font-bold">0</p>
          )}
        </div>

        {/* Total OUT */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
          <div className="flex items-start justify-between mb-3">
            <p className="text-orange-100 text-sm font-medium">Total Stock OUT</p>
            <div className="bg-white/20 p-2 rounded-lg">
              <TrendingDown className="h-6 w-6" />
            </div>
          </div>
          {Object.keys(stats.totalOut).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.totalOut).map(([unit, qty]) => (
                <div key={unit} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
                  <span className="text-sm font-bold">{qty.toFixed(2)}</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded uppercase font-medium">{unit}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-lg font-bold">0</p>
          )}
        </div>

        {/* Hanging Stock */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium mb-1">Stock 15+ Days Old</p>
              <p className="text-3xl font-bold">{stats.hangingStock}</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <AlertTriangle className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Stock Movements History Table */}
      <Card>
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">
            Stock Movements History
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
              <span className="ml-3 text-gray-600 dark:text-dark-text-secondary">
                Loading movements...
              </span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-left">
                    <tr>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Item Name</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Category</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right">Quantity</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Reference</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Ref No</th>
                      <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length > 0 ? (
                      movements.map((movement) => (
                        <tr
                          key={movement.id}
                          className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary">
                            {new Date(movement.movement_date || movement.date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-1 px-2 font-medium text-gray-900 dark:text-dark-text">
                            {movement.item_name || movement.material_name || movement.productName || '-'}
                          </td>
                          <td className="py-1 px-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {movement.category_name || '-'}
                            </span>
                          </td>
                          <td className="py-1 px-2">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                movement.movement_type === 'in'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}
                            >
                              {movement.movement_type?.toUpperCase() || '-'}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-right font-medium text-gray-900 dark:text-dark-text">
                            {parseFloat(movement.quantity).toFixed(2)} {movement.unit || ''}
                          </td>
                          <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary capitalize">
                            {movement.reference_type?.replace('_', ' ') || '-'}
                          </td>
                          <td className="py-1 px-2">
                            {movement.vehicle_no && movement.vehicle_no !== 'N/A' ? (
                              <button
                                onClick={() => openDocumentModal(movement)}
                                className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {movement.vehicle_no}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </button>
                            ) : movement.reference_no ? (
                              <button
                                onClick={() => openDocumentModal(movement)}
                                className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {movement.reference_no}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </button>
                            ) : (
                              <span className="text-gray-700 dark:text-dark-text-secondary">-</span>
                            )}
                          </td>
                          <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary text-sm">
                            {movement.notes || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <div className="flex flex-col items-center text-gray-500 dark:text-dark-text-secondary">
                            <p className="text-lg font-medium">No movements found</p>
                            <p className="text-sm mt-1">
                              {filters.itemSearch || filters.startDate || filters.movementType || filters.referenceType
                                ? 'Try adjusting your filters'
                                : 'Stock movements will appear here as items are purchased or used'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {movements.length > 0 && (
                <div className="mt-4 text-sm text-gray-600 dark:text-dark-text-secondary">
                  Showing {movements.length} movement(s)
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StockMovements;
