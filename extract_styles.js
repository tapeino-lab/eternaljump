import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

let css = '\n/* Extracted inline styles */\n';
let counter = 1;

const elementsWithStyle = document.querySelectorAll('[style]');
elementsWithStyle.forEach(el => {
  const style = el.getAttribute('style');
  
  // Skip display: none and display: flex if they are very short and likely manipulated by JS, 
  // but wait, we can just extract everything EXCEPT display property if we want, or keep display in inline.
  // Actually, let's just extract EVERYTHING and if JS uses .style.display = 'block', it will override the CSS class anyway.
  
  // But to be safe and avoid breaking JS logic that might rely on empty inline style vs display: none,
  // let's extract the full style.
  
  let id = el.getAttribute('id');
  let className = `ext-style-${counter++}`;
  
  if (id) {
    css += `#${id} {\n  ${style.split(';').map(s => s.trim()).filter(s=>s).join(';\n  ')};\n}\n`;
    el.removeAttribute('style');
  } else {
    css += `.${className} {\n  ${style.split(';').map(s => s.trim()).filter(s=>s).join(';\n  ')};\n}\n`;
    el.removeAttribute('style');
    el.classList.add(className);
  }
});

fs.writeFileSync('index_new.html', dom.serialize());
fs.appendFileSync('src/game.css', css);
console.log('Done!');
