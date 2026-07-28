import fs from 'fs';
let code = fs.readFileSync('src/game.css', 'utf8');

const targetStr = `@keyframes fallConfetti {
  0% { transform: translateY(-30px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
}`;

const replacement = `@keyframes fallConfetti {
  0% { transform: translate(0, -30px) rotate(0deg); opacity: 1; }
  100% { transform: translate(var(--shift-x, 0), 400px) rotate(720deg); opacity: 0; }
}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/game.css', code);
  console.log("Success");
} else {
  console.log("Failed to find target string in CSS");
}
