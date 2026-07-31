const fs = require('fs');
let code = fs.readFileSync('src/demo-ranking.ts', 'utf8');

code = code.replace(
  /\<td style="text-align:right;padding:\$\{pt\};padding-right:4px;width:32px;color:#ffb;white-space:nowrap;overflow:hidden;vertical-align:middle;"\>\$\{escapeHTML\(r\.coins \|\| 0\)\}\<\/td\>/g,
  "${displayCoins}"
);

code = code.replace(
  /let displayScore \= \`\$\{escapeHTML\(r\.alt\)\}m\`\;/g,
  `let displayScore = \`\${escapeHTML(r.alt)}m\`;
    let displayCoins = \`<td style="text-align:right;padding:\${pt};padding-right:4px;width:32px;color:#ffb;white-space:nowrap;overflow:hidden;vertical-align:middle;">\${escapeHTML(r.coins || 0)}</td>\`;`
);

code = code.replace(
  /displayScore \= \`\<span style="color:#0ff;"\>\$\{mStr\}:\$\{sStr\}\.\$\{msStr\}\<\/span\>\`\;/g,
  `displayScore = \`<span style="color:#fff;">\${mStr}:\${sStr}.\${msStr}</span>\`;
        displayCoins = \`<td style="text-align:right;padding:\${pt};padding-right:4px;width:32px;white-space:nowrap;overflow:hidden;vertical-align:middle;"></td>\`;`
);

fs.writeFileSync('src/demo-ranking.ts', code);
