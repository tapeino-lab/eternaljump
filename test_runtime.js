import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('dist/index.html', 'utf8');
const dom = new JSDOM(html, {
  url: "http://localhost/",
  runScripts: "dangerously",
  resources: "usable"
});

dom.window.onerror = function(msg, source, lineno, colno, error) {
  console.error("Runtime Error:", msg, error);
};

setTimeout(() => {
  console.log("JSDOM finished. If no Runtime Error above, it might be fine.");
  process.exit(0);
}, 2000);
