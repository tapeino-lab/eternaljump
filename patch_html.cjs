const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(/<div style="border:1px solid #fff;border-radius:4px;padding:8px 0;background:rgba\(0,0,0,0\.5\);margin-bottom:10px;">/, '<div id="rankingTableWrapper" style="border:1px solid #fff;border-radius:4px;padding:8px 0;background:rgba(0,0,0,0.5);margin-bottom:10px; max-height: 250px; overflow-y: auto; overflow-x: hidden;">');

code = code.replace(/<thead>/, '<thead style="position: sticky; top: -8px; background: rgba(0,0,0,0.9); z-index: 10;">');

fs.writeFileSync('index.html', code);
