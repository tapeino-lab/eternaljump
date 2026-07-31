const fs = require('fs');
let code = fs.readFileSync('src/renderer/ui.ts', 'utf8');

const replacement = `
    if (progress >= 1) {
      demoState.phase = 'wait';
      setTimeout(() => {
        if (!isAttractMode) return;
        
        if (demoState.rankingMode === 'ta') {
            demoState.rankingMode = 'height';
            
            // Clone current elements
            const oldHeader = header.cloneNode(true);
            const oldTop3 = top3.cloneNode(true);
            const oldOthersWrapper = othersWrapper.cloneNode(true);
            
            oldHeader.id = 'demoHeaderOld';
            oldTop3.id = 'demoTop3Old';
            oldOthersWrapper.id = 'demoOthersWrapperOld';
            
            container.appendChild(oldHeader);
            container.appendChild(oldTop3);
            container.appendChild(oldOthersWrapper);
            
            import('../demo-ranking.js').then(m => m.startDemoRankingScroll(isAttractMode, 'height', true));
        } else {
            overlay.style.display = 'block';
            overlay.offsetHeight;
            overlay.style.opacity = '1';
            setTimeout(() => {
              if (!isAttractMode) return;
              container.style.display = 'none';
              container.style.opacity = '1';
              container.style.transition = 'none';
              
              runAttractUICycle();
              setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 1000);
              }, 500);
            }, 1000);
        }
      }, 3000);
    }
`;

code = code.replace(/if \(progress >= 1\) \{[\s\S]*?\}, 3000\);\n    \}/, replacement.trim());

const scrollReplacement = `
    if (currentScrolled < demoState.dist1) {
      let headerY = demoState.containerH - currentScrolled;
      header.style.transform = \`translateY(\${headerY}px)\`;
      top3.style.transform = \`translateY(\${headerY + demoState.headerH}px)\`;
      othersWrapper.style.transform = \`translateY(\${headerY + demoState.headerH + demoState.t3H + demoState.gap}px)\`;
      others.style.transform = 'translateY(0px)';
      othersWrapper.style.maskImage = 'none';
      othersWrapper.style.webkitMaskImage = 'none';
      
      let oldHeader = document.getElementById('demoHeaderOld');
      let oldTop3 = document.getElementById('demoTop3Old');
      let oldOthersWrapper = document.getElementById('demoOthersWrapperOld');
      if (oldHeader && oldTop3 && oldOthersWrapper) {
          let oldY = demoState.fixedHeaderY - currentScrolled;
          oldHeader.style.transform = \`translateY(\${oldY}px)\`;
          oldTop3.style.transform = \`translateY(\${oldY + demoState.headerH}px)\`;
          oldOthersWrapper.style.transform = \`translateY(\${oldY + demoState.headerH + demoState.t3H + demoState.gap}px)\`;
      }
    } else {
      let oldHeader = document.getElementById('demoHeaderOld');
      if (oldHeader) {
          oldHeader.remove();
          document.getElementById('demoTop3Old')?.remove();
          document.getElementById('demoOthersWrapperOld')?.remove();
      }
      
      header.style.transform = \`translateY(\${demoState.fixedHeaderY}px)\`;
`;

code = code.replace(/if \(currentScrolled < demoState\.dist1\) \{[\s\S]*?\} else \{[\s\S]*?header\.style\.transform = \`translateY\(\$\{demoState\.fixedHeaderY\}px\)\`;/, scrollReplacement.trim());

fs.writeFileSync('src/renderer/ui.ts', code);
