import { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { toast } from 'sonner';
import { Trash2, Search, FileText, Package, TrendingUp, BarChart3, Download, Filter, RefreshCw, AlertCircle, Pencil, Check, X, ChevronDown, Eraser } from 'lucide-react';
import { dbOperations } from '@/lib/db';
import useSettingsStore from '@/store/settingsStore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import TyreWorkRatesMemory from './TyreWorkRatesMemory';

const RateListMemoryTab = () => {
  const { saveRateListMemory, loadRateListMemory } = useSettingsStore();
  const [rateList, setRateList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ actual_price: '', selling_price: '' });
  const [visibleCount, setVisibleCount] = useState(10);
  const [showData, setShowData] = useState(false);
  const tableRef = useRef(null);

  useEffect(() => {
    loadCategories();
    loadRateList();
  }, []);

  // Reset pagination whenever the filters change
  useEffect(() => {
    setVisibleCount(10);
  }, [searchTerm, categoryFilter]);

  const loadCategories = async () => {
    try {
      const data = await dbOperations.getAll('inventory_categories') || [];
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadRateList = async () => {
    setLoading(true);
    try {
      // Try loading from new backend structure first
      const result = await loadRateListMemory();
      if (result.success && result.data && result.data.rateLists) {
        // New backend structure uses rateLists array
        setRateList(result.data.rateLists);
      } else {
        // Fallback to IndexedDB — exclude the tyre-work config record, which
        // shares this table but is not a material row.
        const data = await dbOperations.getAll('rate_list_memory') || [];
        setRateList(data.filter(r => r.list_name !== 'tyre_work_memory' && r.material_name));
      }
    } catch (error) {
      console.error('Error loading rate list:', error);
      toast.error('Failed to load rate list');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      // Delete from IndexedDB
      await dbOperations.delete('rate_list_memory', id);
      
      // Update new backend structure
      const updatedList = rateList.filter(item => item.id !== id);
      await saveRateListMemory({ rateLists: updatedList });
      
      toast.success('Item deleted successfully');
      loadRateList();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValues({
      actual_price: (item.actual_price ?? item.rate ?? 0).toString(),
      selling_price: (item.selling_price ?? item.rate ?? 0).toString()
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ actual_price: '', selling_price: '' });
  };

  const handleSaveEdit = async (id) => {
    const actualPrice = parseFloat(editValues.actual_price) || 0;
    const sellingPrice = parseFloat(editValues.selling_price) || 0;

    try {
      await dbOperations.update('rate_list_memory', id, {
        actual_price: actualPrice,
        selling_price: sellingPrice,
        rate: sellingPrice || actualPrice,
        last_source: 'manual'
      });

      const updatedList = rateList.map(it =>
        it.id === id
          ? { ...it, actual_price: actualPrice, selling_price: sellingPrice, rate: sellingPrice || actualPrice, last_source: 'manual' }
          : it
      );
      setRateList(updatedList);
      await saveRateListMemory({ rateLists: updatedList });

      cancelEdit();
      toast.success('Rate updated successfully');
    } catch (error) {
      console.error('Error updating rate:', error);
      toast.error('Failed to update rate');
    }
  };

  const handleClearList = async () => {
    if (rateList.length === 0) {
      toast.info('List is already empty');
      return;
    }
    if (!confirm(`Clear the ENTIRE rate list (${rateList.length} items)? This cannot be undone.`)) return;

    try {
      // Delete only material rows — keep the tyre-work config record intact.
      const all = await dbOperations.getAll('rate_list_memory') || [];
      await Promise.all(
        all
          .filter(r => r.list_name !== 'tyre_work_memory' && r.material_name)
          .map(r => dbOperations.delete('rate_list_memory', r.id))
      );
      await saveRateListMemory({ rateLists: [] });
      setRateList([]);
      cancelEdit();
      toast.success('Rate list cleared successfully');
    } catch (error) {
      console.error('Error clearing rate list:', error);
      toast.error('Failed to clear rate list');
    }
  };



  const handleSavePDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Rate List Memory', 14, 20);
    
    // Filter info
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 14, 30);
    if (categoryFilter) {
      const category = categories.find(c => c.id === categoryFilter);
      doc.text(`Category: ${category?.name || 'All'}`, 14, 36);
    }
    
    // Table - now with actual_price and selling_price
    const tableData = filteredRateList.map(item => {
      const category = categories.find(c => c.id === item.category_id);
      // Support both old (rate) and new (actual_price, selling_price) formats
      const actualPrice = item.actual_price ?? item.rate ?? 0;
      const sellingPrice = item.selling_price ?? (item.rate ? item.rate * 1.5 : 0);
      return [
        item.material_name,
        category?.name || 'N/A',
        `₹${parseFloat(actualPrice).toFixed(2)}`,
        `₹${parseFloat(sellingPrice).toFixed(2)}`,
        item.last_source || 'N/A'
      ];
    });
    
    doc.autoTable({
      startY: categoryFilter ? 42 : 36,
      head: [['Material Name', 'Category', 'Actual Price', 'Selling Price', 'Source']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });
    
    // Save
    doc.save(`rate-list-memory-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF saved successfully');
  };

  const generatePrintHTML = (data) => {
    const categoryName = categoryFilter 
      ? categories.find(c => c.id === categoryFilter)?.name || 'All Categories'
      : 'All Categories';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rate List Memory</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #1e40af;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #3b82f6;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 10px 12px;
              border-bottom: 1px solid #e5e7eb;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .source-badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
            }
            .source-estimate { background: #dbeafe; color: #1e40af; }
            .source-stock { background: #dcfce7; color: #166534; }
            .source-sale { background: #fef3c7; color: #92400e; }
            .source-purchase { background: #fce7f3; color: #9d174d; }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Rate List Memory</h1>
            <p>Category: ${categoryName}</p>
            <p>Date: ${new Date().toLocaleDateString('en-GB')}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Material Name</th>
                <th>Category</th>
                <th>Actual Price (₹)</th>
                <th>Selling Price (₹)</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((item, index) => {
                const category = categories.find(c => c.id === item.category_id);
                // Support both old (rate) and new (actual_price, selling_price) formats
                const actualPrice = item.actual_price ?? item.rate ?? 0;
                const sellingPrice = item.selling_price ?? (item.rate ? item.rate * 1.5 : 0);
                const source = item.last_source || 'N/A';
                const sourceClass = source ? 'source-' + source : '';
                return '<tr>' +
                    '<td>' + (index + 1) + '</td>' +
                    '<td>' + item.material_name + '</td>' +
                    '<td>' + (category?.name || 'N/A') + '</td>' +
                    '<td>₹' + parseFloat(actualPrice).toFixed(2) + '</td>' +
                    '<td>₹' + parseFloat(sellingPrice).toFixed(2) + '</td>' +
                    '<td><span class="source-badge ' + sourceClass + '">' + source.toUpperCase() + '</span></td>' +
                  '</tr>';
              }).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString('en-GB')}</p>
          </div>
        </body>
      </html>
    `;
  };

  const filteredRateList = rateList.filter(item => {
    const matchesSearch = !searchTerm || 
      item.material_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || item.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const visibleRateList = filteredRateList.slice(0, visibleCount);
  const hasMore = filteredRateList.length > visibleCount;

  if (!showData) {
    return (
      <div className="space-y-3">
        {/* Tyre work estimate rate memory (built from legacy estimate apps) */}
        <TyreWorkRatesMemory />

        {/* Access the auto-tracked rate list memory */}
        <div className="flex items-center justify-center py-2">
          <button
            onClick={() => setShowData(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
          >
            <Package className="h-5 w-5" />
            Rate List Memory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Back button */}
      <button
        onClick={() => setShowData(false)}
        className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
      >
        <X size={14} />
        Close
      </button>

      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-2 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-white/20 p-1.5 backdrop-blur-sm">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Rate List Memory</h1>
                  <p className="text-blue-100 text-xs">Intelligent rate tracking system for all materials</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-1.5">
              <button
                onClick={() => loadRateList()}
                className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 font-medium text-sm backdrop-blur-sm transition-all hover:bg-white/30"
              >
                <RefreshCw size={14} />
                Refresh
              </button>

              <button
                onClick={handleClearList}
                className="flex items-center gap-1 rounded-lg bg-red-500/90 px-2 py-1 font-medium text-sm text-white shadow backdrop-blur-sm transition-all hover:bg-red-600"
              >
                <Eraser size={14} />
                Clear List
              </button>

              <button
                onClick={handleSavePDF}
                className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-medium text-sm text-blue-600 shadow transition-all hover:shadow-lg"
              >
                <Download size={14} />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl"></div>
          <div className="relative p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Items</p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{rateList.length}</p>
              </div>
              <div className="rounded-xl bg-emerald-500 p-2 shadow">
                <Package className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl"></div>
          <div className="relative p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Categories</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{categories.length}</p>
              </div>
              <div className="rounded-xl bg-purple-500 p-2 shadow">
                <Filter className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl"></div>
          <div className="relative p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Filtered Results</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{filteredRateList.length}</p>
              </div>
              <div className="rounded-xl bg-amber-500 p-2 shadow">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="border-0 shadow-lg">
        <div className="p-2">
          <div className="flex items-center gap-1 mb-1.5">
            <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Search & Filter</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="relative group">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
              <input
                type="text"
                placeholder="Search by material name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
              />
            </div>
            
            <div className="relative group">
              <Filter className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors" size={14} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-purple-500/10 transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="border-0 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-2 border-blue-200 dark:border-blue-800"></div>
              <div className="absolute top-0 h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400 font-medium text-sm">Loading rate list...</p>
          </div>
        ) : filteredRateList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-2 mb-2">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">No rates found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md text-sm">
              Rates will be automatically saved when you create purchase invoices, purchase challans, sell invoices, or sell challans
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" ref={tableRef}>
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <th className="px-2 py-1.5 text-left text-xs font-semibold">
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                      S.No
                    </div>
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold">Material Name</th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold">Category</th>
                  <th className="px-2 py-1.5 text-right text-xs font-semibold">Actual Price</th>
                  <th className="px-2 py-1.5 text-right text-xs font-semibold">Selling Price</th>
                  <th className="px-2 py-1.5 text-center text-xs font-semibold">Source</th>
                  <th className="px-2 py-1.5 text-center text-xs font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleRateList.map((item, idx) => {
                  const category = categories.find(c => c.id === item.category_id);
                  const rowColor = idx % 2 === 0
                    ? 'bg-white dark:bg-gray-900'
                    : 'bg-gray-50 dark:bg-gray-800/50';

                  const actualPrice = item.actual_price ?? item.rate ?? 0;
                  const sellingPrice = item.selling_price ?? (item.rate ? item.rate * 1.5 : 0);
                  const source = item.last_source || 'unknown';
                  const isEditing = editingId === item.id;

                  const sourceColors = {
                    estimate: 'from-blue-500 to-blue-600',
                    stock: 'from-emerald-500 to-emerald-600',
                    sale: 'from-amber-500 to-amber-600',
                    purchase: 'from-pink-500 to-pink-600',
                    manual: 'from-indigo-500 to-indigo-600',
                    unknown: 'from-gray-400 to-gray-500'
                  };
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`${rowColor} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group`}
                    >
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-xs shadow">
                            {idx + 1}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow">
                            <Package className="h-3 w-3 text-white" />
                          </div>
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{item.material_name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium shadow">
                          <div className="h-1 w-1 rounded-full bg-white animate-pulse"></div>
                          {category?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.actual_price}
                            onChange={(e) => setEditValues(v => ({ ...v, actual_price: e.target.value }))}
                            className="w-24 px-2 py-1 text-sm text-right border border-emerald-300 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              ₹{parseFloat(actualPrice).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.selling_price}
                            onChange={(e) => setEditValues(v => ({ ...v, selling_price: e.target.value }))}
                            className="w-24 px-2 py-1 text-sm text-right border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="h-3 w-3 text-blue-500" />
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              ₹{parseFloat(sellingPrice).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r ${sourceColors[source] || sourceColors.unknown} text-white text-xs font-semibold shadow uppercase`}>
                            {source}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all duration-200"
                                title="Save"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-500 hover:text-white dark:hover:bg-gray-600 transition-all duration-200"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(item)}
                                className="p-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all duration-200"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 transition-all duration-200"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination footer */}
            <div className="flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800 px-3 py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{visibleRateList.length}</span> of{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-300">{filteredRateList.length}</span>
              </p>
              {hasMore && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setVisibleCount(c => c + 10)}
                    className="flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all"
                  >
                    <ChevronDown size={14} />
                    Show More
                  </button>
                  <button
                    onClick={() => setVisibleCount(filteredRateList.length)}
                    className="rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-500 hover:text-white dark:hover:bg-gray-600 transition-all"
                  >
                    Show All
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Info Section */}
      <Card className="border-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 shadow-lg">
        <div className="p-2">
          <div className="flex items-start gap-2">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 shadow-lg">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                How Rate List Memory Works
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                <div className="flex items-start gap-1.5 p-1 rounded-lg bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5"></div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>Estimate:</strong> Saves actual price (cost) and selling price from job sheets
                  </p>
                </div>
                <div className="flex items-start gap-1.5 p-1 rounded-lg bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5"></div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>Stock:</strong> Saves cost price as actual and selling price from inventory
                  </p>
                </div>
                <div className="flex items-start gap-1.5 p-1 rounded-lg bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1.5"></div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    Each material's rate is saved category-wise from inventory
                  </p>
                </div>
                <div className="flex items-start gap-1.5 p-1 rounded-lg bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5"></div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    If a material already exists, both prices are updated automatically
                  </p>
                </div>
                <div className="flex items-start gap-1.5 p-1 rounded-lg bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-pink-500 mt-1.5"></div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>Source</strong> column shows where the rate was last updated from
                  </p>
                </div>
                <div className="flex items-start gap-1.5 p-1 rounded-lg bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5"></div>
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    Print or export to PDF for records and delete unwanted items anytime
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RateListMemoryTab;

