// What the Snake party shows, worked out from the room's state: pure, so it
// can be checked without a browser (party.test.mjs).

export const MAX_PLAYERS_SHOWN = 5;
export const GO_MS = 900; // how long "GO!" stays up after the start

/**
 * The countdown's number at `now`: 3, 2, 1 before the start, 0 ("GO!") just
 * after it, -1 once the round is under way.
 */
export function countdownAt(startAt, now) {
  if (!startAt) return -1;
  const left = startAt - now;
  if (left > 0) return Math.min(3, Math.ceil(left / 1000));
  return -left < GO_MS ? 0 : -1;
}

/** Milliseconds left in the round at `now` (never below 0); null outside one. */
export function timeLeft(endsAt, now) {
  return endsAt ? Math.max(0, endsAt - now) : null;
}

/** The bell's final seconds: 10, 9, ... 1 in the last ten seconds, else null. */
export function finalSeconds(endsAt, now) {
  const left = timeLeft(endsAt, now);
  if (left === null || left <= 0 || left > 10_000) return null;
  return Math.ceil(left / 1000);
}

/** "2:47" */
export function clock(ms) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The live ranking: everyone in the round by score (yours from your own
 * screen, which is a moment ahead of the room's), players still going above
 * those who are out on a tie, then joining order. Each row gets its place.
 */
export function liveRanking(players, you = null, yourScore = null) {
  const rows = players
    .map((p, joined) => ({ ...p, joined, score: p.id === you && yourScore !== null ? Math.max(yourScore, p.score) : p.score }))
    .sort((a, b) => b.score - a.score || Number(b.status === 'playing') - Number(a.status === 'playing') || a.joined - b.joined);
  // Equal scores share a place.
  let place = 0;
  return rows.map((r, i) => {
    if (i === 0 || r.score !== rows[i - 1].score) place = i + 1;
    return { ...r, place };
  });
}

/** Medals for the first three places. */
export const MEDALS = ['🥇', '🥈', '🥉'];
export const medal = (place) => MEDALS[place - 1] ?? `${place}.`;

/**
 * The leaderboard's reveal, as a drumroll: last place first, the winner
 * last. Returns how many rows (counted from the bottom) show after `ms`.
 */
export const REVEAL_MS = 750;
export function revealed(count, ms) {
  return Math.max(0, Math.min(count, Math.floor(ms / REVEAL_MS) + 1));
}

/** Why a player's round ended, in a few words. */
export const REASONS = { wall: 'hit the wall', self: 'bit their tail', time: 'made it to the bell', full: 'filled the board', left: 'left early' };

/** The results as text, for sharing. */
export function resultsText(results) {
  const lines = results.ranking.map((r) => `${medal(r.place)} ${r.name}: ${r.score}`);
  return `🐍 Snake party at bennyhinn.life\n${lines.join('\n')}`;
}
