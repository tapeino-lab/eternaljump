const fs = require('fs');
let code = fs.readFileSync('src/lifecycle.ts', 'utf-8');
code = code.replace(/autoBtn\.innerHTML = isActive \? 'AUTO ON' : 'AUTO OFF';/g, "autoBtn.innerHTML = 'AUTO';");
code = code.replace(/autoBtn\.style\.color = isActive \? '#4af' : '#fff';/g, "autoBtn.style.color = isActive ? '#a0f020' : '#fff';");
code = code.replace(/autoBtn\.style\.borderColor = isActive \? '#4af' : '#fff';/g, "autoBtn.style.borderColor = isActive ? '#a0f020' : '#fff';");

code = code.replace(/autoCruiseBtn\.innerHTML = 'AUTO OFF';/g, "autoCruiseBtn.innerHTML = 'AUTO';\n      autoCruiseBtn.style.color = game.aiActive ? '#a0f020' : '#fff';\n      autoCruiseBtn.style.borderColor = game.aiActive ? '#a0f020' : '#fff';");
fs.writeFileSync('src/lifecycle.ts', code);

let html = fs.readFileSync('index.html', 'utf-8');
html = html.replace(/AUTO OFF<\/button>/g, "AUTO</button>");
fs.writeFileSync('index.html', html);
