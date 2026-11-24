// The Snake party Worker: routes /parties/snake-party/<room> to that room's
// Durable Object (server.js), after a few checks:
//   - browsers may only connect from the site itself (ALLOWED_ORIGINS), so
//     another page can't open rooms in a visitor's name
//   - room codes are what the site makes (ROOM_CODE)
//   - one address can't open connections without end (a per-minute cap)

import { routePartykitRequest } from 'partyserver';
import { SnakeParty } from './server.js';
// Room codes are made by the site; both sides share the format.
import { ROOM_CODE } from '../../components/house/partyLink.js';

export { SnakeParty };

const CONNECTS_PER_MINUTE = 30;
const recent = new Map(); // address -> [minute, count]; per Worker instance, a best-effort cap

function tooMany(address) {
  const minute = Math.floor(Date.now() / 60_000);
  const [m, n] = recent.get(address) ?? [minute, 0];
  const count = m === minute ? n + 1 : 1;
  recent.set(address, [minute, count]);
  if (recent.size > 10_000) recent.clear(); // never let the map grow without end
  return count > CONNECTS_PER_MINUTE;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') return new Response('Snake party: the rooms for the Snake game at bennyhinn.life.\n');

    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
    const response = await routePartykitRequest(request, env, {
      onBeforeConnect(req, { name }) {
        const origin = req.headers.get('Origin');
        // Browsers always send Origin; only the site's own pages may connect.
        if (origin && !allowed.includes(origin)) return new Response('Forbidden', { status: 403 });
        if (!ROOM_CODE.test(name)) return new Response('No such room', { status: 404 });
        if (tooMany(req.headers.get('CF-Connecting-IP') ?? 'local')) return new Response('Too many connections', { status: 429 });
        return undefined;
      },
      // Rooms are only for WebSocket connections.
      onBeforeRequest() {
        return new Response('Not found', { status: 404 });
      },
    });
    return response ?? new Response('Not found', { status: 404 });
  },
};
