import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');

const target = `<button id="shopResetBtn" style="background: transparent; border: none; color: rgba(255,255,255,0.4); font-family: 'Press Start 2P', sans-serif; font-size: 8px; padding: 4px 6px; cursor: pointer; text-decoration: underline;">RESET</button>`;
const replacement = `<button id="shopResetBtn" style="background: rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.5); border-radius: 4px; color: #fff; font-family: 'Press Start 2P', sans-serif; font-size: 8px; padding: 4px 6px; cursor: pointer;">RESET</button>`;

if (html.includes(target)) {
  html = html.replace(target, replacement);
  fs.writeFileSync('index.html', html);
  console.log("Replaced reset button in HTML");
} else {
  console.log("Target button not found in HTML");
}
