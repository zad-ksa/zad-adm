const fs = require('fs');

const svgContent = fs.readFileSync('public/assets/logos/لوجو زاد-01.svg', 'utf8');

// Replace width and height attributes or add viewBox
let updatedSvg = svgContent
  .replace('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="1622" height="1622">', 
           '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="107 438 1410 745" width="100%" height="100%">');

fs.writeFileSync('public/assets/logos/لوجو زاد-cropped.svg', updatedSvg);
console.log('Created public/assets/logos/لوجو زاد-cropped.svg with cropped viewBox!');
