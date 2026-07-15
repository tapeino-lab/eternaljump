global.window = { innerWidth: 800, innerHeight: 600, addEventListener: () => {}, URLSearchParams: class { get() { return null; } }, location: { search: '' }, gameScale: 1 };
global.document = {
    getElementById: () => ({ getContext: () => ({ createPattern: () => {}, fillRect: () => {}, save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, rotate: () => {}, globalAlpha: 1, drawImage: () => {}, fillText: () => {}, measureText: () => ({ width: 0 }), beginPath: () => {}, arc: () => {}, fill: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }) }), appendChild: () => {}, style: {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }), addEventListener: () => {}, setAttribute: () => {} }),
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
    let { config } = await import('./src/config.js');
    m.initGame(false);
    m.game.state = 'playing';
    m.game.isBenchmarking = false;
    
    // Jump on super platform!
    let sp = m.game.platforms.find(p => p.type === 'super');
    m.game.player.y = sp.y - m.game.player.h;
    m.game.player.x = sp.x;
    m.game.player.vy = 0; // land
    m.game.highestPlayerY = m.game.player.y;
    
    // Simulate landing
    m.game.player.jump(config.superJumpPower);
    console.time("100 frames");
    for(let i=0;i<100;i++) {
        _rAF(i*16.6);
    }
    console.timeEnd("100 frames");
    console.log(`y=${m.game.player.y}, vy=${m.game.player.vy}, platforms=${m.game.platforms.length}, particles=${m.game.particles.length}`);
}).catch(e => { console.error("ERROR:", e); });
