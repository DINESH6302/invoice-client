"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import Sidebar from './Sidebar';
import EditPanel from './EditPanel';
import TemplatePreview from './TemplatePreview';
import { apiFetch, API_BASE_URL } from '@/lib/api';

const initialTemplate = {
  companyDetails: {
    showLogo: true,
    accentColor: "#2563eb",
    headerTitle: "INVOICE",
    headerFontSize: 60,
    headerOpacity: 0.1,
    fields: [ 
      { key: "header_1737200000001", label: "Invoice No", visible: true },
      { key: "header_1737200000002", label: "Date", visible: true },
      { key: "header_1737200000003", label: "Company Name", visible: true, bold: true },
      { key: "header_1737200000004", label: "Address", visible: true },
      { key: "header_1737200000005", label: "GSTIN", visible: true }
    ]
  },
  invoiceMeta: {
    columnCount: 1,
    fields: []
  },
  customerDetails: {
    layout: "side-by-side",
    billing: {
        title: "Bill To",
        fields: [
            { key: "bill_to_1737200000001", label: "Name", visible: true },
            { key: "bill_to_1737200000002", label: "Address", visible: true },
            { key: "bill_to_1737200000003", label: "GSTIN", visible: true },
            { key: "bill_to_1737200000004", label: "State", visible: true }
        ]
    },
    shipping: {
        title: "Ship To",
        fields: [
            { key: "ship_to_1737200000001", label: "Name", visible: true },
            { key: "ship_to_1737200000002", label: "Address", visible: true },
            { key: "ship_to_1737200000003", label: "State", visible: true }
        ]
    }
  },
  table: {
    enableResize: true,
    columns: [
      { key: "item_1737200000001", label: "S.No", width: "10%", visible: true, align: "center", type: "text" },
      { key: "item_1737200000002", label: "Item & Description", width: "40%", visible: true, align: "left", type: "text" },
      { key: "item_1737200000003", label: "Qty", width: "15%", visible: true, align: "right", type: "number" },
      { key: "item_1737200000004", label: "price", width: "15%", visible: true, align: "right", type: "number" },
      { key: "item_1737200000005", label: "Amount", width: "20%", visible: true, align: "right", type: "number" }
    ]
  },
  summary: {
    fields: [
      { key: "total_1737200000001", label: "Sub Total", visible: true, type: "system", sourceColumn: "item_1737200000005" }, // Default calculated from Total column
      { key: "total_1737200000002", label: "Total (INR)", visible: true, bold: true, type: "system" },
    ]
  },
  footer: {
    bankDetails: {
        visible: true,
        title: "Bank Details",
        fields: [
            { key: "footer_1737200000001", label: "Bank", value: "HDFC Bank", visible: true },
            { key: "footer_1737200000002", label: "Acct No", value: "6711880000", visible: true },
            { key: "footer_1737200000003", label: "IFSC", value: "HDFC000123", visible: true }
        ]
    },
    termsAndConditions: { visible: true, content: "Terms & Conditions applied." },
    signatureLabel: "Authorized Signatory"
  }
};

export default function InvoiceTemplateBuilder({ templateId, onBack }) {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState('companyDetails');
    const [isEditPanelOpen, setIsEditPanelOpen] = useState(true);
    const [template, setTemplate] = useState(initialTemplate);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'success' | 'error'
    const [saveMessage, setSaveMessage] = useState('');
    const [redirectUrl, setRedirectUrl] = useState(null);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(!!templateId);
    const [loadError, setLoadError] = useState(null);

    const handleClose = async () => {
        if (onBack) {
            onBack();
            return;
        }

        // If creating new (!templateId), check if we have any templates
        // If NO templates, redirect to dashboard to prevent loop (templates -> redirect empty -> create -> close -> templates -> ...)
        if (!templateId) {
            try {
                const res = await apiFetch(`${API_BASE_URL}/templates`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length === 0) {
                        router.push('/dashboard');
                        return;
                    }
                }
            } catch (e) {
                console.error("Error checking templates", e);
            }
        }
        
        router.push('/templates');
    };

    useEffect(() => {
        if (templateId) {
            const controller = new AbortController();
            const signal = controller.signal;

            const fetchTemplate = async () => {
                try {
                    const res = await apiFetch(`${API_BASE_URL}/templates/${templateId}`, { signal });
          if (res.ok) {
            const data = await res.json();
            
            // Map the API response (which matches the creation payload) back to the internal state structure
            const newT = JSON.parse(JSON.stringify(initialTemplate));
            
            if (data.template_name) setTemplateName(data.template_name);

            // 1. Company Details
            if (data.font_family) newT.companyDetails.fontFamily = data.font_family;
            if (data.font_size) newT.companyDetails.bodyFontSize = data.font_size;
            if (data.accent_color) newT.companyDetails.accentColor = data.accent_color;
            if (data.header) {
                if (data.header.logo_url) newT.companyDetails.logoUrl = data.header.logo_url;
                if (typeof data.header.logo === 'boolean') newT.companyDetails.showLogo = data.header.logo;
                if (data.header.title) newT.companyDetails.headerTitle = data.header.title;
                if (data.header.font_size) newT.companyDetails.headerFontSize = data.header.font_size;
                if (data.header.text_opacity !== undefined) newT.companyDetails.headerOpacity = data.header.text_opacity / 100;
                
                // Map header fields only if they exist
                if (Array.isArray(data.header.fields)) {
                    newT.companyDetails.fields = data.header.fields.map(f => ({
                        key: f.key,
                        label: f.labe || f.label, // Handle typo in saving payload if present
                        visible: true // Assume visible as payload doesn't store visibility explicitly
                    }));
                }
            }

            // 2. Invoice Meta 
            if (data.invoice_meta) {
                if (data.invoice_meta.column_layout) newT.invoiceMeta.columnCount = data.invoice_meta.column_layout;
                if (Array.isArray(data.invoice_meta.fields)) {
                    newT.invoiceMeta.fields = data.invoice_meta.fields.map(f => ({
                        key: f.key,
                        label: f.label,
                        visible: true 
                    }));
                }
            }

            // 3. Customer Details (Bill To / Ship To)
            // Note: The payload sends `customer_details` or `bill_ship_to`? 
            // Previous code saved as `bill_ship_to` but local variable `customer_details` was used in reading block?
            // Let's assume the payload structure used in SAVE
            
            // Checking SAVE payload structure in code below... it uses `bill_ship_to`?
            // Wait, looking at line 520+, it seems to key as `bill_ship_to`. 
            // But let's check what I wrote in previous turns or simply handle both for robustness
            const customerDetails = data.customer_details;
            
            if (customerDetails) {
                 if (customerDetails.bill_to) {
                     if (customerDetails.bill_to.title) newT.customerDetails.billing.title = customerDetails.bill_to.title;
                     if (Array.isArray(customerDetails.bill_to.fields)) {
                         newT.customerDetails.billing.fields = customerDetails.bill_to.fields.map(f => ({
                             key: f.key,
                             label: f.label,
                             visible: true
                         }));
                     }
                 }
                 if (customerDetails.ship_to) {
                     if (customerDetails.ship_to.title) newT.customerDetails.shipping.title = customerDetails.ship_to.title;
                     if (Array.isArray(customerDetails.ship_to.fields)) {
                         newT.customerDetails.shipping.fields = customerDetails.ship_to.fields.map(f => ({
                             key: f.key,
                             label: f.label,
                             visible: true
                         }));
                     }
                 }
            }

            // 4. Items Table
            // Save payload uses `items_table`
            const items = data.items;
            if (items && Array.isArray(items.columns)) {
                newT.table.columns = items.columns.map(c => ({
                    key: c.key,
                    label: c.label,
                    width: c.width,
                    align: c.align,
                    type: c.type,
                    visible: true,
                    group: c.group_name || "",
                    formula: c.formula || ""
                }));
            }

            // 5. Total / Summary
            if (data.total && Array.isArray(data.total.fields)) {
                newT.summary.fields = data.total.fields.map(f => ({
                    key: f.key,
                    label: f.label,
                    bold: f.bold || false,
                    visible: true,
                    // reconstruct type if possible or default
                    type: f.value === "calculated" ? "system" : "text",
                    sourceColumn: f.value === "calculated" ? "item_1737200000005" : undefined // Heuristic
                }));
            }

            // 6. Footer
            if (data.footer) {
                if (data.footer.title) newT.footer.bankDetails.title = data.footer.title;
                if (typeof data.footer.show_bank_details === 'boolean') newT.footer.bankDetails.visible = data.footer.show_bank_details;
                
                // Separate signature from fields
                if (Array.isArray(data.footer.fields)) {
                    const signatureField = data.footer.fields.find(f => f.key === 'signature');
                    const bankFields = data.footer.fields.filter(f => f.key !== 'signature');
                    
                    if (signatureField) newT.footer.signatureLabel = signatureField.label;
                    
                    newT.footer.bankDetails.fields = bankFields.map(f => ({
                        key: f.key,
                        label: f.label,
                        value: f.value || "", // Value might not be in template payload if it's dynamic? but checking footer structure
                        visible: true
                    }));
                }
            }

                        setTemplate(newT);
                        setIsLoadingTemplate(false);
          } else {
             // Handle 404/500 etc.
             const text = await res.text();
             let msg = "Failed to load template";
             try {
                  const json = JSON.parse(text);
                  msg = json.message || json.msg || msg;
             } catch (e) {
                  if (text) msg = text;
             }
             setLoadError(msg);
             setIsLoadingTemplate(false);
          }
        } catch (error) {
          if (error.name === 'AbortError') return;
          console.error("Failed to load template", error);
          setLoadError("Network error occurred while loading template.");
          setIsLoadingTemplate(false);
        }
      };
      
      fetchTemplate();

      return () => controller.abort();
    }
  }, [templateId]);

    // Error State
    if (loadError) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-slate-50">
             <div className="fixed inset-0 bg-black/20 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto mb-4">
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Error Loading Template</h3>
                        <p className="text-sm text-slate-600 mb-6 break-words">
                            {loadError}
                        </p>
                        <button 
                            onClick={handleClose}
                            className="w-full px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 font-medium transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
             </div>
            </div>
        );
    }

    if (isLoadingTemplate) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-slate-50 text-slate-500 text-sm">
                Loading template...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-background overflow-hidden text-foreground font-sans relative">
      {/* Save Modal Overlay */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                {saveStatus === 'success' ? (
                    <div className="p-6 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in zoom-in duration-300">
                        <div className="w-12 h-12 bg-green-100/80 rounded-full flex items-center justify-center text-green-600 shadow-sm">
                            <CheckCircle size={24} strokeWidth={3} />
                        </div>
                        <div>
                             <h3 className="text-lg font-bold text-slate-800">Success!</h3>
                             <p className="text-sm text-slate-600 mt-1">{saveMessage}</p>
                        </div>
                        <button 
                            onClick={handleClose}
                            className="px-6 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors font-medium mt-1"
                        >
                            Close
                        </button>
                    </div>
                ) : saveStatus === 'error' ? (
                    <div className="p-6 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in zoom-in duration-300">
                        <div className="w-12 h-12 bg-red-100/80 rounded-full flex items-center justify-center text-red-600 shadow-sm">
                            <AlertCircle size={24} strokeWidth={3} />
                        </div>
                        <div>
                             <h3 className="text-lg font-bold text-slate-800">Save Failed</h3>
                             <p className="text-sm text-slate-600 mt-1 break-words max-w-xs">{saveMessage}</p>
                        </div>
                        <div className="flex gap-3 mt-1">
                            <button 
                                onClick={() => setSaveStatus('idle')}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Try Again
                            </button>
                            <button 
                                onClick={() => { setShowSaveModal(false); setSaveStatus('idle'); }}
                                className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                ) : (
                <>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-semibold text-slate-800">Save Template</h3>
                    <button 
                        onClick={() => setShowSaveModal(false)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Template Name</label>
                        <input 
                            type="text" 
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            placeholder="e.g. Standard Business Invoice"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            autoFocus
                        />
                        <p className="text-xs text-slate-500">Give your template a recognizable name.</p>
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button 
                        onClick={() => setShowSaveModal(false)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={async () => {
                            try {
                                const payload = {
                                    template_name: templateName,
                                    font_family: template.companyDetails.fontFamily || "Inter",
                                    font_size: template.companyDetails.bodyFontSize || 14,
                                    accent_color: template.companyDetails.accentColor,
                                    
                                    header: {
                                        logo_url: template.companyDetails.logoUrl || "",
                                        logo: template.companyDetails.showLogo,
                                        title: template.companyDetails.headerTitle,
                                        font_size: template.companyDetails.headerFontSize,
                                        text_opacity: (template.companyDetails.headerOpacity || 0.1) * 100,
                                        fields: template.companyDetails.fields.map(f => ({
                                            key: f.key,
                                            labe: f.label
                                        }))
                                    },

                                    invoice_meta: {
                                        column_layout: template.invoiceMeta.columnCount,
                                        fields: template.invoiceMeta.fields.map(f => ({
                                            key: f.key,
                                            label: f.label
                                        }))
                                    },

                                    customer_details: {
                                        bill_to: {
                                            title: template.customerDetails.billing.title,
                                            fields: template.customerDetails.billing.fields.map(f => ({
                                                key: f.key,
                                                label: f.label
                                            }))
                                        },
                                        ship_to: {
                                            title: template.customerDetails.shipping.title,
                                            fields: template.customerDetails.shipping.fields.map(f => ({
                                                key: f.key,
                                                label: f.label
                                            }))
                                        }
                                    },

                                    items: {
                                        columns: template.table.columns.map(c => ({
                                            key: c.key,
                                            label: c.label,
                                            width: c.width,
                                            align: c.align,
                                            type: c.type,
                                            group_name: c.group || "",
                                            formula: c.formula || ""
                                        }))
                                    },

                                    total: {
                                        fields: template.summary.fields.map(f => ({
                                            key: f.key,
                                            label: f.label,
                                            value: f.sourceColumn ? "calculated" : "manual_input", 
                                            bold: f.bold || false
                                        }))
                                    },

                                    footer: {
                                        title: template.footer.bankDetails.title,
                                        show_bank_details: template.footer.bankDetails.visible,
                                        fields: [
                                            // Add Signature as a field to match generic structure
                                            { key: "signature", label: template.footer.signatureLabel },
                                            // Spread bank details
                                            ...template.footer.bankDetails.fields.map(f => ({
                                                key: f.key,
                                                label: f.label
                                            }))
                                        ]
                                    }
                                };

                                                                console.log('Sending payload:', JSON.stringify(payload, null, 2));

                                                                const url = templateId 
                                                                    ? `${API_BASE_URL}/templates/${templateId}` 
                                                                    : `${API_BASE_URL}/templates`;
                                const method = templateId ? "PUT" : "POST";

                                const response = await apiFetch(url, {
                                    method: method,
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify(payload)
                                });

                                if (response.status === 201 || response.ok) {
                                    console.log("Template saved successfully");
                                    
                                    const resText = await response.text();
                                    let msg = "Template saved successfully!";

                                    try {
                                        if (resText) {
                                            const resData = JSON.parse(resText);
                                            if (resData.message) msg = resData.message;
                                            else if (resData.msg) msg = resData.msg;
                                        }
                                    } catch (e) {
                                        // If plain text and reasonable length, use it directly
                                        if (resText && resText.length < 200) msg = resText;
                                    }
                                    
                                    setSaveStatus('success');
                                    setSaveMessage(msg);
                                } else {
                                    const errorText = await response.text();

                                    // Attempt to extract a friendly error message
                                    let friendlyError = `Server Error ${response.status}`;
                                    
                                    if (response.status === 400) {
                                        friendlyError = "Bad Request: Please check your input.";
                                    }

                                    try {
                                        // 1. Try JSON parsing
                                        try {
                                            const errorJson = JSON.parse(errorText);
                                            if (errorJson.message) friendlyError = errorJson.message;
                                            else if (errorJson.error) friendlyError = errorJson.error;
                                            else if (errorJson.msg) friendlyError = errorJson.msg;
                                            
                                            // Handle array of validation errors often sent with 400
                                            if (errorJson.errors && Array.isArray(errorJson.errors)) {
                                                friendlyError = errorJson.errors.map(e => e.message || e).join(', ');
                                            }
                                        } catch (e) {
                                            // 2. Try HTML scraping (Spring Boot default error page)
                                            const messageMatch = errorText.match(/<b>Message<\/b>\s*(.*?)<\/p>/);
                                            if (messageMatch) friendlyError = messageMatch[1];
                                            else if (errorText.length < 300) friendlyError = errorText; // Use raw text if short
                                        }
                                    } catch (e) {
                                        // parsing failed, stick with default
                                    }

                                    setSaveStatus('error');
                                    setSaveMessage(friendlyError);
                                }
                            } catch (error) {
                                console.error("Error saving template:", error);
                                setSaveStatus('error');
                                setSaveMessage("Network error. Please check your connection.");
                            }
                        }}
                        disabled={!templateName.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save size={16} />
                        Save Template
                    </button>
                </div>
                </>
                )}
            </div>
        </div>
      )}

      {/* 0. Top Navigation Bar */}
      <div className="h-[58px] border-b bg-white flex items-center justify-between px-6 z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-2 font-bold text-[17px] text-slate-800 tracking-tight">
             {templateId ? (templateName ? `Edit ${templateName}` : 'Edit Template') : 'Create New Template'}
          </div>
          
          <div className="flex items-center gap-2.5">
             <button 
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-1.5 px-[14px] py-[7px] text-[13px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-md transition-colors shadow-sm border border-blue-100 hover:border-blue-600"
             >
                <Save size={15} />
                Save Template
             </button>
             <button 
                onClick={handleClose}
                className="flex items-center gap-1.5 px-[14px] py-[7px] text-[13px] font-medium text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-md transition-colors shadow-sm border border-red-100 hover:border-red-600"
             >
                <X size={16} />
                Close
             </button>
          </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
      {/* 1. Sidebar (Fixed Width) */}
      <div className="w-[164px] min-w-[160px] border-r bg-slate-50 z-20 shadow-[1px_0_10px_rgba(0,0,0,0.05)] h-full">
        <Sidebar activeSection={activeSection} setActiveSection={(s) => { setActiveSection(s); setIsEditPanelOpen(true); }} />
      </div>

      {/* 2. Edit Panel (Variable Width) */}
      <div 
        className={`bg-white border-r flex flex-col z-10 shadow-[1px_0_10px_rgba(0,0,0,0.03)] transition-all duration-300 ease-in-out overflow-hidden ${isEditPanelOpen ? 'w-[396px] opacity-100' : 'w-0 opacity-0 border-none'}`}
      >
        <div className="w-[396px] h-full flex flex-col">
          <div className="h-14 shrink-0 border-b bg-white flex items-center justify-between px-5 sticky top-0 z-10">
             <h2 className="text-sm font-semibold capitalize tracking-tight flex items-center gap-2 text-slate-800">
                 <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block shadow-sm shadow-blue-200" />
                 {activeSection.replace(/([A-Z])/g, ' $1').trim()} Settings
             </h2>
             <button 
                onClick={() => setIsEditPanelOpen(false)} 
                className="bg-slate-100 text-slate-500 p-1.5 rounded-md hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                title="Close Settings"
             >
                <ChevronLeft size={18} />
             </button>
          </div>
          <div className="flex-1 overflow-hidden p-5">
             <EditPanel activeSection={activeSection} template={template} setTemplate={setTemplate} />
          </div>
        </div>
      </div>

      {/* 3. Template Preview (Remaining Width) */}
      <div className="flex-1 bg-gray-100 relative overflow-hidden flex flex-col">
          {!isEditPanelOpen && (
            <div className="absolute top-6 left-6 z-50">
                <button 
                  onClick={() => setIsEditPanelOpen(true)}
                  className="bg-blue-600 p-3 rounded-full shadow-lg shadow-blue-600/30 hover:bg-blue-700 text-white transition-all hover:scale-110 active:scale-95 group"
                  title="Open Settings"
                >
                  <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
          )}
          <div className="absolute top-6 right-6 flex gap-2 z-20 pointer-events-none">
               <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-medium text-slate-500 border shadow-sm">
                 A4 Format · 210mm x 297mm
               </div>
          </div>
          
          {/* Scrollable Container with Auto-Scale */}
          <PreviewContainer template={template} isEditPanelOpen={isEditPanelOpen} />
      </div>
      </div>
    </div>
  );
}

function PreviewContainer({ template, isEditPanelOpen }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [manualLayout, setManualLayout] = useState({ width: 'auto', height: 'auto' });
  const [zoomMode, setZoomMode] = useState('auto'); // 'auto' | 'manual'

  // Extracted layout logic
  const calculateLayout = React.useCallback(() => {
      if (!containerRef.current || !contentRef.current) return;
      
      const container = containerRef.current;
      const content = contentRef.current;
      
      const contW = container.clientWidth;
      const contH = container.clientHeight;
      const contentW = content.offsetWidth;
      const contentH = content.offsetHeight;
      
      if (contentW === 0 || contentH === 0) return;

      const padding = 60; 
      const availW = contW - padding;
      const availH = contH - padding;

      const scaleX = availW / contentW;
      const scaleY = availH / contentH;
      
      // Calculate Auto Scale
      let autoScale = 1;
      if (isEditPanelOpen) {
          autoScale = Math.min(scaleX, scaleY, 1);
      } else {
          autoScale = Math.min(scaleX, 1.1);
      }
      const MIN_SCALE = 0.4;
      autoScale = Math.max(autoScale, MIN_SCALE);

      // Determine final scale based on mode
      // If manual, we don't change scale, BUT we need to update layout width/height if content size changed
      // Actually if content size changes (e.g. added column), we should probably re-fit (reset to auto) 
      // or at least re-calculate layout with current manual scale.
      
      // Decision: If template changes, force Auto. If only window resize, respect Manual.
      // But here `calculateLayout` runs on template change too.
      // We can use a ref to track if template changed? No, `calculateLayout` is deps on `template`.
      
      // Simple approach: Always Calculate 'Auto' Base. 
      // If mode is manual, we keep current `scale` state (which user set). 
      // However, we need to ensure manualLayout dimensions are correct for that scale.
      
      const effectiveScale = zoomMode === 'auto' ? autoScale : scale;
      
      if (zoomMode === 'auto') {
          setScale(effectiveScale);
      }

      setManualLayout({ 
          width: contentW * effectiveScale, 
          height: contentH * effectiveScale 
      });

  }, [template, isEditPanelOpen, zoomMode, scale]); // Added scale/zoomMode deps

  useEffect(() => {
    calculateLayout();

    const observer = new ResizeObserver(() => {
        requestAnimationFrame(calculateLayout);
    });
    
    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);

    return () => observer.disconnect();
  }, [calculateLayout]);

  // Handler for manual zoom
  const handleManualZoom = (newScale) => {
      setZoomMode('manual');
      const clamped = Math.min(Math.max(newScale, 0.25), 2.0); // 25% to 200%
      setScale(clamped);
  };

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden">
        <div ref={containerRef} className="w-full h-full overflow-auto bg-gray-100 flex p-8">
            <div style={{ 
                width: manualLayout.width, 
                height: manualLayout.height,
                margin: 'auto',
                flexShrink: 0,
                position: 'relative'
            }}>
                <div 
                  ref={contentRef}
                  style={{ 
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
                  className="shadow-2xl bg-white transition-transform duration-200 ease-out will-change-transform"
                >
                  <TemplatePreview template={template} />
                </div>
            </div>
        </div>

        {/* Floating Zoom Controls */}
        <div className="absolute bottom-6 right-8 flex items-center gap-2 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg border border-slate-200 z-50">
            <button 
                onClick={() => setZoomMode('auto')}
                className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${zoomMode === 'auto' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}
                title="Fit to Screen"
            >
                <RotateCcw size={16} />
            </button>
            
            <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>

            <button 
                onClick={() => handleManualZoom(scale - 0.1)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full"
            >
                <ZoomOut size={16} />
            </button>

            <span className="text-xs font-medium w-9 text-center text-slate-600">
                {Math.round(scale * 100)}%
            </span>

            <button 
                onClick={() => handleManualZoom(scale + 0.1)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full"
            >
                <ZoomIn size={16} />
            </button>
        </div>
    </div>
  );
}
