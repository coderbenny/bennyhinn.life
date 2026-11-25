// Drawing a Snake party board: your snake, the fruit, the "+1"/"+3" pops and
// the crash screen. Shared by the desk monitor (DeskMonitor.js) and the big
// board phones get during a race (PhoneBoard in PartyRace.js). Sizes follow
// the cell size, so it reads the same at any scale.

import { GRID } from './snake';

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export function fruit(ctx, x, y, cell, golden, steps) {
  if (golden) {
    const pulse = 0.5 + 0.5 * Math.sin(steps * 0.9);
    ctx.fillStyle = `rgba(255, 196, 64, ${0.18 + 0.22 * pulse})`;
    ctx.beginPath();
    ctx.arc(x, y, cell * (0.62 + 0.12 * pulse), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = golden ? '#ffc940' : '#ff7b72';
  ctx.beginPath();
  ctx.arc(x, y, cell * (golden ? 0.42 : 0.38), 0, Math.PI * 2);
  ctx.fill();
}

/**
 * The board at (ox, oy), `cell` pixels a square.
 * game   your game (partyPlay), or null when only watching
 * color  your colour
 * pops   the fruit just eaten, with when ({ x, y, text, golden, at })
 * now    the room's clock
 */
export function drawBoard(ctx, { game, color, pops = [], now, ox, oy, cell, mono = MONO }) {
  const k = cell / 26; // the monitor's cell size is the reference
  const w = cell * GRID.cols;
  const h = cell * GRID.rows;
  if (!game) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8b949e';
    ctx.font = `600 ${30 * k}px ${mono}`;
    ctx.fillText('watching the race', ox + w / 2, oy + h / 2);
    ctx.textAlign = 'left';
    return;
  }
  if (game.food) fruit(ctx, ox + (game.food[0] + 0.5) * cell, oy + (game.food[1] + 0.5) * cell, cell, game.golden, game.steps);
  const pad = Math.max(1, 1.5 * k);
  game.snake.forEach(([x, y], i) => {
    ctx.fillStyle = color;
    ctx.globalAlpha = i === 0 ? 1 : Math.max(0.45, 0.95 - i * 0.012);
    ctx.fillRect(ox + x * cell + pad, oy + y * cell + pad, cell - 2 * pad, cell - 2 * pad);
  });
  ctx.globalAlpha = 1;
  // Head: a bright cap so you can always find it.
  const [hx, hy] = game.snake[0];
  ctx.fillStyle = '#ffffffcc';
  ctx.fillRect(ox + hx * cell + cell * 0.3, oy + hy * cell + cell * 0.3, cell * 0.4, cell * 0.4);
  // +1 / +3 rising from where the fruit was.
  ctx.textAlign = 'center';
  for (const p of pops) {
    const age = (now - p.at) / 700;
    ctx.globalAlpha = Math.max(0, 1 - age);
    ctx.fillStyle = p.golden ? '#ffc940' : '#f0f6fc';
    ctx.font = `800 ${(p.golden ? 40 : 30) * k}px ${mono}`;
    ctx.fillText(p.text, ox + (p.x + 0.5) * cell, oy + p.y * cell - age * 40 * k);
  }
  ctx.globalAlpha = 1;
  if (game.over) {
    ctx.fillStyle = 'rgba(13, 17, 23, 0.72)';
    ctx.fillRect(ox, oy, w, h);
    ctx.fillStyle = game.reason === 'time' ? '#7ee787' : '#ff7b72';
    ctx.font = `800 ${64 * k}px ${mono}`;
    ctx.fillText(game.reason === 'time' ? 'TIME!' : 'CRASHED', ox + w / 2, oy + h / 2 - 6 * k);
    ctx.fillStyle = '#c9d1d9';
    ctx.font = `600 ${28 * k}px ${mono}`;
    ctx.fillText(`${game.score} points · watching the others`, ox + w / 2, oy + h / 2 + 42 * k);
  }
  ctx.textAlign = 'left';
}
