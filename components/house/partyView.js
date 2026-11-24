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
