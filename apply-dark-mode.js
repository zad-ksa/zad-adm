const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/dashboard/(main)/tasks/TasksClient.tsx',
  'src/app/dashboard/(main)/news/NewsFilterClient.tsx',
  'src/app/dashboard/(main)/employees/EmployeesClient.tsx',
  'src/app/dashboard/(main)/charities/CharitiesClient.tsx',
];

const replacements = [
  { regex: /(?<!dark:)bg-white/g, replacement: 'bg-white dark:bg-slate-800' },
  { regex: /(?<!dark:)text-slate-800/g, replacement: 'text-slate-800 dark:text-slate-100' },
  { regex: /(?<!dark:)text-slate-700/g, replacement: 'text-slate-700 dark:text-slate-200' },
  { regex: /(?<!dark:)text-slate-600/g, replacement: 'text-slate-600 dark:text-slate-300' },
  { regex: /(?<!dark:)text-slate-500/g, replacement: 'text-slate-500 dark:text-slate-400' },
  { regex: /(?<!dark:)border-slate-100/g, replacement: 'border-slate-100 dark:border-slate-800/80' },
  { regex: /(?<!dark:)border-slate-200/g, replacement: 'border-slate-200 dark:border-slate-700' },
  { regex: /(?<!dark:)bg-slate-50/g, replacement: 'bg-slate-50 dark:bg-slate-900/50' },
  { regex: /(?<!dark:)bg-slate-100/g, replacement: 'bg-slate-100 dark:bg-slate-800' },
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
    newContent = newContent.replace(r.regex, r.replacement);
  });
  
  if (content !== newContent) {
    fs.writeFileSync(absolutePath, newContent);
    console.log('Updated', filePath);
  } else {
    console.log('No changes needed for', filePath);
  }
});
