const fs = require('fs');

const content = fs.readFileSync('src/components/ZadLogo.tsx', 'utf8');

// Extract the Icon Paths
const iconPathsStart = content.indexOf('{/* Icon Paths */}');
const iconPathsEnd = content.indexOf('{/* Text Paths */}');
const iconPaths = content.substring(iconPathsStart + 18, iconPathsEnd).trim();

// Extract the Text Paths
const textPathsStart = content.indexOf('<g transform="translate(-90, 0) translate(538, 787) scale(1.35) translate(-538, -787)">');
const textPathsEnd = content.lastIndexOf('</g>');
const textPaths = content.substring(textPathsStart, textPathsEnd + 4).trim();

// logo-full.svg
const fullSvg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="-140 430 1660 760">
  ${iconPaths}
  ${textPaths}
</svg>`;

// logo-icon.svg
const iconSvg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="1070 430 450 760">
  ${iconPaths}
</svg>`;

fs.writeFileSync('public/logo-full.svg', fullSvg);
fs.writeFileSync('public/logo-icon.svg', iconSvg);
console.log('SVGs created successfully.');
