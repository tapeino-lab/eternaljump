const fs = require('fs');
let content = fs.readFileSync('src/renderer.js', 'utf8');

const target = `      if (n.balloonTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        let tw = n.balloonText.length * 8 + 8;
        ctx.roundRect(-tw/2, -14, tw, 14, 4);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.lineTo(2, 0);
        ctx.lineTo(0, 4);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.balloonText, 0, -7);
      }`;

const replaceStr = `      if (n.balloonTimer > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        let tw = n.balloonText.length * 8 + 8;
        
        if (sy < 0) {
          ctx.beginPath();
          ctx.roundRect(-tw/2, 4, tw, 14, 4);
          ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(-2, 4);
          ctx.lineTo(2, 4);
          ctx.lineTo(0, 0);
          ctx.fill();
          
          ctx.fillStyle = '#000';
          ctx.font = '8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(n.balloonText, 0, 11);
        } else {
          ctx.beginPath();
          ctx.roundRect(-tw/2, -14, tw, 14, 4);
          ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(-2, 0);
          ctx.lineTo(2, 0);
          ctx.lineTo(0, 4);
          ctx.fill();
          
          ctx.fillStyle = '#000';
          ctx.font = '8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(n.balloonText, 0, -7);
        }
      }`;

content = content.replace(target, replaceStr);
fs.writeFileSync('src/renderer.js', content);
console.log('renderer.js updated');
