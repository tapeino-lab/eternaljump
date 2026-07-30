function drawRod(dH: number, vS: number, vOy: number, imgKey: string) {
  if (!game.equipped?.['rod']) return;
  if (imgKey !== 'jmp' && imgKey !== 'pwr') return;

  // The hand is at the top corner of the direction they are facing.
  // In the context, positive X is the facing direction (due to ctx.scale(-1, 1) if facing left).
  // The sprite bounding box is from x: -w/2 to w/2, y: -dH to 0.
  // So the top corner is roughly x: w/2 - 2, y: -dH + 2.
}
