let svg = [];
let grid = Array(16).fill(0).map(() => Array(16).fill(0));

// Draw Stick
for(let x=0; x<16; x++) {
  for(let y=0; y<16; y++) {
    if (x + y === 14) grid[y][x] = 4;
    else if (x + y === 15) grid[y][x] = 3;
    else if (x + y === 16) grid[y][x] = 2;
  }
}
// Cut off stick at x < 2
for(let x=0; x<16; x++) {
  for(let y=0; y<16; y++) {
    if (x < 2 && grid[y][x] >= 2 && grid[y][x] <= 4) {
      grid[y][x] = 0;
    }
  }
}

// Draw Sphere
let cx = 11, cy = 4;
for(let x=0; x<16; x++) {
  for(let y=0; y<16; y++) {
    let dx = x - cx;
    let dy = y - cy;
    if (dx*dx + dy*dy <= 10) {
      // Shading for sphere
      // Light source from top-left (smaller x and y)
      let distToLight = (x - (cx - 1)) * (x - (cx - 1)) + (y - (cy - 1)) * (y - (cy - 1));
      if (dx === -1 && dy === -1) grid[y][x] = 8; // pure white highlight
      else if (dx === 0 && dy === -1) grid[y][x] = 8;
      else if (distToLight <= 3) grid[y][x] = 7; // light
      else if (distToLight <= 10) grid[y][x] = 6; // mid
      else grid[y][x] = 5; // base
    }
  }
}

// Add Outlines
let outGrid = Array(16).fill(0).map(() => Array(16).fill(0));
for(let x=0; x<16; x++) {
  for(let y=0; y<16; y++) {
    if (grid[y][x] !== 0) {
      outGrid[y][x] = grid[y][x];
    } else {
      // check neighbors
      let hasNeighbor = false;
      if (x>0 && grid[y][x-1] !== 0) hasNeighbor = true;
      if (x<15 && grid[y][x+1] !== 0) hasNeighbor = true;
      if (y>0 && grid[y-1][x] !== 0) hasNeighbor = true;
      if (y<15 && grid[y+1][x] !== 0) hasNeighbor = true;
      if (hasNeighbor) {
        outGrid[y][x] = 1;
      }
    }
  }
}

// Generate SVG rects
let colors = {
  1: '#000',
  2: '#333',
  3: '#555',
  4: '#888',
  5: '#222',
  6: '#444',
  7: '#777',
  8: '#fff'
};

for(let y=0; y<16; y++) {
  let row = [];
  for(let x=0; x<16; x++) {
    if (outGrid[y][x] !== 0) {
      row.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[outGrid[y][x]]}"/>`);
    }
  }
  if (row.length > 0) svg.push(row.join(''));
}

console.log(svg.join(''));
