import { Jimp } from 'jimp';

const p14 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAOCAYAAAAmL5yKAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAABkSURBVDhPY7ytzfCfgQLABKXJBoz/gYBhjg2UiwRSjjAwAgGIiVcNWBIIYIpBAF0Mn5pB4IWBj4XT/vw4XWC17RvDMS8uKA8TgOQpdwErKytFYYDiBWKcjC5PuReAmAIvMDAAAEyrPVVqLa0yAAAAAElFTkSuQmCC";
const p22 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAWCAMAAAD+dOxOAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAVUExURdsrAP////+bO8tPDwUFBQAAAAAAAP66ppcAAAAHdFJOU////////wAaSwNGAAAACXBIWXMAAA7CAAAOwgEVKEqAAAAAV0lEQVQoU4WPAQ7AIAgDhcn+/+RRiksUo02EemKj7a4XEuFyESiAhg2g4VkB6LI3H809iAAwLOR+B9YrJXS4rPuHRXCG549Oeqg+egV9ESb+U5QKbJLZB5jrBPFSVQC+AAAAAElFTkSuQmCC";
const p30 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAeCAMAAAASJ24jAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAVUExURdsrAP////+bO8tPDwUFBQAAAAAAAP66ppcAAAAHdFJOU////////wAaSwNGAAAACXBIWXMAAA7CAAAOwgEVKEqAAAAAY0lEQVQoU42QAQ6AIAwDBZn/f7ItnUtgolwiq6ewheOfi5SiB0hUitqji1gWQlFlT/i7AoT3A+xOoYkA06uYt6RDw/SyKRSlVwL9hgviRD6f3+wXp2hPzaJN8I/4yiULGzC7ARD+B+E+NdkFAAAAAElFTkSuQmCC";

async function replaceColor(b64, targetR, targetG, targetB, replR, replG, replB) {
  const buf = Buffer.from(b64.split(',')[1], 'base64');
  const img = await Jimp.read(buf);
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];
    if (a > 0 && Math.abs(r - targetR) < 15 && Math.abs(g - targetG) < 15 && Math.abs(b - targetB) < 15) {
      this.bitmap.data[idx + 0] = replR;
      this.bitmap.data[idx + 1] = replG;
      this.bitmap.data[idx + 2] = replB;
    }
  });
  const b = await img.getBase64("image/png");
  return b;
}

async function main() {
  const np14 = await replaceColor(p14, 219, 43, 0, 0, 255, 0);
  const np22 = await replaceColor(p22, 219, 43, 0, 0, 255, 0);
  const np30 = await replaceColor(p30, 219, 43, 0, 0, 255, 0);
  console.log(`pm14: "${np14}",`);
  console.log(`pm22: "${np22}",`);
  console.log(`pm30: "${np30}",`);
}
main();
