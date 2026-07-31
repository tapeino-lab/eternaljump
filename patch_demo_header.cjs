const fs = require('fs');
let code = fs.readFileSync('src/demo-ranking.ts', 'utf8');

code = code.replace(
  /\<th style="padding:4px 0;width:32px;padding-right:4px;vertical-align:middle;font-weight:normal;"\>\<div style="display:flex;justify-content:center;align-items:center;height:8px;"\>\<div class="coin-icon"\>\<div class="c-p1"\>\<\/div\>\<div class="c-p2"\>\<\/div\>\<div class="c-p3"\>\<\/div\>\<\/div\>\<\/div\>\<\/th\>/g,
  '<th style="padding:4px 0;width:32px;padding-right:4px;vertical-align:middle;font-weight:normal;">${mode === \'ta\' ? \'\' : \'<div style="display:flex;justify-content:center;align-items:center;height:8px;"><div class="coin-icon"><div class="c-p1"></div><div class="c-p2"></div><div class="c-p3"></div></div></div>\'}</th>'
);

fs.writeFileSync('src/demo-ranking.ts', code);
