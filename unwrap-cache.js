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

  // We want to unwrap:
  // unstable_cache(
  //   async (...) => { ... },
  //   ['...'],
  //   { ... }
  // );
  // Note: the function block can have any number of lines.
  // A regex with non-greedy match until the cache keys array:
  // \bunstable_cache\s*\(\s*(async\s*(?:\([^)]*\)|[^=]*)\s*=>\s*\{[\s\S]*?\})\s*,\s*\[(.*?)\]\s*,\s*\{.*?\}\s*\)
  // Let's refine it. We know the 2nd argument is an array `['...']` and 3rd is an object `{ revalidate: ... }`

  const regex = /unstable_cache\s*\(\s*(async\s*(?:\([^)]*\)|\w+)\s*=>\s*\{[\s\S]*?\})\s*,\s*\[[^\]]*\]\s*,\s*\{[^}]*\}\s*\)/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, '$1');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Unwrapped in ${filePath}`);
  }
}

walkDir(path.join(__dirname, 'src/app'), processFile);
console.log('Done.');
