"use client";

import Link from "next/link";
import {
  Plus,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Star,
  Copy,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import InvoiceTemplateBuilder from "@/components/invoice-template/InvoiceTemplateBuilder";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function TemplatesPage() {
  const router = useRouter();
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  // States for deletion flow
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [apiResponse, setApiResponse] = useState(null); // { type: 'success' | 'error', message: '' }
  const [warningModal, setWarningModal] = useState({ open: false, message: "" });

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (apiResponse) {
      const timer = setTimeout(() => setApiResponse(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [apiResponse]);

  const fetchTemplates = async () => {
    try {
      const response = await apiFetch("/templates");
      if (response.ok) {
        const data = await response.json();
        setSavedTemplates(data);
        if (Array.isArray(data) && data.length === 0) {
          router.push("/templates/create");
        }
      } else {
        if (response.status >= 400 && response.status < 500) {
          const resText = await response.text();
          let message = "Failed to fetch templates";
          try {
            const json = JSON.parse(resText);
            message = json.message || json.msg || message;
          } catch (e) {
            if (resText) message = resText;
          }
          setApiResponse({ type: "error", message });
        }
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      setApiResponse({ type: "error", message: "Network error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDelete = (id, e) => {
    e.stopPropagation();

    // Check if it's the only template
    if (savedTemplates.length <= 1) {
      setWarningModal({
        open: true,
        message: "Cannot delete the only remaining template.",
      });
      setOpenDropdownId(null);
      return;
    }

    const template = savedTemplates.find((t) => t.template_id === id);

    // Check if it's the default template
    if (template && template.is_default) {
      setWarningModal({
        open: true,
        message:
          "Cannot delete the default template. Please set another template as default first.",
      });
      setOpenDropdownId(null);
      return;
    }

    setTemplateToDelete(id);
    setShowDeleteModal(true);
    setOpenDropdownId(null);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;

    const id = templateToDelete;

    try {
      const response = await apiFetch(`/templates/${id}`, { method: "DELETE" });

      if (response.status === 204) {
        setSavedTemplates((prev) => prev.filter((t) => t.template_id !== id));
        setApiResponse({
          type: "success",
          message: "Template deleted successfully",
        });
      } else {
        const resText = await response.text();
        let message = response.ok
          ? "Template deleted successfully"
          : "Failed to delete template";

        try {
          if (resText) {
            const json = JSON.parse(resText);
            if (json.message || json.msg) {
              message = json.message || json.msg;
            }
          }
        } catch (e) {
          if (resText && response.status >= 400 && response.status < 500) {
            message = resText;
          }
        }

        if (response.ok) {
          setSavedTemplates((prev) => prev.filter((t) => t.template_id !== id));
          setApiResponse({ type: "success", message });
        } else {
          setApiResponse({ type: "error", message });
        }
      }
    } catch (error) {
      console.error("Delete failed", error);
      setApiResponse({ type: "error", message: "Network error occurred" });
    } finally {
      setShowDeleteModal(false);
      setTemplateToDelete(null);
    }
  };



  const handleEdit = (id) => {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('editTemplateId', id);
        router.push(`/templates/edit`);
    }
  };

  const handleDuplicate = async (id, e) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    
    try {
      const response = await apiFetch(`/templates/${id}/duplicate`, { method: "POST" });
      
      if (response.ok || response.status === 201) {
          setApiResponse({ type: "success", message: "Template duplicated successfully" });
          fetchTemplates();
      } else {
          const resText = await response.text();
          let msg = "Failed to duplicate template";
          try {
              const json = JSON.parse(resText);
              msg = json.message || msg;
          } catch(e) {}
          setApiResponse({ type: "error", message: msg });
      }
    } catch (err) {
        setApiResponse({ type: "error", message: "Network error occurred" });
    }
  };

  /*
  if (selectedTemplateId) {
    return (
      <div className="fixed inset-0 z-50 bg-white h-screen w-screen overflow-hidden">
        <InvoiceTemplateBuilder
          templateId={selectedTemplateId}
          onBack={() => {
            setSelectedTemplateId(null);
            fetchTemplates(); // Refresh list on back
          }}
        />
      </div>
    );
  }
  */

  return (
    <div
      className="p-8 max-w-7xl mx-auto min-h-screen relative"
      onClick={() => setOpenDropdownId(null)}
    >
      {/* API Response Toast */}
      {apiResponse && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-10 duration-300 ${apiResponse.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
        >
          {apiResponse.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span className="font-medium text-sm">{apiResponse.message}</span>
          <button
            onClick={() => setApiResponse(null)}
            className="ml-2 hover:opacity-75"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Warning Modal */}
      {warningModal.open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-4">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Action Blocked
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                {warningModal.message}
              </p>
              <button
                onClick={() => setWarningModal({ open: false, message: "" })}
                className="w-full px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Delete Template?
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to delete this template? This action
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Invoice Templates</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Create New Card */}
          <Link
            href="/templates/create"
            className="group border border-blue-200 bg-blue-50/50 rounded-lg p-6 flex flex-col items-center justify-center min-h-[240px] hover:border-blue-400 hover:bg-blue-100/50 transition-all cursor-pointer hover:shadow-sm"
          >
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 group-hover:bg-blue-200 group-hover:text-blue-600 mb-4 transition-colors shadow-inner">
              <Plus size={28} />
            </div>
            <span className="text-blue-700 font-semibold group-hover:text-blue-800">
              Create New Template
            </span>
          </Link>

          {savedTemplates.map((template) => (
            <div
              key={template.template_id}
              onClick={() => handleEdit(template.template_id)}
              className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow relative group cursor-pointer ${template.is_default ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'}`}
            >
              {template.is_default && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-blue-500/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <Star size={10} className="fill-white" /> DEFAULT
                  </span>
                </div>
              )}
              <div className="h-40 bg-slate-100 border-b border-slate-100 flex items-center justify-center rounded-t-lg relative overflow-hidden">
                <FileText size={48} className="text-slate-300" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-800 mb-1 truncate">
                  {template.template_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Last edited: {formatDate(template.updated_at)}
                </p>
              </div>

              <div className="absolute top-3 right-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(
                      openDropdownId === template.template_id
                        ? null
                        : template.template_id,
                    );
                  }}
                  className="p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 rounded-full transition-colors bg-white/50 backdrop-blur-sm"
                >
                  <MoreVertical size={16} />
                </button>

                {openDropdownId === template.template_id && (
                  <div
                    className="absolute top-full right-0 mt-1 w-32 bg-white rounded-md shadow-xl border border-slate-100 py-1 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(template.template_id);
                      }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                    >
                      <Edit size={14} className="text-blue-500" /> Edit
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(template.template_id, e)}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                    >
                      <Copy size={14} className="text-indigo-500" /> Duplicate
                    </button>
                    <button
                      onClick={(e) => handleOpenDelete(template.template_id, e)}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
