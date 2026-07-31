const fs = require('fs');
let code = fs.readFileSync('src/ranking/ui.ts', 'utf8');
code = code.replace(
`                document.getElementById('rankingHeaderScore').innerText = 'TIME';`,
`                document.getElementById('rankingHeaderScore').innerText = 'TIME';
                Array.from(document.querySelectorAll('.ranking-th-coin')).forEach(el => el.style.opacity = '0');`
);
code = code.replace(
`                document.getElementById('rankingHeaderScore').innerText = 'HEIGHT';`,
`                document.getElementById('rankingHeaderScore').innerText = 'HEIGHT';
                Array.from(document.querySelectorAll('.ranking-th-coin')).forEach(el => el.style.opacity = '1');`
);

code = code.replace(
`            let displayScore = \`\${escapeHTML(r.alt)}m\`;
            if (mode === 'ta' && r.t) {
                let t = r.t;
                let tMs = t % 1000;
                let totalSec = Math.floor(t / 1000);
                let mStr = Math.floor(totalSec / 60);
                let sStr = (totalSec % 60).toString().padStart(2, '0');
                let msStr = Math.floor(tMs / 100).toString();
                displayScore = \`<span style="color:#0ff;">\${mStr}:\${sStr}.\${msStr}</span>\`;
            }
            let rankStyle = (typeof rNum === 'number' && rNum >= 100) ? 'font-size:7px;letter-spacing:-0.5px;padding-left:2px;' : '';
            return \`<tr\${idAttr} style="border-bottom:1px dashed #333;\${bg}"><td style="padding:4px 0 4px 4px;text-align:left;width:24px;white-space:nowrap;overflow:hidden;\${rankStyle}">\${m}\${rNum}</td><td style="padding:4px 0;text-align:center;width:32px;white-space:nowrap;overflow:hidden;font-size:8px;">\${escapeHTML(lang)}</td><td style="width:4px;padding:0;"></td><td style="padding:4px 0;text-align:center;width:32px;white-space:nowrap;overflow:hidden;font-size:8px;">\${escapeHTML(name)}</td><td style="padding:4px 0;text-align:right;white-space:nowrap;overflow:hidden;">\${displayScore}</td><td style="padding:4px 4px 4px 0;text-align:right;width:32px;color:#ffb;white-space:nowrap;overflow:hidden;">\${escapeHTML(r.coins || 0)}</td></tr>\`;`,
`            let displayScore = \`\${escapeHTML(r.alt)}m\`;
            let displayCoins = \`<td style="padding:4px 4px 4px 0;text-align:right;width:32px;color:#ffb;white-space:nowrap;overflow:hidden;">\${escapeHTML(r.coins || 0)}</td>\`;
            if (mode === 'ta' && r.t) {
                let t = r.t;
                let tMs = t % 1000;
                let totalSec = Math.floor(t / 1000);
                let mStr = Math.floor(totalSec / 60);
                let sStr = (totalSec % 60).toString().padStart(2, '0');
                let msStr = Math.floor(tMs / 100).toString();
                displayScore = \`<span style="color:#fff;">\${mStr}:\${sStr}.\${msStr}</span>\`;
                displayCoins = \`<td style="padding:4px 4px 4px 0;text-align:right;width:32px;white-space:nowrap;overflow:hidden;"></td>\`;
            }
            let rankStyle = (typeof rNum === 'number' && rNum >= 100) ? 'font-size:7px;letter-spacing:-0.5px;padding-left:2px;' : '';
            return \`<tr\${idAttr} style="border-bottom:1px dashed #333;\${bg}"><td style="padding:4px 0 4px 4px;text-align:left;width:24px;white-space:nowrap;overflow:hidden;\${rankStyle}">\${m}\${rNum}</td><td style="padding:4px 0;text-align:center;width:32px;white-space:nowrap;overflow:hidden;font-size:8px;">\${escapeHTML(lang)}</td><td style="width:4px;padding:0;"></td><td style="padding:4px 0;text-align:center;width:32px;white-space:nowrap;overflow:hidden;font-size:8px;">\${escapeHTML(name)}</td><td style="padding:4px 0;text-align:right;white-space:nowrap;overflow:hidden;">\${displayScore}</td>\${displayCoins}</tr>\`;`
);
fs.writeFileSync('src/ranking/ui.ts', code);
