"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Calendar,
  User,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";

// Collapsible Section Component
const CollapsibleSection = ({
  title,
  children,
  defaultOpen = true,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={`bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden ${className}`}
    >
      <div
        className="flex items-center justify-between p-6 cursor-pointer bg-blue-50/50 hover:bg-blue-100/50 transition-colors border-b border-blue-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wider">
          {title}
        </h2>
        <button className="text-blue-400">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isOpen && (
        <div className="px-6 pb-6 pt-6">
          {children}
        </div>
      )}
    </section>
  );
};

export default function CreateInvoiceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template_id");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState(null);
  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [loadedTemplateId, setLoadedTemplateId] = useState(null);
  const dataFetchedRef = useRef(false);

  // Popup State
  const [saveResult, setSaveResult] = useState({
    show: false,
    success: false,
    message: "",
  });

  // Invoice State
  const [invoiceData, setInvoiceData] = useState({
    header: {},
    meta: {},
    customer: {
      bill_to: {},
      ship_to: {},
    },
    items: [],
    footer: {},
  });

  useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const templateApiUrl = templateId
        ? `/templates/${templateId}`
        : "/templates/default";

      const [tplRes, orgRes, custRes] = await Promise.all([
        apiFetch(templateApiUrl),
        apiFetch("/orgs"),
        apiFetch("/customers/summary"),
      ]);

      let tplData = null;
      let orgData = null;

      if (tplRes.ok) {
        const json = await tplRes.json();
        tplData = json.data || json;
        setTemplate(tplData);

        // Capture Template ID robustly
        const foundId =
          tplData.template_id ||
          tplData._id ||
          tplData.id ||
          json.template_id ||
          (json.data && json.data.template_id);
        if (foundId) {
          setLoadedTemplateId(foundId);
        } else if (templateId) {
          setLoadedTemplateId(templateId);
        }
      } else {
        throw new Error(
          templateId
            ? "Failed to load selected template"
            : "Failed to load default template",
        );
      }

      if (orgRes.ok) {
        const json = await orgRes.json();
        // Handle both single object and array response (take first org)
        const rawData = json.data || json;
        orgData = Array.isArray(rawData) ? rawData[0] : rawData;
      }

      if (custRes.ok) {
        const json = await custRes.json();
        setCustomerList(json.data || []);
      }

      if (tplData) {
        initializeInvoiceData(tplData, orgData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Network or Template error occurred");
    } finally {
      setLoading(false);
    }
  };

  const initializeInvoiceData = (tmpl, orgData) => {
    const initialData = {
      header: {},
      meta: {},
      customer: { bill_to: {}, ship_to: {} },
      items: [{ id: Date.now() }], // Start with one empty item row
      footer: {}, // Footer usually contains static bank details
    };

    // Helper to init fields
    const initFields = (fields, targetObj) => {
      if (Array.isArray(fields)) {
        fields.forEach((field) => {
          targetObj[field.key] = "";
        });
      }
    };

    if (tmpl.header?.fields) initFields(tmpl.header.fields, initialData.header);
    if (tmpl.invoice_meta?.fields)
      initFields(tmpl.invoice_meta.fields, initialData.meta);
    if (tmpl.customer_details?.bill_to?.fields)
      initFields(
        tmpl.customer_details.bill_to.fields,
        initialData.customer.bill_to,
      );
    if (tmpl.customer_details?.ship_to?.fields)
      initFields(
        tmpl.customer_details.ship_to.fields,
        initialData.customer.ship_to,
      );

    // Populate Header from Org Data
    if (orgData && tmpl.header?.fields) {
      tmpl.header.fields.forEach((field) => {
        // Check 'label' from API then fallback to 'label'
        const label = (field.label || "").toLowerCase().trim();

        if (label === "company name") {
          initialData.header[field.key] = orgData.org_name || "";
        } else if (label.toLowerCase().includes("gst")) {
          initialData.header[field.key] = orgData.gst_no || "";
        } else if (label === "state") {
          initialData.header[field.key] = orgData.address?.state || "";
        } else if (label === "address" || label === "company address") {
          const addr = orgData.address || {};
          // Format: street + ", " + city + ", " + state + " - " + zip_code + ", " + state
          const parts = [];
          if (addr.street) parts.push(addr.street);
          if (addr.city) parts.push(addr.city);

          let complexPart = "";
          if (addr.state) complexPart += addr.state;
          if (addr.zip_code)
            complexPart += (complexPart ? " - " : "") + addr.zip_code;
          // Re-appending state as requested
          //  if (addr.state) complexPart += (complexPart ? ", " : "") + addr.state;

          if (complexPart) parts.push(complexPart);

          initialData.header[field.key] = parts.join(", ");
        } else if (label === "date") {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          const dd = String(today.getDate()).padStart(2, "0");
          // If the rendered input is type='date', use yyyy-mm-dd
          // If text, use dd/mm/yyyy
          // Based on rendering logic: type={field.label?.toLowerCase().includes('date') ? 'date' : 'text'}
          initialData.header[field.key] = `${yyyy}-${mm}-${dd}`;
        }
      });
    }

    // Populate Bill To from Org Data
    if (orgData && tmpl.customer_details?.bill_to?.fields) {
      tmpl.customer_details.bill_to.fields.forEach((field) => {
        const label = (field.label || "").toLowerCase().trim();

        if (label === "company name" || label === "name") {
          initialData.customer.bill_to[field.key] = orgData.org_name || "";
        } else if (label.toLowerCase().includes("gst") || label.toLowerCase().includes("tax")) {
          initialData.customer.bill_to[field.key] = orgData.gst_no || "";
        } else if (label === "state") {
          initialData.customer.bill_to[field.key] =
            orgData.address?.state || "";
        } else if (label === "address") {
          const addr = orgData.address || {};
          // Format: street + ", " + city + ", " + state + " - " + zip_code
          const parts = [];
          if (addr.street) parts.push(addr.street);
          if (addr.city) parts.push(addr.city);

          let complexPart = "";
          if (addr.state) complexPart += addr.state;
          if (addr.zip_code)
            complexPart += (complexPart ? " - " : "") + addr.zip_code;

          if (complexPart) parts.push(complexPart);

          initialData.customer.bill_to[field.key] = parts.join(", ");
        }
      });
    }

    setInvoiceData(initialData);
  };

  const handleCustomerSelect = async (customerId, targetSection = "ship_to") => {
    setSelectedCustomerId(customerId);
    const selected = customerList.find((c) => c.customer_id == customerId);
    if (!selected) return;

    // Use name from selection immediately
    // We assume the Name field key can be found in the template
    const fields = template.customer_details?.[targetSection]?.fields || [];
    const nameField = fields.find((f) => f.label === "Name");

    if (nameField) {
      handleInputChange(
        "customer",
        nameField.key,
        selected.customer_name,
        targetSection,
      );
    }

    try {
      const res = await apiFetch(`/v1/customers/${customerId}`);
      if (res.ok) {
        const json = await res.json();
        const details = json.data;
        const addressObj = details.address || {};

        // Format address
        const parts = [];
        if (addressObj.street) parts.push(addressObj.street);
        if (addressObj.city) parts.push(addressObj.city);

        let complexPart = "";
        if (addressObj.state) complexPart += addressObj.state;
        if (addressObj.zip_code)
          complexPart += (complexPart ? " - " : "") + addressObj.zip_code;

        if (complexPart) parts.push(complexPart);

        const fullAddress = parts.join(", ");

        setInvoiceData((prev) => {
          const newData = { ...prev };
          // Ensure proper referencing if doing deep mutation
          newData.customer = { ...prev.customer };
          newData.customer[targetSection] = { ...prev.customer[targetSection] };

          fields.forEach((field) => {
            const label = (field.label || "").toLowerCase();
            const key = field.key;

            if (label === "address") {
              newData.customer[targetSection][key] = fullAddress;
            } else if (label === "state") {
              newData.customer[targetSection][key] = addressObj.state || "";
            } else if (label.includes("gst") || label.includes("tax")) {
              newData.customer[targetSection][key] = details.gst_no || details.gstNo || "";
            }
          });
          return newData;
        });
      }
    } catch (error) {
      console.error("Error fetching customer details", error);
    }
  };

  const handleInputChange = (section, key, value, subSection = null) => {
    setInvoiceData((prev) => {
      const newData = { ...prev };
      if (subSection) {
        newData[section][subSection][key] = value;
      } else {
        newData[section][key] = value;
      }
      return newData;
    });
  };

  // Calculate column aggregate based on function type
  const calculateColumnAggregate = (colKey, funcType, items) => {
    const values = items.map(item => Number(item[colKey]) || 0);
    if (values.length === 0) return 0;

    switch (funcType) {
      case 'sum':
        return values.reduce((acc, val) => acc + val, 0);
      case 'sub':
        return -1 * values.reduce((acc, val) => acc + val, 0);
      case 'mul':
        return values.reduce((acc, val) => acc * val, 1);
      case 'avg':
        const sum = values.reduce((acc, val) => acc + val, 0);
        return sum / values.length;
      case 'max':
        return Math.max(...values);
      case 'min':
        return Math.min(...values);
      default:
        return values.reduce((acc, val) => acc + val, 0);
    }
  };

  // Calculate chained aggregations with arithmetic operators
  const calculateChainedAggregations = (aggregations, items) => {
    if (!aggregations || aggregations.length === 0) return 0;

    let result = 0;
    aggregations.forEach((agg, index) => {
      const sourceColumn = agg.source_column || agg.sourceColumn;
      const aggValue = calculateColumnAggregate(sourceColumn, agg.function || 'sum', items);
      
      if (index === 0) {
        result = aggValue;
      } else {
        const operator = agg.operator || '+';
        switch (operator) {
          case '+':
            result = result + aggValue;
            break;
          case '-':
            result = result - aggValue;
            break;
          case '*':
            result = result * aggValue;
            break;
          case '/':
            result = aggValue !== 0 ? result / aggValue : result;
            break;
          default:
            result = result + aggValue;
        }
      }
    });

    return result;
  };

  // Calculate summary field value
  const calculateSummaryValue = (field) => {
    const items = invoiceData.items;
    
    // New aggregations format
    if (field.aggregations && field.aggregations.length > 0) {
      return calculateChainedAggregations(field.aggregations, items);
    }
    
    // Legacy single aggregation format
    const sourceColumn = field.source_column || field.sourceColumn;
    if (sourceColumn) {
      return calculateColumnAggregate(sourceColumn, field.function || 'sum', items);
    }
    
    return 0;
  };

  // Formula evaluator helper
  const evaluateFormula = (formula, row, labelToKey) => {
    if (!formula) return "";
    let expression = formula;

    const matches = expression.match(/\[(.*?)\]/g);

    if (matches) {
      for (const match of matches) {
        const label = match.slice(1, -1);
        const key = labelToKey[label];
        let val = 0;
        if (key) {
          const rawVal = row[key];
          val = parseFloat(rawVal);
          if (isNaN(val)) val = 0;
        }
        expression = expression.split(match).join(val);
      }
    }

    try {
      const safeExpression = expression.replace(/[^0-9+\-*/().\s]/g, "");
      if (!safeExpression.trim()) return "";
      // eslint-disable-next-line no-new-func
      const result = new Function("return " + safeExpression)();
      return isFinite(result) ? Number(result.toFixed(2)) : "";
    } catch (err) {
      return "";
    }
  };

  const handleItemChange = (index, key, value) => {
    setInvoiceData((prev) => {
      const newItems = [...prev.items];
      let currentItem = { ...newItems[index], [key]: value };

      // Dynamic Calculation logic
      if (template?.items?.columns) {
        const columns = template.items.columns;
        const labelToKey = {};
        columns.forEach((col) => (labelToKey[col.label] = col.key));

        // Multi-pass evaluation to handle dependencies
        for (let i = 0; i < 2; i++) {
          columns.forEach((col) => {
            // Only calculate if formula exists and field is NOT the one being edited
            if ((col.type === "formula" || col.formula) && col.key !== key) {
              const calculated = evaluateFormula(
                col.formula,
                currentItem,
                labelToKey,
              );
              if (calculated !== "") {
                currentItem[col.key] = calculated;
              }
            }
          });
        }
      }

      newItems[index] = currentItem;
      return { ...prev, items: newItems };
    });
  };

  const handleAddItem = () => {
    setInvoiceData((prev) => ({
      ...prev,
      items: [...prev.items, { id: Date.now() }],
    }));
  };

  const handleRemoveItem = (index) => {
    if (invoiceData.items.length <= 1) return; // Prevent removing last row
    setInvoiceData((prev) => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: newItems };
    });
  };

  const handleSave = async () => {
    // Construct payload
    const payload = {
      template_id: loadedTemplateId,
      customer_id: selectedCustomerId,
    };

    // Debug Payload content
    console.log("Saving Invoice Payload:", payload);

    // Helper to map fields
    const mapFields = (fields, dataObj) => {
      return fields.map((field) => ({
        key: field.key,
        label: field.label || field.label,
        value: dataObj[field.key] || "",
      }));
    };

    if (template.header?.fields) {
      payload.header = {
        fields: mapFields(template.header.fields, invoiceData.header),
      };
    }

    if (template.invoice_meta?.fields) {
      payload.invoice_meta = {
        fields: mapFields(template.invoice_meta.fields, invoiceData.meta),
      };
    }

    if (template.customer_details) {
      payload.customer_details = {};
      if (template.customer_details.bill_to?.fields) {
        payload.customer_details.bill_to = {
          fields: mapFields(
            template.customer_details.bill_to.fields,
            invoiceData.customer.bill_to,
          ),
        };
      }
      if (template.customer_details.ship_to?.fields) {
        payload.customer_details.ship_to = {
          fields: mapFields(
            template.customer_details.ship_to.fields,
            invoiceData.customer.ship_to,
          ),
        };
      }
    }

    if (template.footer?.fields) {
      payload.footer = {
        fields: mapFields(template.footer.fields, invoiceData.footer),
      };
    }

    // Items
    payload.items = { fields: invoiceData.items };

    try {
      setIsSaving(true);
      const res = await apiFetch("/v1/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveResult({
          show: true,
          success: true,
          message: "Invoice created successfully.",
        });
      } else {
        const data = await res.json();
        setSaveResult({
          show: true,
          success: false,
          message: data.message || "Failed to save invoice.",
        });
      }
    } catch (e) {
      console.error("Save error:", e);
      setSaveResult({
        show: true,
        success: false,
        message: "An unexpected error occurred while saving.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClosePopup = () => {
    if (saveResult.success) {
      router.push("/invoices");
    }
    setSaveResult({ ...saveResult, show: false });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-slate-500 font-medium">
            Loading default template...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-red-100 max-w-md text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
            <FileText size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            Template Error
          </h3>
          <p className="text-slate-600 mb-6">
            {error}. Please ensure a default invoice template is set.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!template) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Top Navigation */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-800">Create Invoice</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Invoice
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* 1. Header Section */}
        {template.header?.fields?.length > 0 && (
          <CollapsibleSection title="Header Details">
            <div
              className={`grid grid-cols-1 ${
                (template.header?.fields?.length || 0) < 3
                  ? "md:grid-cols-2"
                  : "md:grid-cols-3"
              } gap-x-8 gap-y-6`}
            >
              {/* Template fields first */}
              {template.header?.fields?.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {field.label || field.label}
                  </label>
                  <input
                    type={
                      field.label?.toLowerCase().includes("gst") || field.type === "number"
                        ? "text"
                        : field.type ||
                          (field.label?.toLowerCase().includes("date")
                            ? "date"
                            : "text")
                    }
                    inputMode={field.type === "number" ? "decimal" : undefined}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder={`Enter ${field.label || field.label}`}
                    value={invoiceData.header[field.key] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (field.type === "number" && val !== "" && !/^\d*\.?\d*$/.test(val)) return;
                      handleInputChange("header", field.key, val);
                    }}
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* 2. Invoice Meta Data */}
        {template.invoice_meta?.fields?.length > 0 && (
          <CollapsibleSection title="Invoice Details">
            {/* Using column layout from template if available, else standard grid */}
            <div
              className={`grid grid-cols-1 ${
                (template.invoice_meta?.fields?.length || 0) < 3
                  ? "md:grid-cols-2"
                  : `md:grid-cols-${template.invoice_meta?.column_layout || 3}`
              } gap-6`}
            >
              {template.invoice_meta?.fields?.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {field.label}
                  </label>
                  <input
                    type={
                      field.label?.toLowerCase().includes("gst") || field.type === "number"
                        ? "text"
                        : field.type ||
                          (field.label?.toLowerCase().includes("date")
                            ? "date"
                            : "text")
                    }
                    inputMode={field.type === "number" ? "decimal" : undefined}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={invoiceData.meta[field.key] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (field.type === "number" && val !== "" && !/^\d*\.?\d*$/.test(val)) return;
                      handleInputChange("meta", field.key, val);
                    }}
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* 3. Customer Details */}
        {(template.customer_details?.bill_to?.fields?.length > 0 ||
          template.customer_details?.ship_to?.fields?.length > 0) && (
          <CollapsibleSection title="Customer Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Bill To */}
              {template.customer_details?.bill_to?.fields?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <User size={16} className="text-blue-500" />
                    {template.customer_details?.bill_to?.title || "Bill To"}
                  </h3>
                  <div className="space-y-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                    {template.customer_details?.bill_to?.fields?.map(
                      (field) => {
                        return (
                          <div key={field.key} className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase">
                              {field.label}
                            </label>
                            <input
                              type={
                                field.label?.toLowerCase().includes("gst") ||
                                field.type === "number"
                                  ? "text"
                                  : field.type || "text"
                              }
                              inputMode={
                                field.type === "number" ? "decimal" : undefined
                              }
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              placeholder={field.label}
                              value={
                                invoiceData.customer.bill_to[field.key] || ""
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (
                                  field.type === "number" &&
                                  val !== "" &&
                                  !/^\d*\.?\d*$/.test(val)
                                )
                                  return;
                                handleInputChange(
                                  "customer",
                                  field.key,
                                  val,
                                  "bill_to",
                                );
                              }}
                            />
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

              {/* Ship To */}
              {template.customer_details?.ship_to?.fields?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <MapPin size={16} className="text-blue-500" />
                    {template.customer_details?.ship_to?.title || "Ship To"}
                  </h3>
                  <div className="space-y-4 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                    {template.customer_details?.ship_to?.fields?.map(
                      (field) => {
                        const label = field.label || field.label;
                        if (label === "Name") {
                          return (
                            <div key={field.key} className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-500 uppercase">
                                {label}
                              </label>
                              <div className="relative">
                                <select
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                  value={
                                    invoiceData.customer.ship_to[field.key] ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleInputChange(
                                      "customer",
                                      field.key,
                                      val,
                                      "ship_to",
                                    );
                                    const cust = customerList.find(
                                      (c) => c.customer_name === val,
                                    );
                                    if (cust)
                                      handleCustomerSelect(cust.customer_id, "ship_to");
                                  }}
                                >
                                  <option value="">Select Customer</option>
                                  {invoiceData.customer.ship_to[field.key] &&
                                    !customerList.find(
                                      (c) =>
                                        c.customer_name ===
                                        invoiceData.customer.ship_to[field.key],
                                    ) && (
                                      <option
                                        value={
                                          invoiceData.customer.ship_to[field.key]
                                        }
                                      >
                                        {invoiceData.customer.ship_to[field.key]}
                                      </option>
                                    )}
                                  {customerList.map((c) => (
                                    <option
                                      key={c.customer_id}
                                      value={c.customer_name}
                                    >
                                      {c.customer_name}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                  size={14}
                                />
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={field.key} className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase">
                              {label}
                            </label>
                            <input
                              type={
                                field.label?.toLowerCase().includes("gst") || field.type === "number"
                                  ? "text"
                                  : field.type || "text"
                              }
                              inputMode={field.type === "number" ? "decimal" : undefined}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                              placeholder={label}
                              value={
                                invoiceData.customer.ship_to[field.key] || ""
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (field.type === "number" && val !== "" && !/^\d*\.?\d*$/.test(val)) return;
                                handleInputChange(
                                  "customer",
                                  field.key,
                                  val,
                                  "ship_to",
                                )
                              }}
                            />
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* 4. Items Section */}
        <CollapsibleSection title="Items">
          <div className="space-y-4">
            {invoiceData.items.map((item, index) => (
              <div
                key={item.id}
                className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm relative group hover:border-blue-200 hover:shadow-md transition-all"
              >
                {/* Header of the Card: Item Index and Remove */}
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                  <h4 className="text-sm font-bold text-slate-700">
                    Item #{index + 1}
                  </h4>
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove Item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
                  {template.items?.columns?.map((col) => {
                    // Skip S.No in the grid as it is handled by the header
                    if (col.label === "S.No" || col.key === "sno") return null;

                    return (
                      <div
                        key={`${item.id}-${col.key}`}
                        className="space-y-1.5"
                      >
                        <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                          {col.label}
                        </label>
                        <input
                          type={col.type === "number" ? "text" : col.type || "text"}
                          inputMode={col.type === "number" ? "decimal" : undefined}
                          className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 ${col.type === "number" ? "font-medium text-slate-700" : ""}`}
                          placeholder={col.label}
                          value={item[col.key] || ""}
                          // onWheel intentionally removed since it's text type
                          onChange={(e) => {
                            const val = e.target.value;
                            if (col.type === "number" && val !== "" && !/^\d*\.?\d*$/.test(val)) return;
                            handleItemChange(index, col.key, val);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleAddItem}
            className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-4 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 w-full justify-center border border-blue-100 border-dashed"
          >
            <Plus size={16} />
            Add New Item
          </button>
        </CollapsibleSection>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* 6. Footer Section (Left) */}
          {template.footer?.fields?.length > 0 && (
            <div className="w-full md:flex-1">
              <CollapsibleSection title="Bank Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">
                      {template.footer?.title || "Bank Details"}
                    </h3>
                    {template.footer?.show_bank_details && (
                      <div className="space-y-2 text-sm text-slate-600">
                        {template.footer?.fields?.map((field) => {
                          if (field.label === "Authorized Signatory")
                            return null;
                          return (
                            <div key={field.key} className="flex gap-2">
                              <span className="font-medium min-w-[80px]">
                                {field.label || field.label}:
                              </span>
                              <span>{field.value || "-"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Notes or Terms could go here */}
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* 5. Total Section (Right) */}
          <div className="w-full md:flex-1 space-y-6">
            {template.total?.fields?.length > 0 && (
              <CollapsibleSection title="Summary">
                <div className="space-y-3">
                  {template.total?.fields?.map((field) => {
                    const calculatedValue = calculateSummaryValue(field);
                    const formattedValue = calculatedValue.toLocaleString('en-IN', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    });
                    
                    return (
                      <div
                        key={field.key}
                        className="flex items-center justify-between"
                      >
                        <span
                          className={`text-sm ${field.bold ? "font-bold text-slate-800" : "text-slate-600"}`}
                        >
                          {field.label || field.label}
                        </span>
                        <span
                          className={`text-sm ${field.bold ? "font-bold text-slate-800" : "text-slate-900"}`}
                        >
                          {formattedValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleSection>
            )}
          </div>
        </div>
      </div>

      {/* Success/Error Popup */}
      {saveResult.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 p-6 relative">
            <button
              onClick={handleClosePopup}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                  saveResult.success
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {saveResult.success ? (
                  <CheckCircle size={24} />
                ) : (
                  <AlertCircle size={24} />
                )}
              </div>

              <h3
                className={`text-lg font-bold mb-2 ${
                  saveResult.success ? "text-green-700" : "text-red-700"
                }`}
              >
                {saveResult.success ? "Success!" : "Error"}
              </h3>

              <p className="text-slate-600 mb-6">{saveResult.message}</p>

              <button
                onClick={handleClosePopup}
                className="px-8 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors shadow-sm mt-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
