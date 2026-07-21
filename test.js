const Jimp = require('jimp');

const b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAeCAMAAAASJ24jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAVUExURdsrAP////+bO8tPDwUFBQAAAAAAAP66ppcAAAAHdFJOU////////wAaSwNGAAAACXBIWXMAAA7CAAAOwgEVKEqAAAAAY0lEQVQoU42QAQ6AIAwDBZn/f7ItnUtgolwiq6ewheOfi5SiB0hUitqji1gWQlFlT/i7AoT3A+xOoYkA06uYt6RDw/SyKRSlVwL9hgviRD6f3+wXp2hPzaJN8I/4yiULGzC7ARD+B+E+NdkFAAAAAElFTkSuQmCC";

Jimp.read(Buffer.from(b64.split(',')[1], 'base64')).then(img => {
  const colors = {};
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];
    if (a > 0) {
      const c = `${r},${g},${b}`;
      colors[c] = (colors[c] || 0) + 1;
    }
  });
  console.log(colors);
});
