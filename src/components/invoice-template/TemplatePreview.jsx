import React from 'react';
import { ToWords } from 'to-words';

const toWords = new ToWords({
  localeCode: 'en-IN',
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
  }
});

export default function TemplatePreview({ template, renderData }) {
  // Calculate total visible width percentage
  // If user sets columns like "10%" and there are 15 of them, total is 150%.
  // A4 Page is 210mm. If total > 100%, page extends.
  // We parse "10%" -> 10.
  const totalWidthPercent = template.table.columns
    .filter(c => c.visible)
    .reduce((acc, col) => acc + (parseFloat(col.width) || 0), 0);

  // Helper to safely get nested values
  const getFieldValue = (section, key, fallback) => {
      // 1. Try finding by key in the section (e.g. data.header['header_123'])
      if (renderData && renderData[section] && renderData[section][key] !== undefined) {
          return renderData[section][key];
      }
      
      // 2. Try finding by key in the root data
      if (renderData && renderData[key] !== undefined) return renderData[key];

      // 3. Try finding in 'fields' array if the section has it (Invoice API structure)
      if (renderData && renderData[section] && Array.isArray(renderData[section].fields)) {
          const fieldObj = renderData[section].fields.find(f => f.key === key);
          if (fieldObj) return fieldObj.value;
      }
      
      return fallback;
  };

  // We are using `box-sizing: border-box`. 
  // The container has `p-12` padding. 
  // 1 inch = 25.4mm = 96px. 
  // p-12 = 3rem = 48px = 0.5 inches = 12.7mm.
  // Left + Right = 25.4mm.
  const horizontalPaddingMm = 26; // Using 26 to be safe
  const standardPageWidthMm = 210;
  const standardContentWidthMm = standardPageWidthMm - horizontalPaddingMm; // ~184mm
  
  // Calculate the raw required width for the table content
  // If columns sum to 100%, they should take up `standardContentWidthMm`.
  // If columns sum to 120%, they take up `1.2 * standardContentWidthMm`.
  const contentWidthMm = (totalWidthPercent / 100) * standardContentWidthMm;
  
  // The page width is Max(A4, content + padding)
  const pageWidthMm = Math.max(standardPageWidthMm, contentWidthMm + horizontalPaddingMm);

  // Auto-fit logic: If columns sum < 100%, scale them up to fill the print area.
  const widthScale = totalWidthPercent > 0 && totalWidthPercent < 100 
    ? (100 / totalWidthPercent) 
    : 1;

  const getColWidth = (widthStr) => {
      const pct = parseFloat(widthStr) || 0;
      // Calculate mm based on the CONTENT width, not page width.
      return `${(pct * widthScale / 100) * standardContentWidthMm}mm`; 
  };
  
  // Dummy Data for Preview
  const PREVIEW_ROWS = [1, 2, 3, 4, 5, 6];

  // Helper to compute all cell values including formulas
  const calculateRowValues = (rowItem, rowIndex) => {
      // Map column values - all values are already calculated and stored
      const values = template.table.columns.map((col) => {
          // A. Real Data Handling
          if (renderData && typeof rowItem === 'object') {
              // Priority 1: Check 'fields' array (API Standard)
              if (Array.isArray(rowItem.fields)) {
                  const field = rowItem.fields.find(f => f.key === col.key);
                  if (field) {
                      // Convert to number if it's a number/formula column
                      if (col.type === 'number' || col.type === 'formula') {
                          const num = parseFloat(field.value);
                          return isNaN(num) ? 0 : num;
                      }
                      return field.value;
                  }
              }
              // Priority 2: Direct Property Access using column key
              if (rowItem[col.key] !== undefined) {
                  // Convert to number if it's a number/formula column
                  if (col.type === 'number' || col.type === 'formula') {
                      const num = parseFloat(rowItem[col.key]);
                      return isNaN(num) ? 0 : num;
                  }
                  return rowItem[col.key];
              }

              // Priority 3: Special Columns
              if (col.label === 'S.No') return rowIndex + 1;

              // Fallback
              return col.type === 'number' || col.type === 'formula' ? 0 : '';
          }

          // B. Dummy Data Handling (for template preview without invoice data)
          const rowNum = rowItem;
          if (col.label === 'S.No') return rowNum;
          if (col.label === 'Item & Description') return "Premium Product Name";
          if (col.type === 'number') return rowNum * 100;
          
          // For formula columns in dummy mode, calculate them
          if (col.type === 'formula') return 0; // Will be calculated below
          
          return 0;
      });

      // Only calculate formulas for dummy preview mode (no renderData)
      if (!renderData) {
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
                              const colIndex = template.table.columns.findIndex(c => 
                                  c.label.toLowerCase() === labelName.toLowerCase()
                              );
                              if (colIndex === -1) return 0;

                              const val = values[colIndex];
                              const numVal = typeof val === 'number' ? val : parseFloat(val);
                              return isNaN(numVal) ? 0 : numVal;
                          });
                          
                          const result = new Function(`return (${expr})`)();
                          const newVal = Number.isFinite(result) ? result : 0;
                          
                          if (values[idx] !== newVal) {
                              values[idx] = newVal;
                              changed = true;
                          }
                      } catch (e) {
                          console.warn("Formula Error", e);
                          values[idx] = 0;
                      }
                  }
              });
          }
      }
      
      return values;
  };

  // Pre-calculate all rows to be used in rendering and totals
  const rowsSource = (renderData && renderData.items) ? renderData.items : PREVIEW_ROWS;
  // If renderData.items is just { fields: ... } or similar wrapper, we might need to drill down. 
  // Assuming renderData.items is Array.
  
  const calculatedRowsData = (Array.isArray(rowsSource) ? rowsSource : []).map((row, idx) => calculateRowValues(row, idx));

  // Calculate Column Sum helper using computed data
  const calculateColumnSum = (colKey) => {
       // Find column index
       const colIdx = template.table.columns.findIndex(c => c.key === colKey);
       if (colIdx === -1) return 0;

       return calculatedRowsData.reduce((acc, rowVals) => {
            return acc + (Number(rowVals[colIdx]) || 0);
       }, 0);
  };

  // Calculate column aggregate based on function type (sum, sub, mul, avg, max, min)
  const calculateColumnAggregate = (colKey, funcType) => {
       const colIdx = template.table.columns.findIndex(c => c.key === colKey);
       if (colIdx === -1) return 0;

       const values = calculatedRowsData.map(rowVals => Number(rowVals[colIdx]) || 0);
       if (values.length === 0) return 0;

       switch (funcType) {
           case 'sum':
               return values.reduce((acc, val) => acc + val, 0);
           case 'sub':
               // Subtraction: negative of the sum
               return -1 * values.reduce((acc, val) => acc + val, 0);
           case 'mul':
               // Multiplication: multiply all values together
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
  const calculateChainedAggregations = (aggregations) => {
       if (!aggregations || aggregations.length === 0) return 0;

       let result = 0;
       aggregations.forEach((agg, index) => {
           const aggValue = calculateColumnAggregate(agg.sourceColumn, agg.function || 'sum');
           
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

  // Dynamic Grand Total Calculation (matches 'total' column sum or column specified in summary)
  // Default to looking for a column named 'total' or 'amount'
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
                {(() => {
                    const fallback = field.label === 'Company Name' ? 'Acme Corp Private Ltd' : 
                                     field.label === 'Address' ? '123 Business Park, Fifth Avenue' : 
                                     field.label === 'GSTIN' ? '33AAAAA0000A1Z5' : 
                                     'Custom Value';
                    
                    const value = getFieldValue('header', field.key, fallback);
                    
                    // Specific formatting for GSTIN or labeled fields if needed, 
                    // but usually the value is just the value.
                    // If the Dummy data included "GSTIN: ", we might want to replicate that pattern if strictly needed.
                    // But clearer is to just show value.
                    // The previous code hardcoded 'GSTIN: ...'. Let's optionally prefix if needed.
                    if (field.label === 'GSTIN' && !value.toString().startsWith('GSTIN')) {
                        return `GSTIN: ${value}`;
                    }
                    if ((field.key.startsWith('custom') || field.key.startsWith('header')) && value === 'Custom Value') {
                        return `${field.label}: ${value}`;
                    }
                    return value;
                })()}
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
               {/* Primary Header Fields (Invoice #, Date/TimeStamps in 173... range) */}
               {template.companyDetails.fields.filter(f => f.key.includes('header_') && (f.label === 'Invoice No' || f.label === 'Date')).map(field => field.visible && (
                    <div key={field.key} className="flex justify-end gap-4">
                        <span className="font-semibold text-slate-700">{field.label}:</span> 
                        <span className="text-slate-900 font-medium">
                            {getFieldValue('header', field.key, field.label === 'Date' ? '12 Oct 2026' : 'INV-#00912')}
                        </span>
                    </div>
               ))}
           </div>
        </div>
      </div>
      
      {/* 1.5 Meta Data Section (Moved below line) */}
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
                <span className={`${isBold ? 'font-bold' : 'font-medium'} text-black tracking-wide ${isRow ? '' : 'mb-0.5'}`}>
                    {field.label}{isRow ? ':' : ''}
                </span> 
                <span className="text-slate-900 font-medium">
                     {getFieldValue('header', field.key, 'Custom Val')}
                </span>
            </div>
           )})}
           </div>
      </div>

      {/* 2. Bill To / Ship To */}
      <div className="flex justify-between mb-16 gap-12">
        <div className="w-1/2">
           <h3 className="font-bold text-slate-800 mb-3 border-b pb-1 uppercase tracking-wide" style={{ borderColor: template.companyDetails.isAccentFilled !== false ? template.companyDetails.accentColor : '#000000' }}>{template.customerDetails.billing.title}</h3>
           {template.customerDetails.billing.fields.map(field => {
              if (field.visible === false) return null;
              
              const styles = template.customerDetails.displayStyle || {};
              const showLabel = styles.showLabel ?? true; 
              const labelBold = styles.labelBold ?? false;
              const isRow = styles.layout === 'row'; 

              const fallback = field.label === 'Name' ? 'John Doe Enterprises' : 
                               field.label === 'Address' ? '45, North Street, Main Road\nChennai, Tamil Nadu - 600028' : 
                               field.label;
              
              const val = getFieldValue('billTo', field.key, fallback);
              
              // if (field.label === 'State' && !renderData) return null;

              if (field.label === 'Name') {
                  return (
                      <div key={field.key} className={`flex ${isRow ? 'flex-row gap-2 items-baseline' : 'flex-col'} mb-1`}>
                         {showLabel && (
                             <div className={`${labelBold ? 'font-bold text-slate-800' : 'text-slate-600'} ${isRow ? 'min-w-fit' : ''}`}>
                                {field.label}{isRow ? ':' : ''}
                             </div>
                         )}
                         <div className="font-bold text-slate-900">{val}</div>
                      </div>
                  )
              }

              return (
                  <div key={field.key} className={`flex ${isRow ? 'flex-row gap-2' : 'flex-col'} mb-1 text-slate-600`}>
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
           <h3 className="font-bold text-slate-800 mb-3 border-b pb-1 uppercase tracking-wide" style={{ borderColor: template.companyDetails.isAccentFilled !== false ? template.companyDetails.accentColor : '#000000' }}>{template.customerDetails.shipping.title}</h3>
           {template.customerDetails.shipping.fields.map(field => {
              if (field.visible === false) return null;

              const styles = template.customerDetails.displayStyle || {};
              const showLabel = styles.showLabel ?? true; 
              const labelBold = styles.labelBold ?? false;
              const isRow = styles.layout === 'row';

              const fallback = field.label === 'Name' ? 'John Doe Enterprises' : 
                               field.label === 'Address' ? 'Warehouse No. 9\nKanchipuram, Tamil Nadu' : 
                               field.label;
              
              const val = getFieldValue('shipTo', field.key, fallback);

              // if (field.label === 'State' && !renderData) return null;

              if (field.label === 'Name') {
                  
                  return (
                      <div key={field.key} className={`flex ${isRow ? 'flex-row gap-2 items-baseline' : 'flex-col'} mb-1`}>
                         {showLabel && (
                             <div className={`${labelBold ? 'font-bold text-slate-800' : 'text-slate-600'} ${isRow ? 'min-w-fit' : ''}`}>
                                {field.label}{isRow ? ':' : ''}
                             </div>
                         )}
                         <div className="font-bold text-slate-900">{val}</div>
                      </div>
                  )
              }

              return (
                  <div key={field.key} className={`flex ${isRow ? 'flex-row gap-2' : 'flex-col'} mb-1 text-slate-600`}>
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
            className="flex font-bold uppercase tracking-wider items-stretch" 
            style={{ 
                backgroundColor: (template.companyDetails.isAccentFilled !== false) ? template.companyDetails.accentColor : 'transparent',
                borderBottom: `${template.table.borderWidth || 1}px solid rgba(0, 0, 0, ${template.table.borderOpacity === undefined ? 1 : template.table.borderOpacity})`,
                color: template.table.headerTextColor || ((template.companyDetails.isAccentFilled === false) ? '#000000' : '#ffffff')
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
                  // Use dynamic border for unfilled state, default white/20 for filled state
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
        {/* Dummy Rows */}
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
                 >
                    <div 
                        style={{
                            paddingTop: (template.table.tdPadding || 16) + 'px',
                            paddingBottom: (template.table.tdPadding || 16) + 'px'
                        }}
                        className={`px-2 h-full flex items-center ${col.align === 'right' ? 'justify-end' : (col.align === 'center' ? 'justify-center' : 'justify-start')} ${idx === 0 ? 'pl-4' : ''} ${idx === template.table.columns.length - 1 ? 'pr-4' : ''}`}
                    >
                        {col.label === 'Item & Description' ? (
                            <div className={`w-full ${col.align === 'right' ? 'text-right' : (col.align === 'center' ? 'text-center' : 'text-left')}`}>
                                    <span className="font-medium text-slate-900 block">{val}</span>
                                    <span className="text-xs text-slate-500">
                                      {renderData && typeof rowsSource[rowIdx] === 'object' 
                                          ? (rowsSource[rowIdx].description || '') 
                                          : 'Size: L, Color: Blue'}
                                    </span>
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
                                    <span className="text-right flex-1">{field.value}</span>
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

                // Calculate value based on aggregations array or legacy sourceColumn
                let displayValue = '--';
                let aggregateValue = 0;
                
                if (field.aggregations && field.aggregations.length > 0) {
                    // New chained aggregations format
                    aggregateValue = calculateChainedAggregations(field.aggregations);
                    displayValue = '₹ ' + aggregateValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                } else if (field.sourceColumn) {
                    // Legacy single aggregation format
                    aggregateValue = calculateColumnAggregate(field.sourceColumn, field.function || 'sum');
                    
                    if (field.sourceColumn === 'quantity') displayValue = aggregateValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    else displayValue = '₹ ' + aggregateValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
