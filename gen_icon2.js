let html = [];

// Diagonal stick
for(let i=0; i<10; i++) {
  let x = 2 + i;
  let y = 13 - i;
  
  html.push(`<rect x="${x-1}" y="${y}" width="1" height="2" fill="#000"/>`); // left outline
  html.push(`<rect x="${x}" y="${y+1}" width="2" height="1" fill="#000"/>`); // bottom outline
  
  html.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="#555"/>`); // base
  html.push(`<rect x="${x}" y="${y-1}" width="1" height="1" fill="#888"/>`); // light
  html.push(`<rect x="${x-1}" y="${y-1}" width="1" height="1" fill="#aaa"/>`); // highlight
}

// Head Base
html.push(`<rect x="11" y="1" width="4" height="4" fill="#333"/>`);
html.push(`<rect x="12" y="0" width="2" height="6" fill="#333"/>`);
html.push(`<rect x="10" y="2" width="6" height="2" fill="#333"/>`);

// Head Highlight
html.push(`<rect x="12" y="1" width="2" height="1" fill="#aaa"/>`);
html.push(`<rect x="11" y="2" width="1" height="2" fill="#aaa"/>`);
html.push(`<rect x="12" y="2" width="1" height="1" fill="#fff"/>`);
html.push(`<rect x="13" y="2" width="1" height="1" fill="#888"/>`);
html.push(`<rect x="12" y="3" width="1" height="1" fill="#888"/>`);

// Head Outline
html.push(`<rect x="12" y="0" width="2" height="1" fill="#000"/>`);
html.push(`<rect x="11" y="1" width="1" height="1" fill="#000"/>`);
html.push(`<rect x="14" y="1" width="1" height="1" fill="#000"/>`);
html.push(`<rect x="10" y="2" width="1" height="2" fill="#000"/>`);
html.push(`<rect x="15" y="2" width="1" height="2" fill="#000"/>`);
html.push(`<rect x="11" y="4" width="1" height="1" fill="#000"/>`);
html.push(`<rect x="14" y="4" width="1" height="1" fill="#000"/>`);
html.push(`<rect x="13" y="5" width="1" height="1" fill="#000"/>`);
html.push(`<rect x="12" y="5" width="1" height="1" fill="#000"/>`);

console.log(`<svg viewBox="0 0 16 16" width="24" height="24" shape-rendering="crispEdges">\n${html.join('\n')}\n</svg>`);
