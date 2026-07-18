const fs = require('fs');
let code = fs.readFileSync('src/ranking.js', 'utf8');
const rankingRe = /showRanking: async function\(state\) \{[\s\S]*?\},[\s]+reset: function\(\)/;
code = code.replace(rankingRe, `showRanking: async function(state) {
        this.isShowingResult = false;
        $('resultContainer').style.display = 'none';
        $('rankingContainer').style.display = 'none';
        $('rankingLoading').style.display = 'block';
        $('rankingModal').style.display = 'flex';
        setIgnoreNextTap(true);
        let s = await this.getScores();
        let pid = LootLockerAPI.playerIdentifier;
        let pIdVal = LootLockerAPI.playerId ? String(LootLockerAPI.playerId) : null;
        let pRank = s.find(x => x.id === pid || (pIdVal && x.id === pIdVal));
        if (pRank) game.lastRank = pRank.rank;
        
        let isEnd = (state === 'clear' || state === 'gameover' || state === 'demo');
        
        let curLen = s.length;
        for (let i = 0; i < 10 - curLen; i++) s.push({ rank: curLen + i + 1, alt: 2000, coins: 0, lang: 'CPU', n: 'CPU --' });
        let top10 = s.slice(0, 10);
        let hl = false;
        
        let tbodyHTML = '';
        top10.forEach((r, i) => {
            let isC = (r.id === pid || (pIdVal && r.id === pIdVal));
            if (isC) hl = true;
            let bg = isC ? 'animation:rowBlink 1s infinite;font-weight:bold;' : '';
            let m = '';
            if (i === 0) m = '<span class="mdl mdl-1"></span>';
            else if (i === 1) m = '<span class="mdl mdl-2"></span>';
            else if (i === 2) m = '<span class="mdl mdl-3"></span>';
            
            let nVal = r.n || '--- ??';
            let lang = '---';
            let name = '??';
            if (nVal.includes(' ')) {
                let parts = nVal.split(' ');
                lang = parts[0] || '---';
                name = parts[1] || '??';
            } else if (nVal.length >= 3) {
                lang = nVal.substring(0, 3);
                name = nVal.substring(3) || '??';
            }
            if (lang === '???' || lang === '---') {
                if (r.lang && r.lang !== '---') lang = r.lang;
            }
            if (lang.length > 3) lang = lang.substring(0, 3);
            if (name.length > 2) name = name.substring(0, 2);
            tbodyHTML += \`<tr style="border-bottom:1px dashed #333;\${bg}"><td style="padding:4px 0 4px 4px;text-align:left;width:24px;white-space:nowrap;overflow:hidden;">\${m}\${i + 1}</td><td style="padding:4px 0;text-align:center;width:32px;white-space:nowrap;overflow:hidden;font-size:8px;">\${escapeHTML(lang)}</td><td style="width:4px;padding:0;"></td><td style="padding:4px 0;text-align:center;width:32px;white-space:nowrap;overflow:hidden;font-size:8px;">\${escapeHTML(name)}</td><td style="padding:4px 0;text-align:right;white-space:nowrap;overflow:hidden;">\${escapeHTML(r.alt)}m</td><td style="padding:4px 4px 4px 0;text-align:right;width:32px;color:#ffb;white-space:nowrap;overflow:hidden;">\${escapeHTML(r.coins || 0)}</td></tr>\`;
        });
        
        $('rankingTableBody').innerHTML = tbodyHTML;
        
        if (!hl && pRank && pRank.rank > 10) {
            let r = pRank;
            let rRank = pRank.rank;
            let rLang = '---';
            let rName = '??';
            let rnVal = r.n || '--- ??';
            if (rnVal.includes(' ')) {
                let parts = rnVal.split(' ');
                rLang = parts[0] || '---';
                rName = parts[1] || '??';
            } else if (rnVal.length >= 3) {
                rLang = rnVal.substring(0, 3);
                rName = rnVal.substring(3) || '??';
            }
            if (rLang === '???' || rLang === '---') {
                if (r.lang && r.lang !== '---') rLang = r.lang;
            }
            if (rLang.length > 3) rLang = rLang.substring(0, 3);
            if (rName.length > 2) rName = rName.substring(0, 2);
            
            $('pRankNum').innerText = rRank;
            $('pRankLang').innerText = escapeHTML(rLang);
            $('pRankName').innerText = escapeHTML(rName);
            $('pRankAlt').innerText = escapeHTML(r.alt) + 'm';
            $('pRankCoins').innerText = escapeHTML(r.coins || 0);
            $('playerRankContainer').style.display = 'block';
        } else {
            $('playerRankContainer').style.display = 'none';
        }
        
        $('rankingLoading').style.display = 'none';
        $('rankingContainer').style.display = 'flex';
        
        setTimeout(() => {
          setIgnoreNextTap(false);
          if (isEnd) {
            $('tapToStartMsg').innerText = 'TAP TO START';
          } else {
            $('tapToStartMsg').innerText = 'TAP TO CLOSE';
          }
          $('tapToStartMsg').style.display = 'block';
        }, 50);
      },
      reset: function()`);
fs.writeFileSync('src/ranking.js', code);
