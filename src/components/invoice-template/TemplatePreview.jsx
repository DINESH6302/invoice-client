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

export default function TemplatePreview({ template }) {
  // Calculate total visible width percentage
  // If user sets columns like "10%" and there are 15 of them, total is 150%.
  // A4 Page is 210mm. If total > 100%, page extends.
  // We parse "10%" -> 10.
  const totalWidthPercent = template.table.columns
    .filter(c => c.visible)
    .reduce((acc, col) => acc + (parseFloat(col.width) || 0), 0);

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
  const PREVIEW_ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Calculate Column Sum helper
  const calculateColumnSum = (colKey) => {
       return PREVIEW_ROWS.reduce((acc, row) => {
            let val = 0;
            if (colKey === 'quantity') val = row * 10;
            else if (colKey === 'price') val = 453.00;
            else if (colKey === 'total') val = row * 10 * 453;
            return acc + val;
       }, 0);
  };

  // Dynamic Grand Total Calculation (matches 'Total' column sum)
  const grandTotal = calculateColumnSum('total');

  return (
    <div 
        className="min-h-[297mm] bg-white shadow-sm p-12 text-sm relative text-black text-left border overflow-hidden flex flex-col"
        style={{ width: `${pageWidthMm}mm` }}
    >
      {/* 1. Header Section */}
      <div className="flex justify-between mb-6 pb-6" style={{ borderBottom: `2px solid ${template.companyDetails.accentColor}`}}>

        <div className="w-[60%]">
          {template.companyDetails.showLogo && (
             template.companyDetails.logoUrl ? (
                <img src={template.companyDetails.logoUrl} alt="Company Logo" className="w-32 h-auto object-contain mb-6 max-h-16" />
             ) : (
                <div className="w-32 h-16 bg-slate-100 flex items-center justify-center mb-6 text-xs text-slate-400 rounded-sm border border-slate-200 border-dashed">Company Logo</div>
             )
          )}
          <div className="space-y-1">
          {template.companyDetails.fields.map(field => field.visible && (
             <div key={field.key} className={`${field.bold ? 'font-bold text-2xl text-slate-800 mb-2' : 'text-slate-600'}`}>
               {field.key === 'name' ? (field.label === 'Display Label' ? 'Acme Corp Private Ltd' : 'Acme Corp Private Ltd') : 
                (field.key === 'address' ? '123 Business Park, Fifth Avenue' : 
                (field.key === 'gstin' ? 'GSTIN: 33AAAAA0000A1Z5' : 
                (field.key.startsWith('custom') ? `${field.label}: Custom Value` : 'Details')))}
             </div>
          ))}
          </div>
        </div>
        <div className="text-right w-[40%]">
           <h1 className="text-slate-100 font-bold mb-6 tracking-tighter" style={{ 
               color: template.companyDetails.accentColor + Math.round((template.companyDetails.headerOpacity || 0.1) * 255).toString(16).padStart(2, '0'), 
               fontSize: (template.companyDetails.headerFontSize || 60) + 'px', 
               lineHeight: 1 
           }}>
              {template.companyDetails.headerTitle || 'INVOICE'}
           </h1>
           <div className="space-y-1">
               {/* Primary Header Fields (Invoice #, Date) */}
               {template.invoiceMeta.fields.filter(f => f.key === 'invoice_no' || f.key === 'date').map(field => field.visible && (
                    <div key={field.key} className="flex justify-end gap-4">
                        <span className="font-semibold text-slate-700">{field.label}:</span> 
                        <span className="text-slate-900 font-medium">{field.key === 'date' ? '12 Oct 2026' : 'INV-#00912'}</span>
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
           {template.invoiceMeta.fields.filter(f => f.key !== 'invoice_no' && f.key !== 'date').map(field => field.visible && (
             <div key={field.key} className="flex flex-col">
                <span className="font-semibold text-slate-700 text-xs uppercase tracking-wide opacity-70 mb-0.5">{field.label}</span> 
                <span className="text-slate-900 font-medium text-sm">
                    {field.key === 'date' ? '12 Oct 2026' : 
                     field.key === 'invoice_no' ? 'INV-#00912' : 
                     'Custom Val'}
                </span>
            </div>
           ))}
           </div>
      </div>

      {/* 2. Bill To / Ship To */}
      <div className="flex justify-between mb-16 gap-12">
        <div className="w-1/2">
           <h3 className="font-bold text-slate-800 mb-3 border-b pb-1 text-sm uppercase tracking-wide" style={{ borderColor: template.companyDetails.accentColor }}>{template.customerDetails.billing.title}</h3>
           {template.customerDetails.billing.fields.map(field => field.visible && (
              <div key={field.key} className={`mb-1 ${field.key === 'name' ? 'font-bold text-lg text-slate-900' : 'text-slate-600'}`}>
                {field.key === 'name' ? 'John Doe Enterprises' : 
                 field.key === 'address' ? (
                     <>
                        <div>45, North Street, Main Road</div>
                        <div>Chennai, Tamil Nadu - 600028</div>
                     </>
                 ) : 
                 field.key === 'state' ? '' : // State is merged into address for demo simplicity usually, but here I'll hide it if address handles it, or show it. Let's keep it simple.
                 field.key === 'gstin' ? 'GSTIN: 33BBBBB0000B1Z5' : 
                 `${field.label}: Value`}
              </div>
           ))}
        </div>
        <div className="w-1/2">
           <h3 className="font-bold text-slate-800 mb-3 border-b pb-1 text-sm uppercase tracking-wide" style={{ borderColor: template.companyDetails.accentColor }}>{template.customerDetails.shipping.title}</h3>
           {template.customerDetails.shipping.fields.map(field => field.visible && (
              <div key={field.key} className={`mb-1 ${field.key === 'name' ? 'font-bold text-lg text-slate-900' : 'text-slate-600'}`}>
                {field.key === 'name' ? 'John Doe Enterprises' : 
                 field.key === 'address' ? (
                     <>
                        <div>Warehouse No. 9</div>
                        <div>Kanchipuram, Tamil Nadu</div>
                     </>
                 ) : 
                 field.key === 'state' ? '' : 
                 `${field.label}: Value`}
              </div>
           ))}
        </div>
      </div>

      {/* 3. Items Table */}
      <div className="mb-10 border border-slate-400 rounded-sm overflow-hidden">
        <div className="flex font-bold text-white text-xs uppercase tracking-wider items-stretch" style={{ backgroundColor: template.companyDetails.accentColor }}>
           {template.table.columns.map((col, idx) => {
             if (!col.visible) return null;
             const hasSubs = col.subColumns && col.subColumns.length > 0;
             return (
             <div key={col.key} style={{ width: getColWidth(col.width), flexShrink: 0 }} className={`${idx === template.table.columns.length - 1 ? '' : 'border-r border-white/20'}`}>
                {hasSubs ? (
                    <div className="flex flex-col h-full">
                        <div className="py-2 px-1 text-center border-b border-white/20 flex-1 flex items-center justify-center">
                            {col.label}
                        </div>
                        <div className="flex h-full">
                            {col.subColumns.map((sub, sIdx) => (
                                <div key={sIdx} className="flex-1 py-1 px-1 text-center border-r border-white/20 last:border-none text-[10px] flex items-center justify-center">
                                    {sub.label}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={`h-full py-3 px-2 flex items-center ${idx === 0 ? 'pl-4' : ''} ${idx === template.table.columns.length - 1 ? 'pr-4' : ''}`} style={{ justifyContent: col.align === 'center' ? 'center' : (col.align === 'right' ? 'flex-end' : 'flex-start') }}>
                        {col.label}
                    </div>
                )}
             </div>
           )})}
        </div>
        {/* Dummy Rows */}
        {PREVIEW_ROWS.map((row) => (
           <div key={row} className="flex border-b border-slate-400 last:border-b-0 text-slate-700 text-sm items-stretch">
              {template.table.columns.map((col, idx) => {
                 if (!col.visible) return null;
                 const hasSubs = col.subColumns && col.subColumns.length > 0;
                 return (
                 <div key={col.key} style={{ width: getColWidth(col.width), flexShrink: 0 }} className={`${idx === template.table.columns.length - 1 ? '' : 'border-r border-slate-400'}`}>
                    {hasSubs ? (
                        <div className="flex h-full items-stretch">
                            {col.subColumns.map((sub, sIdx) => (
                                <div key={sIdx} className="flex-1 py-2 px-1 text-center border-r border-slate-400 last:border-none flex items-center justify-center">
                                    <span className="text-xs text-slate-500 font-mono">--</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={`py-4 px-2 h-full flex items-center ${col.align === 'right' ? 'justify-end' : (col.align === 'center' ? 'justify-center' : 'justify-start')} ${idx === 0 ? 'pl-4' : ''} ${idx === template.table.columns.length - 1 ? 'pr-4' : ''}`}>
                            {col.key === 'sno' ? row : 
                             col.key === 'description' ? (
                                <div className="text-left w-full">
                                    <span className="font-medium text-slate-900 block">Premium Cotton Shirt</span>
                                    <span className="text-xs text-slate-500">Size: {row % 2 === 0 ? 'L' : 'M'}, Color: Blue</span>
                                </div>
                             ) : 
                             col.key === 'quantity' ? (row * 10) : 
                             col.key === 'price' ? '450.00' : 
                             col.key === 'total' ? (row * 10 * 450).toFixed(2) : '--'}
                        </div>
                    )}
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
