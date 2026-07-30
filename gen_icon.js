let stick = [];
for (let i = 0; i < 9; i++) {
  // Main stick
  let x = 3 + i;
  let y = 12 - i;
  
  stick.push(`<rect x="${x-1}" y="${y}" width="1" height="2" fill="#000"/>`); // Left outline
  stick.push(`<rect x="${x}" y="${y+1}" width="2" height="1" fill="#000"/>`); // Bottom outline
  stick.push(`<rect x="${x-1}" y="${y-1}" width="1" height="1" fill="#fff"/>`); // Highlight
  stick.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="#666"/>`); // Base
  stick.push(`<rect x="${x}" y="${y-1}" width="1" height="1" fill="#444"/>`); // Top/Right base
}

console.log(stick.join('\n'));
