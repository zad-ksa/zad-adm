const fs = require('fs');
const path = require('path');

const dir = 'public/assets/logos';
const files = fs.readdirSync(dir);

function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  // PNG signature check
  if (buffer.readUInt32BE(0) !== 0x89504E47 || buffer.readUInt32BE(4) !== 0x0D0A1A0A) {
    return null;
  }
  // IHDR chunk check
  const ihdrOffset = 8;
  const chunkLength = buffer.readUInt32BE(ihdrOffset);
  const chunkType = buffer.toString('ascii', ihdrOffset + 4, ihdrOffset + 8);
  if (chunkType !== 'IHDR') {
    return null;
  }
  const width = buffer.readUInt32BE(ihdrOffset + 8);
  const height = buffer.readUInt32BE(ihdrOffset + 12);
  return { width, height };
}

files.forEach(file => {
  const ext = path.extname(file).toLowerCase();
  const filePath = path.join(dir, file);
  if (ext === '.png') {
    const dimensions = getPngDimensions(filePath);
    if (dimensions) {
      console.log(`${file}: ${dimensions.width}x${dimensions.height} (aspect ratio: ${(dimensions.width/dimensions.height).toFixed(2)})`);
    } else {
      console.log(`${file}: not a valid PNG`);
    }
  } else if (ext === '.svg') {
    const content = fs.readFileSync(filePath, 'utf8');
    const widthMatch = content.match(/width="([^"]+)"/);
    const heightMatch = content.match(/height="([^"]+)"/);
    const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
    console.log(`${file}: SVG, width=${widthMatch ? widthMatch[1] : 'none'}, height=${heightMatch ? heightMatch[1] : 'none'}, viewBox=${viewBoxMatch ? viewBoxMatch[1] : 'none'}`);
  }
});
