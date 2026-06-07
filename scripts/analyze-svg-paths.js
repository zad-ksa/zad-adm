const fs = require('fs');

const svgContent = fs.readFileSync('public/assets/logos/لوجو زاد-01.svg', 'utf8');

// A very basic parser to find translates and coordinate ranges in paths
const pathRegex = /<path[^>]+d="([^"]+)"[^>]+transform="translate\(([^)]+)\)"/g;

let minX = Infinity;
let maxX = -Infinity;
let minY = Infinity;
let maxY = -Infinity;

let match;
let pathCount = 0;

while ((match = pathRegex.exec(svgContent)) !== null) {
  pathCount++;
  const d = match[1];
  const translateStr = match[2];
  const [tx, ty] = translateStr.split(',').map(Number);
  
  // Parse numbers in path data
  const numRegex = /[-+]?[0-9]*\.?[0-9]+/g;
  let numMatch;
  let isX = true; // Alternates X, Y for coordinates in path data
  
  // We want to be careful because some path commands have control points.
  // But all coordinates in the path data are within the shape's boundaries.
  while ((numMatch = numRegex.exec(d)) !== null) {
    const val = Number(numMatch[0]);
    if (isX) {
      const absX = val + tx;
      if (absX < minX) minX = absX;
      if (absX > maxX) maxX = absX;
    } else {
      const absY = val + ty;
      if (absY < minY) minY = absY;
      if (absY > maxY) maxY = absY;
    }
    isX = !isX;
  }
}

console.log(`Parsed ${pathCount} paths.`);
console.log(`Bounding box:`);
console.log(`Min X: ${minX}`);
console.log(`Max X: ${maxX}`);
console.log(`Min Y: ${minY}`);
console.log(`Max Y: ${maxY}`);
console.log(`Width: ${maxX - minX}`);
console.log(`Height: ${maxY - minY}`);
console.log(`Recommended viewBox: "${Math.floor(minX) - 10} ${Math.floor(minY) - 10} ${Math.ceil(maxX - minX) + 20} ${Math.ceil(maxY - minY) + 20}"`);
