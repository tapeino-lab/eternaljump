let svg = [];
let grid = Array(16).fill(0).map(() => Array(16).fill(0));

// Draw Stick
for(let x=0; x<16; x++) {
  for(let y=0; y<16; y++) {
    let sum = x + y;
    if (sum === 13) grid[y][x] = 4; // highlight
    else if (sum === 14) grid[y][x] = 4;
    else if (sum === 15) grid[y][x] = 3; // base
    else if (sum === 16) grid[y][x] = 2; // shadow
    else if (sum === 17) grid[y][x] = 2;
  }
}

// Cut off stick at bottom left
for(let x=0; x<16; x++) {
  for(let y=0; y<16; y++) {
    if (x < 1 || y > 14) {
      grid[y][x] = 0;
    }
  }
}

// Draw Sphere at top right
let cx = 11.5, cy = 3.5;
for(let x=0; x<16; x++) {
  for(let y=0; y<16; y++) {
    let dx = x - cx;
    let dy = y - cy;
    if (dx*dx + dy*dy <= 12) {
      // Overwrite stick with sphere
      let distToLight = (x - (cx - 1.5)) * (x - (cx - 1.5)) + (y - (cy - 1.5)) * (y - (cy - 1.5));
      if (distToLight <= 1) grid[y][x] = 8; // pure white highlight
      else if (distToLight <= 6) grid[y][x] = 7; // light
      else if (distToLight <= 12) grid[y][x] = 6; // mid
      else grid[y][x] = 5; // dark base
    }
  }
}

// Ensure stick doesn't protrude past the sphere
for(let x=0; x<16; x++) {
  for(let y=0; y<16; y++) {
    if (grid[y][x] >= 2 && grid[y][x] <= 4) { // if it's stick
      // if it's past the center of the sphere
      if (x > 11 || y < 4) {
        grid[y][x] = 0;
      }
    }
  }
}

// Redraw Sphere at top right to overwrite any zeroed out stick if needed, 
// wait, the zeroing out might have deleted the sphere?
// The zeroing out condition was only for stick (grid value 2,3,4) so sphere is safe.

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
      // Corners
      if (x>0 && y>0 && grid[y-1][x-1] !== 0) hasNeighbor = true;
      if (x<15 && y>0 && grid[y-1][x+1] !== 0) hasNeighbor = true;
      if (x>0 && y<15 && grid[y+1][x-1] !== 0) hasNeighbor = true;
      if (x<15 && y<15 && grid[y+1][x+1] !== 0) hasNeighbor = true;

      if (hasNeighbor) {
        outGrid[y][x] = 1;
      }
    }
  }
}

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
