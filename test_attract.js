import('./src/game.js').then(m => {
    // startAttractCycle isn't exported, but maybe we can trigger a click on document?
    console.log("We can't easily test internal functions without exporting.");
});
