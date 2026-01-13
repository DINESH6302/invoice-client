import React from 'react';
import { LayoutTemplate, FileText, Users, Table, Calculator, FileSignature } from 'lucide-react';

const sections = [
  { id: 'companyDetails', label: 'Header', icon: LayoutTemplate },
  { id: 'invoiceMeta', label: 'Meta Data', icon: FileText },
  { id: 'customerDetails', label: 'Bill To', icon: Users },
  { id: 'table', label: 'Items Table', icon: Table },
  { id: 'summary', label: 'Totals', icon: Calculator },
  { id: 'footer', label: 'Footer', icon: FileSignature },
];

export default function Sidebar({ activeSection, setActiveSection }) {
  return (
    <div className="flex flex-col w-full h-full bg-gray-50/80 border-r backdrop-blur-3xl pt-2">
      <div className="flex-1 py-4 space-y-1 px-3">
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all relative rounded-lg group
              ${isActive 
                ? 'text-blue-700 bg-blue-50 shadow-md ring-1 ring-slate-300' 
                : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 hover:shadow-sm'
              }`}
          >
            <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
            {section.label}
          </button>
        );
      })}
      </div>
      <div className="p-4 border-t text-[10px] text-center text-slate-400 uppercase tracking-widest font-semibold bg-gray-50/50">
        v1.0.0 Beta
      </div>
    </div>
  );
}
