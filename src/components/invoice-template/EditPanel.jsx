import React, { useRef, useEffect, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, GripVertical, Upload, ChevronDown, ChevronRight } from 'lucide-react';

export default function EditPanel({ activeSection, template, setTemplate }) {
  
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
             {template.companyDetails.fields.map((field, idx) => (
               <div key={idx} className="group p-3 bg-card border rounded-md shadow-sm hover:shadow-md transition-all flex items-start gap-3">
                 <GripVertical className="w-4 h-4 text-gray-300 cursor-move mt-2" />
                 
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
               </div>
             ))}
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
         {template.table.columns.map((col, idx) => (
           <div 
             key={idx} 
             className="p-3 bg-card border rounded-md shadow-sm transition-all"
             ref={idx === template.table.columns.length - 1 ? lastColumnRef : null}
           >
             <div className="flex items-center gap-3 mb-2">
                <div className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-medium border">{idx + 1}</div>
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
           </div>
         ))}
       </div>
    </div>
  );
  
  return (
    <div className="flex flex-col h-full relative">
        <ScrollArea className="flex-1 -mr-4 pr-4">
        {activeSection === 'companyDetails' && renderCompanyDetails()}
        {activeSection === 'table' && renderTable()}
        
        {!['companyDetails', 'table'].includes(activeSection) && (
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
