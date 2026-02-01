'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, ChevronDown, Star, FileText, Edit, Trash2, 
  FileDown, Eye, Loader2, Calendar, User, CreditCard, 
  MapPin, ChevronUp, Save, ArrowLeft, CheckCircle, AlertCircle, X, AlertTriangle,
  Search, ArrowUp, ArrowDown, Filter
} from 'lucide-react';
import { apiFetch } from '@/lib/api';


export default function InvoicesPage() {
  const router = useRouter();
  
  // List View State
  const [showDropdown, setShowDropdown] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  
  // Search, Sort & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });



  // Delete & Notification State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });



  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getFilteredInvoices = () => {
    let filtered = [...invoices];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(inv => 
        (inv.customer_name?.toLowerCase() || '').includes(q) ||
        (inv.invoice_number?.toLowerCase() || '').includes(q)
      );
    }

    // Status Filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(inv => inv.invoice_status === statusFilter);
    }

    // Date Filter
    if (dateFilter.start) {
      filtered = filtered.filter(inv => new Date(inv.invoice_date) >= new Date(dateFilter.start));
    }
    if (dateFilter.end) {
      filtered = filtered.filter(inv => new Date(inv.invoice_date) <= new Date(dateFilter.end));
    }

    // Sort
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
  
  const dropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);

  useEffect(() => {
    fetchInvoices();
    
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, statusDropdownRef]);

  const fetchInvoices = async () => {
    try {
      const res = await apiFetch('/v1/invoices');
      if (res.ok) {
        const json = await res.json();
        setInvoices(json.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch invoices", error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedInvoices(invoices.map(inv => inv.invoice_id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (id) => {
    setSelectedInvoices(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleBulkStatusUpdate = async (newStatus) => {
    setIsBulkUpdating(true);
    setShowStatusDropdown(false);
    
    try {
      const res = await apiFetch(`/v1/invoices/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            invoice_ids: selectedInvoices,
            status: newStatus 
        })
      });

      if (res.status === 200) {
        setNotification({
            show: true,
            type: 'success',
            message: `Successfully updated ${selectedInvoices.length} invoices to ${newStatus}`
        });

        // Refresh list and clear selection
        fetchInvoices();
        setSelectedInvoices([]);
      } else {
        const data = await res.json().catch(() => ({}));
        setNotification({
            show: true,
            type: 'error',
            message: data.message || 'Failed to update invoices.'
        });
      }

    } catch (error) {
      console.error("Bulk update failed", error);
      setNotification({
        show: true,
        type: 'error',
        message: error.message || 'Failed to update invoices.'
      });
    } finally {
      setIsBulkUpdating(false);
      setTimeout(() => setNotification(p => ({...p, show: false})), 3000);
    }
  };

  const handleGenerateClick = (invoiceId, templateId) => {
      if (!templateId) {
          setNotification({ show: true, type: 'error', message: 'Invoice does not have a linked template.' });
          setTimeout(() => setNotification(p => ({...p, show: false})), 3000);
          return;
      }
      
      // Store IDs in sessionStorage and navigate to preview page
      if (typeof window !== 'undefined') {
          sessionStorage.setItem('previewInvoiceId', invoiceId);
          sessionStorage.setItem('previewTemplateId', templateId);
          router.push('/invoices/preview');
      }
  };

  const handleDropdownClick = async (e) => {
    e.stopPropagation();
    if (!showDropdown) {
        setLoadingTemplates(true);
        setShowDropdown(true);
        try {
            const res = await apiFetch('/templates');
            if (res.ok) {
                const data = await res.json();
                setTemplates(Array.isArray(data) ? data : (data.data || []));
            }
        } catch (error) {
            console.error("Failed to fetch templates", error);
        } finally {
            setLoadingTemplates(false);
        }
    } else {
        setShowDropdown(false);
    }
  };

  const handleSetDefault = async (e, id) => {
    e.stopPropagation();
    try {
        const res = await apiFetch("/templates/default", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ template_id: id, is_default: true })
        });
        if (res.ok) {
            setTemplates(prev => prev.map(t => ({
                ...t,
                is_default: t.template_id === id
            })));
        }
    } catch (err) {
        console.error("Failed to set default", err);
    }
  };

  const handleDeleteClick = (id) => {
    setInvoiceToDelete(id);
    setShowDeleteConfirm(true);
  };
  
  const handleBulkDeleteClick = () => {
    if (selectedInvoices.length === 0) return;
    setInvoiceToDelete(null); // Indicates bulk delete
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete && selectedInvoices.length === 0) return;
    
    try {
        let res;
        
        const idsToDelete = invoiceToDelete ? [invoiceToDelete] : selectedInvoices;

        res = await apiFetch('/v1/invoices', {
             method: 'DELETE',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ invoice_ids: idsToDelete })
        });

      setShowDeleteConfirm(false);

      if (res.status === 204 || res.status === 200) {
        setNotification({
          show: true,
          type: 'success',
          message: invoiceToDelete ? 'Invoice deleted successfully.' : `Deleted ${selectedInvoices.length} invoices successfully.`
        });
        
        // Remove from list immediately
        if (invoiceToDelete) {
            setInvoices(prev => prev.filter(inv => inv.invoice_id !== invoiceToDelete));
        } else {
            setInvoices(prev => prev.filter(inv => !selectedInvoices.includes(inv.invoice_id)));
            setSelectedInvoices([]);
        }
        
      } else {
        const data = await res.json().catch(() => ({}));
        setNotification({
          show: true,
          type: 'error',
          message: data.message || 'Failed to delete.'
        });
      }
    } catch (error) {
      console.error("Delete error", error);
      setShowDeleteConfirm(false);
       setNotification({
          show: true,
          type: 'error',
          message: 'An unexpected error occurred.'
        });
    } finally {
      setInvoiceToDelete(null);
      setTimeout(() => {
         setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
    }
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  // --- Edit Logic ---

  const handleEditClick = (invId) => {
      // Find the invoice in the current list to get the template_id
      const inv = invoices.find(i => i.invoice_id === invId);
      
      if (typeof window !== 'undefined') {
          sessionStorage.setItem('editInvoiceId', invId);
          if (inv && inv.template_id) {
              sessionStorage.setItem('editTemplateId', inv.template_id);
          }
          router.push(`/invoices/edit`);
      }
  };

  /* 
   * Edit logic has been moved to /invoices/edit/page.js
   * Previous in-page edit functions and states can be cleaned up later.
   */

  // --- Render ---

  // Removed isEditing check as navigation handles it now.

  // --- List View ---

  return (
    <div className="flex-1 bg-slate-50 overflow-auto">
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
              <p className="text-slate-600 mt-1">Manage and create invoices</p>
            </div>
            
            <div className="relative inline-flex shadow-sm rounded-lg" ref={dropdownRef}>
                <button
                    onClick={() => router.push('/invoices/create')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-l-lg hover:bg-blue-700 transition-colors font-medium border-r border-blue-500"
                >
                    <Plus size={20} />
                    Create Invoice
                </button>
                <button
                    onClick={handleDropdownClick}
                    className="bg-blue-600 text-white px-2 py-2 rounded-r-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    <ChevronDown size={20} />
                </button>
                
                {showDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-full min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        {loadingTemplates ? (
                            <div className="flex items-center justify-center p-4 text-slate-500 text-sm gap-2">
                                <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                                Loading...
                            </div>
                        ) : templates.length > 0 ? (
                            <>
                                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Select Template</div>
                                {templates.map(t => (
                                    <div 
                                        key={t.template_id}
                                        onClick={() => router.push(`/invoices/create?template_id=${t.template_id}`)}
                                        className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center justify-between group cursor-pointer"
                                    >
                                        <span className="truncate">{t.template_name}</span>
                                        {t.is_default ? (
                                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">DEFAULT</span>
                                        ) : (
                                            <button
                                                onClick={(e) => handleSetDefault(e, t.template_id)}
                                                className="text-slate-300 hover:text-yellow-500 hover:fill-yellow-500 transition-colors"
                                                title="Set as default"
                                            >
                                                <Star size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="p-4 text-center text-sm text-slate-500">No templates found</div>
                        )}
                    </div>
                )}
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
            {/* Search and Filters Bar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
              
              {/* Search */}
              <div className="relative flex-1 min-w-[300px]">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by Invoice No or Customer Name" 
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                 {/* Status Filter */}
                 <div className="relative group">
                    <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="appearance-none pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-blue-400 transition-colors cursor-pointer"
                    >
                        <option value="ALL">All Status</option>
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="PAID">Paid</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                 </div>

                 {/* Date Range - Simplified */}
                 <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 px-3">
                     <Calendar size={16} className="text-slate-400 shrink-0" />
                     <input 
                        type="date"
                        value={dateFilter.start}
                        onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})}
                        className="text-sm text-slate-600 focus:outline-none bg-transparent w-[130px] sm:w-auto" 
                     />
                     <span className="text-slate-300">-</span>
                     <input 
                        type="date"
                        value={dateFilter.end}
                        onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})}
                        className="text-sm text-slate-600 focus:outline-none bg-transparent w-[130px] sm:w-auto"
                     />
                 </div>

                 {/* Reset Filters */}
                 {(statusFilter !== 'ALL' || dateFilter.start || dateFilter.end || searchQuery) && (
                    <button 
                        onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('ALL');
                            setDateFilter({ start: '', end: '' });
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Reset Filters"
                    >
                        <X size={18} />
                    </button>
                 )}
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedInvoices.length > 0 && (
            <div className="px-6 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                <CheckCircle size={16} />
                {selectedInvoices.length} selected
              </span>
              <div className="h-4 w-px bg-blue-200"></div>
              
              <div className="relative" ref={statusDropdownRef}>
                <button 
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  disabled={isBulkUpdating}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-700 hover:text-blue-600 hover:border-blue-300 border border-slate-200 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50"
                >
                   {isBulkUpdating ? <Loader2 size={14} className="animate-spin" /> : "Update Status"}
                   <ChevronDown size={14} />
                </button>
                {showStatusDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {['DRAFT', 'SENT', 'PAID', 'CANCELLED'].map(status => (
                      <button
                        key={status}
                        onClick={() => handleBulkStatusUpdate(status)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white text-purple-600 hover:bg-purple-50 hover:border-purple-300 border border-slate-200 rounded-lg text-sm font-medium transition-all shadow-sm">
                <FileDown size={16} />
                Generate Selected
              </button>
              <button 
                onClick={handleBulkDeleteClick}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 border border-slate-200 rounded-lg text-sm font-medium transition-all shadow-sm"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Delete Selected</span>
              </button>
            </div>
            )}
            
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                  <tr className="border-b border-blue-100 bg-blue-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <th className="pl-6 py-4 text-left w-16">
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={invoices.length > 0 && selectedInvoices.length === invoices.length}
                          onChange={handleSelectAll}
                        />
                      </div>
                    </th>
                    
                    <th 
                        className="py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                        onClick={() => handleSort('invoice_number')}
                    >
                        <div className="flex items-center justify-center gap-1 group-hover:text-blue-600">
                            Invoice No
                            {sortConfig.key === 'invoice_number' && (
                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />
                            )}
                        </div>
                    </th>

                    <th 
                        className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                        onClick={() => handleSort('invoice_date')}
                    >
                        <div className="flex items-center justify-center gap-1 group-hover:text-blue-600">
                            Date
                            {sortConfig.key === 'invoice_date' && (
                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />
                            )}
                        </div>
                    </th>

                    <th 
                        className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                        onClick={() => handleSort('customer_name')}
                    >
                         <div className="flex items-center justify-center gap-1 group-hover:text-blue-600">
                            Customer
                            {sortConfig.key === 'customer_name' && (
                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />
                            )}
                        </div>
                    </th>

                    <th 
                        className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                        onClick={() => handleSort('total_amount')}
                    >
                         <div className="flex items-center justify-center gap-1 group-hover:text-blue-600">
                            Amount
                            {sortConfig.key === 'total_amount' && (
                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />
                            )}
                        </div>
                    </th>

                    <th 
                        className="pl-6 pr-2 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                        onClick={() => handleSort('invoice_status')}
                    >
                        <div className="flex items-center justify-center gap-1 group-hover:text-blue-600">
                            Status
                            {sortConfig.key === 'invoice_status' && (
                                sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />
                            )}
                        </div>
                    </th>

                    <th className="pl-2 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingInvoices ? (
                      <tr>
                          <td colSpan="7" className="text-center py-12">
                                <div className="flex flex-col items-center justify-center text-slate-400">
                                    <Loader2 size={32} className="animate-spin mb-4 text-blue-500" />
                                    <p>Loading invoices...</p>
                                </div>
                          </td>
                      </tr>
                  ) : filteredInvoices.length === 0 ? (
                      <tr>
                          <td colSpan="7" className="text-center py-12">
                                <div className="flex flex-col items-center justify-center text-slate-400">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <Search size={24} className="text-slate-400" />
                                    </div>
                                    <p className="text-slate-600 font-medium">No invoices found</p>
                                    <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                                </div>
                          </td>
                      </tr>
                  ) : filteredInvoices.map((inv) => (
                    <tr 
                      key={inv.invoice_id} 
                      className={`hover:bg-slate-100 transition-colors group ${selectedInvoices.includes(inv.invoice_id) ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="pl-6 py-4">
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedInvoices.includes(inv.invoice_id)}
                            onChange={() => handleSelectInvoice(inv.invoice_id)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="font-semibold text-slate-900 transition-colors">
                          {inv.invoice_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 group-hover:text-slate-900 text-center transition-colors">
                        <div className="flex items-center justify-center gap-2">
                          <Calendar size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                          {inv.invoice_date}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 group-hover:text-slate-900 text-center transition-colors">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                             {inv.customer_name?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700">{inv.customer_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 text-center">
                        ${inv.total_amount?.toFixed(2)}
                      </td>
                      <td className="pl-6 pr-2 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          inv.invoice_status === 'PAID' 
                            ? 'bg-green-50 text-green-700 border-green-300' 
                            : inv.invoice_status === 'DRAFT'
                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : inv.invoice_status === 'CANCELLED'
                            ? 'bg-red-50 text-red-700 border-red-300'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-300'
                        }`}>
                          {inv.invoice_status}
                        </span>
                      </td>
                      <td className="pl-2 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all" 
                            title="Edit Invoice"
                            onClick={() => handleEditClick(inv.invoice_id)}
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg transition-all" 
                            title="Generate/Download"
                            onClick={() => handleGenerateClick(inv.invoice_id, inv.template_id)}
                          >
                            <FileDown size={18} />
                          </button>
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setInvoiceToDelete(inv.invoice_id);
                                setShowDeleteConfirm(true); 
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                            title="Delete Invoice"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Invoice?</h3>
              <p className="text-slate-500 mb-6">
                 {invoiceToDelete ? (
                    <>Are you sure you want to delete the <span className="font-semibold">{invoices.find(i => i.invoice_id === invoiceToDelete)?.invoice_number}</span> invoice?</>
                 ) : (
                    <>Are you sure you want to delete <span className="font-semibold">{selectedInvoices.length}</span> selected invoices?</>
                 )}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 font-medium rounded-lg transition-colors shadow-sm shadow-red-200"
                >
                  Delete Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
          <div className={`flex items-center gap-4 px-6 py-5 rounded-xl shadow-2xl border min-w-[320px] ${
            notification.type === 'success' 
              ? 'bg-white border-green-100 text-slate-800' 
              : 'bg-white border-red-100 text-slate-800'
          }`}>
            {notification.type === 'success' ? (
              <div className="p-2 bg-green-100 rounded-full text-green-600">
                <CheckCircle size={24} />
              </div>
            ) : (
              <div className="p-2 bg-red-100 rounded-full text-red-600">
                <AlertCircle size={24} />
              </div>
            )}
            <div className="flex-1">
              <h4 className={`font-bold ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {notification.type === 'success' ? 'Success' : 'Error'}
              </h4>
              <p className="text-sm text-slate-600 font-medium mt-0.5">{notification.message}</p>
            </div>
            <button 
              onClick={closeNotification}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors -mr-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
