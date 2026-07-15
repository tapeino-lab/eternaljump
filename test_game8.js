global.window = {
    innerWidth: 800, innerHeight: 600, addEventListener: () => {}, URLSearchParams: class { get() { return null; } }, location: { search: '' }, gameScale: 1
};
global.document = {
    getElementById: () => ({ getContext: () => ({ createPattern: () => {}, fillRect: () => {}, save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, drawImage: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }), fillText: () => {}, measureText: () => ({ width: 0 }) }), appendChild: () => {}, style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }), addEventListener: () => {}, setAttribute: () => {} }),
    createElement: () => ({ getContext: () => ({ createPattern: () => {}, fillRect: () => {}, drawImage: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }) }), appendChild: () => {}, style: {} }),
    querySelectorAll: () => [], body: { classList: { add: () => {}, remove: () => {} } }, addEventListener: () => {}, visibilityState: 'visible'
};
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.Image = class { constructor() { this.src = ''; } };
global.performance = { now: () => 0 };
let _rAF = null;
global.requestAnimationFrame = (cb) => { _rAF = cb; };
global.setTimeout = () => {}; global.clearTimeout = () => {}; global.alert = () => {};

import('./src/game.js').then(m => {
    m.initGame(false);
    m.game.state = 'playing';
    m.game.player.y = 100;
    m.game.player.vy = 5;
    m.game.player.isFalling = true;
    m.game.platforms.push({
        x: m.game.player.x, y: 110, w: 100, h: 20, type: 'super', count: 1, squishTimers: [0], breakOnSquish: [false]
    });
    for(let i=0;i<10;i++) {
        _rAF(i*16);
    }
}).catch(e => { console.error("ERROR:", e); });
