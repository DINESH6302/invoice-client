import React from 'react';
import { ToWords } from 'to-words';
import { formatDate } from '@/lib/utils';

const toWords = new ToWords({
  localeCode: 'en-IN',
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
  }
});

export default function InvoiceDocument({ template, data }) {
  // If no data is available, we can't render properly, but we'll try to prevent crash
  if (!data) return <div className="p-8 text-center text-red-500">Invoice data is missing.</div>;
  if (!template) return <div className="p-8 text-center text-red-500">Template data is missing.</div>;

  // Calculate total visible width percentage
  const totalWidthPercent = template.table.columns
    .filter(c => c.visible)
    .reduce((acc, col) => acc + (parseFloat(col.width) || 0), 0);

  const horizontalPaddingMm = 26; 
  const standardPageWidthMm = 210;
  const standardContentWidthMm = standardPageWidthMm - horizontalPaddingMm; 
  
  const contentWidthMm = (totalWidthPercent / 100) * standardContentWidthMm;
  const pageWidthMm = Math.max(standardPageWidthMm, contentWidthMm + horizontalPaddingMm);

  const widthScale = totalWidthPercent > 0 && totalWidthPercent < 100 
    ? (100 / totalWidthPercent) 
    : 1;

  const getColWidth = (widthStr) => {
      const pct = parseFloat(widthStr) || 0;
      return `${(pct * widthScale / 100) * standardContentWidthMm}mm`; 
  };
  
  // Helper to safely get nested values
  const getFieldValue = (section, key, fallback) => {
      // 1. Direct Access nested (e.g. data.header.invoice_number)
      if (data && data[section] && data[section][key] !== undefined) {
          return data[section][key];
      }
      // 2. Direct Access root
      if (data && data[key] !== undefined) return data[key];

      // 3. API Field Structure Access (e.g. data.header.fields[{key:..., value:...}])
      if (data && data[section] && Array.isArray(data[section].fields)) {
          const field = data[section].fields.find(f => f.key === key);
          if (field) return field.value;
      }

      return fallback;
  };

  const formatIfDate = (field, val) => {
      if (val && (field.label?.toLowerCase().includes('date') || field.type === 'date')) {
         return formatDate(val);
      }
      return val;
  };

  // Determine rows to render: Real Data items or empty array
  const rowsToRender = (data && data.items && Array.isArray(data.items.fields)) ? data.items.fields : [];

  // Helper to compute all cell values including formulas
  // NOTE: This logic mimics the frontend calculation. 
  // Ideally backend should provide calculated totals, but for "preview" consistency we re-run it.
  const calculateRowValues = (rowItem, rowIndex) => {
      const values = template.table.columns.map((col) => {
         // S.No
         if (col.label === 'S.No') return rowIndex + 1;
         
         // Item & Description special handling? 
         // If rowItem has description field directly or in fields
         if (col.label.toLowerCase() === 'item & description') {
             // Try check usual keys
             if (rowItem.description) return rowItem.description;
             if (rowItem['Item & Description']) return rowItem['Item & Description'];
             // Try check fields
             if (Array.isArray(rowItem.fields)) {
                 const f = rowItem.fields.find(k => k.key === 'description' || k.key === 'item_description');
                 if (f) return f.value;
             }
         }

         // Direct Mapping
         if (rowItem[col.key] !== undefined) {
             return rowItem[col.key];
         }
         
         // Fields Array Mapping
         if (Array.isArray(rowItem.fields)) {
              const f = rowItem.fields.find(k => k.key === col.key);
              if (f) return f.value;
         }

         // Fallback/Default
         return 0; 
      });

      // Formula Pass - Multi-pass to handle dependencies regardless of column order
      const MAX_PASSES = 5;
      let changed = true;
      let pass = 0;
      
      while (changed && pass < MAX_PASSES) {
          changed = false;
          pass++;
          
          template.table.columns.forEach((col, idx) => {
            if (col.type === 'formula' && col.formula) {
                 try {
                  const expr = col.formula.replace(/\[(.*?)\]/g, (match, labelName) => {
                      const colIndex = template.table.columns.findIndex(c => c.label.toLowerCase() === labelName.toLowerCase());
                      if (colIndex === -1) return 0;
                      const val = parseFloat(values[colIndex]);
                      return isNaN(val) ? 0 : val;
                  });
                  if (/^[\d+\-*/().\s]+$/.test(expr) || true) {
                     const result = new Function(`return (${expr})`)();
                     const newVal = Number.isFinite(result) ? result : 0;
                     
                     if (values[idx] !== newVal) {
                         values[idx] = newVal;
                         changed = true;
                     }
                  }
                 } catch(e) { values[idx] = 0; }
            }
          });
      }
      
      return values;
  };

  // Pre-calculate all rows 
  const calculatedRowsData = rowsToRender.map((row, idx) => calculateRowValues(row, idx));

  // Calculate Column Sum helper
  const calculateColumnSum = (colKey) => {
       const colIdx = template.table.columns.findIndex(c => c.key === colKey);
       if (colIdx === -1) return 0;

       return calculatedRowsData.reduce((acc, rowVals) => {
            return acc + (Number(rowVals[colIdx]) || 0);
       }, 0);
  };

  const grandTotal = calculateColumnSum('total');
  
  const fontFamilyValue = template.companyDetails.fontFamily || 'Inter';
  const bodyFontSize = (template.companyDetails.bodyFontSize || 14) + 'px';

  return (
    <div 
        className="min-h-[297mm] bg-white shadow-sm p-12 relative text-black text-left border overflow-hidden flex flex-col"
        style={{ width: `${pageWidthMm}mm`, fontFamily: fontFamilyValue, fontSize: bodyFontSize }}
    >
      {/* 1. Header Section */}
      <div className="flex justify-between mb-6 pb-6" style={{ borderBottom: `2px solid ${template.companyDetails.isAccentFilled !== false ? template.companyDetails.accentColor : '#000000'}`}}>

        <div className="w-[60%]">
          {template.companyDetails.showLogo && (
             template.companyDetails.logoUrl ? (
                <img src={template.companyDetails.logoUrl} alt="Company Logo" className="w-32 h-auto object-contain mb-6 max-h-16" />
             ) : (
                <div className="w-32 h-16 bg-slate-100 flex items-center justify-center mb-6 text-xs text-slate-400 rounded-sm border border-slate-200 border-dashed">Company Logo</div>
             )
          )}
          <div className="space-y-1">
          {template.companyDetails.fields.filter(f => !f.key.includes('header_') || (f.label !== 'Invoice No' && f.label !== 'Date')).map(field => field.visible && (
             <div key={field.key} className={`${field.bold ? 'font-bold text-2xl text-slate-800 mb-2' : 'text-slate-600'}`}>
               {formatIfDate(field, getFieldValue('header', field.key, '--'))}
             </div>
          ))}
          </div>
        </div>
        <div className="text-right w-[40%]">
           <h1 className="text-slate-100 font-bold mb-6 tracking-tighter" style={{ 
               color: (template.companyDetails.isAccentFilled !== false ? template.companyDetails.accentColor : '#000000') + Math.round((template.companyDetails.headerOpacity || 0.1) * 255).toString(16).padStart(2, '0'), 
               fontSize: (template.companyDetails.headerFontSize || 60) + 'px', 
               lineHeight: 1 
           }}>
              {template.companyDetails.headerTitle || 'INVOICE'}
           </h1>
           <div className="space-y-1">
               {template.companyDetails.fields.filter(f => f.key.includes('header_') && (f.label === 'Invoice No' || f.label === 'Date')).map(field => field.visible && (
                    <div key={field.key} className="flex justify-end gap-4">
                        <span className="font-semibold text-slate-700">{field.label}:</span> 
                        <span className="text-slate-900 font-medium">
                            {formatIfDate(field, getFieldValue('header', field.key, '--'))}
                        </span>
                    </div>
               ))}
           </div>
        </div>
      </div>
      
      {/* 1.5 Meta Data Section */}
      <div className="mb-10">
           <div className="grid gap-x-6 gap-y-4 text-left" style={{ 
               gridTemplateColumns: `repeat(${template.invoiceMeta.columnCount || 1}, minmax(0, 1fr))` 
           }}>
           {template.invoiceMeta.fields.map(field => {
             if (field.visible === false) return null;
             // Global styles from invoiceMeta.displayStyle
             const styles = template.invoiceMeta.displayStyle || {};
             const isRow = styles.layout === 'row';
             const isBold = styles.labelBold;
             
             return (
             <div key={field.key} className={`flex ${isRow ? 'flex-row items-baseline gap-2' : 'flex-col'}`}>
                <span className={`${isBold ? 'font-bold' : 'font-medium'} text-black text-sm tracking-wide ${isRow ? '' : 'mb-0.5'}`}>
                    {field.label}{isRow ? ':' : ''}
                </span> 
                <span className="text-slate-900 font-medium text-base">
                     {formatIfDate(field, getFieldValue('invoice_meta', field.key, '--'))}
                </span>
            </div>
           )})}
           </div>
      </div>

      {/* 2. Bill To / Ship To */}
      <div className="flex justify-between mb-16 gap-12">
        <div className="w-1/2">
           <h3 className="font-bold text-slate-800 mb-3 border-b pb-1 text-sm uppercase tracking-wide" style={{ borderColor: template.companyDetails.isAccentFilled !== false ? template.companyDetails.accentColor : '#000000' }}>{template.customerDetails.billing.title}</h3>
           {template.customerDetails.billing.fields.map(field => {
              if (field.visible === false) return null;
              
              const styles = template.customerDetails.displayStyle || {};
              const showLabel = styles.showLabel ?? true; 
              const labelBold = styles.labelBold ?? false;
              const isRow = styles.layout === 'row';

              let val = '--';
              const section = data?.customer_details?.bill_to;
              if (section) {
                  if (section[field.key]) val = section[field.key];
                  else if (Array.isArray(section.fields)) {
                      const f = section.fields.find(k => k.key === field.key);
                      if (f) val = f.value;
                  }
              }
              val = formatIfDate(field, val);

              if (field.label === 'Name') {
                  return (
                      <div key={field.key} className={`flex ${isRow ? 'flex-row gap-2 items-baseline' : 'flex-col'} mb-1`}>
                         {showLabel && (
                             <div className={`${labelBold ? 'font-bold text-slate-800' : 'text-slate-600'} text-sm ${isRow ? 'min-w-fit' : ''}`}>
                                {field.label}{isRow ? ':' : ''}
                             </div>
                         )}
                         <div className="font-bold text-lg text-slate-900">{val}</div>
                      </div>
                  )
              }

              return (
                  <div key={field.key} className={`flex ${isRow ? 'flex-row gap-2' : 'flex-col'} mb-1 text-slate-600 text-sm`}>
                     {showLabel && (
                         <div className={`${labelBold ? 'font-bold text-slate-800' : ''} ${isRow ? 'min-w-fit' : ''}`}>
                            {field.label}{isRow ? ':' : ''}
                         </div>
                     )}
                     <div className="whitespace-pre-line">{val}</div>
                  </div>
              );
           })}
        </div>
        <div className="w-1/2">
           <h3 className="font-bold text-slate-800 mb-3 border-b pb-1 text-sm uppercase tracking-wide" style={{ borderColor: template.companyDetails.isAccentFilled !== false ? template.companyDetails.accentColor : '#000000' }}>{template.customerDetails.shipping.title}</h3>
           {template.customerDetails.shipping.fields.map(field => {
              if (field.visible === false) return null;

              const styles = template.customerDetails.displayStyle || {};
              const showLabel = styles.showLabel ?? true; 
              const labelBold = styles.labelBold ?? false;
              const isRow = styles.layout === 'row';

              let val = '--';
              const section = data?.customer_details?.ship_to;
              if (section) {
                  if (section[field.key]) val = section[field.key];
                  else if (Array.isArray(section.fields)) {
                      const f = section.fields.find(k => k.key === field.key);
                      if (f) val = f.value;
                  }
              }
              val = formatIfDate(field, val);

              if (field.label === 'Name') {
                  
                  return (
                      <div key={field.key} className={`flex ${isRow ? 'flex-row gap-2 items-baseline' : 'flex-col'} mb-1`}>
                         {showLabel && (
                             <div className={`${labelBold ? 'font-bold text-slate-800' : 'text-slate-600'} text-sm ${isRow ? 'min-w-fit' : ''}`}>
                                {field.label}{isRow ? ':' : ''}
                             </div>
                         )}
                         <div className="font-bold text-lg text-slate-900">{val}</div>
                      </div>
                  )
              }

              return (
                  <div key={field.key} className={`flex ${isRow ? 'flex-row gap-2' : 'flex-col'} mb-1 text-slate-600 text-sm`}>
                     {showLabel && (
                         <div className={`${labelBold ? 'font-bold text-slate-800' : ''} ${isRow ? 'min-w-fit' : ''}`}>
                            {field.label}{isRow ? ':' : ''}
                         </div>
                     )}
                     <div className="whitespace-pre-line">{val}</div>
                  </div>
              );
           })}
        </div>
      </div>

      {/* 3. Items Table */}
      <div 
        className="mb-10 rounded-sm overflow-hidden" 
        style={{
            border: `${template.table.borderWidth || 1}px solid rgba(0, 0, 0, ${template.table.borderOpacity === undefined ? 1 : template.table.borderOpacity})`
        }}
      >
        <div 
            className="flex font-bold text-xs uppercase tracking-wider items-stretch" 
            style={{ 
                backgroundColor: (template.companyDetails.isAccentFilled !== false) ? template.companyDetails.accentColor : 'transparent',
                borderBottom: `${template.table.borderWidth || 1}px solid rgba(0, 0, 0, ${template.table.borderOpacity === undefined ? 1 : template.table.borderOpacity})`,
                color: template.table?.headerTextColor || ((template.companyDetails.isAccentFilled === false) ? '#000000' : '#ffffff')
            }}
        >
           {(() => {
              const visibleCols = template.table.columns.filter(c => c.visible);
              const isFilled = template.companyDetails.isAccentFilled !== false;
              const groups = [];
              visibleCols.forEach((col) => {
                  const last = groups[groups.length - 1];
                  if (col.group && last && last.name === col.group) {
                      last.cols.push(col);
                  } else {
                      groups.push({ name: col.group, cols: [col] });
                  }
              });

              return groups.map((grp, gIdx) => {
                  const isGrouped = !!grp.name;
                  const groupWidth = grp.cols.reduce((acc, c) => acc + (parseFloat(c.width) || 0), 0);
                  const isFirstGroup = gIdx === 0;
                  const isLastGroup = gIdx === groups.length - 1;

                  // Define border color logic for separators
                  const borderColor = `rgba(0, 0, 0, ${template.table.borderOpacity === undefined ? 1 : template.table.borderOpacity})`;
                  const borderStyle = `${template.table.borderWidth || 1}px solid ${borderColor}`;

                  return (
                      <div key={gIdx} style={{ width: getColWidth(groupWidth), flexShrink: 0, borderRight: isLastGroup ? 'none' : borderStyle }} className={`flex flex-col`}>
                          {isGrouped ? (
                              <>
                                <div 
                                    className={`flex-1 flex items-center justify-center text-[10px] px-1 truncate ${isFilled ? 'bg-white/10' : ''}`}
                                    style={{ borderBottom: borderStyle }}
                                >
                                    {grp.name}
                                </div>
                                <div className="flex flex-1">
                                    {grp.cols.map((col, cIdx) => (
                                        <div key={col.key} style={{ width: getColWidth(col.width) }} className={`flex items-center justify-center`}>
                                            <div 
                                                style={{ 
                                                    justifyContent: col.align === 'center' ? 'center' : (col.align === 'right' ? 'flex-end' : 'flex-start'),
                                                    borderRight: cIdx === grp.cols.length - 1 ? 'none' : borderStyle
                                                }}
                                                className={`flex items-center w-full h-full px-2 ${isFirstGroup && cIdx === 0 ? 'pl-4' : ''} ${isLastGroup && cIdx === grp.cols.length - 1 ? 'pr-4' : ''}`}
                                            >
                                                {col.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                              </>
                          ) : (
                              <div className="h-full flex flex-col justify-center">
                                  {grp.cols.map((col) => (
                                      <div key={col.key} style={{ 
                                          justifyContent: col.align === 'center' ? 'center' : (col.align === 'right' ? 'flex-end' : 'flex-start'),
                                          paddingTop: (template.table.thPadding || 12) + 'px',
                                          paddingBottom: (template.table.thPadding || 12) + 'px'
                                      }} className={`h-full px-2 flex items-center ${isFirstGroup ? 'pl-4' : ''} ${isLastGroup ? 'pr-4' : ''}`}>
                                          {col.label}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  );
              });
           })()}
        </div>
        {/* Real Rows */}
        {calculatedRowsData.map((rowVals, rowIdx) => (
           <div key={rowIdx} className="flex last:border-b-0 text-slate-700 text-sm items-stretch"
                style={{ borderBottom: rowIdx === calculatedRowsData.length - 1 ? 'none' : `${template.table.borderWidth || 1}px solid rgba(0, 0, 0, ${template.table.borderOpacity === undefined ? 1 : template.table.borderOpacity})` }}
           >
              {template.table.columns.map((col, idx) => {
                 if (!col.visible) return null;
                 const val = rowVals[idx];
                 return (
                 <div key={col.key} 
                      style={{ 
                          width: getColWidth(col.width), 
                          flexShrink: 0,
                          borderRight: idx === template.table.columns.length - 1 ? 'none' : `${template.table.borderWidth || 1}px solid rgba(0, 0, 0, ${template.table.borderOpacity === undefined ? 1 : template.table.borderOpacity})`
                      }} 
                      className=""
                 >
                    <div 
                        style={{
                            paddingTop: (template.table.tdPadding || 16) + 'px',
                            paddingBottom: (template.table.tdPadding || 16) + 'px'
                        }}
                        className={`px-2 h-full flex items-center ${col.align === 'right' ? 'justify-end' : (col.align === 'center' ? 'justify-center' : 'justify-start')} ${idx === 0 ? 'pl-4' : ''} ${idx === template.table.columns.length - 1 ? 'pr-4' : ''}`}
                    >
                        {col.label === 'Item & Description' ? (
                            <div className="text-left w-full">
                                    <span className="font-medium text-slate-900 block">{val}</span>
                                    {(() => { // Render separate Description if available
                                        const r = rowsToRender[rowIdx];
                                        if(!r) return null;
                                        // Attempt to find detailed description. 
                                        // Usually 'description' key separate from item name.
                                        let desc = r.description; 
                                        if(!desc && Array.isArray(r.fields)) {
                                            const f = r.fields.find(k => k.key === 'description' || k.key === 'item_description');
                                            if(f) desc = f.value;
                                            
                                            // Ensure we didn't just pick up the same value as the main column if keys overlap
                                            if (desc === val) desc = null;
                                        }
                                        
                                        if (desc) {
                                            return <span className="text-xs text-slate-500 block">{desc}</span>; 
                                        }
                                        return null;
                                    })()}
                                </div>
                             ) : 
                             (col.type === 'number' || col.type === 'formula') ? (
                                typeof val === 'number' ? val.toFixed(2) : val
                             ) : val}
                        </div>
                 </div>
              )})}
           </div>
        ))}
      </div>

      {/* 4. Totals & Amount In Words */}
      <div className="flex justify-between items-start gap-8">
         {/* Left Side: Amount In Words & Bank Details */}
         <div className="flex-1 max-w-[50%] pt-2 space-y-6">
            <div>
                <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase">Total Amount In Words</h4>
                <div className="text-slate-600 text-sm p-3 bg-slate-50 rounded border border-slate-200 w-full">
                    <p className="capitalize italic">{toWords.convert(grandTotal, { currency: true })}</p>
                </div>
            </div>

            {/* Bank Details */}
            {template.footer?.bankDetails?.visible && (
                <div>
                    <h4 className="font-bold text-slate-800 mb-2 text-sm uppercase">{template.footer.bankDetails.title || 'Bank Details'}</h4>
                    <div className="text-slate-600 text-sm p-3 bg-slate-50 rounded border border-slate-200 w-full">
                        {template.footer.bankDetails.fields?.map((field, idx) => (
                             field.visible && (
                                <div key={idx} className="flex justify-between py-0.5">
                                    <span className="font-semibold w-24 shrink-0">{field.label}:</span> 
                                    <span className="text-right flex-1">{getFieldValue('footer', field.key, field.value)}</span>
                                </div>
                             )
                        ))}
                    </div>
                </div>
            )}
         </div>

         {/* Right Side: Totals */}
         <div className="w-1/2 bg-slate-50 p-6 rounded-lg border border-slate-100">
            {[
                ...template.summary.fields.filter(f => f.key !== 'grand_total'),
                ...template.summary.fields.filter(f => f.key === 'grand_total')
            ].map(field => {
                if(!field.visible) return null;

                // Calculate value based on sourceColumn if present
                let displayValue = '--';
                if (field.sourceColumn) {
                    const sum = calculateColumnSum(field.sourceColumn);
                    
                    if (field.sourceColumn === 'quantity') displayValue = sum;
                    else displayValue = '₹ ' + sum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                } else if (field.key === 'grand_total') {
                     displayValue = '₹ ' + grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                }

                return (
               <div key={field.key} className={`flex justify-between py-2 ${field.bold ? 'font-bold text-xl mt-4 text-slate-900' : 'text-slate-600'}`}>
                  <span>{field.label}</span>
                  <span className={field.bold ? '' : 'font-medium'}>{displayValue}</span>
               </div>
            )})}
         </div>
      </div>
      
      {/* 5. Footer */}
      <div className="mt-8 pt-6 grow-0">
         <div className="flex justify-end items-end">
            <div className="text-center">
                <div className="border-t border-slate-400 w-48 pt-3 font-bold text-slate-700">{template.footer.signatureLabel}</div>
            </div>
         </div>
         <div className="mt-8 text-xs text-slate-400 text-center border-t pt-4">
            This is a computer generated invoice. No signature required.
         </div>
      </div>
    </div>
  );
}
