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
  let modified = false;

  // Replace export const revalidate = 300; with export const dynamic = "force-dynamic";
  const revalidateRegex = /export\s+const\s+revalidate\s*=\s*\d+;?(\s*\/\/[^\n]*)?/g;
  if (revalidateRegex.test(content)) {
    content = content.replace(revalidateRegex, 'export const dynamic = "force-dynamic";');
    modified = true;
  }

  // Remove import { unstable_cache } from "next/cache";
  const importRegex = /import\s*{\s*unstable_cache\s*}\s*from\s*['"]next\/cache['"];?/g;
  if (importRegex.test(content)) {
    content = content.replace(importRegex, '');
    modified = true;
  }

  // Replace unstable_cache wrapper
  // We need to match: const funcName = unstable_cache( async () => { ... }, ['key'], { ... } );
  // This is tricky with regex. Instead of removing it perfectly, since we just want to disable caching,
  // we can change { revalidate: 300, tags: [...] } to { revalidate: 0, tags: [...] }
  // OR we can just write a regex that matches the wrapper:
  // unstable_cache(\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{
  // Actually, setting revalidate: 0 inside unstable_cache is easiest.
  const cacheOptsRegex = /\{\s*revalidate\s*:\s*\d+/g;
  if (cacheOptsRegex.test(content)) {
    content = content.replace(cacheOptsRegex, '{ revalidate: 0');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

walkDir(path.join(__dirname, 'src/app'), processFile);
console.log('Done.');
