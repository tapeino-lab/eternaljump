const fs = require('fs');
const { createCanvas, Image } = require('canvas');
const jmp_b64 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAPUExURf+lAGA4FP///9gAAAAAAA4IzkwAAAAFdFJOU/////8A+7YOUwAAAAlwSFlzAAAOwgAADsIBFShKgAAAAGFJREFUKFNNzkESwCAIQ1FA7n/m5ofKyKIjrxCNfitUc0rqAfeSCzQRGVUaMqgB+H1hZVdA5y4wNBl1zi9pqJLoU8UGORaT80k2IdykpeTsIcUolBcOzYQeMEAEtzC01f0BJ9YCM7HM4pQAAAAASUVORK5CYII="
const img = new Image();
img.onload = () => {
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  for(let y=0; y<img.height; y++) {
    let row = '';
    for(let x=0; x<img.width; x++) {
      let alpha = data[(y*img.width + x)*4 + 3];
      row += alpha > 128 ? '#' : '.';
    }
    console.log(row);
  }
}
img.src = 'data:image/png;base64,' + jmp_b64;
