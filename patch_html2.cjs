const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(/padding:8px 0;/, '');
code = code.replace(/<thead style="position: sticky; top: -8px; background: rgba\(0,0,0,0\.9\); z-index: 10;">/, '<thead style="position: sticky; top: 0; background: rgba(0,0,0,0.95); z-index: 10;">');
code = code.replace(/<th style="padding-bottom:4px;/g, '<th style="padding-bottom:4px;padding-top:8px;');

fs.writeFileSync('index.html', code);
