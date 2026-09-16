const fs = require('fs');

const input = `
Potential duplication for name: RUS JW
Potential duplication for name: JPN 05
Potential duplication for name: JPN WT
Potential duplication for name: LTU TT
Potential duplication for name: SWE SD
Potential duplication for name: BRA HS
Potential duplication for name: JPN KA
Potential duplication for name: USA XK
Potential duplication for name: USA JW
Potential duplication for name: LTU RJ
Potential duplication for name: ENG MK
Potential duplication for name: JPN SH
Potential duplication for name: LTU EE
Potential duplication for name: USA WZ
Potential duplication for name: SPA Y9
Potential duplication for name: USA 27
`;

const names = new Set();
for (const line of input.split('\n')) {
  if (line.includes('Potential duplication for name:')) {
    names.add(line.split('name: ')[1].trim());
  }
}

console.log(JSON.stringify(Array.from(names)));
