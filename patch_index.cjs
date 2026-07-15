const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(/v1\.37\.11 Global Edition/g, 'v1.37.12 - 20260715');

code = code.replace(
`<button id="db_rank_reset" class="dbg-btn" style="width:100%; margin-top:5px; padding:8px; background:#555; border-color:#aaa; font-size:12px;">RESET RANKING</button>`,
`<button id="db_rank_reset" class="dbg-btn" style="width:100%; margin-top:5px; padding:8px; background:#555; border-color:#aaa; font-size:12px;">RESET RANKING</button>
        <button id="db_title" class="dbg-btn" style="width:100%; margin-top:10px; padding:12px; background:#444; border-color:#888; font-size:14px; font-family:'Press Start 2P', sans-serif;">RETURN TO TITLE</button>`
);

code = code.replace(
`<button id="btnTitlePause" class="dbg-btn" style="position:absolute; top:10px; left:10px; z-index:100; padding:5px; font-size:10px;">TITLE</button>`,
`<button id="btnTitlePause" class="dbg-btn" style="position:absolute; top:10px; left:10px; z-index:100; padding:8px; font-size:10px; font-family:'Press Start 2P', sans-serif; background:#333; color:#fff; border:2px solid #fff;">TITLE</button>`
);

fs.writeFileSync('index.html', code);
