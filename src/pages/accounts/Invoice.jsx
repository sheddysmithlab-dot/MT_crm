import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2, Eye, Download, Printer } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import useCompanyStore from '@/store/companyStore';
import useMultiplierStore from '@/store/multiplierStore';
import { openPrintPreview, PRINT_PRESETS } from '@/utils/printHelpers';

const Invoice = () => {
  const companyDetails = useCompanyStore(state => state.companyDetails);
  const { getCategoryMultiplier, getMultiplierByWorkType } = useMultiplierStore();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [customersMap, setCustomersMap] = useState({});
  const [searchFilters, setSearchFilters] = useState({
    invoice_no: '',
    party_name: '',
    date_from: '',
    date_to: '',
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const [invoicesData, customersData] = await Promise.all([
        dbOperations.getAll('invoices'),
        dbOperations.getAll('customers')
      ]);

      const custMap = {};
      if (customersData) {
        customersData.forEach(c => {
          custMap[c.id] = c;
        });
      }
      setCustomersMap(custMap);

      const sorted = (invoicesData || []).sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
      setInvoices(sorted);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (invoice) => {
    setViewingInvoice(invoice);
    setIsViewModalOpen(true);
    
    // Load customer details if customer_id exists
    if (invoice.customer_id) {
      try {
        const customer = await dbOperations.getById('customers', invoice.customer_id);
        setCustomerDetails(customer);
      } catch (error) {
        console.error('Failed to load customer details:', error);
        setCustomerDetails(null);
      }
    } else {
      setCustomerDetails(null);
    }
  };



  const handlePrint = () => {
    if (!viewingInvoice) {
      toast.error('No invoice selected for printing');
      return;
    }
    
    const success = openPrintPreview({
      elementId: 'invoice-print-view',
      title: `Invoice - ${viewingInvoice.invoice_no || 'N/A'}`,
      ...PRINT_PRESETS.invoice
    });
    
    if (!success) {
      toast.error('Print failed. Please try again.');
    }
  };

  const handleSavePDF = () => {
    if (!viewingInvoice) return;
    
    const input = document.getElementById('invoice-print-view');
    if (!input) {
      toast.error('Invoice view not found');
      return;
    }
    
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Generate filename with party name and vehicle number
      const partyName = (viewingInvoice.party_name || viewingInvoice.customer_name || 'unknown').replace(/[^a-zA-Z0-9]/g, '-');
      const vehicleNo = (viewingInvoice.vehicle_no || 'no-vehicle').replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `invoice-${partyName}-${vehicleNo}.pdf`;
      
      pdf.save(filename);
      toast.success('PDF saved successfully');
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      // Get invoice details before deleting
      const invoice = await dbOperations.getById('invoices', id);
      
      // Delete the invoice
      await dbOperations.delete('invoices', id);
      
      // Delete related customer ledger entries
      if (invoice && invoice.customer_id) {
        try {
          const allLedgerEntries = await dbOperations.getAll('customer_ledger_entries');
          
          // Find and delete ledger entries for this invoice
          const ledgerEntriesToDelete = allLedgerEntries.filter(entry => 
            entry.customer_id === invoice.customer_id &&
            (entry.reference_id === id || 
             (invoice.invoice_no && entry.invoice_no === invoice.invoice_no) ||
             (invoice.vehicle_no && entry.vehicle_no === invoice.vehicle_no && invoice.challan_no && entry.challan_no === invoice.challan_no))
          );
          
          console.log('Deleting customer ledger entries for invoice:', ledgerEntriesToDelete.length);
          
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
      
      toast.success('Invoice deleted successfully');
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleEdit = (invoice) => {
    toast.info('Edit functionality coming soon');
  };

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchFilters({ ...searchFilters, [name]: value });
  };

  const handleSearch = () => {
    // Filtering is done in filteredInvoices
  };

  const handleReset = () => {
    setSearchFilters({
      invoice_no: '',
      party_name: '',
      date_from: '',
      date_to: '',
    });
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (searchFilters.invoice_no && !(invoice.invoice_no || invoice.invoice_number || '').toLowerCase().includes(searchFilters.invoice_no.toLowerCase())) {
      return false;
    }
    if (searchFilters.party_name && !invoice.party_name?.toLowerCase().includes(searchFilters.party_name.toLowerCase())) {
      return false;
    }
    if (searchFilters.date_from && invoice.date < searchFilters.date_from) {
      return false;
    }
    if (searchFilters.date_to && invoice.date > searchFilters.date_to) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-6">
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text">
            Sell Invoices
          </h2>
        </div>

        {/* Search Filters */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <input
                type="text"
                name="invoice_no"
                value={searchFilters.invoice_no}
                onChange={handleSearchChange}
                placeholder="Search by invoice no"
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
                placeholder="dd-mm-yyyy"
                className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <div>
              <input
                type="date"
                name="date_to"
                value={searchFilters.date_to}
                onChange={handleSearchChange}
                placeholder="dd-mm-yyyy"
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

        {/* Invoice Reports Table */}
        {loading ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400">
              No sell invoices found
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Create invoices from Jobs &gt; Invoice section
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800 text-left">
                <tr>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Status</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Invoice No</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Party Name</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">GST Number</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Date</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700">Branch</th>
                  <th className="py-1 px-2 border-b dark:border-gray-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            invoice.status === 'paid' ? 'bg-green-500' : 'bg-yellow-400'
                          }`}
                          title={invoice.status === 'paid' ? 'Paid' : 'Pending'}
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {invoice.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="py-1 px-2 font-medium text-gray-900 dark:text-white">
                      {invoice.invoice_no || invoice.invoice_number || '-'}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {invoice.party_name || invoice.customer_name || 'N/A'}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {customersMap[invoice.customer_id]?.gstin || '-'}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {invoice.date ? new Date(invoice.date).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-gray-300">
                      {invoice.branch || '-'}
                    </td>
                    <td className="py-1 px-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(invoice)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(invoice)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(invoice.id)}
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
        onClose={() => setIsViewModalOpen(false)}
        title="View Invoice"
        size="xl"
      >
        {viewingInvoice && (
          <div className="space-y-4">
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

            {/* Invoice Print View */}
            <div id="invoice-print-view" className="bg-white text-black p-6">
              {/* Header Section */}
              <div className="mb-6">
                <div className="bg-red-600 text-white text-center py-1 -mx-6 mb-4">
                  <h1 className="text-2xl font-bold tracking-wider">Tax Invoice</h1>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-red-600 mb-2">{companyDetails.name || "Malwa Trolley"}</h2>
                    <p className="text-gray-600 italic mb-1">{`${companyDetails.address || ''}, ${companyDetails.city || ''}`.replace(/^, /, '').replace(/, $/, '') || "09, Nemawar Road, Udyog nagar, Palda, Indore"}</p>
                    <a href={`http://${companyDetails.website || "www.malwatrolley.com"}`} className="text-blue-600 underline">{companyDetails.website || "www.malwatrolley.com"}</a>
                    <p className="text-gray-700 mt-1">Contact :- {companyDetails.phone || "+91 822 4000 822"}</p>
                    <p className="text-gray-700">GSTIN : {companyDetails.gstin || "23CLKPM9473J1ZI"}</p>
                  </div>
                  
                  <div className="flex-shrink-0 ml-4">
                    <img 
                      src={companyDetails.logo || "/malwa_logo.png"} 
                      alt="Company Logo" 
                      className="h-32 w-32 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-base">
                <div className="border border-black p-3">
                  <h5 className="font-bold mb-2">BILL TO:</h5>
                  <div><strong>Name:</strong> {customerDetails?.name || viewingInvoice.customer_name || viewingInvoice.party_name || 'N/A'}</div>
                  <div><strong>Contact:</strong> {customerDetails?.phone || viewingInvoice.contact || viewingInvoice.contact_no || 'N/A'}</div>
                  <div><strong>Address:</strong> {customerDetails?.address || 'N/A'}</div>
                  <div><strong>GST No:</strong> {customerDetails?.gstin || 'N/A'}</div>
                </div>
                <div className="border border-black p-3">
                  <div><strong>Invoice No:</strong> {viewingInvoice.invoice_no || 'N/A'}</div>
                  <div><strong>Invoice Date:</strong> {viewingInvoice.date ? new Date(viewingInvoice.date).toLocaleDateString('en-GB') : 'N/A'}</div>
                  <div><strong>Vehicle No:</strong> {viewingInvoice.vehicle_no || 'N/A'}</div>
                  <div><strong>Payment Type:</strong> {viewingInvoice.payment_type || 'N/A'}</div>
                </div>
              </div>

              {/* Items Section */}
              <h4 className="font-semibold mb-2">ITEMS</h4>
              <table className="w-full text-base border border-black border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border border-black" style={{width: '5%'}}>S.No</th>
                    <th className="p-2 border border-black" style={{width: '55%'}}>Work</th>
                    <th className="p-2 border border-black" style={{width: '15%'}}>Cost (₹)</th>
                    <th className="p-2 border border-black" style={{width: '10%'}}>Qty.</th>
                    <th className="p-2 border border-black" style={{width: '15%'}}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingInvoice.items && viewingInvoice.items.length > 0 ? (
                    viewingInvoice.items.map((item, idx) => {
                      const itemName = item.item || item.item_name || item.name || item.productName || 'N/A';
                      const cost = item.cost || item.rate || 0;
                      const quantity = item.quantity || item.qty || 1;
                      const total = item.total || (cost * quantity) || 0;
                      
                      return (
                        <tr key={idx}>
                          <td className="p-2 border border-black text-center">{idx + 1}</td>
                          <td className="p-2 border border-black">
                            {item.category && <span className="font-semibold">{item.category}: </span>}
                            {itemName}
                            {item.condition && <span className="text-sm italic"> ({item.condition})</span>}
                          </td>
                          <td className="p-2 border border-black text-right">{cost.toFixed(2)}</td>
                          <td className="p-2 border border-black text-center">{quantity}</td>
                          <td className="p-2 border border-black text-right">{total.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-1 px-2 text-center border border-black">No items available</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                {/* Left side - Amount in Words and Account Details */}
                <div className="text-base">
                  <div className="font-semibold mb-2">Amount in Words:</div>
                  <div className="italic mb-4">{numberToWords(Math.round(viewingInvoice.total || 0))}</div>
                  
                  {/* Account Details */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="font-semibold mb-2">Account Details:</div>
                    <div><strong>{companyDetails.name || "MALWA TROLLEY"}</strong></div>
                    <div>ACC. NO.: 917020005504917</div>
                    <div>IFSC: UTIB0002512</div>
                    <div>AXIS BANK PALDA INDORE</div>
                  </div>
                </div>
                
                {/* Right side - Totals and Signature */}
                <div>
                  <div className="text-sm">
                    <div className="flex justify-between border-b border-black py-1">
                      <span>Subtotal:</span>
                      <span>₹{(viewingInvoice.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {viewingInvoice.gst_type === "IGST" ? (
                      <div className="flex justify-between border-b border-black py-1">
                        <span>IGST (18%):</span>
                        <span>₹{(viewingInvoice.igst || viewingInvoice.tax || 0).toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between border-b border-black py-1">
                          <span>CGST (9%):</span>
                          <span>₹{(viewingInvoice.cgst || (viewingInvoice.tax || 0) / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-black py-1">
                          <span>SGST (9%):</span>
                          <span>₹{(viewingInvoice.sgst || (viewingInvoice.tax || 0) / 2).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between border-b border-black py-1">
                      <span>Discount:</span>
                      <span>₹{(viewingInvoice.discount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b border-black py-1">
                      <span>Round Off:</span>
                      <span>₹{(viewingInvoice.round_off || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg py-2 border-t-2 border-black">
                      <span>Grand Total:</span>
                      <span>₹{(viewingInvoice.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Authorized Signature */}
                  <div className="mt-8 text-right">
                    <div className="inline-block border-t border-black pt-2 px-8">
                      <div className="font-semibold">Authorized Signature</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Image */}
              <div className="mt-6">
                <img 
                  src="/Invoice_footer.png" 
                  alt="Invoice Footer" 
                  className="w-full"
                  style={{ objectFit: 'cover', width: '100%' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Convert number to words for Indian currency
const numberToWords = (num) => {
  if (num === 0) return 'Zero Rupees Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  const convertLessThanThousand = (n) => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  };
  
  if (num < 1000) return convertLessThanThousand(num) + ' Rupees Only';
  if (num < 100000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return convertLessThanThousand(thousands) + ' Thousand' + 
           (remainder !== 0 ? ' ' + convertLessThanThousand(remainder) : '') + ' Rupees Only';
  }
  if (num < 10000000) {
    const lakhs = Math.floor(num / 100000);
    const remainder = num % 100000;
    const thousands = Math.floor(remainder / 1000);
    const hundreds = remainder % 1000;
    let result = convertLessThanThousand(lakhs) + ' Lakh';
    if (thousands !== 0) result += ' ' + convertLessThanThousand(thousands) + ' Thousand';
    if (hundreds !== 0) result += ' ' + convertLessThanThousand(hundreds);
    return result + ' Rupees Only';
  }
  
  const crores = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let result = convertLessThanThousand(crores) + ' Crore';
  if (remainder >= 100000) {
    const lakhs = Math.floor(remainder / 100000);
    result += ' ' + convertLessThanThousand(lakhs) + ' Lakh';
    remainder = remainder % 100000;
  }
  if (remainder >= 1000) {
    const thousands = Math.floor(remainder / 1000);
    result += ' ' + convertLessThanThousand(thousands) + ' Thousand';
    remainder = remainder % 1000;
  }
  if (remainder > 0) result += ' ' + convertLessThanThousand(remainder);
  return result + ' Rupees Only';
};

export default Invoice;
