const fs = require('fs');
const { createCanvas, Image } = require('canvas');

const b64 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAgCAMAAAAsVwj+AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAPUExURf+lAGA4FP///9gAAAAAAA4IzkwAAAAFdFJOU/////8A+7YOUwAAAAlwSFlzAAAOwQAADsEBuJFr7QAAAJNJREFUKFN9kAkOgDAIBOnx/zc7u1BDE+PGGnbkKMZuiojdQcQQsoYE4LwW8d2g7Bhq8gUUEnAmEnAvTwAVyH6ogYQGTVlScoKvXgDNBLNsAQ1fa/EGsKH8ISQcUIR63U2wAU8rImD9Ax58Ei12vMnmJ5BVQPPY6AZkaEktcQGvYf8CT0QGapJWor6ikjO64k7Y+wH9hAQathHZQAAAAABJRU5ErkJggg==";
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
img.src = 'data:image/png;base64,' + b64;
