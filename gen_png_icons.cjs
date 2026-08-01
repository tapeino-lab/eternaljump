const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function main() {
  const svgBuf = fs.readFileSync('public/icon.svg');
  const img = await loadImage(svgBuf);

  // 192x192
  const cvs192 = createCanvas(192, 192);
  const ctx192 = cvs192.getContext('2d');
  ctx192.drawImage(img, 0, 0, 192, 192);
  fs.writeFileSync('public/icon-192.png', cvs192.toBuffer('image/png'));
  console.log('Saved public/icon-192.png');

  // 512x512
  const cvs512 = createCanvas(512, 512);
  const ctx512 = cvs512.getContext('2d');
  ctx512.drawImage(img, 0, 0, 512, 512);
  fs.writeFileSync('public/icon-512.png', cvs512.toBuffer('image/png'));
  console.log('Saved public/icon-512.png');
}

main().catch(err => {
  console.error('PNG conversion error:', err);
});
