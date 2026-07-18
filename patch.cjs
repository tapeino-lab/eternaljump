const fs = require('fs');
let code = fs.readFileSync('src/ranking.js', 'utf8');
const resultRe = /showResult: async function\(state\) \{[\s\S]*?\},[\s]+showRanking: async function\(state\)/;
code = code.replace(resultRe, `showResult: async function(state) {
        this.isShowingResult = true;
        $('rankingLoading').style.display = 'none';
        $('rankingContainer').style.display = 'none';
        $('resultContainer').style.display = 'flex';
        $('rankingModal').style.display = 'flex';
        $('tapToStartMsg').style.display = 'none';
        setIgnoreNextTap(true);
        
        let title = '';
        let titleColor = '#fff';
        let titleAnim = '';
        if (state === 'clear') {
          title = 'CONGRATULATIONS!';
          titleColor = '#fff';
          titleAnim = 'superBlink 0.1s steps(1) infinite';
        } else if (state === 'gameover') {
          if (game.isNewRecord) {
            title = 'NEW RECORD!';
            titleColor = '#f0f';
            titleAnim = 'superBlink 0.3s steps(1) infinite';
          } else {
            title = 'TRY AGAIN!';
            titleColor = '#fff';
            titleAnim = '';
          }
        } else if (state === 'demo') {
          title = 'DEMO RESULT';
          titleColor = '#fff';
        }
        if (game.isBenchmarking) title = 'BENCHMARK';
        
        $('resultTitle').innerText = title;
        $('resultTitle').style.color = titleColor;
        $('resultTitle').style.animation = titleAnim;
        
        if (game.lastScoreObj) {
          if (game.isNewRecord && state === 'clear') {
            $('newRecordBadge').style.display = 'block';
          } else {
            $('newRecordBadge').style.display = 'none';
          }
          
          $('resultScoreAlt').innerText = game.lastScoreObj.alt + 'm';
          $('resultScoreCoins').innerHTML = '&times; ' + (game.lastScoreObj.coins || 0);
          
          let showBest = (!game.isNewRecord && game.personalBest);
          if (showBest) {
            $('bestScoreContainer').style.display = 'block';
            $('bestScoreAlt').innerText = game.personalBest.alt + 'm';
            $('bestScoreCoins').innerHTML = '&times; ' + (game.personalBest.coins || 0);
          } else {
            $('bestScoreContainer').style.display = 'none';
          }
        }
        
        setTimeout(() => {
          setIgnoreNextTap(false);
          $('tapToStartMsg').innerText = 'TAP TO RANKING';
          $('tapToStartMsg').style.display = 'block';
        }, 50);
      },
      showRanking: async function(state)`);
fs.writeFileSync('src/ranking.js', code);
