'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, ChevronDown, ChevronUp, Search, Filter, 
  Loader2, Edit, Trash2, Eye, FileText, Calendar, Copy, CheckCircle
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import InvoicePreviewPanel from '@/components/invoices/InvoicePreviewPanel';

export default function InvoicesPage() {
  const router = useRouter();
  
  // Data State
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  
  // Sort State
  const [sortConfig, setSortConfig] = useState({ key: 'invoice_date', direction: 'desc' });

  // UI State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPreviewFullScreen, setIsPreviewFullScreen] = useState(false);
  
  // Refs
  const statusDropdownRef = useRef(null);

  // Load saved filters on mount
  useEffect(() => {
    const saved = localStorage.getItem('invoice_filters');
    if (saved) {
      try {
        const { q, s, df, dt, sort } = JSON.parse(saved);
        if (q) setSearchQuery(q);
        if (s) setStatusFilter(s);
        if (df) setDateFrom(df);
        if (dt) setDateTo(dt);
        if (sort) setSortConfig(sort);
      } catch (e) {
        console.error('Error parsing saved filters', e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save filters when changed
  useEffect(() => {
    if (!isInitialized) return;
    const filters = {
      q: searchQuery,
      s: statusFilter,
      df: dateFrom,
      dt: dateTo,
      sort: sortConfig
    };
    localStorage.setItem('invoice_filters', JSON.stringify(filters));
  }, [searchQuery, statusFilter, dateFrom, dateTo, sortConfig, isInitialized]);

  // Fetch invoices on mount
  useEffect(() => {
    fetchInvoices();
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('api/v1/invoices');
      if (res.ok) {
        const json = await res.json();
        setInvoices(json.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch invoices", error);
    } finally {
      setLoading(false);
    }
  };

  // Sorting
  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={14} className="inline ml-1" />
      : <ChevronDown size={14} className="inline ml-1" />;
  };

  // Filtering & Sorting Logic
  const getFilteredInvoices = () => {
    let filtered = [...invoices];
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(inv => 
        (inv.customer_name?.toLowerCase() || '').includes(q) ||
        (inv.invoice_number?.toLowerCase() || '').includes(q)
      );
    }
    
    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(inv => inv.invoice_status === statusFilter);
    }
    
    // Date from filter
    if (dateFrom) {
      filtered = filtered.filter(inv => new Date(inv.invoice_date) >= new Date(dateFrom));
    }
    
    // Date to filter
    if (dateTo) {
      filtered = filtered.filter(inv => new Date(inv.invoice_date) <= new Date(dateTo));
    }
    
    // Sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === 'total_amount') {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        } else if (sortConfig.key === 'invoice_date') {
          aVal = new Date(aVal || '1970-01-01');
          bVal = new Date(bVal || '1970-01-01');
        } else {
          aVal = (aVal || '').toString().toLowerCase();
          bVal = (bVal || '').toString().toLowerCase();
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  };

  const filteredInvoices = getFilteredInvoices();

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredInvoices.map(inv => inv.invoice_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const isAllSelected = filteredInvoices.length > 0 && selectedIds.length === filteredInvoices.length;

  // Actions
  const handleDelete = (invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteConfirm(true);
  };

  const handlePreview = (invoice) => {
    setPreviewInvoice(invoice);
  };

  const handleDuplicate = async (invoice) => {
    try {
      const res = await apiFetch(`api/v1/invoices/${invoice.invoice_id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        fetchInvoices();
      }
    } catch (e) {
      console.error('Error duplicating invoice', e);
    }
  };

  const handleDeleteAll = () => {
    setInvoiceToDelete(null);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const idsToDelete = invoiceToDelete ? [invoiceToDelete.invoice_id] : selectedIds;
      
      await apiFetch('api/v1/invoices', {
        method: 'DELETE',
        body: JSON.stringify({ invoice_ids: idsToDelete })
      });
      
      if (!invoiceToDelete) {
        setSelectedIds([]);
      } else {
        setSelectedIds(prev => prev.filter(id => id !== invoiceToDelete.invoice_id));
      }

      setShowDeleteConfirm(false);
      setInvoiceToDelete(null);
      fetchInvoices();
    } catch (e) {
      console.error('Error deleting invoices', e);
    }
  };

  const handleGenerateAll = async () => {
    try {
      await Promise.all(
        selectedIds.map(id => apiFetch(`api/v1/invoices/${id}/generate`, { method: 'POST' }))
      );
      setSelectedIds([]);
      fetchInvoices();
    } catch (e) {
      console.error('Error generating invoices', e);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-600 ring-1 ring-slate-500/20';
      case 'GENERATED':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20';
      default:
        return 'bg-slate-100 text-slate-600 ring-1 ring-slate-500/20';
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-400';
      case 'GENERATED': return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className={`w-full h-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/50 flex flex-col ${previewInvoice ? 'p-2' : 'p-8'}`}>
      {/* Header */}
      {!previewInvoice && (
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-slate-500 mt-1">Manage and track all your invoices</p>
        </div>
        <Link 
          href="/invoices/create"
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium shadow-md"
        >
          <Plus size={16} />
          Create Invoice
        </Link>
      </div>
      )}

      {/* Actions Toolbar */}
      {!previewInvoice && (
      <div className="flex flex-col xl:flex-row gap-4 mb-4 items-start xl:items-center justify-between w-full lg:h-[60px]">
        
        {/* Selection Actions */}
        <div className="h-full flex items-center min-h-[44px]">
          {selectedIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 flex items-center gap-4 shadow-sm whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-200">
              <div className="flex items-center gap-2 text-blue-700 font-medium text-[15px]">
                <CheckCircle size={18} />
                <span>{selectedIds.length} Selected</span>
              </div>
              <div className="h-5 w-px bg-blue-200"></div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all text-sm font-medium shadow-sm hover:shadow"
                >
                  <FileText size={16} />
                  Generate All
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all text-sm font-medium shadow-sm hover:shadow"
                >
                  <Trash2 size={16} />
                  Delete All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filters Bar */}
        <div className="bg-white/80 backdrop-blur-sm max-w-[800px] border border-slate-200/60 rounded-2xl px-4 py-2 shadow-md flex-1 relative z-20">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm bg-slate-50/80 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative" ref={statusDropdownRef}>
              <button 
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm text-slate-700 font-medium transition-all"
              >
                <Filter size={16} className="text-slate-400" />
                <span>{statusFilter === 'ALL' ? 'All' : statusFilter}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showStatusDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  {['ALL', 'DRAFT', 'GENERATED'].map(status => (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); setShowStatusDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${statusFilter === status ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600'}`}
                    >
                      <div className="flex items-center gap-2">
                        {status !== 'ALL' && <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(status)}`}></span>}
                        {status === 'ALL' ? 'All Status' : status}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Date Range */}
            <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-2 rounded-lg border border-slate-200">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm bg-transparent border-none focus:outline-none text-slate-700 w-28"
                placeholder="From"
              />
              <span className="text-slate-300 text-sm">→</span>
              <input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm bg-transparent border-none focus:outline-none text-slate-700 w-28"
                placeholder="To"
              />
            </div>
            
            {/* Clear Filters */}
            {(searchQuery || statusFilter !== 'ALL' || dateFrom || dateTo || sortConfig.key !== 'invoice_date' || sortConfig.direction !== 'desc') && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setDateFrom('');
                  setDateTo('');
                  setSortConfig({ key: 'invoice_date', direction: 'desc' });
                }}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium px-3 py-2 hover:bg-slate-100 rounded-md transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 w-full">
        {previewInvoice ? (
          <div className="flex flex-col lg:flex-row h-full gap-4">
            {/* Left: Compact List (20%) - Hidden in Full Screen Mode */}
            {!isPreviewFullScreen && (
            <div className="w-full lg:w-[25%] bg-white border border-slate-200/60 rounded-2xl overflow-hidden flex flex-col min-w-[280px] shadow-sm">
               <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                 <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-700">Invoices List</h2>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{filteredInvoices.length}</span>
                 </div>
                 
                 <div className="space-y-2">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-400"
                            />
                        </div>
                        
                        <div className="relative w-[85px] shrink-0">
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full appearance-none pl-2 pr-6 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-600 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer"
                            >
                                <option value="ALL">All</option>
                                <option value="DRAFT">Draft</option>
                                <option value="GENERATED">Done</option>
                            </select>
                            <Filter size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex gap-2 items-center">
                        <input 
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full min-w-0 text-[10px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" 
                        />
                        <span className="text-slate-300 text-[10px]">-</span>
                        <input 
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full min-w-0 text-[10px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" 
                        />
                        {(searchQuery || statusFilter !== 'ALL' || dateFrom || dateTo) && (
                            <button 
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('ALL');
                                    setDateFrom('');
                                    setDateTo('');
                                }}
                                className="shrink-0 px-2.5 py-1.5 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold"
                                title="Reset Filters"
                            >
                                X
                            </button>
                        )}
                    </div>
                 </div>
               </div>
               <div className="overflow-y-auto flex-1 p-2 space-y-2">
                 {filteredInvoices.map((inv) => (
                   <div 
                     key={inv.invoice_id}
                     onClick={() => setPreviewInvoice(inv)}
                     className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                       previewInvoice.invoice_id === inv.invoice_id 
                         ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' 
                         : 'bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50'
                     }`}
                   >
                     <div className="flex justify-between items-start mb-1">
                       <span className="font-semibold text-sm text-slate-800">{inv.invoice_number}</span>
                       <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${getStatusStyle(inv.invoice_status)}`}>
                         {inv.invoice_status}
                       </span>
                     </div>
                     <div className="text-xs text-slate-500 mb-2 truncate">{inv.customer_name || 'No Customer'}</div>
                     <div className="flex justify-between items-center text-xs">
                       <span className="text-slate-400">{formatDate(inv.invoice_date)}</span>
                       <span className="font-bold text-slate-700 font-mono">
                          {parseFloat(inv.total_amount || 0).toLocaleString('en-US', { 
                            style: 'currency', 
                            currency: inv.currency || 'USD' 
                          })}
                       </span>
                     </div>
                   </div>
                 ))}
                 {filteredInvoices.length === 0 && (
                   <div className="text-center py-8 text-slate-400 text-sm">No invoices found</div>
                 )}
               </div>
            </div>
            )}
            
            {/* Right: Preview (80%) - Expanded Mode covers Header but respects Sidebar */}
            <div className={`
                bg-white overflow-hidden shadow-sm h-full flex flex-col transition-all duration-200
                ${isPreviewFullScreen 
                    ? 'fixed top-0 right-0 bottom-0 left-56 z-30 rounded-none border-0' 
                    : 'flex-1 min-w-0 border border-slate-200/60 rounded-2xl'
                }
            `}>
                <InvoicePreviewPanel 
                   invoiceId={previewInvoice.invoice_id}
                   templateId={previewInvoice.template_id}
                   onClose={() => setPreviewInvoice(null)}
                   isFullScreen={isPreviewFullScreen}
                   onToggleFullScreen={() => setIsPreviewFullScreen(prev => !prev)}
                />
            </div>
          </div>
        ) : (
          /* Table */
          <div className="w-full bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-full">
            <div className="overflow-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-blue-200/60">
                    <th className="sticky top-0 z-10 bg-blue-100 px-3 py-4 text-center w-[5%]">
                      <input 
                        type="checkbox" 
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                      />
                    </th>
                    <th 
                      className="sticky top-0 z-10 bg-blue-100 px-3 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-blue-200 select-none transition-colors"
                      onClick={() => handleSort('invoice_date')}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        Date 
                        <span className="text-blue-500">{getSortIcon('invoice_date')}</span>
                      </span>
                    </th>
                    <th 
                      className="sticky top-0 z-10 bg-blue-100 px-3 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-blue-200 select-none transition-colors"
                      onClick={() => handleSort('invoice_number')}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        Invoice No 
                        <span className="text-blue-500">{getSortIcon('invoice_number')}</span>
                      </span>
                    </th>
                    <th 
                      className="sticky top-0 z-10 bg-blue-100 px-3 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-blue-200 select-none transition-colors"
                      onClick={() => handleSort('customer_name')}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        Customer 
                        <span className="text-blue-500">{getSortIcon('customer_name')}</span>
                      </span>
                    </th>
                    <th 
                      className="sticky top-0 z-10 bg-blue-100 px-3 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-blue-200 select-none transition-colors"
                      onClick={() => handleSort('total_amount')}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        Amount 
                        <span className="text-blue-500">{getSortIcon('total_amount')}</span>
                      </span>
                    </th>
                    <th 
                      className="sticky top-0 z-10 bg-blue-100 px-3 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-blue-200 select-none transition-colors"
                      onClick={() => handleSort('invoice_status')}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        Status 
                        <span className="text-blue-500">{getSortIcon('invoice_status')}</span>
                      </span>
                    </th>
                    <th className="sticky top-0 z-10 bg-blue-100 px-3 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                      </div>
                      <span className="text-slate-500 font-medium">Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                        <FileText className="text-slate-400" size={28} />
                      </div>
                      <div>
                        <p className="text-slate-700 font-medium">No invoices found</p>
                        <p className="text-slate-400 text-sm mt-0.5">Try adjusting your filters or create a new invoice</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, index) => (
                  <tr 
                    key={inv.invoice_id} 
                    className="hover:bg-slate-100 transition-all duration-150 group"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <td className="px-3 py-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(inv.invoice_id)}
                        onChange={() => handleSelectOne(inv.invoice_id)}
                        className="w-4 h-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-4 text-center text-sm text-slate-500 font-medium">
                      {formatDate(inv.invoice_date)}
                    </td>
                    <td className="px-3 py-4 text-center">
                      <Link 
                        href={`/invoices/edit?id=${inv.invoice_id}`}
                        className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                          {(inv.customer_name || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-700 font-medium">
                          {inv.customer_name || <span className="text-slate-400 font-normal">No customer</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <span className="text-sm font-bold text-slate-900 font-mono tracking-tight">
                        {parseFloat(inv.total_amount || 0).toLocaleString('en-US', { 
                          style: 'currency', 
                          currency: inv.currency || 'USD' 
                        })}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${getStatusStyle(inv.invoice_status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(inv.invoice_status)}`}></span>
                        {inv.invoice_status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button 
                          onClick={() => handlePreview(inv)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="Preview"
                        >
                          <Eye size={18} />
                        </button>
                        <Link 
                          href={`/invoices/edit?id=${inv.invoice_id}`}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(inv)}
                          className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all duration-200"
                          title="Duplicate"
                        >
                          <Copy size={18} />
                        </button>
                        <div className="w-px h-5 bg-slate-200 mx-1"></div>
                        <button
                          onClick={() => handleDelete(inv)} 
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-[400px] animate-in zoom-in-95 duration-200 p-6">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="text-red-500" size={28} />
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Invoice?</h3>
              
              <p className="text-slate-500 text-center mb-6 text-sm leading-relaxed">
                Are you sure you want to delete {invoiceToDelete ? (
                  <>invoice <span className="font-bold text-slate-900">{invoiceToDelete.invoice_number}</span>?</>
                ) : (
                  <><span className="font-bold text-slate-900">{selectedIds.length}</span> invoice(s)?</>
                )} 
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-md shadow-red-200 transition-all duration-200"
                >
                  Delete
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
