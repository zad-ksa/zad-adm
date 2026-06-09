const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/dashboard/(main)/tasks/TasksClient.tsx',
  'src/app/dashboard/(main)/news/NewsFilterClient.tsx',
  'src/app/dashboard/(main)/employees/EmployeesClient.tsx',
  'src/app/dashboard/(main)/charities/page.tsx',
  'src/app/dashboard/(main)/(home)/page.tsx',
  'src/app/dashboard/(main)/surveys/page.tsx',
  'src/app/dashboard/charity/[name]/CharitySidebar.tsx',
  'src/components/EmployeeSidebar.tsx',
  'src/app/dashboard/charity/[name]/CharityLayoutClient.tsx',
  'src/app/dashboard/charity/[name]/page.tsx',
  'src/app/dashboard/charity/[name]/finance/page.tsx',
  'src/app/dashboard/charity/[name]/programs/page.tsx',
  'src/app/dashboard/charity/[name]/strategy/page.tsx',
];

const replacements = [
  { regex: /(?<!dark:)bg-white/g, replacement: 'bg-white dark:bg-slate-800' },
  { regex: /(?<!dark:)text-slate-900/g, replacement: 'text-slate-900 dark:text-slate-50' },
  { regex: /(?<!dark:)text-slate-800/g, replacement: 'text-slate-800 dark:text-slate-100' },
  { regex: /(?<!dark:)text-slate-700/g, replacement: 'text-slate-700 dark:text-slate-200' },
  { regex: /(?<!dark:)text-slate-600/g, replacement: 'text-slate-600 dark:text-slate-300' },
  { regex: /(?<!dark:)text-slate-500/g, replacement: 'text-slate-500 dark:text-slate-400' },
  { regex: /(?<!dark:)border-slate-100/g, replacement: 'border-slate-100 dark:border-slate-700/50' },
  { regex: /(?<!dark:)border-slate-200/g, replacement: 'border-slate-200 dark:border-slate-700' },
  { regex: /(?<!dark:)border-slate-300/g, replacement: 'border-slate-300 dark:border-slate-600' },
  { regex: /(?<!dark:)bg-slate-50/g, replacement: 'bg-slate-50 dark:bg-slate-900/50' },
  { regex: /(?<!dark:)bg-slate-100/g, replacement: 'bg-slate-100 dark:bg-slate-800' },
  { regex: /(?<!dark:)bg-slate-200/g, replacement: 'bg-slate-200 dark:bg-slate-700' },
  
  // Hover & Focus states
  { regex: /(?<!dark:)hover:bg-slate-50/g, replacement: 'hover:bg-slate-50 dark:hover:bg-slate-800/50' },
  { regex: /(?<!dark:)hover:bg-slate-100/g, replacement: 'hover:bg-slate-100 dark:hover:bg-slate-700' },
  { regex: /(?<!dark:)focus:bg-white/g, replacement: 'focus:bg-white dark:focus:bg-slate-800' },
  { regex: /(?<!dark:)focus:bg-slate-50/g, replacement: 'focus:bg-slate-50 dark:focus:bg-slate-800/50' },
  
  // Specific colored backgrounds (emerald, blue, red, amber, purple)
  { regex: /(?<!dark:)bg-emerald-50/g, replacement: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { regex: /(?<!dark:)bg-emerald-100/g, replacement: 'bg-emerald-100 dark:bg-emerald-900/40' },
  { regex: /(?<!dark:)border-emerald-100/g, replacement: 'border-emerald-100 dark:border-emerald-800/50' },
  { regex: /(?<!dark:)border-emerald-200/g, replacement: 'border-emerald-200 dark:border-emerald-800' },
  { regex: /(?<!dark:)text-emerald-700/g, replacement: 'text-emerald-700 dark:text-emerald-400' },
  { regex: /(?<!dark:)text-emerald-800/g, replacement: 'text-emerald-800 dark:text-emerald-300' },
  
  { regex: /(?<!dark:)bg-blue-50/g, replacement: 'bg-blue-50 dark:bg-blue-900/20' },
  { regex: /(?<!dark:)bg-blue-100/g, replacement: 'bg-blue-100 dark:bg-blue-900/40' },
  { regex: /(?<!dark:)border-blue-100/g, replacement: 'border-blue-100 dark:border-blue-800/50' },
  { regex: /(?<!dark:)text-blue-700/g, replacement: 'text-blue-700 dark:text-blue-400' },
  { regex: /(?<!dark:)text-blue-800/g, replacement: 'text-blue-800 dark:text-blue-300' },

  { regex: /(?<!dark:)bg-amber-50/g, replacement: 'bg-amber-50 dark:bg-amber-900/20' },
  { regex: /(?<!dark:)bg-amber-100/g, replacement: 'bg-amber-100 dark:bg-amber-900/40' },
  { regex: /(?<!dark:)border-amber-100/g, replacement: 'border-amber-100 dark:border-amber-800/50' },
  { regex: /(?<!dark:)text-amber-700/g, replacement: 'text-amber-700 dark:text-amber-400' },
  { regex: /(?<!dark:)text-amber-800/g, replacement: 'text-amber-800 dark:text-amber-300' },

  { regex: /(?<!dark:)bg-red-50/g, replacement: 'bg-red-50 dark:bg-red-900/20' },
  { regex: /(?<!dark:)bg-red-100/g, replacement: 'bg-red-100 dark:bg-red-900/40' },
  { regex: /(?<!dark:)border-red-100/g, replacement: 'border-red-100 dark:border-red-800/50' },
  { regex: /(?<!dark:)text-red-700/g, replacement: 'text-red-700 dark:text-red-400' },
  { regex: /(?<!dark:)text-red-800/g, replacement: 'text-red-800 dark:text-red-300' },

  { regex: /(?<!dark:)bg-purple-50/g, replacement: 'bg-purple-50 dark:bg-purple-900/20' },
  { regex: /(?<!dark:)bg-purple-100/g, replacement: 'bg-purple-100 dark:bg-purple-900/40' },
  { regex: /(?<!dark:)border-purple-100/g, replacement: 'border-purple-100 dark:border-purple-800/50' },
  { regex: /(?<!dark:)text-purple-700/g, replacement: 'text-purple-700 dark:text-purple-400' },
  { regex: /(?<!dark:)text-purple-800/g, replacement: 'text-purple-800 dark:text-purple-300' },
];

filesToUpdate.forEach(filePath => {
  const absolutePath = path.join(__dirname, filePath);
  if (!fs.existsSync(absolutePath)) {
    console.log('Skipping', filePath);
    return;
  }
  
  let content = fs.readFileSync(absolutePath, 'utf8');
  let newContent = content;
  
  replacements.forEach(r => {
    // To prevent growing strings if already replaced previously in a similar run
    // we use a lookbehind, but wait, JS doesn't always support complex lookbehinds easily if variable length.
    // However, our regex has fixed-width negative lookbehind `(?<!dark:)` which works in modern Node.js.
    // Also we need to make sure we don't accidentally replace a string that already has the exact replacement text to avoid duplication.
    // A simpler way to avoid duplication: run the regex, and if the matched text is already followed by the dark variant, skip.
    // Actually the negative lookbehind handles cases where the string starts with `dark:`.
    // Let's do it cleanly:
    
    // Remove previously added dark modes by the previous script to avoid duplication
    // E.g. bg-white dark:bg-slate-800 -> bg-white
    const cleanupRegex = new RegExp(r.replacement.replace(/\//g, '\\/').replace(/\./g, '\\.'), 'g');
    newContent = newContent.replace(cleanupRegex, r.replacement.split(' ')[0]);

    newContent = newContent.replace(r.regex, r.replacement);
  });
  
  if (content !== newContent) {
    fs.writeFileSync(absolutePath, newContent);
    console.log('Updated', filePath);
  } else {
    console.log('No changes needed for', filePath);
  }
});
