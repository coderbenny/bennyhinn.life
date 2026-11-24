# Snake party: the room server

The multiplayer rooms for Snake on the desk monitor at bennyhinn.life: up to five players race the same game, each on their own screen, then see a leaderboard.

One [Cloudflare Durable Object](https://developers.cloudflare.com/durable-objects/) per room, through [PartyServer](https://github.com/cloudflare/partykit). It runs on Cloudflare's free plan.

- `src/room.js`: the rules (lobby, host, countdown, the 3-minute bell, replaying every player's turns with `components/house/snake.js` so scores can't be faked, results). No network code, so it is tested with a fake clock: `src/room.test.mjs`.
- `src/server.js`: connects the rules to PartyServer. Rooms live in memory while players are connected; only the finished leaderboard is kept, for 10 minutes.
- `src/index.js`: the Worker. Only the site's own pages may connect (`ALLOWED_ORIGINS` in `wrangler.jsonc`), room codes must be 8 characters from the site's alphabet, and one address may open at most 30 connections a minute.

```bash
npm install
npm test          # the rules
npm run dev       # a local room server on http://localhost:8787
npm run deploy    # needs `npx wrangler login` once
```

Players connect to `wss://<host>/parties/snake-party/<room code>` and speak JSON: `hello`, `start`, `moves`, `stay`, `leave`, `rematch` and `ping` in; `welcome`, `state` (with live `events`), `resend`, `pong` and `error` out. See the comments in `src/room.js`.
