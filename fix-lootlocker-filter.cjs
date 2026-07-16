const fs = require('fs');
let code = fs.readFileSync('src/lootlocker.js', 'utf-8');

// Replace the map with map + filter + re-rank
code = code.replace(/return d\.items\.map\(i => \{[\s\S]*?valid: isValid \};\s*\}\);/, `
      let validItems = [];
      d.items.forEach(i => {
        let m = { alt: FLR(i.score / 1000), coins: i.score % 1000, lang: '---', t: 0, sig: '' };
        try {
          if (i.metadata) m = JSON.parse(i.metadata);
        } catch (e) {}
        
        let isValid = true;
        if (m.sig) {
            let expectedSig = generateSignature(m.alt, m.coins, (m.t || 0) * 1000, m.lang);
            if (expectedSig !== m.sig) isValid = false;
        } else {
            // For backward compatibility, allow old scores if they look reasonable
            if (m.alt > 30000 && !m.t) isValid = false;
        }
        
        // Impossible speed check (e.g. 400m per second)
        if (m.t && m.t > 0) {
            if (m.alt / m.t > 400) isValid = false;
        }
        
        if (isValid) {
           validItems.push({ id: i.member_id, _originalRank: i.rank, alt: m.alt, coins: m.coins, lang: m.lang });
        }
      });
      
      // Re-assign ranks based on filtered list
      validItems.forEach((v, idx) => {
         v.rank = idx + 1;
      });
      
      return validItems;
`);

fs.writeFileSync('src/lootlocker.js', code);
