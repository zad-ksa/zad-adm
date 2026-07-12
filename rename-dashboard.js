const fs = require('fs');
const path = require('path');

// مجلد الكود المصدري src
const srcDir = path.join(__dirname, 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      // فحص ملفات الكود فقط
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

if (!fs.existsSync(srcDir)) {
  console.error("خطأ: لم يتم العثور على مجلد src في هذا المسار!");
  process.exit(1);
}

const files = walk(srcDir);
let replacedCount = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // التعابير النمطية لاستبدال الروابط بدقة دون المساس بأسماء المكونات (مثل DashboardLayout)
  const patterns = [
    { regex: /\/dashboard\//g, replace: '/main/' },
    { regex: /"\/dashboard"/g, replace: '"/main"' },
    { regex: /'\/dashboard'/g, replace: "'/main'" },
    { regex: /`\/dashboard`/g, replace: '`/main`' },
    { regex: /`\/dashboard\//g, replace: '`/main/' },
    { regex: /"\/dashboard\//g, replace: '"/main/' },
    { regex: /'\/dashboard\//g, replace: "'/main/" }
  ];

  let newContent = content;
  patterns.forEach(pat => {
    if (pat.regex.test(newContent)) {
      newContent = newContent.replace(pat.regex, pat.replace);
      updated = true;
    }
  });

  if (updated) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`تم التحديث: ${path.relative(srcDir, filePath)}`);
    replacedCount++;
  }
});

console.log(`\nاكتمل العمل بنجاح! تم تحديث ${replacedCount} ملفاً.`);
