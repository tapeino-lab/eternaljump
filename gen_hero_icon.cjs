const fs = require('fs');
const zlib = require('zlib');

const b64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAPUExURf+lAGA4FP///9gAAAAAAA4IzkwAAAAFdFJOU/////8A+7YOUwAAAAlwSFlzAAAOwgAADsIBFShKgAAAAGFJREFUKFNNzkESwCAIQ1FA7n/m5ofKyKIjrxCNfitUc0rqAfeSCzQRGVUaMqgB+H1hZVdA5y4wNBl1zi9pqJLoU8UGORaT80k2IdykpeTsIcUolBcOzYQeMEAEtzC01f0BJ9YCM7HM4pQAAAAASUVORK5CYII=';
const buf = Buffer.from(b64, 'base64');

let pos = 8;
let width, height, bitDepth;
let palette = [];
let trans = [];
let idatList = [];

while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  const data = buf.slice(pos + 8, pos + 8 + len);
  
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    bitDepth = data[8];
  } else if (type === 'PLTE') {
    for (let i = 0; i < data.length; i += 3) {
      palette.push([data[i], data[i+1], data[i+2]]);
    }
  } else if (type === 'tRNS') {
    for (let i = 0; i < data.length; i++) {
      trans.push(data[i]);
    }
  } else if (type === 'IDAT') {
    idatList.push(data);
  }
  pos += 12 + len;
}

const idat = Buffer.concat(idatList);
const uncompressed = zlib.inflateSync(idat);

const bytesPerRow = Math.ceil(width * bitDepth / 8);
const grid = [];
for (let y = 0; y < height; y++) {
  const rowStart = y * (bytesPerRow + 1) + 1;
  const row = [];
  for (let x = 0; x < width; x++) {
    const idx = uncompressed[rowStart + x];
    const color = palette[idx] || [0,0,0];
    const alpha = (trans[idx] !== undefined) ? trans[idx] : 255;
    row.push({ idx, color, alpha });
  }
  grid.push(row);
}

// Convert palette colors to hex strings
function toHex(rgb) {
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
}

// Generate SVG string
// Canvas size: 512x512
// Grid size: 16x16 pixels
// Each pixel size: 24x24 px -> Total sprite size = 384x384 px
// Offset X = (512 - 384) / 2 = 64
// Offset Y = (512 - 384) / 2 = 64

let rects = [];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const p = grid[y][x];
    if (p.alpha > 0) {
      const hex = toHex(p.color);
      const px = 64 + x * 24;
      const py = 64 + y * 24;
      rects.push(`<rect x="${px}" y="${py}" width="24" height="24" fill="${hex}" />`);
    }
  }
}

// Sky blue background: #38b0f8 (RGB 56, 176, 248)
// Border: subtle rounded card
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Sky Blue Background -->
  <rect width="512" height="512" fill="#38b0f8" rx="96" />
  <rect x="12" y="12" width="488" height="488" fill="none" stroke="#70ccff" stroke-width="8" rx="84" />
  
  <!-- Subtle cloud pixel accents at bottom -->
  <rect x="40" y="440" width="120" height="24" fill="#ffffff" opacity="0.6" rx="4" />
  <rect x="360" y="420" width="100" height="24" fill="#ffffff" opacity="0.6" rx="4" />

  <!-- Hero Jump Sprite (16x16 Pixel Art scaled to 384x384) -->
  <g>
    ${rects.join('\n    ')}
  </g>
</svg>`;

fs.writeFileSync('public/icon.svg', svg);
console.log('Successfully generated public/icon.svg!');
