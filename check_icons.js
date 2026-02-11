const lucide = require('lucide-react');
const icons = [
  'Plus', 'ChevronDown', 'Monitor', 'Search', 'Filter', 
  'ArrowUp', 'ArrowDown', 'CheckCircle', 'AlertCircle', 
  'Loader2', 'MoreVertical', 'Edit', 'Trash2', 'Copy', 'Eye',
  'FileText', 'ArrowLeft', 'Download', 'RotateCcw', 'ZoomIn', 'ZoomOut'
];

icons.forEach(icon => {
  if (!lucide[icon]) {
    console.log(`MISSING: ${icon}`);
  } else {
    // console.log(`OK: ${icon}`);
  }
});
console.log('Check complete');
