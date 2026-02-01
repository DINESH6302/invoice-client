'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import TemplatePreview from '@/components/invoice-template/TemplatePreview';

export default function InvoicePreviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [zoom, setZoom] = useState(70);
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;
    
    loadPreviewData();
  }, []);

  const loadPreviewData = async () => {
    try {
      const invoiceId = sessionStorage.getItem('previewInvoiceId');
      const templateId = sessionStorage.getItem('previewTemplateId');

      if (!invoiceId || !templateId) {
        throw new Error('Missing invoice or template information. Please try again.');
      }

      // Fetch template and invoice data in parallel
      const [templateRes, invoiceRes] = await Promise.all([
        apiFetch(`/templates/${templateId}`),
        apiFetch(`/v1/invoices/${invoiceId}`)
      ]);

      if (!templateRes.ok) throw new Error('Failed to fetch template');
      if (!invoiceRes.ok) throw new Error('Failed to fetch invoice');

      const templateJson = await templateRes.json();
      const invoiceJson = await invoiceRes.json();

      const rawTemplate = templateJson.data || templateJson;
      const invoiceData = invoiceJson.data || invoiceJson;

      // Transform API template to TemplatePreview format
      const processedTemplate = transformTemplateForPreview(rawTemplate);

      // Transform invoice data to renderData format
      const renderData = transformInvoiceForPreview(invoiceData);

      setPreviewData({
        template: processedTemplate,
        renderData: renderData,
        invoiceNumber: invoiceData.invoice_number || 'Invoice',
        templateName: rawTemplate.name || rawTemplate.template_name || 'Template'
      });

    } catch (err) {
      console.error('Preview Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Transform API template JSON to TemplatePreview component format
  const transformTemplateForPreview = (apiData) => {
    const template = {
      companyDetails: {
        showLogo: true,
        accentColor: "#2563eb",
        headerTitle: "INVOICE",
        headerFontSize: 60,
        headerOpacity: 0.1,
        fontFamily: "Inter",
        bodyFontSize: 14,
        fields: []
      },
      invoiceMeta: {
        columnCount: 1,
        displayStyle: { layout: 'col', labelBold: true },
        fields: []
      },
      customerDetails: {
        layout: "side-by-side",
        displayStyle: { showLabel: true, labelBold: true, layout: 'col' },
        billing: { title: "Bill To", fields: [] },
        shipping: { title: "Ship To", fields: [] }
      },
      table: {
        enableResize: true,
        columns: []
      },
      summary: {
        title: "Summary",
        fields: []
      },
      footer: {
        title: "Bank Details",
        show_bank_details: true,
        signatureLabel: "Authorized Signatory",
        fields: []
      },
      total: { fields: [] }
    };

    if (!apiData) return template;

    // Root Level - Handle null accent_color by using black for line separators
    if (apiData.accent_color !== undefined) {
      template.companyDetails.accentColor = apiData.accent_color || "#000000";
      template.companyDetails.isAccentFilled = !!apiData.accent_color; // false if null/empty
    }
    if (apiData.font_family) template.companyDetails.fontFamily = apiData.font_family;
    // Use root font_size for all sections body text
    if (apiData.font_size !== undefined) template.companyDetails.bodyFontSize = apiData.font_size || 14;

    // Header
    if (apiData.header) {
      if (apiData.header.logo_url) template.companyDetails.logoUrl = apiData.header.logo_url;
      if (typeof apiData.header.logo === 'boolean') template.companyDetails.showLogo = apiData.header.logo;
      if (apiData.header.title) template.companyDetails.headerTitle = apiData.header.title;
      if (apiData.header.title_font_size) template.companyDetails.headerFontSize = apiData.header.title_font_size;
      if (apiData.header.font_size) template.companyDetails.headerFontSize = apiData.header.font_size;
      if (apiData.header.title_opacity !== undefined) template.companyDetails.headerOpacity = apiData.header.title_opacity / 100;
      if (apiData.header.text_opacity !== undefined) template.companyDetails.headerOpacity = apiData.header.text_opacity / 100;
      if (Array.isArray(apiData.header.fields)) {
        template.companyDetails.fields = apiData.header.fields.map(f => ({ ...f, visible: true }));
      }
    }

    // Invoice Meta
    if (apiData.invoice_meta) {
      if (apiData.invoice_meta.column_layout) template.invoiceMeta.columnCount = apiData.invoice_meta.column_layout;
      if (apiData.invoice_meta.display_style) {
        const ds = apiData.invoice_meta.display_style;
        template.invoiceMeta.displayStyle = {
          layout: ds.layout || 'col',
          labelBold: ds.label_bold ?? ds.labelBold ?? true,
          showLabel: ds.show_label ?? ds.showLabel ?? true
        };
      }
      if (Array.isArray(apiData.invoice_meta.fields)) {
        template.invoiceMeta.fields = apiData.invoice_meta.fields.map(f => ({ ...f, visible: true }));
      }
    }

    // Customer Details
    if (apiData.customer_details) {
      const cust = apiData.customer_details;
      if (cust.display_style) {
        const ds = cust.display_style;
        template.customerDetails.displayStyle = {
          layout: ds.layout || 'col',
          labelBold: ds.label_bold ?? ds.labelBold ?? true,
          showLabel: ds.show_label ?? ds.showLabel ?? true
        };
      }
      if (cust.bill_to) {
        if (cust.bill_to.title) template.customerDetails.billing.title = cust.bill_to.title;
        if (Array.isArray(cust.bill_to.fields)) {
          template.customerDetails.billing.fields = cust.bill_to.fields.map(f => ({ ...f, visible: true }));
        }
      }
      if (cust.ship_to) {
        if (cust.ship_to.title) template.customerDetails.shipping.title = cust.ship_to.title;
        if (Array.isArray(cust.ship_to.fields)) {
          template.customerDetails.shipping.fields = cust.ship_to.fields.map(f => ({ ...f, visible: true }));
        }
      }
    }

    // Items Table
    if (apiData.items && Array.isArray(apiData.items.columns)) {
      template.table.columns = apiData.items.columns.map(c => ({ ...c, visible: c.visible !== false }));
    }
    // Table header text color - use black if null
    if (apiData.items?.header_text_color !== undefined) {
      template.table.headerTextColor = apiData.items.header_text_color || "#000000";
    } else {
      // If accent is null/transparent, use black text for visibility
      template.table.headerTextColor = apiData.accent_color ? "#ffffff" : "#000000";
    }
    
    // Table styling properties - map to TemplatePreview expected property names
    if (apiData.items) {
      // thPadding for header height, tdPadding for row height
      if (apiData.items.header_padding !== undefined) template.table.thPadding = apiData.items.header_padding;
      if (apiData.items.row_padding !== undefined) template.table.tdPadding = apiData.items.row_padding;
      if (apiData.items.border_width !== undefined) template.table.borderWidth = apiData.items.border_width;
      if (apiData.items.border_opacity !== undefined) template.table.borderOpacity = apiData.items.border_opacity;
    }

    // Summary (for totals section)
    if (apiData.summary) {
      if (apiData.summary.title) template.summary.title = apiData.summary.title;
      if (Array.isArray(apiData.summary.fields)) {
        template.summary.fields = apiData.summary.fields.map(f => ({
          ...f,
          visible: f.visible !== false,
          sourceColumn: f.source_column || null,
          aggregations: f.aggregations ? f.aggregations.map(agg => ({
            function: agg.function || 'sum',
            sourceColumn: agg.source_column || '',
            operator: agg.operator || '+'
          })) : null
        }));
      }
    }

    // Total
    if (apiData.total) {
      template.total = apiData.total;
      // Also populate summary if total has fields
      if (Array.isArray(apiData.total.fields) && template.summary.fields.length === 0) {
        template.summary.fields = apiData.total.fields.map(f => ({
          ...f,
          visible: f.visible !== false,
          sourceColumn: f.source_column || null,
          aggregations: f.aggregations ? f.aggregations.map(agg => ({
            function: agg.function || 'sum',
            sourceColumn: agg.source_column || '',
            operator: agg.operator || '+'
          })) : null
        }));
      }
    }

    // Footer
    if (apiData.footer) {
      if (apiData.footer.title) template.footer.title = apiData.footer.title;
      if (apiData.footer.signature_label) template.footer.signatureLabel = apiData.footer.signature_label;
      template.footer.show_bank_details = apiData.footer.show_bank_details;
      if (Array.isArray(apiData.footer.fields)) {
        template.footer.fields = apiData.footer.fields.map(f => ({ ...f, visible: true }));
      }
    }

    return template;
  };

  // Transform Invoice API data to renderData format for TemplatePreview
  const transformInvoiceForPreview = (invoiceData) => {
    const flattenFields = (fieldsArray) => {
      if (!Array.isArray(fieldsArray)) return {};
      return fieldsArray.reduce((acc, field) => {
        acc[field.key] = field.value;
        return acc;
      }, {});
    };

    const renderData = {
      // Header fields (company info, invoice no, date)
      header: flattenFields(invoiceData.header?.fields),

      // Meta fields
      meta: flattenFields(invoiceData.invoice_meta?.fields),

      // Customer details
      billTo: flattenFields(invoiceData.customer_details?.bill_to?.fields),
      shipTo: flattenFields(invoiceData.customer_details?.ship_to?.fields),

      // Footer/Bank details
      footer: flattenFields(invoiceData.footer?.fields),

      // Items - handle various structures
      // Could be: array of objects, or { fields: [...] }, or { rows: [...] }
      items: (() => {
        const items = invoiceData.items;
        if (!items) return [];
        if (Array.isArray(items)) return items;
        if (Array.isArray(items.fields)) return items.fields;
        if (Array.isArray(items.rows)) return items.rows;
        return [];
      })(),
    };

    // Also flatten to root for fallback access
    Object.assign(renderData, renderData.header);
    Object.assign(renderData, renderData.meta);

    return renderData;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(70);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-slate-500 font-medium">Loading Preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-100">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-100 max-w-md text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Error Loading Preview</h3>
          <p className="text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/invoices')}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  if (!previewData) return null;

  return (
    <div className="h-full flex flex-col bg-slate-100 overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 print:hidden w-full overflow-x-auto">
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => router.push('/invoices')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <h1 className="text-lg font-bold text-slate-800">{previewData.invoiceNumber}</h1>
            <p className="text-sm text-slate-500">Template: {previewData.templateName}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 mr-0">
          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 bg-white border border-slate-200 shadow-sm rounded-md p-1">
            <button
              onClick={handleResetZoom}
              className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-xs font-medium text-slate-600 min-w-[2.5rem] text-center">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Download size={16} />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 overflow-auto p-8 pb-6 flex flex-col items-center">
        <div
          className="shadow-2xl print:shadow-none bg-white transition-transform origin-top"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          <TemplatePreview
            template={previewData.template}
            renderData={previewData.renderData}
          />
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
