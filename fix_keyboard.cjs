const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

const target = `      <div id="virtualKeyboard" style="width:100%; background:#151515; border:2px solid #444; border-radius:6px; padding:12px; box-sizing:border-box; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-around; gap:4px; margin-bottom:12px; border-bottom:1px dashed #333; padding-bottom:10px;">
          <span id="tabLetters" style="font-size:14px; color:#fff; cursor:pointer; border-bottom:2px solid #fff; padding-bottom:4px; font-weight:bold; letter-spacing:1px;">A-Z</span>
          <span id="tabNumbers" style="font-size:14px; color:#888; cursor:pointer; padding-bottom:4px; font-weight:bold; letter-spacing:1px;">0-9</span>
          <span id="tabSymbols" style="font-size:14px; color:#888; cursor:pointer; padding-bottom:4px; font-weight:bold; letter-spacing:1px;">SYM</span>
        </div>
        
        <!-- コンテナの高さを 340px に固定し、各ブロックは通常フロー。 -->
        <div style="height: 340px; width: 100%;">
          <!-- A-Z Block -->
          <div id="kbLetters" style="display:grid; grid-template-columns: repeat(6, 1fr); gap:6px 4px; align-content:start;"></div>
          <!-- 0-9 Block -->
          <div id="kbNumbers" style="display:grid; grid-template-columns: repeat(5, 1fr); gap:6px 4px; align-content:start; display:none;"></div>
          <!-- Symbols Block -->
          <div id="kbSymbols" style="display:grid; grid-template-columns: repeat(5, 1fr); gap:6px 4px; align-content:start; display:none;"></div>
        </div>
      </div>`;

const replaceStr = `      <div id="virtualKeyboard" style="width:100%; background:#151515; border:2px solid #444; border-radius:6px; padding:12px; box-sizing:border-box; margin-bottom:20px;">
        <!-- コンテナの高さを 340px に固定し、各ブロックは通常フロー。 -->
        <div style="height: 340px; width: 100%;">
          <!-- A-Z Block -->
          <div id="kbLetters" style="display:grid; grid-template-columns: repeat(6, 1fr); gap:6px 4px; align-content:start;"></div>
          <!-- 0-9 Block -->
          <div id="kbNumbers" style="display:grid; grid-template-columns: repeat(5, 1fr); gap:6px 4px; align-content:start; display:none;"></div>
          <!-- Symbols Block -->
          <div id="kbSymbols" style="display:grid; grid-template-columns: repeat(5, 1fr); gap:6px 4px; align-content:start; display:none;"></div>
        </div>

        <div style="display:flex; justify-content:space-around; gap:4px; margin-top:12px; border-top:1px dashed #333; padding-top:12px;">
          <span id="tabLetters" style="font-size:14px; color:#fff; cursor:pointer; border-bottom:2px solid #fff; padding-bottom:4px; font-weight:bold; letter-spacing:1px;">A-Z</span>
          <span id="tabNumbers" style="font-size:14px; color:#888; cursor:pointer; padding-bottom:4px; font-weight:bold; letter-spacing:1px;">0-9</span>
          <span id="tabSymbols" style="font-size:14px; color:#888; cursor:pointer; padding-bottom:4px; font-weight:bold; letter-spacing:1px;">SYM</span>
        </div>
      </div>`;

content = content.replace(target, replaceStr);
fs.writeFileSync('index.html', content);
console.log('index.html updated');
