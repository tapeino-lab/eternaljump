global.window = {
    innerWidth: 800, innerHeight: 600, addEventListener: () => {}, URLSearchParams: class { get() { return null; } }, location: { search: '' }, gameScale: 1
};
global.document = {
    getElementById: () => ({ getContext: () => ({ createPattern: () => {}, fillRect: () => {}, save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, rotate: () => {}, beginPath: () => {}, arc: () => {}, fill: () => {}, globalAlpha: 1, drawImage: () => {}, fillText: () => {}, measureText: () => ({ width: 0 }), createLinearGradient: () => ({ addColorStop: () => {} }) }), appendChild: () => {}, style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }), addEventListener: () => {}, setAttribute: () => {} }),
    createElement: () => ({ getContext: () => ({ createPattern: () => {}, fillRect: () => {}, drawImage: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }) }), appendChild: () => {}, style: {} }),
    querySelectorAll: () => [], body: { classList: { add: () => {}, remove: () => {} } }, addEventListener: () => {}, visibilityState: 'visible'
};
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.Image = class { constructor() { this.src = ''; } };
global.performance = { now: () => 0 };
let _rAF = null;
global.requestAnimationFrame = (cb) => { _rAF = cb; };
global.setTimeout = () => {}; global.clearTimeout = () => {}; global.alert = () => {};

import('./src/game.js').then(async m => {
    let { getPl } = await import('./src/entities.js');
    m.initGame(false);
    m.game.state = 'playing'; m.game.isBenchmarking = true;
    m.game.player.y = 100;
    m.game.player.vy = 5;
    m.game.player.isFalling = true;
    m.game.platforms.push(getPl(110, 'super', false, m.game.player.x, 100, 20, 1, false));
    for(let i=0;i<100;i++) {
        _rAF(i*16);
    }
}).catch(e => { console.error("ERROR:", e); });
