import React, { useRef, useEffect, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, GripVertical, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableRow({ id, children, className }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} className={className}>
      {children(listeners, attributes)}
    </div>
  );
}

export default function EditPanel({ activeSection, template, setTemplate }) {
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event, listKey, subKey = null) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
        const newTemplate = JSON.parse(JSON.stringify(template));
        let list = [];
        if (subKey) {
            // Nested like customerDetails.billing.fields
            list = newTemplate[listKey][subKey].fields;
        } else if (listKey === 'table') {
            list = newTemplate.table.columns;
        } else {
            // Standard sections like companyDetails.fields
            list = newTemplate[listKey].fields;
        }

        const oldIndex = list.findIndex((item) => item.key === active.id);
        const newIndex = list.findIndex((item) => item.key === over.id);
        
        const reorderedList = arrayMove(list, oldIndex, newIndex);
        
        if (subKey) {
            newTemplate[listKey][subKey].fields = reorderedList;
        } else if (listKey === 'table') {
            newTemplate.table.columns = reorderedList;
        } else {
            newTemplate[listKey].fields = reorderedList;
        }
        
        setTemplate(newTemplate);
    }
  };
  
  const [expandedSubCols, setExpandedSubCols] = useState({});
  const lastColumnRef = useRef(null);
  const prevColumnsCount = useRef(template.table?.columns?.length || 0);

  useEffect(() => {
    if (activeSection === 'table' && template.table?.columns?.length > prevColumnsCount.current) {
        setTimeout(() => {
            lastColumnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
    prevColumnsCount.current = template.table?.columns?.length;
  }, [template.table?.columns?.length, activeSection]);

  const handleFieldChange = (section, index, key, value) => {
    const newTemplate = JSON.parse(JSON.stringify(template));
    newTemplate[section].fields[index][key] = value;
    setTemplate(newTemplate);
  };
  
  const handleColumnChange = (index, key, value) => {
    const newTemplate = JSON.parse(JSON.stringify(template));
    newTemplate.table.columns[index][key] = value;
    setTemplate(newTemplate);
  };

  const handleAddField = (section) => {
    const newTemplate = JSON.parse(JSON.stringify(template));
    const newField = { 
        key: `custom_${Date.now()}`, 
        label: "New Field", 
        visible: true 
    };
    if(newTemplate[section] && newTemplate[section].fields) {
        newTemplate[section].fields.push(newField);
        setTemplate(newTemplate);
    }
  };

  const handleRemoveField = (section, index) => {
    const newTemplate = JSON.parse(JSON.stringify(template));
    if(newTemplate[section] && newTemplate[section].fields) {
        newTemplate[section].fields.splice(index, 1);
        setTemplate(newTemplate);
    }
  };

  const handleAddColumn = () => {
    const newTemplate = JSON.parse(JSON.stringify(template));
    newTemplate.table.columns.push({
        key: `col_${Date.now()}`,
        label: "New Column",
        width: "10%",
        visible: true,
        align: 'left'
    });
    setTemplate(newTemplate);
  };

  const handleRemoveColumn = (index) => {
    const newTemplate = JSON.parse(JSON.stringify(template));
    newTemplate.table.columns.splice(index, 1);
    setTemplate(newTemplate);
  };

  const handleAddSubColumn = (index) => {
    const newTemplate = JSON.parse(JSON.stringify(template));
    if (!newTemplate.table.columns[index].subColumns) {
        newTemplate.table.columns[index].subColumns = [];
    }
    newTemplate.table.columns[index].subColumns.push({
        key: `sub_${Date.now()}`,
        label: "Sub Col"
    });
    setTemplate(newTemplate);
  };

  const handleSubColumnChange = (colIndex, subIndex, key, value) => {
    const newTemplate = JSON.parse(JSON.stringify(template));
    newTemplate.table.columns[colIndex].subColumns[subIndex][key] = value;
    setTemplate(newTemplate);
  };

  const handleRemoveSubColumn = (colIndex, subIndex) => {
    const newTemplate = JSON.parse(JSON.stringify(template));
    newTemplate.table.columns[colIndex].subColumns.splice(subIndex, 1);
    setTemplate(newTemplate);
  };

  const renderInvoiceMeta = () => (
    <div className="space-y-6">
        <div className="p-4 bg-card border rounded-lg shadow-sm space-y-4">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Layout Columns</Label>
                    <span className="text-xs text-muted-foreground font-medium bg-slate-100 px-2 py-1 rounded">
                        {template.invoiceMeta.columnCount || 1} Column(s)
                    </span>
                </div>
                <div className="pt-2">
                    <input 
                        type="range"
                        min="1"
                        max="4"
                        step="1"
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        value={template.invoiceMeta.columnCount || 1} 
                        onChange={e => {
                            const newT = {...template};
                            newT.invoiceMeta.columnCount = parseInt(e.target.value);
                            setTemplate(newT);
                        }}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-4">
           <div className="flex items-center justify-between">
             <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Fields</h3>
             <Button 
                onClick={() => handleAddField('invoiceMeta')}
                size="sm" 
                className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
             >
                <Plus className="w-3 h-3" /> Add Field
             </Button>
           </div>
           
           <div className="grid gap-2">
             <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, 'invoiceMeta')}
             >
             <SortableContext 
                items={template.invoiceMeta.fields.filter(f => f.key !== 'invoice_no' && f.key !== 'date').map(f => f.key)}
                strategy={verticalListSortingStrategy}
             >
             {template.invoiceMeta.fields.filter(f => f.key !== 'invoice_no' && f.key !== 'date').map((field, idx) => (
               <SortableRow key={field.key} id={field.key} className="group p-3 bg-card border rounded-md shadow-sm hover:shadow-md transition-all flex items-start gap-3">
                 {(listeners, attributes) => (
                 <>
                 <div {...listeners} {...attributes}>
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-move mt-2 outline-none" />
                 </div>
                 
                 <div className="flex-1 space-y-2">
                     <div className="flex items-center justify-between">
                        <Label className="font-semibold text-gray-700 capitalize text-sm">
                            <Input 
                                value={field.key.replace('custom_', 'Field ')} 
                                readOnly
                                className="h-6 text-xs w-32 border-none p-0 focus-visible:ring-0 font-semibold bg-transparent"
                            />
                        </Label>
                        <div className="flex items-center gap-2">
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => {
                                    // Find logic index since we are mapping a filtered list
                                    const realIndex = template.invoiceMeta.fields.findIndex(f => f.key === field.key);
                                    handleRemoveField('invoiceMeta', realIndex);
                                }}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                     </div>
                     
                     <div className="pt-1">
                        <Input 
                            value={field.label} 
                            onChange={(e) => {
                                const realIndex = template.invoiceMeta.fields.findIndex(f => f.key === field.key);
                                handleFieldChange('invoiceMeta', realIndex, 'label', e.target.value);
                            }} 
                            className="h-7 text-xs"
                            placeholder="Display Label"
                        />
                    </div>
                 </div>
                 </>
                 )}
               </SortableRow>
             ))}
             </SortableContext>
             </DndContext>
           </div>
       </div>
    </div>
  );

  const renderCompanyDetails = () => (
    <div className="space-y-6">
       <div className="p-4 bg-card border rounded-lg shadow-sm space-y-4">
          
          <div className="grid grid-cols-2 gap-4 items-end">
             {/* Part 1: Logo Import */}
             <div className="space-y-2">
                 <Label className="text-base">Logo</Label>
                 <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        className="w-full text-xs" 
                        onClick={() => document.getElementById('logo-upload').click()}
                    >
                        <Upload className="w-3.5 h-3.5 mr-2" /> Upload Logo
                    </Button>
                    <input 
                        id="logo-upload"
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                            if (e.target.files?.[0]) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    const newT = {...template};
                                    newT.companyDetails.logoUrl = reader.result;
                                    newT.companyDetails.showLogo = true; // Auto-enable
                                    setTemplate(newT);
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                    />
                 </div>
             </div>

             {/* Part 2: Show Logo Toggle */}
             <div className="flex flex-col gap-2">
                 <Label className="text-base">Show Logo</Label>
                 <div className="flex items-center h-10 border rounded-md px-3 bg-muted/20 justify-between">
                     <span className="text-sm text-muted-foreground">Visible</span>
                     <Switch 
                        checked={template.companyDetails.showLogo} 
                        onCheckedChange={(checked) => {
                            const newT = {...template};
                            newT.companyDetails.showLogo = checked;
                            setTemplate(newT);
                        }} 
                        className="data-[state=checked]:bg-slate-500"
                     />
                 </div>
             </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
             <div className="space-y-0.5">
               <Label className="text-base">Accent Color</Label>
               <p className="text-sm text-muted-foreground">Main color for headers and lines</p>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border shadow-sm" style={{ backgroundColor: template.companyDetails.accentColor }}></div>
                <Input 
                  type="color" 
                  className="w-20 h-9 p-1 cursor-pointer" 
                  value={template.companyDetails.accentColor} 
                  onChange={e => {
                      const newT = {...template};
                      newT.companyDetails.accentColor = e.target.value;
                      setTemplate(newT);
                  }} 
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
                <Label className="text-sm font-semibold">Header Title</Label>
                <Input 
                    value={template.companyDetails.headerTitle || 'INVOICE'} 
                    onChange={e => {
                        const newT = {...template};
                        newT.companyDetails.headerTitle = e.target.value;
                        setTemplate(newT);
                    }}
                />
            </div>
            <div className="space-y-2">
                <Label className="text-sm font-semibold">Font Size</Label>
                <div className="flex items-center gap-2">
                    <Input 
                        type="number"
                        min="20"
                        max="100"
                        value={template.companyDetails.headerFontSize || 60} 
                        onChange={e => {
                            const newT = {...template};
                            newT.companyDetails.headerFontSize = parseInt(e.target.value) || 60;
                            setTemplate(newT);
                        }}
                    />
                    <span className="text-xs text-muted-foreground">px</span>
                </div>
            </div>
          </div>
          
          <div className="pt-4 border-t space-y-4">
            <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Standard Fields</Label>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs">Invoice # Label</Label>
                    <Input 
                        value={template.invoiceMeta.fields.find(f => f.key === 'invoice_no')?.label || 'Invoice #'} 
                        onChange={e => {
                            const newT = {...template};
                            const idx = newT.invoiceMeta.fields.findIndex(f => f.key === 'invoice_no');
                            if(idx > -1) newT.invoiceMeta.fields[idx].label = e.target.value;
                            setTemplate(newT);
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Date Label</Label>
                    <Input 
                        value={template.invoiceMeta.fields.find(f => f.key === 'date')?.label || 'Date'} 
                        onChange={e => {
                            const newT = {...template};
                            const idx = newT.invoiceMeta.fields.findIndex(f => f.key === 'date');
                            if(idx > -1) newT.invoiceMeta.fields[idx].label = e.target.value;
                            setTemplate(newT);
                        }}
                    />
                </div>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <div className="space-y-2">
                <div className="flex justify-between">
                    <Label className="text-sm font-semibold">Text Opacity</Label>
                    <span className="text-xs text-muted-foreground">{Math.round((template.companyDetails.headerOpacity || 0.1) * 100)}%</span>
                </div>
                <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    value={template.companyDetails.headerOpacity || 0.1} 
                    onChange={e => {
                        const newT = {...template};
                        newT.companyDetails.headerOpacity = parseFloat(e.target.value);
                        setTemplate(newT);
                    }}
                />
            </div>
          </div>
       </div>

       <div className="space-y-4">
           <div className="flex items-center justify-between">
             <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Fields</h3>
             <Button 
                onClick={() => handleAddField('companyDetails')}
                size="sm" 
                className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
             >
                <Plus className="w-3 h-3" /> Add Field
             </Button>
           </div>
           
           <div className="grid gap-2">
             <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, 'companyDetails')}
             >
             <SortableContext 
                items={template.companyDetails.fields.map(f => f.key)}
                strategy={verticalListSortingStrategy}
             >
             {template.companyDetails.fields.map((field, idx) => (
               <SortableRow key={field.key} id={field.key} className="group p-3 bg-card border rounded-md shadow-sm hover:shadow-md transition-all flex items-start gap-3">
                 {(listeners, attributes) => (
                 <>
                 <div {...listeners} {...attributes}>
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-move mt-2 outline-none" />
                 </div>
                 
                 <div className="flex-1 space-y-2">
                     <div className="flex items-center justify-between">
                        <Label className="font-semibold text-gray-700 capitalize text-sm">
                            {idx < 3 ? field.key.replace(/_/g, ' ') : (
                                <Input 
                                    value={field.key} 
                                    className="h-6 text-xs w-32 border-none p-0 focus-visible:ring-0 font-semibold"
                                    onChange={(e) => handleFieldChange('companyDetails', idx, 'key', e.target.value)}
                                />
                            )}
                        </Label>
                        <div className="flex items-center gap-2">
                             {idx > 2 && ( // Only allow deleting custom fields (assuming first 3 are standard)
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleRemoveField('companyDetails', idx)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            )}
                        </div>
                     </div>
                     
                     <div className="pt-1">
                        {/* <Label className="text-[10px] text-muted-foreground mb-1 block">Label</Label> */}
                        <Input 
                            value={field.label} 
                            onChange={(e) => handleFieldChange('companyDetails', idx, 'label', e.target.value)} 
                            className="h-7 text-xs"
                            placeholder="Display Label"
                        />
                    </div>
                 </div>
                 </>
                 )}
               </SortableRow>
             ))}
             </SortableContext>
             </DndContext>
           </div>
       </div>
    </div>
  );

  const renderTable = () => (
    <div className="space-y-6">
       <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs text-blue-800 leading-relaxed">
           Customize columns. Rename headers or adjust widths.
       </div>

       <div className="space-y-2 pb-4">
         <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, 'table')}
         >
         <SortableContext 
            items={template.table.columns.map(c => c.key)}
            strategy={verticalListSortingStrategy}
         >
         {template.table.columns.map((col, idx) => (
           <SortableRow 
             key={col.key} 
             id={col.key} 
             className="p-3 bg-card border rounded-md shadow-sm transition-all relative"
           >
             {(listeners, attributes) => (
             <>
             {idx === template.table.columns.length - 1 && <div ref={lastColumnRef} className="absolute top-0 left-0 w-px h-px opacity-0" />}
             <div className="flex items-center gap-3 mb-2">
                <div 
                    className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-medium border cursor-grab active:cursor-grabbing hover:bg-slate-200"
                    {...listeners} {...attributes}
                    title="Drag to reorder"
                >
                    {idx + 1}
                </div>
                <div className="flex-1 font-medium text-sm">{col.key.toUpperCase()}</div>
                <div className="flex items-center gap-1">
                    {idx > 4 && ( // Assuming first 5 are standard
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50 ml-1"
                            onClick={() => handleRemoveColumn(idx)}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    )}
                </div>
             </div>
             
            <div className="grid grid-cols-[5fr_3fr_2fr] gap-3 pl-8">
                <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Label</Label>
                    <Input 
                    value={col.label} 
                    onChange={e => handleColumnChange(idx, 'label', e.target.value)} 
                    className="h-7 text-xs"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Position</Label>
                    <select 
                      value={col.align || 'left'} 
                      onChange={e => handleColumnChange(idx, 'align', e.target.value)}
                      className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Width</Label>
                    <Input 
                    value={col.width} 
                    onChange={e => handleColumnChange(idx, 'width', e.target.value)} 
                    className="h-7 text-xs"
                    />
                </div>
            </div>
            
            {/* Sub-columns Section (Only for Custom Columns) */}
            {col.key.startsWith('col_') && (
                <div className="mt-3 pt-3 border-t pl-8">
                    <div className="flex items-center justify-between mb-2">
                        <div 
                            className="flex items-center gap-1 cursor-pointer hover:text-slate-700 group select-none"
                            onClick={() => setExpandedSubCols(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                        >
                            {expandedSubCols[col.key] ? 
                                <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-slate-700" /> : 
                                <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-slate-700" />
                            }
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold cursor-pointer group-hover:text-slate-700">Sub-Columns</Label>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 text-[10px] text-blue-600 hover:text-blue-700 px-2"
                            onClick={() => {
                                handleAddSubColumn(idx);
                                if (!expandedSubCols[col.key]) {
                                    setExpandedSubCols(prev => ({ ...prev, [col.key]: true }));
                                }
                            }}
                        >
                            <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                    </div>
                    {expandedSubCols[col.key] && (
                        <div className="space-y-2">
                            {col.subColumns?.map((sub, sIdx) => (
                                <div key={sIdx} className="flex items-center gap-2">
                                    <div className="w-4 border-l-2 border-b-2 border-slate-200 h-4 -mt-4 rounded-bl-sm"></div>
                                    <Input 
                                        value={sub.label} 
                                        onChange={(e) => handleSubColumnChange(idx, sIdx, 'label', e.target.value)} 
                                        className="h-6 text-xs flex-1"
                                        placeholder="Sub Label"
                                    />
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-red-400 hover:text-red-600"
                                        onClick={() => handleRemoveSubColumn(idx, sIdx)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                            {(!col.subColumns || col.subColumns.length === 0) && (
                                <div className="text-[10px] text-muted-foreground italic pl-6">No sub-columns added</div>
                            )}
                        </div>
                    )}
                </div>
            )}
           </>
           )}
           </SortableRow>
         ))}
         </SortableContext>
         </DndContext>
       </div>
    </div>
  );
  
  const renderCustomerDetails = () => (
    <div className="space-y-8">
        {/* Billing Section */}
        <div className="space-y-4">
           <div className="p-4 bg-card border rounded-lg shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                 <Label className="text-base font-semibold">Billing Section</Label>
              </div>
              <div className="space-y-2">
                 <Label className="text-sm">Section Title</Label>
                 <Input 
                    value={template.customerDetails.billing.title} 
                    onChange={e => {
                        const newT = {...template};
                        newT.customerDetails.billing.title = e.target.value;
                        setTemplate(newT);
                    }}
                 />
              </div>
           </div>

           <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Billing Fields</h3>
                 <Button 
                    onClick={() => {
                        const newT = {...template};
                        newT.customerDetails.billing.fields.push({ key: `custom_${Date.now()}`, label: "New Field", visible: true });
                        setTemplate(newT);
                    }}
                    size="sm" 
                    className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                 >
                    <Plus className="w-3 h-3" /> Add Field
                 </Button>
               </div>
               
               <div className="grid gap-2">
                 <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, 'customerDetails', 'billing')}
                 >
                 <SortableContext 
                    items={template.customerDetails.billing.fields.map(f => f.key)}
                    strategy={verticalListSortingStrategy}
                 >
                 {template.customerDetails.billing.fields.map((field, idx) => (
                   <SortableRow key={field.key} id={field.key} className="group p-3 bg-card border rounded-md shadow-sm hover:shadow-md transition-all flex items-start gap-3">
                     {(listeners, attributes) => (
                     <>
                     <div {...listeners} {...attributes}>
                        <GripVertical className="w-4 h-4 text-gray-300 cursor-move mt-2 outline-none" />
                     </div>
                     <div className="flex-1 space-y-2">
                         <div className="flex items-center justify-between">
                            <Label className="font-semibold text-gray-700 capitalize text-sm">
                                {idx < 4 ? field.key : (
                                    <Input 
                                        value={field.key} 
                                        className="h-6 text-xs w-32 border-none p-0 focus-visible:ring-0 font-semibold"
                                        onChange={(e) => {
                                            const newT = {...template};
                                            newT.customerDetails.billing.fields[idx].key = e.target.value;
                                            setTemplate(newT);
                                        }}
                                    />
                                )}
                            </Label>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                        const newT = {...template};
                                        newT.customerDetails.billing.fields.splice(idx, 1);
                                        setTemplate(newT);
                                    }}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                         </div>
                         <div className="pt-1">
                            <Input 
                                value={field.label} 
                                onChange={(e) => {
                                    const newT = {...template};
                                    newT.customerDetails.billing.fields[idx].label = e.target.value;
                                    setTemplate(newT);
                                }} 
                                className="h-7 text-xs"
                                placeholder="Display Label"
                            />
                        </div>
                     </div>
                     </>
                     )}
                   </SortableRow>
                 ))}
                 </SortableContext>
                 </DndContext>
               </div>
           </div>
        </div>

        {/* Shipping Section */}
        <div className="space-y-4 pt-4 border-t">
           <div className="p-4 bg-card border rounded-lg shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                 <Label className="text-base font-semibold">Shipping Section</Label>
              </div>
              <div className="space-y-2">
                 <Label className="text-sm">Section Title</Label>
                 <Input 
                    value={template.customerDetails.shipping.title} 
                    onChange={e => {
                        const newT = {...template};
                        newT.customerDetails.shipping.title = e.target.value;
                        setTemplate(newT);
                    }}
                 />
              </div>
           </div>

           <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Shipping Fields</h3>
                 <Button 
                    onClick={() => {
                        const newT = {...template};
                        newT.customerDetails.shipping.fields.push({ key: `custom_${Date.now()}`, label: "New Field", visible: true });
                        setTemplate(newT);
                    }}
                    size="sm" 
                    className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                 >
                    <Plus className="w-3 h-3" /> Add Field
                 </Button>
               </div>
               
               <div className="grid gap-2">
                 <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, 'customerDetails', 'shipping')}
                 >
                 <SortableContext 
                    items={template.customerDetails.shipping.fields.map(f => f.key)}
                    strategy={verticalListSortingStrategy}
                 >
                 {template.customerDetails.shipping.fields.map((field, idx) => (
                   <SortableRow key={field.key} id={field.key} className="group p-3 bg-card border rounded-md shadow-sm hover:shadow-md transition-all flex items-start gap-3">
                     {(listeners, attributes) => (
                     <>
                     <div {...listeners} {...attributes}>
                        <GripVertical className="w-4 h-4 text-gray-300 cursor-move mt-2 outline-none" />
                     </div>
                     <div className="flex-1 space-y-2">
                         <div className="flex items-center justify-between">
                            <Label className="font-semibold text-gray-700 capitalize text-sm">
                                {idx < 3 ? field.key : (
                                    <Input 
                                        value={field.key} 
                                        className="h-6 text-xs w-32 border-none p-0 focus-visible:ring-0 font-semibold"
                                        onChange={(e) => {
                                            const newT = {...template};
                                            newT.customerDetails.shipping.fields[idx].key = e.target.value;
                                            setTemplate(newT);
                                        }}
                                    />
                                )}
                            </Label>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                        const newT = {...template};
                                        newT.customerDetails.shipping.fields.splice(idx, 1);
                                        setTemplate(newT);
                                    }}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                         </div>
                         <div className="pt-1">
                            <Input 
                                value={field.label} 
                                onChange={(e) => {
                                    const newT = {...template};
                                    newT.customerDetails.shipping.fields[idx].label = e.target.value;
                                    setTemplate(newT);
                                }} 
                                className="h-7 text-xs"
                                placeholder="Display Label"
                            />
                        </div>
                     </div>
                     </>
                     )}
                   </SortableRow>
                 ))}
                 </SortableContext>
                 </DndContext>
               </div>
           </div>
        </div>
    </div>
  );
  
  const renderSummary = () => (
    <div className="space-y-6">
       <div className="p-4 bg-card border rounded-lg shadow-sm space-y-4">
           {/* Header */}
           <div className="flex items-center justify-between">
             <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Fields</h3>
             <Button 
                onClick={() => {
                    const newT = {...template};
                    newT.summary.fields.push({ key: `custom_${Date.now()}`, label: "Total Qty", visible: true, type: "manual" });
                    setTemplate(newT);
                }}
                size="sm" 
                className="h-8 gap-1 bg-blue-600 hover:bg-blue-700 text-white"
             >
                <Plus className="w-3 h-3" /> Add Field
             </Button>
           </div>
           
           <div className="space-y-3">
             <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, 'summary')}
             >
             <SortableContext 
                items={template.summary.fields.map(f => f.key)}
                strategy={verticalListSortingStrategy}
             >
             {template.summary.fields.map((field, idx) => (
               <SortableRow key={field.key} id={field.key} className="group p-4 bg-card border rounded-md shadow-sm hover:shadow-md transition-all space-y-3">
                 {(listeners, attributes) => (
                 <>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div {...listeners} {...attributes}>
                            <GripVertical className="w-4 h-4 text-gray-300 cursor-move outline-none" />
                        </div>
                        <span className="font-semibold text-gray-700 text-sm">{field.label || 'Field'}</span>
                    </div>
                    
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                            const newT = {...template};
                            newT.summary.fields.splice(idx, 1);
                            setTemplate(newT);
                        }}
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-2">
                    <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Label</Label>
                        <Input 
                            value={field.label} 
                            onChange={(e) => handleFieldChange('summary', idx, 'label', e.target.value)} 
                            className="h-7 text-xs"
                        />
                    </div>
                     <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Value Source</Label>
                        <select 
                            className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={field.sourceColumn || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                const newT = JSON.parse(JSON.stringify(template));
                                newT.summary.fields[idx].sourceColumn = val;
                                // If source is selected, it's calculated. Else manual.
                                // We don't necessarily need a 'type' field if sourceColumn presence detects it, but good for clarity
                                setTemplate(newT);
                            }}
                        >
                            <option value="">Manual Input</option>
                            <optgroup label="Sum of Table Column">
                                {template.table.columns
                                    .filter(col => col.key !== 'sno' && col.key !== 'description')
                                    .map(col => (
                                    <option key={col.key} value={col.key}>
                                        Sum({col.label})
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>
                 </div>

                 {/* Style Toggles */}
                 <div className="flex items-center justify-between pt-2">
                    <Label className="text-[10px] text-muted-foreground">Bold Text</Label>
                    <Switch 
                        checked={field.bold || false} 
                        onCheckedChange={(checked) => handleFieldChange('summary', idx, 'bold', checked)}
                        className="scale-75 origin-right"
                    />
                 </div>
                 </>
                 )}
               </SortableRow>
             ))}
             </SortableContext>
             </DndContext>
           </div>
       </div>
    </div>
  );
  
  return (
    <div className="flex flex-col h-full relative">
        <ScrollArea className="flex-1 -mr-4 pr-4">
        {activeSection === 'companyDetails' && renderCompanyDetails()}
        {activeSection === 'invoiceMeta' && renderInvoiceMeta()}
        {activeSection === 'customerDetails' && renderCustomerDetails()}
        {activeSection === 'table' && renderTable()}
        {activeSection === 'summary' && renderSummary()}
        
        {!['companyDetails', 'invoiceMeta', 'table', 'customerDetails', 'summary'].includes(activeSection) && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <span className="text-2xl">🚧</span>
                </div>
                <div>
                <h3 className="text-lg font-medium text-foreground">Work in Progress</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                    The settings for <span className="font-semibold">{activeSection}</span> will be implemented similar to the Table and Header sections.
                </p>
                </div>
            </div>
        )}
        <div className="h-24" /> {/* Bottom padding to clear floating button */}
        </ScrollArea>

        {activeSection === 'table' && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-0 z-20">
                <Button 
                    className="w-full border-dashed bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border-blue-200 shadow-sm" 
                    variant="outline"
                    onClick={handleAddColumn}
                >
                <Plus className="w-4 h-4 mr-2" /> Add Custom Column
                </Button>
            </div>
        )}
    </div>
  );
}
