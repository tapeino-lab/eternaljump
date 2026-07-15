global.window = {}; global.document = {}; global.localStorage = { getItem: () => null }; global.Image = class {};
import('./src/ranking.js').then(m => {
    console.log("RankingAPI methods:", Object.keys(m.RankingAPI));
}).catch(e => console.error(e));
