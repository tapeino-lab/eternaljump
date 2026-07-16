const fs = require('fs');
let code = fs.readFileSync('src/lootlocker.js', 'utf-8');

// Add hash function
const hashFn = `
function generateSignature(alt, coins, playTime, lang) {
  const salt = "E7eRn4L_JumP_Pr0t3ct10n";
  let str = alt + "_" + (coins || 0) + "_" + Math.floor(playTime / 1000) + "_" + lang + "_" + salt;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
      let char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
  }
  return hash.toString(36);
}
`;

code = code.replace("export const LootLockerAPI = {", hashFn + "\nexport const LootLockerAPI = {");

// Update submitScore signature and logic
code = code.replace("submitScore: async function(a, c, l) {", "submitScore: async function(a, c, l, t) {");
code = code.replace(
  "let meta = JSON.stringify({ alt: a, coins: c, lang: l });",
  "let sig = generateSignature(a, c, t, l);\n    let meta = JSON.stringify({ alt: a, coins: c, lang: l, t: Math.floor(t / 1000), sig: sig });"
);

// Update getScores to validate signature
code = code.replace(
  "let m = { alt: FLR(i.score / 1000), coins: i.score % 1000, lang: '---' };",
  "let m = { alt: FLR(i.score / 1000), coins: i.score % 1000, lang: '---', t: 0, sig: '' };"
);

// In getScores, after parsing metadata, we can validate. But wait!
// What if we just map and let the UI handle it? Or we can filter them out right here!
const parseMetaRegex = /try \{\s*if \(i\.metadata\) m = JSON\.parse\(i\.metadata\);\s*\} catch \(e\) \{\}/;
const validationLogic = `
        try {
          if (i.metadata) m = JSON.parse(i.metadata);
        } catch (e) {}
        
        // Simple sanity check & signature validation
        let isValid = true;
        if (m.sig) {
            let expectedSig = generateSignature(m.alt, m.coins, (m.t || 0) * 1000, m.lang);
            if (expectedSig !== m.sig) isValid = false;
        } else {
            // Old scores might not have sig, but let's say they are valid for backward compat?
            // Actually, we should probably mark invalid if they are ridiculous.
            if (m.alt > 1000 && (!m.t || m.t < 5)) isValid = false;
        }
        
        // Speed check: if height / time > 300 units per second, it's impossible.
        if (m.t && m.t > 0) {
            if (m.alt / m.t > 400) isValid = false;
        }
`;

code = code.replace(parseMetaRegex, validationLogic);

// Wait, filter out invalid ones!
const mapReturn = /return \{ id: i\.member_id, rank: i\.rank, alt: m\.alt, coins: m\.coins, lang: m\.lang \};/g;
code = code.replace(mapReturn, "return { id: i.member_id, rank: i.rank, alt: m.alt, coins: m.coins, lang: m.lang, valid: isValid };");

fs.writeFileSync('src/lootlocker.js', code);
