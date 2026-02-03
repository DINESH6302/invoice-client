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
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
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
      let activeTemplateId = templateId;
      let invoiceToLoad = null;
      let isEditMode = false;

      // Check Session Storage for Edit/Duplicate
      if (typeof window !== 'undefined') {
          const editId = sessionStorage.getItem('editInvoiceId');
          const dupId = sessionStorage.getItem('duplicateInvoiceId');
          
          let fetchId = null;
          if (editId) {
             fetchId = editId;
             isEditMode = true;
             setEditingInvoiceId(editId);
             sessionStorage.removeItem('editInvoiceId');
          } else if (dupId) {
             fetchId = dupId;
             sessionStorage.removeItem('duplicateInvoiceId');
          }

          if (fetchId) {
             const invRes = await apiFetch(`/v1/invoices/${fetchId}`);
             if (invRes.ok) {
                 const json = await invRes.json();
                 invoiceToLoad = json.data || json;
                 if (invoiceToLoad.template_id) activeTemplateId = invoiceToLoad.template_id;
                 if (invoiceToLoad.customer_id) setSelectedCustomerId(invoiceToLoad.customer_id);
             }
          }
      }
      
      let isDuplicate = false;
      if (typeof window !== 'undefined' && sessionStorage.getItem('isDuplicate') === 'true') {
          isDuplicate = true;
          sessionStorage.removeItem('isDuplicate');
      }

      const templateApiUrl = activeTemplateId
        ? `/templates/${activeTemplateId}`
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
        } else if (activeTemplateId) {
          setLoadedTemplateId(activeTemplateId);
        }
      } else {
        throw new Error(
          activeTemplateId
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
        if (invoiceToLoad) {
             // Use setTimeout to ensure populateInvoiceData state update has processed 
             // or overwrite it completely since populate merges into prev.
             // Actually, initializeInvoiceData does setInvoiceData(initialData).
             // populateInvoiceData does setInvoiceData(prev => ...).
             
             populateInvoiceData(invoiceToLoad);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Network or Template error occurred");
    } finally {
      setLoading(false);
    }
  };

  const populateInvoiceData = (inv) => {
      setInvoiceData(prev => {
         const newData = { ...prev };
         
         const fillConfig = (sourceFields, targetObj) => {
             if (Array.isArray(sourceFields)) {
                 sourceFields.forEach(f => {
                     targetObj[f.key] = f.value;
                 });
             }
         };

         if (inv.header?.fields) fillConfig(inv.header.fields, newData.header);
         if (inv.invoice_meta?.fields) fillConfig(inv.invoice_meta.fields, newData.meta);
         
         if (inv.customer_details) {
             if (inv.customer_details.bill_to?.fields) fillConfig(inv.customer_details.bill_to.fields, newData.customer.bill_to);
             if (inv.customer_details.ship_to?.fields) fillConfig(inv.customer_details.ship_to.fields, newData.customer.ship_to);
         }

         if (inv.items?.fields) {
             newData.items = inv.items.fields.map(item => ({ ...item, id: Date.now() + Math.random() }));
         }

         if (inv.footer?.fields) fillConfig(inv.footer.fields, newData.footer);
         
         // Force overwrite Invoice No from top-level property if available
         // This handles cases where backend duplicate logic updates the top-level column 
         // but not the JSON blob field value.
         if (inv.invoice_number && inv.header?.fields) {
             const invNoField = inv.header.fields.find(f => (f.label || '').toLowerCase().includes("invoice no"));
             if (invNoField) {
                 newData.header[invNoField.key] = inv.invoice_number;
             }
         }

         return newData;
      });
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

    // Summary/Total Section with calculated values
    const summarySectionFields = template.total?.fields || template.summary?.fields;
    if (summarySectionFields) {
        payload.summary = {
            fields: summarySectionFields.map(field => ({
                key: field.key,
                label: field.label,
                value: calculateSummaryValue(field)
            }))
        };
    }

    // Calculate Analytics fields (Total, Tax, Quantity)
    const summaryFields = summarySectionFields || [];
    if (summaryFields.length > 0) {
        summaryFields.forEach(field => {
            // Check for analytics_column
            const type = field.analytics_column;
            
            if (type && ['Total', 'Tax', 'Quantity'].includes(type)) {
                const val = calculateSummaryValue(field);
                
                if (type === 'Total') payload.total = val;
                if (type === 'Tax') payload.tax = val; 
                if (type === 'Quantity') payload.quantity = val;
            }
        });
    }

    try {
      setIsSaving(true);
      let res;
      
      if (editingInvoiceId) {
          res = await apiFetch(`/v1/invoices/${editingInvoiceId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      } else {
          res = await apiFetch("/v1/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      }

      if (res.ok) {
        setSaveResult({
          show: true,
          success: true,
          message: editingInvoiceId ? "Invoice updated successfully." : "Invoice created successfully.",
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
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
         <p className="text-red-500">{error || "Template not found"}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800">
      {/* Top Header */}
      <div className="h-[58px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-20">
        <div className="flex flex-col justify-center">
            <div className="font-bold text-[17px] text-slate-800 tracking-tight leading-none">
                {editingInvoiceId ? "Edit Invoice" : "Create Invoice"}
            </div>
            {template?.template_name && (
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                    Template: <span className="text-slate-700">{template.template_name}</span>
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-2.5">
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-[14px] py-[7px] text-[13px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-md transition-colors shadow-sm border border-blue-100 hover:border-blue-600 disabled:opacity-50"
            >
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {editingInvoiceId ? "Update Invoice" : "Save Invoice"}
            </button>
            <button 
                onClick={() => router.back()}
                className="flex items-center gap-1.5 px-[14px] py-[7px] text-[13px] font-medium text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-md transition-colors shadow-sm border border-red-100 hover:border-red-600"
            >
                <X size={16} />
                Close
            </button>
        </div>
      </div>

      {/* Main Content Full Screen */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
         <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-5 h-full">
            
            {/* ROW 1: HEADER & CUSTOMER */}
            {/* Header Details (Left) */}
            {template.header?.fields?.length > 0 && (
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                <div className="bg-white border border-slate-200 rounded-lg shadow-md p-5 flex flex-col gap-4 h-full">
                    <h3 className="text-sm font-bold uppercase text-blue-600 tracking-wider">Header Details</h3>
                    <div className="space-y-4">
                        {(() => {
                            const fields = template.header?.fields || [];
                            const getField = (labelLike) => fields.find(f => (f.label || '').toLowerCase().includes(labelLike.toLowerCase()));
                            const renderField = (field) => {
                                if (!field) return null;
                                return (
                                    <div key={field.key} className="space-y-1 w-full">
                                        <label className="text-[11px] font-semibold text-slate-600 block">{field.label}</label>
                                        <input
                                            className="w-full h-8 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors placeholder:text-slate-300"
                                            placeholder={field.label}
                                            value={invoiceData.header[field.key] || ""}
                                            type={field.label?.toLowerCase().includes("date") ? "date" : "text"}
                                            onChange={(e) => handleInputChange("header", field.key, e.target.value)}
                                        />
                                    </div>
                                );
                            };

                            const invoiceNo = getField("Invoice No");
                            const dateField = getField("Date");
                            const companyName = getField("Company Name");
                            const gstField = getField("GSTIN") || getField("GST");
                            const addressField = getField("Address");
                            
                            // Remaining fields excluding the ones we just picked
                            const usedKeys = [invoiceNo, dateField, companyName, gstField, addressField].filter(Boolean).map(f => f.key);
                            const otherFields = fields.filter(f => !usedKeys.includes(f.key));

                            return (
                                <>
                                    {/* Row 1: Invoice No & Date */}
                                    <div className="flex gap-4">
                                        {renderField(invoiceNo)}
                                        {renderField(dateField)}
                                    </div>

                                    {/* Row 2: Company Name & GST */}
                                    <div className="flex gap-4">
                                        {renderField(companyName)}
                                        {renderField(gstField)}
                                    </div>

                                    {/* Row 3: Address (Full Width) */}
                                    <div className="w-full">
                                        {renderField(addressField)}
                                    </div>

                                    {/* Row 4+: Remaining fields */}
                                    {otherFields.length > 0 && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {otherFields.map(f => renderField(f))}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>
            )}

            {/* Customer Details (Right) */}
            {(template.customer_details?.bill_to?.fields?.length > 0 || template.customer_details?.ship_to?.fields?.length > 0) && (
            <div className="col-span-12 lg:col-span-8">
                <div className="bg-white border border-slate-200 rounded-lg shadow-md p-5 h-full">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold uppercase text-blue-600 tracking-wider">Customer Details</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 relative h-full">
                         {/* Divider Line (Visible on Desktop) */}
                         <div className="hidden md:block absolute top-4 bottom-4 left-1/2 w-px bg-slate-200 -ml-px"></div>

                         {/* Bill To */}
                         <div className="p-4 flex flex-col gap-3 h-full md:pr-8">
                             <div className="flex items-center gap-2 mb-1">
                                <User size={14} className="text-blue-500"/>
                                <span className="text-xs font-bold text-slate-700">Bill To</span>
                             </div>
                             <div className="space-y-3 flex-1">
                                {template.customer_details?.bill_to?.fields?.map((field) => (
                                    <div key={field.key}>
                                        <input
                                            className="w-full h-8 px-3 text-xs bg-white border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                            placeholder={field.label}
                                            value={invoiceData.customer.bill_to[field.key] || ""}
                                            onChange={(e) => handleInputChange("customer", field.key, e.target.value, "bill_to")}
                                        />
                                    </div>
                                ))}
                             </div>
                         </div>

                         {/* Ship To */}
                         <div className="p-4 flex flex-col gap-3 h-full md:pl-8 border-t md:border-t-0 border-slate-200">
                             <div className="flex items-center gap-2 mb-1">
                                <MapPin size={14} className="text-blue-500"/>
                                <span className="text-sm font-bold text-slate-700">Ship To</span>
                             </div>
                             <div className="space-y-3 flex-1">
                                {template.customer_details?.ship_to?.fields?.map((field) => {
                                    if (field.label === "Name") {
                                        return (
                                            <div key={field.key} className="relative">
                                                <select
                                                    className="w-full h-8 px-3 text-xs bg-white border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors appearance-none"
                                                    value={invoiceData.customer.ship_to[field.key] || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        handleInputChange("customer", field.key, val, "ship_to");
                                                        const cust = customerList.find(c => c.customer_name === val);
                                                        if(cust) handleCustomerSelect(cust.customer_id, "ship_to");
                                                    }}
                                                >
                                                    <option value="">Select Customer</option>
                                                    {customerList.map(c => (
                                                        <option key={c.customer_id} value={c.customer_name}>{c.customer_name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                            </div>
                                        )
                                    }
                                    return (
                                        <div key={field.key}>
                                            <input
                                                className="w-full h-8 px-3 text-xs bg-white border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                                placeholder={field.label}
                                                value={invoiceData.customer.ship_to[field.key] || ""}
                                                onChange={(e) => handleInputChange("customer", field.key, e.target.value, "ship_to")}
                                            />
                                        </div>
                                    )
                                })}
                             </div>
                         </div>
                    </div>
                </div>
            </div>
            )}

            {/* ROW 2: INVOICE META DETAILS */}
            {template.invoice_meta?.fields?.length > 0 && (
            <div className="col-span-12">
                <div className="bg-white border border-slate-200 rounded-lg shadow-md p-4">
                    <h3 className="text-sm font-bold uppercase text-blue-600 tracking-wider mb-3">Invoice Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {template.invoice_meta?.fields?.map((field) => (
                             <div key={field.key} className="space-y-1">
                                <label className="text-[11px] font-semibold text-slate-500">{field.label}</label>
                                <input
                                    className="w-full h-8 px-3 text-xs border border-slate-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                                    value={invoiceData.meta[field.key] || ""}
                                    type={field.label?.toLowerCase().includes("date") ? "date" : "text"}
                                    onChange={(e) => handleInputChange("meta", field.key, e.target.value)}
                                />
                             </div>
                        ))}
                    </div>
                </div>
            </div>
            )}

            {/* ROW 3: ITEM TABLE */}
            {template.items?.columns?.length > 0 && (
            <div className="col-span-12">
               <div className="bg-white border border-slate-200 rounded-lg shadow-md overflow-hidden flex flex-col">
                   <div className="overflow-x-auto">
                       <table className="w-full text-left text-xs">
                           <thead className="bg-slate-50 border-b border-slate-200">
                               <tr>
                                   <th className="px-4 py-3 font-semibold text-slate-600 w-12 text-center">#</th>
                                   {template.items?.columns?.filter(c => c.label !== "S.No" && c.key !== "sno").map(col => (
                                       <th key={col.key} className="px-4 py-3 font-semibold text-slate-600 min-w-[100px]">
                                           {col.label}
                                       </th>
                                   ))}
                                   <th className="px-2 py-3 w-10"></th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {invoiceData.items.map((item, index) => (
                                   <tr key={item.id} className="group hover:bg-slate-50/50">
                                       <td className="px-4 py-2 text-center text-slate-400 font-mono">{index + 1}</td>
                                       {template.items?.columns?.filter(c => c.label !== "S.No" && c.key !== "sno").map(col => (
                                           <td key={`${item.id}-${col.key}`} className="px-4 py-2">
                                               <input
                                                  className={`w-full h-7 px-2 text-xs bg-slate-50 border border-slate-200 rounded hover:border-blue-300 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400 placeholder:text-left text-left ${col.type === 'number' ? 'font-medium' : ''}`}
                                                  placeholder={col.label}
                                                  value={item[col.key] || ""}
                                                  onChange={(e) => handleItemChange(index, col.key, e.target.value)}
                                               />
                                           </td>
                                       ))}
                                       <td className="px-2 py-2 text-center">
                                           <button 
                                              onClick={() => handleRemoveItem(index)}
                                              className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                              title="Remove Item"
                                           >
                                               <Trash2 size={14} />
                                           </button>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
                   <div className="p-2 border-t border-slate-100 bg-slate-50/30">
                       <button
                           onClick={handleAddItem}
                           className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                       >
                           <Plus size={14} />
                           Add Item
                       </button>
                   </div>
               </div>
            </div>
            )}

            {/* ROW 4: SUMMARY & FOOTER */}
            {(template.footer?.show_bank_details || template.total?.fields?.length > 0) && (
            <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-start pb-8">
               {/* Left: Bank Details */}
               <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-md">
                   <h3 className="text-sm font-bold uppercase text-blue-600 tracking-wider mb-3">{template.footer?.title || "Bank Details"}</h3>
                   {template.footer?.show_bank_details && (
                      <div className="space-y-2 text-xs text-slate-600">
                        {template.footer?.fields?.map((field) => {
                          if (field.label === "Authorized Signatory") return null;
                          return (
                            <div key={field.key} className="flex gap-2">
                              <span className="font-semibold min-w-[100px] text-slate-500 uppercase text-[10px]">{field.label}:</span>
                              <span className="font-medium text-slate-800">{field.value || "-"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
               </div>

               {/* Right: Calculations/Total */}
               {template.total?.fields?.length > 0 && (
               <div>
                  <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-md">
                      <h3 className="text-sm font-bold uppercase text-blue-600 tracking-wider mb-4">Summary</h3>
                      <div className="space-y-3">
                          {template.total?.fields?.map((field) => {
                             const calculatedValue = calculateSummaryValue(field);
                             const formattedValue = calculatedValue.toLocaleString('en-IN', { 
                               minimumFractionDigits: 2, 
                               maximumFractionDigits: 2 
                             });
                             
                             if(field.label === 'Total' || field.label === 'Grand Total') {
                                 return (
                                     <div key={field.key} className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                                         <span className="text-sm font-bold text-slate-800">{field.label}</span>
                                         <span className="text-lg font-bold text-blue-600">₹ {formattedValue}</span>
                                     </div>
                                 )
                             }

                             return (
                                <div key={field.key} className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-500">{field.label}</span>
                                    <span className="text-xs font-semibold text-slate-800">{formattedValue}</span>
                                </div>
                             );
                          })}
                      </div>
                  </div>
               </div>
               )}
            </div>
            )}

         </div>
      </div>

      {/* Popups */}
      {saveResult.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 p-6 relative">
            <button
              onClick={handleClosePopup}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${saveResult.success ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                {saveResult.success ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
              </div>
              <h3 className={`text-lg font-bold mb-2 ${saveResult.success ? "text-green-700" : "text-red-700"}`}>
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
