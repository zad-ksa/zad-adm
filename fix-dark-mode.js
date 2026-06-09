const fs = require('fs');
const path = require('path');

// Read a file and apply targeted, clean dark mode replacements
function fixDarkMode(filePath) {
  const absolutePath = path.join(__dirname, filePath);
  if (!fs.existsSync(absolutePath)) {
    console.log('Skipping', filePath, '(not found)');
    return;
  }

  let content = fs.readFileSync(absolutePath, 'utf8');

  // First, clean up doubled/malformed dark: classes created by previous scripts
  // e.g. "dark:bg-slate-900/500" -> fix /500 artifacts
  content = content.replace(/dark:bg-emerald-900\/200/g, 'dark:bg-emerald-900/20');
  content = content.replace(/dark:bg-red-900\/200/g, 'dark:bg-red-900/20');
  content = content.replace(/dark:bg-amber-900\/200/g, 'dark:bg-amber-900/20');
  content = content.replace(/dark:bg-emerald-900\/200\/10/g, 'dark:bg-emerald-900/10');

  // Fix doubled dark: classes (e.g. "dark:bg-slate-800 dark:bg-slate-800" -> "dark:bg-slate-800")
  content = content.replace(/(\bdark:[a-z-]+[a-z0-9\/]+)\s+\1/g, '$1');

  // Fix invalid class: "bg-slate-900/50/30" -> "bg-slate-900/30"
  content = content.replace(/bg-slate-900\/50\/30/g, 'dark:bg-slate-900/30');

  // Fix notification toasts: they should be solid colored not bg-emerald-50
  content = content.replace(
    /className="fixed bottom-6 left-6 z-50 bg-emerald-50 dark:bg-emerald-900\/20 text-white/g,
    'className="fixed bottom-6 left-6 z-50 bg-emerald-500 dark:bg-emerald-600 text-white'
  );
  content = content.replace(
    /className="fixed bottom-6 left-6 z-50 bg-red-50 dark:bg-red-900\/20 text-white/g,
    'className="fixed bottom-6 left-6 z-50 bg-red-500 dark:bg-red-600 text-white'
  );

  // Fix border-slate-50 (missing dark) -> needs dark variant
  content = content.replace(/\bborder-slate-50\b(?!\s+dark:)/g, 'border-slate-50 dark:border-slate-800/60');

  // Fix indigo badges/hover without dark: 
  content = content.replace(
    /text-indigo-600 bg-indigo-50(?!\s+dark:)/g,
    'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
  );
  content = content.replace(
    /hover:text-indigo-600 hover:bg-indigo-50(?!\s+dark:)/g,
    'hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
  );

  // Fix teal badges without dark:
  content = content.replace(
    /text-teal-700 bg-teal-50(?!\s+dark:)/g,
    'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20'
  );

  // Fix violet badges without dark:
  content = content.replace(
    /text-violet-700 bg-violet-50(?!\s+dark:)/g,
    'text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
  );

  // Fix rose badges without dark:
  content = content.replace(
    /text-rose-700 bg-rose-50(?!\s+dark:)/g,
    'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20'
  );

  // Fix hover:bg-red-50 without dark (button hover states in task rows)
  content = content.replace(
    /hover:bg-red-50 dark:bg-red-900\/20/g,
    'hover:bg-red-50 dark:hover:bg-red-900/20'
  );
  content = content.replace(
    /hover:bg-emerald-50 dark:bg-emerald-900\/20/g,
    'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
  );
  content = content.replace(
    /hover:bg-amber-50 dark:bg-amber-900\/20/g,
    'hover:bg-amber-50 dark:hover:bg-amber-900/20'
  );
  content = content.replace(
    /hover:bg-indigo-50 dark:bg-indigo-900\/20/g,
    'hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
  );

  // Fix cancel button: remove duplicate dark:bg- in the same className chain
  // Pattern: "dark:bg-slate-900/50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 dark:bg-slate-900/50"
  content = content.replace(
    /dark:bg-slate-900\/50 dark:hover:bg-slate-800\/50 dark:bg-slate-900\/50 dark:bg-slate-900\/50/g,
    'dark:bg-slate-800 dark:hover:bg-slate-700/50'
  );
  content = content.replace(
    /dark:bg-slate-900\/50 dark:bg-slate-900\/50/g,
    'dark:bg-slate-800'
  );

  // Fix the close button: "p-2 bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700"
  // -> "p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
  content = content.replace(
    /bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700/g,
    'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
  );

  // Fix "bg-slate-800 dark:bg-slate-800" in select focus (doubled)
  content = content.replace(/focus:bg-white dark:focus:bg-slate-800 dark:bg-slate-800 dark:focus:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800/g, 
    'focus:bg-white dark:focus:bg-slate-800');

  // Fix "dark:bg-slate-800 dark:bg-slate-800" doubled anywhere
  content = content.replace(/dark:bg-slate-800 dark:bg-slate-800/g, 'dark:bg-slate-800');
  content = content.replace(/dark:bg-slate-700 dark:bg-slate-700/g, 'dark:bg-slate-700');
  content = content.replace(/dark:border-slate-700\/50 dark:border-slate-800\/80 dark:border-slate-800\/80/g, 
    'dark:border-slate-700/60');
  content = content.replace(/dark:border-slate-700 dark:border-slate-700/g, 'dark:border-slate-700');

  // Fix doubled text dark classes
  content = content.replace(/dark:text-slate-100 dark:text-slate-100/g, 'dark:text-slate-100');
  content = content.replace(/dark:text-slate-200 dark:text-slate-200/g, 'dark:text-slate-200');
  content = content.replace(/dark:text-slate-300 dark:text-slate-300/g, 'dark:text-slate-300');
  content = content.replace(/dark:text-slate-400 dark:text-slate-400/g, 'dark:text-slate-400');

  // Fix the select dropdown background (focus:bg-white followed by redundant dark classes)
  content = content.replace(
    /focus:bg-white dark:focus:bg-slate-800 dark:bg-slate-800 dark:focus:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800 dark:bg-slate-800/g,
    'focus:bg-white dark:focus:bg-slate-800'
  );

  // Fix the amber indicator dot in tasks (bg-amber-50 on a tiny span - should be a solid color dot indicator)
  content = content.replace(
    /<span className="w-2\.5 h-5 bg-amber-50 dark:bg-amber-900\/20 rounded-full"><\/span>/g,
    '<span className="w-2.5 h-5 bg-amber-400 dark:bg-amber-500 rounded-full"></span>'
  );
  content = content.replace(
    /<span className="w-2\.5 h-5 bg-emerald-50 dark:bg-emerald-900\/20 rounded-full"><\/span>/g,
    '<span className="w-2.5 h-5 bg-emerald-400 dark:bg-emerald-500 rounded-full"></span>'
  );

  // Fix footer border in news card (border-slate-50 without dark)
  content = content.replace(
    /pt-4 border-t border-slate-50 text-\[11px\]/g,
    'pt-4 border-t border-slate-100 dark:border-slate-700/50 text-[11px]'
  );

  // Fix filter card inner header border (border-slate-50 without dark)
  content = content.replace(
    /border-b border-slate-50\b/g,
    'border-b border-slate-100 dark:border-slate-800/60'
  );

  // Fix select text-slate-805 (wrong class) -> text-slate-800 dark:text-slate-100
  content = content.replace(/text-slate-805/g, 'text-slate-800 dark:text-slate-100');

  // Fix text-slate-750 (wrong class) -> text-slate-700 dark:text-slate-200
  content = content.replace(/text-slate-750/g, 'text-slate-700 dark:text-slate-200');

  // Fix checkbox label colors in news form
  content = content.replace(/text-slate-750 cursor-pointer/g, 'text-slate-700 dark:text-slate-200 cursor-pointer');

  // Write back
  fs.writeFileSync(absolutePath, content);
  console.log('Fixed:', filePath);
}

const files = [
  'src/app/dashboard/(main)/tasks/TasksClient.tsx',
  'src/app/dashboard/(main)/news/NewsFilterClient.tsx',
  'src/app/dashboard/(main)/employees/EmployeesClient.tsx',
  'src/app/dashboard/(main)/charities/page.tsx',
  'src/app/dashboard/(main)/(home)/page.tsx',
  'src/app/dashboard/(main)/surveys/page.tsx',
  'src/components/EmployeeSidebar.tsx',
  'src/app/dashboard/charity/[name]/CharitySidebar.tsx',
  'src/app/dashboard/charity/[name]/CharityLayoutClient.tsx',
  'src/app/dashboard/charity/[name]/page.tsx',
  'src/app/dashboard/charity/[name]/strategy/page.tsx',
];

files.forEach(fixDarkMode);
console.log('\nDone! All dark mode issues fixed.');
