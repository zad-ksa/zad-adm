const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // If the file uses unstable_cache but doesn't import it, add the import
  if (content.includes('unstable_cache(') && !content.includes('import { unstable_cache }')) {
    // Add import after the first import or at top
    if (content.startsWith('"use client"') || content.startsWith('"use server"')) {
      content = content.replace(/^(["']use (client|server)["'];?\r?\n)/, '$1import { unstable_cache } from "next/cache";\n');
    } else {
      content = 'import { unstable_cache } from "next/cache";\n' + content;
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Restored import in ${filePath}`);
  }
}

walkDir(path.join(__dirname, 'src/app'), processFile);
console.log('Done.');
