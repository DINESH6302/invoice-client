"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
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
      { key: "item_1737200000003", label: "Quantity", width: "15%", visible: true, align: "right", type: "number" },
      { key: "item_1737200000004", label: "price", width: "15%", visible: true, align: "right", type: "number" },
      { key: "item_1737200000005", label: "Amount", width: "20%", visible: true, align: "right", type: "number" }
    ]
  },
  summary: {
    fields: [
      { key: "sub_total", label: "Sub Total", visible: true, type: "system", function: "sum", sourceColumn: "item_1737200000005" },
      { key: "total_amount", label: "Total", visible: true, bold: true, type: "system", function: "sum", sourceColumn: "item_1737200000005" },
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
    const [isDefault, setIsDefault] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'success' | 'error'
    const [saveMessage, setSaveMessage] = useState('');
    const [redirectUrl, setRedirectUrl] = useState(null);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(!!templateId);
    const [loadError, setLoadError] = useState(null);

    // Zoom State
    const [scale, setScale] = useState(1);
    const [zoomMode, setZoomMode] = useState('auto'); // 'auto' | 'manual'

    const handleManualZoom = (newScale) => {
        setZoomMode('manual');
        const clamped = Math.min(Math.max(newScale, 0.25), 2.0); // 25% to 200%
        setScale(clamped);
    };

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
            const jsonResponse = await res.json();
            const data = jsonResponse.data || jsonResponse;
            
            // Map the API response back to the internal state structure
            const newT = JSON.parse(JSON.stringify(initialTemplate));
            
            if (data.template_name) setTemplateName(data.template_name);
            if (data.is_default !== undefined) setIsDefault(data.is_default);

            // 1. Global Styles & Company Details
            if (data.font_family) newT.companyDetails.fontFamily = data.font_family;
            if (data.font_size) newT.companyDetails.bodyFontSize = data.font_size;
            // Handle accent_color: null means no accent (isAccentFilled = false)
            if (data.accent_color !== undefined) {
                if (data.accent_color === null) {
                    newT.companyDetails.isAccentFilled = false;
                } else {
                    newT.companyDetails.accentColor = data.accent_color;
                    newT.companyDetails.isAccentFilled = true;
                }
            }
            // Legacy support for is_accent_filled field
            if (data.is_accent_filled !== undefined) newT.companyDetails.isAccentFilled = data.is_accent_filled;
            
            // Header Section
            if (data.header) {
                if (data.header.logo_url) newT.companyDetails.logoUrl = data.header.logo_url;
                if (typeof data.header.show_logo === 'boolean') newT.companyDetails.showLogo = data.header.show_logo;
                // Fallback for old format
                if (typeof data.header.logo === 'boolean') newT.companyDetails.showLogo = data.header.logo;
                if (data.header.title) newT.companyDetails.headerTitle = data.header.title;
                if (data.header.title_font_size) newT.companyDetails.headerFontSize = data.header.title_font_size;
                // Fallback for old format
                if (data.header.font_size) newT.companyDetails.headerFontSize = data.header.font_size;
                if (data.header.title_opacity !== undefined) newT.companyDetails.headerOpacity = data.header.title_opacity / 100;
                // Fallback for old format
                if (data.header.text_opacity !== undefined) newT.companyDetails.headerOpacity = data.header.text_opacity / 100;
                
                if (Array.isArray(data.header.fields)) {
                    newT.companyDetails.fields = data.header.fields.map(f => ({
                        key: f.key,
                        label: f.label,
                        type: f.type || 'text',
                        visible: f.visible !== false,
                        bold: f.bold || false
                    }));
                }
            }

            // 2. Invoice Meta
            if (data.invoice_meta) {
                if (data.invoice_meta.column_count) newT.invoiceMeta.columnCount = data.invoice_meta.column_count;
                // Fallback for old format
                if (data.invoice_meta.column_layout) newT.invoiceMeta.columnCount = data.invoice_meta.column_layout;
                
                if (data.invoice_meta.display_style) {
                    newT.invoiceMeta.displayStyle = {
                        layout: data.invoice_meta.display_style.layout || 'col',
                        labelBold: data.invoice_meta.display_style.label_bold || false
                    };
                }
                
                if (Array.isArray(data.invoice_meta.fields)) {
                    newT.invoiceMeta.fields = data.invoice_meta.fields.map(f => ({
                        key: f.key,
                        label: f.label,
                        type: f.type || 'text',
                        visible: f.visible !== false
                    }));
                }
            }

            // 3. Customer Details (Bill To / Ship To)
            const customerDetails = data.customer_details;
            if (customerDetails) {
                if (customerDetails.display_style) {
                    newT.customerDetails.displayStyle = {
                        showLabel: customerDetails.display_style.show_label ?? true,
                        labelBold: customerDetails.display_style.label_bold ?? false,
                        layout: customerDetails.display_style.layout || 'col'
                    };
                }
                
                if (customerDetails.bill_to) {
                    if (customerDetails.bill_to.title) newT.customerDetails.billing.title = customerDetails.bill_to.title;
                    if (Array.isArray(customerDetails.bill_to.fields)) {
                        newT.customerDetails.billing.fields = customerDetails.bill_to.fields.map(f => ({
                            key: f.key,
                            label: f.label,
                            type: f.type || 'text',
                            visible: f.visible !== false
                        }));
                    }
                }
                if (customerDetails.ship_to) {
                    if (customerDetails.ship_to.title) newT.customerDetails.shipping.title = customerDetails.ship_to.title;
                    if (Array.isArray(customerDetails.ship_to.fields)) {
                        newT.customerDetails.shipping.fields = customerDetails.ship_to.fields.map(f => ({
                            key: f.key,
                            label: f.label,
                            type: f.type || 'text',
                            visible: f.visible !== false
                        }));
                    }
                }
            }

            // 4. Items Table
            const itemsTable = data.items_table || data.items;
            if (itemsTable) {
                if (itemsTable.header_text_color) newT.table.headerTextColor = itemsTable.header_text_color;
                if (itemsTable.border_width !== undefined) newT.table.borderWidth = itemsTable.border_width;
                if (itemsTable.border_opacity !== undefined) newT.table.borderOpacity = itemsTable.border_opacity;
                if (itemsTable.header_padding !== undefined) newT.table.thPadding = itemsTable.header_padding;
                if (itemsTable.row_padding !== undefined) newT.table.tdPadding = itemsTable.row_padding;
                
                if (Array.isArray(itemsTable.columns)) {
                    newT.table.columns = itemsTable.columns.map(c => ({
                        key: c.key,
                        label: c.label,
                        width: c.width,
                        align: c.align || 'left',
                        type: c.type || 'text',
                        visible: c.visible !== false,
                        group: c.group_name || '',
                        formula: c.formula || ''
                    }));
                }
            }

            // 5. Summary / Totals
            const summary = data.summary || data.total;
            if (summary && Array.isArray(summary.fields)) {
                newT.summary.fields = summary.fields.map(f => ({
                    key: f.key,
                    label: f.label,
                    visible: f.visible !== false,
                    bold: f.bold || false,
                    type: f.type || 'manual',
                    sourceColumn: f.source_column || null,
                    function: f.function || null,
                    aggregations: f.aggregations ? f.aggregations.map(agg => ({
                        function: agg.function || 'sum',
                        sourceColumn: agg.source_column || '',
                        operator: agg.operator || '+'
                    })) : null
                }));
            }

            // 6. Footer
            if (data.footer) {
                if (data.footer.signature_label) newT.footer.signatureLabel = data.footer.signature_label;
                
                if (data.footer.bank_details) {
                    newT.footer.bankDetails.visible = data.footer.bank_details.visible !== false;
                    if (data.footer.bank_details.title) newT.footer.bankDetails.title = data.footer.bank_details.title;
                    if (Array.isArray(data.footer.bank_details.fields)) {
                        newT.footer.bankDetails.fields = data.footer.bank_details.fields.map(f => ({
                            key: f.key,
                            label: f.label,
                            type: f.type || 'text',
                            value: f.value || '',
                            visible: f.visible !== false
                        }));
                    }
                }
                
                if (data.footer.terms_and_conditions) {
                    newT.footer.termsAndConditions = {
                        visible: data.footer.terms_and_conditions.visible !== false,
                        content: data.footer.terms_and_conditions.content || ''
                    };
                }
                
                // Fallback for old footer format
                if (data.footer.title && !data.footer.bank_details) {
                    newT.footer.bankDetails.title = data.footer.title;
                }
                if (typeof data.footer.show_bank_details === 'boolean') {
                    newT.footer.bankDetails.visible = data.footer.show_bank_details;
                }
                if (Array.isArray(data.footer.fields) && !data.footer.bank_details) {
                    const signatureField = data.footer.fields.find(f => f.key === 'signature');
                    const bankFields = data.footer.fields.filter(f => f.key !== 'signature');
                    
                    if (signatureField) newT.footer.signatureLabel = signatureField.label;
                    
                    newT.footer.bankDetails.fields = bankFields.map(f => ({
                        key: f.key,
                        label: f.label,
                        value: f.value || '',
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
                                    is_default: isDefault,
                                    
                                    // Global Styles
                                    font_family: template.companyDetails.fontFamily || "Inter",
                                    font_size: template.companyDetails.bodyFontSize || 14,
                                    accent_color: template.companyDetails.isAccentFilled !== false ? template.companyDetails.accentColor : null,
                                    
                                    // Header Section
                                    header: {
                                        logo_url: template.companyDetails.logoUrl || "",
                                        show_logo: template.companyDetails.showLogo,
                                        title: template.companyDetails.headerTitle,
                                        title_font_size: template.companyDetails.headerFontSize,
                                        title_opacity: Math.round((template.companyDetails.headerOpacity || 0.1) * 100),
                                        fields: template.companyDetails.fields.map(f => ({
                                            key: f.key,
                                            label: f.label,
                                            type: f.type || 'text',
                                            bold: f.bold || false
                                        }))
                                    },

                                    // Invoice Meta Section
                                    invoice_meta: {
                                        column_count: template.invoiceMeta.columnCount || 1,
                                        display_style: {
                                            layout: template.invoiceMeta.displayStyle?.layout || 'col',
                                            label_bold: template.invoiceMeta.displayStyle?.labelBold || false
                                        },
                                        fields: template.invoiceMeta.fields.map(f => ({
                                            key: f.key,
                                            label: f.label,
                                            type: f.type || 'text'
                                        }))
                                    },

                                    // Customer Details Section (Bill To / Ship To)
                                    customer_details: {
                                        display_style: {
                                            show_label: template.customerDetails.displayStyle?.showLabel ?? true,
                                            label_bold: template.customerDetails.displayStyle?.labelBold ?? false,
                                            layout: template.customerDetails.displayStyle?.layout || 'col'
                                        },
                                        bill_to: {
                                            title: template.customerDetails.billing.title,
                                            fields: template.customerDetails.billing.fields.map(f => ({
                                                key: f.key,
                                                label: f.label,
                                                type: f.type || 'text'
                                            }))
                                        },
                                        ship_to: {
                                            title: template.customerDetails.shipping.title,
                                            fields: template.customerDetails.shipping.fields.map(f => ({
                                                key: f.key,
                                                label: f.label,
                                                type: f.type || 'text'
                                            }))
                                        }
                                    },

                                    // Items Table Section
                                    items: {
                                        header_text_color: template.table.headerTextColor || null,
                                        border_width: template.table.borderWidth || 1,
                                        border_opacity: template.table.borderOpacity === undefined ? 1 : template.table.borderOpacity,
                                        header_padding: template.table.thPadding || 12,
                                        row_padding: template.table.tdPadding || 16,
                                        columns: template.table.columns.map(c => ({
                                            key: c.key,
                                            label: c.label,
                                            width: c.width,
                                            align: c.align || 'left',
                                            type: c.type || 'text',
                                            group_name: c.group || null,
                                            formula: c.formula || null
                                        }))
                                    },

                                    // Summary/Totals Section
                                    total: {
                                        fields: template.summary.fields.map(f => {
                                            // Check if field has aggregations array (new format)
                                            const hasAggregations = f.aggregations && f.aggregations.length > 0;
                                            // Legacy: If sourceColumn is set, treat as system type with default 'sum' function
                                            const hasSource = !!f.sourceColumn;
                                            
                                            const fieldPayload = {
                                                key: f.key,
                                                label: f.label,
                                                bold: f.bold || false,
                                                type: hasAggregations || hasSource ? 'system' : (f.type || 'manual'),
                                            };
                                            
                                            if (hasAggregations) {
                                                // New aggregations format
                                                fieldPayload.aggregations = f.aggregations.map(agg => ({
                                                    function: agg.function || 'sum',
                                                    source_column: agg.sourceColumn || '',
                                                    operator: agg.operator || '+'
                                                }));
                                            } else if (hasSource) {
                                                // Legacy single aggregation format
                                                fieldPayload.source_column = f.sourceColumn || null;
                                                fieldPayload.function = f.function || 'sum';
                                            }
                                            
                                            return fieldPayload;
                                        })
                                    },

                                    // Footer Section
                                    footer: {
                                        signature_label: template.footer.signatureLabel,
                                        bank_details: {
                                            title: template.footer.bankDetails.title,
                                            fields: template.footer.bankDetails.fields.map(f => ({
                                                key: f.key,
                                                label: f.label,
                                                type: f.type || 'text'
                                            }))
                                        },
                                        terms_and_conditions: {
                                            content: template.footer.termsAndConditions?.content || ''
                                        }
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
             <div className="flex items-center mr-2 h-[30px] bg-white rounded-md border border-slate-200 shadow-sm">
                <button 
                    onClick={() => setZoomMode('auto')}
                    className={`h-full px-2 flex items-center justify-center rounded-l-md transition-colors border-r border-slate-100 ${zoomMode === 'manual' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 bg-white hover:text-slate-800 hover:bg-slate-50'}`}
                    title="Fit to Screen"
                >
                    <RotateCcw size={14} />
                </button>
                <button 
                    onClick={() => handleManualZoom(scale - 0.1)}
                    className="h-full px-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors border-r border-slate-100"
                    title="Zoom Out"
                >
                    <ZoomOut size={14} />
                </button>
                <span className="text-[11px] font-medium w-10 text-center text-slate-700 select-none">
                    {Math.round(scale * 100)}%
                </span>
                <button 
                    onClick={() => handleManualZoom(scale + 0.1)}
                    className="h-full px-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-r-md transition-colors border-l border-slate-100"
                    title="Zoom In"
                >
                    <ZoomIn size={14} />
                </button>
             </div>
             
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
          <PreviewContainer 
               template={template} 
               isEditPanelOpen={isEditPanelOpen} 
               scale={scale}
               setScale={setScale}
               zoomMode={zoomMode}
          />
      </div>
      </div>
    </div>
  );
}

function PreviewContainer({ template, isEditPanelOpen, scale, setScale, zoomMode }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [manualLayout, setManualLayout] = useState({ width: 'auto', height: 'auto' });
  const prevIsOpen = useRef(isEditPanelOpen);
  
  // Panning State
  const [isPanning, setIsPanning] = useState(false);
  const startPan = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Handle Manual Zoom transition when panel opens/closes
  useEffect(() => {
    if (prevIsOpen.current !== isEditPanelOpen) {
        if (zoomMode === 'manual') {
            if (isEditPanelOpen) {
                 // Panel Opened: Zoom Out (-10%)
                 setScale(prev => Math.max(0.25, parseFloat((prev - 0.1).toFixed(2))));
            } else {
                 // Panel Closed: Zoom In (+10%)
                 setScale(prev => Math.min(2.0, parseFloat((prev + 0.1).toFixed(2))));
            }
        }
        prevIsOpen.current = isEditPanelOpen;
    }
  }, [isEditPanelOpen, zoomMode, setScale]);

  // Panning Logic
  useEffect(() => {
    const handleWindowMouseMove = (e) => {
        if (!isPanning || !containerRef.current) return;
        e.preventDefault();
        const dx = e.clientX - startPan.current.x;
        const dy = e.clientY - startPan.current.y;
        
        containerRef.current.scrollLeft = startPan.current.scrollLeft - dx;
        containerRef.current.scrollTop = startPan.current.scrollTop - dy;
    };

    const handleWindowMouseUp = () => {
        if (isPanning) {
            setIsPanning(false);
            if (containerRef.current) containerRef.current.style.cursor = 'grab';
            document.body.style.userSelect = '';
        }
    };

    if (isPanning) {
        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);
        window.addEventListener('mouseleave', handleWindowMouseUp);
    }
    
    return () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
        window.removeEventListener('mouseleave', handleWindowMouseUp);
    };
  }, [isPanning]);

  const handleMouseDown = (e) => {
      // Allow only left mouse button and ensure we're not clicking on interactive elements if needed
      if (e.button !== 0) return;
      
      setIsPanning(true);
      startPan.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: containerRef.current?.scrollLeft || 0,
          scrollTop: containerRef.current?.scrollTop || 0
      };
      
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
  };

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
      // Always fit to screen (both dimensions) to ensure stable transition and prevent zoom jumps
      let autoScale = Math.min(scaleX, scaleY, 1);
      
      if (!isEditPanelOpen) {
          autoScale = autoScale + 0.1;
      }

      const MIN_SCALE = 0.4;
      autoScale = Math.max(autoScale, MIN_SCALE);

      if (zoomMode === 'auto') {
          setScale(autoScale);
          setManualLayout({ 
              width: contentW * autoScale, 
              height: contentH * autoScale 
          });
      } else {
          // In manual mode, just update layout with current scale
          setManualLayout(prev => {
              const newWidth = contentW * scale;
              const newHeight = contentH * scale;
              // Only update if changed to prevent unnecessary rerenders
              if (prev.width !== newWidth || prev.height !== newHeight) {
                  return { width: newWidth, height: newHeight };
              }
              return prev;
          });
      }

  }, [template, isEditPanelOpen, zoomMode, scale, setScale]);

  useEffect(() => {
    // Initial layout calculation
    const timer = setTimeout(() => {
        calculateLayout();
    }, 50);

    const observer = new ResizeObserver(() => {
        requestAnimationFrame(calculateLayout);
    });
    
    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);

    return () => {
        clearTimeout(timer);
        observer.disconnect();
    };
  }, [calculateLayout]);

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden">
        <div 
            ref={containerRef} 
            className="w-full h-full overflow-auto bg-gray-100 flex p-8 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
        >
            <div style={{ 
                width: manualLayout.width, 
                height: manualLayout.height,
                margin: 'auto',
                flexShrink: 0,
                position: 'relative',
                pointerEvents: isPanning ? 'none' : 'auto' // Prevent interactions while panning
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
    </div>
  );
}
