'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Loader2, Pencil, Trash2, AlertCircle } from 'lucide-react';

export default function CustomersIndexPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // Ensure we call the correct endpoint
      const response = await apiFetch('/customers'); 
      if (response.ok) {
        const data = await response.json();
        // Handle the nested data structure specified in the prompt
        // Response format: { status: true, message: "...", data: [...] }
        setCustomers(data.data || []);
      } else {
        // If 404 or other valid error, just set empty array? Or show error?
        // Assuming if fetch fails we show empty or error
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || 'Failed to fetch customers');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDeleteClick = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    
    try {
        const response = await apiFetch(`/customers/${deleteId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Remove from local state
            setCustomers(customers.filter(c => c.customer_id !== deleteId));
            setDeleteId(null);
        } else {
            console.error("Failed to delete");
            alert("Failed to delete customer");
        }
    } catch (error) {
        console.error("Error deleting customer", error);
        alert("Error deleting customer");
    }
  };

  const cancelDelete = () => {
    setDeleteId(null);
  };
  
  const handleEdit = (id) => {
      router.push(`/customers/new?id=${id}`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <Trash2 size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Delete Customer</h3>
                    <p className="text-slate-500 text-sm">Are you sure you want to delete this customer?</p>
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
                <button 
                    onClick={cancelDelete}
                    className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={confirmDelete}
                    className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                >
                    Delete Customer
                </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-1">Manage your customers and billing details.</p>
        </div>
        <Link 
          href="/customers/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Customer
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
           <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
             <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
             <h3 className="text-lg font-medium text-red-900">Error Loading Customers</h3>
             <p className="text-red-700 mb-4">{error}</p>
             <button onClick={fetchCustomers} className="text-blue-600 hover:underline font-medium">Try Again</button>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No customers yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-6">
            Get started by adding your first customer to generate invoices for them.
            </p>
            <Link
            href="/customers/new"
            className="text-blue-600 hover:text-blue-700 font-medium"
            >
            Add your first customer &rarr;
            </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 border-b border-blue-100">
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">S.No</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Name</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">GST No</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">City</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">State</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer, index) => (
                <tr key={customer.customer_id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                    {customer.customer_name}
                  </td>
                   <td className="px-6 py-4 text-sm text-slate-600">
                    {customer.gst_no || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {customer.address?.city || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {customer.address?.state || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right">
                    <div className="flex items-center justify-end gap-3">
                        <button 
                            onClick={() => handleEdit(customer.customer_id)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Customer"
                        >
                            <Pencil size={18} />
                        </button>
                        <button 
                            onClick={() => handleDeleteClick(customer.customer_id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Customer"
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
      )}
    </div>
  );
}
