// Time on the walls of the house: Nairobi's clock and the month on the wall
// calendar. Nairobi is on East Africa Time, UTC+3 all year (no daylight
// saving), so its time is UTC shifted by three hours.

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Nairobi's wall-clock time for an instant: { year, month (0-11), day, weekday (0 = Sunday), hours, minutes, seconds }. */
export function nairobiTime(date) {
  const d = new Date(date.getTime() + EAT_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    seconds: d.getUTCSeconds() + d.getUTCMilliseconds() / 1000,
  };
}

/** The angles of the clock's hands, in radians clockwise from twelve. */
export function handAngles({ hours, minutes, seconds }) {
  const turn = Math.PI * 2;
  return {
    hour: (((hours % 12) + minutes / 60 + seconds / 3600) / 12) * turn,
    minute: ((minutes + seconds / 60) / 60) * turn,
    second: (Math.floor(seconds) / 60) * turn, // a quartz tick, once a second
  };
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;

/**
 * A month as a wall calendar prints it: weeks of seven days, Monday first,
 * with null where the month has not started or has ended.
 */
export function monthGrid(year, month) {
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 = Sunday
  const lead = (firstWeekday + 6) % 7; // days before the 1st, Monday first
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** The contributions in one month, from public/house/contributions.json's days. */
export function monthTotal(days, year, month) {
  let total = 0;
  for (const [key, d] of Object.entries(days ?? {})) {
    if (key.startsWith(`${year}-${pad(month + 1)}-`)) total += d.count;
  }
  return total;
}
