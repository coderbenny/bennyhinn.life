// The Snake party's leaderboard as a picture to keep: nothing about a party
// is stored, so players download (or share) this before the room closes.
// 1080 x 1350, the shape Instagram and WhatsApp statuses show whole.
// Browser only.

import { REASONS, medal } from './partyView';

const W = 1080;
const H = 1350;
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const short = (name, n) => ([...name].length > n ? `${[...name].slice(0, n - 1).join('')}…` : name);
const lasted = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

/** Draws the results; resolves a PNG Blob. */
export function resultsImage(results, code) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  // Night-blue, with a glow behind the winner.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d1117');
  bg.addColorStop(1, '#161b22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const winner = results.ranking[0];
  if (winner) {
    const glow = ctx.createRadialGradient(W / 2, 360, 20, W / 2, 360, 520);
    glow.addColorStop(0, `${winner.color}55`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }
  // A border of snake squares in everyone's colours.
  const colours = results.ranking.map((r) => r.color);
  for (let i = 0; i < 54; i++) {
    ctx.fillStyle = colours[i % colours.length] ?? '#3fb950';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(i * 20, 0, 16, 16);
    ctx.fillRect(W - 16 - i * 20, H - 16, 16, 16);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#7ee787';
  ctx.font = `800 84px ${MONO}`;
  ctx.fillText('SNAKE PARTY', W / 2, 150);
  ctx.fillStyle = '#8b949e';
  ctx.font = `500 30px ${MONO}`;
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(`${date} · round ${results.round} · ${results.ranking.length} players`, W / 2, 205);

  if (winner) {
    ctx.font = `110px ${SANS}`;
    ctx.fillText('👑', W / 2, 340);
    ctx.fillStyle = '#f0f6fc';
    ctx.font = `800 76px ${SANS}`;
    ctx.fillText(short(winner.name, 14), W / 2, 440);
    ctx.fillStyle = winner.color;
    ctx.font = `800 44px ${MONO}`;
    ctx.fillText(`${winner.score} points`, W / 2, 500);
  }

  // Everyone, in order, then the awards: the block sits in the middle of the space left.
  const awards = [
    [results.awards.golden, '🍯 Most golden', (r) => `${r.golden}`],
    [results.awards.longest, '🐍 Longest snake', (r) => `${r.length}`],
    [results.awards.survivor, '⏱ Lasted longest', (r) => lasted(r.lastedMs)],
  ]
    .map(([id, label, detail]) => {
      const r = results.ranking.find((x) => x.id === id);
      return r && { label, r, detail: detail(r) };
    })
    .filter(Boolean);
  const block = results.ranking.length * 112 + (awards.length ? 40 + awards.length * 58 : 0);
  let y = 560 + Math.max(0, (H - 140 - 560 - block) / 2);
  for (const r of results.ranking) {
    roundRect(ctx, 90, y, W - 180, 96, 20);
    ctx.fillStyle = r.place === 1 ? `${r.color}33` : '#ffffff0d';
    ctx.fill();
    ctx.fillStyle = r.color;
    roundRect(ctx, 90, y, 14, 96, 7);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.font = `48px ${SANS}`;
    ctx.fillStyle = '#f0f6fc';
    ctx.fillText(medal(r.place), 130, y + 64);
    ctx.font = `700 42px ${SANS}`;
    ctx.fillText(short(r.name, 14), 220, y + 52);
    ctx.font = `500 24px ${SANS}`;
    ctx.fillStyle = '#8b949e';
    const golden = r.golden ? ` · ${r.golden} golden` : '';
    ctx.fillText(`${REASONS[r.reason] ?? ''} · ${lasted(r.lastedMs)}${golden}`, 220, y + 82);
    ctx.textAlign = 'right';
    ctx.fillStyle = r.color;
    ctx.font = `800 52px ${MONO}`;
    ctx.fillText(String(r.score), W - 125, y + 66);
    y += 112;
  }
  y += 40;
  for (const a of awards) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8b949e';
    ctx.font = `500 32px ${SANS}`;
    ctx.fillText(a.label, 130, y + 36);
    ctx.textAlign = 'right';
    ctx.fillStyle = a.r.color;
    ctx.font = `700 34px ${SANS}`;
    ctx.fillText(`${short(a.r.name, 12)} · ${a.detail}`, W - 130, y + 36);
    y += 58;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8b949e';
  ctx.font = `500 30px ${SANS}`;
  ctx.fillText('Play at bennyhinn.life: /party on the desk terminal', W / 2, H - 70);
  ctx.fillStyle = '#30363d';
  ctx.font = `500 22px ${MONO}`;
  ctx.fillText(`room ${code}`, W / 2, H - 36);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Saves the picture: a download on laptops; on phones the share sheet can save it to Photos. */
export async function downloadResults(results, code) {
  const blob = await resultsImage(results, code);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `snake-party-${code}-round-${results.round}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

/** Shares the picture and the ranking as text where the browser can; else copies the text. */
export async function shareResults(results, code, text) {
  try {
    const blob = await resultsImage(results, code);
    const file = blob && new File([blob], `snake-party-${code}.png`, { type: 'image/png' });
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text, title: 'Snake party' });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ text, title: 'Snake party' });
      return 'shared';
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
