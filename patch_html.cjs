const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
code = code.replace(
  '          <div id="pauseBest" class="pause-value"></div>',
  '          <div id="pauseBest" class="pause-value"></div>\n          <button id="btnSyncTA" style="margin-top:20px;padding:10px;background:#0ff;color:#000;border:none;border-radius:5px;font-family:monospace;font-weight:bold;cursor:pointer;">SYNC TA SCORES</button>'
);
fs.writeFileSync('index.html', code);
