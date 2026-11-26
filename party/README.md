# Snake party: the room server

The multiplayer rooms for Snake on the desk monitor at bennyhinn.life: up to five players race the same game, each on their own screen, then see a leaderboard.

One [Cloudflare Durable Object](https://developers.cloudflare.com/durable-objects/) per room, through [PartyServer](https://github.com/cloudflare/partykit). It runs on Cloudflare's free plan.

- `src/room.js`: the rules (lobby, host, countdown, the 3-minute bell, replaying every player's turns with `components/house/snake.js` so scores can't be faked, results). No network code, so it is tested with a fake clock: `src/room.test.mjs`.
- `src/server.js`: connects the rules to PartyServer. Rooms live in memory while players are connected; only the finished leaderboard is kept, for 10 minutes.
- `src/index.js`: the Worker. Only the site's own pages may connect (`ALLOWED_ORIGINS` in `wrangler.jsonc`), room codes must be 8 characters from the site's alphabet, and one address may open at most 30 connections a minute.

## Keeping it within the free plan

On Cloudflare's free plan, misuse can't run up a bill: at the daily limit the rooms stop working until 00:00 UTC. The risk is an outage, and the limits below are there to prevent it. What costs the most is time a room stays awake (an open connection keeps it in memory), so nothing may hold a room open without playing:

| Limit | Where |
|---|---|
| Only the site's pages may connect; no `Origin` header (a script) gets 403 | `src/index.js` |
| Room codes must be in the site's format | `src/index.js` |
| 30 connections a minute per address (per Worker instance, best effort) | `src/index.js` |
| A connection must say hello within 10 s, or it's closed | `src/room.js` `HELLO_MS` |
| 12 connections per room at most | `src/room.js` `MAX_CONNECTIONS` |
| A lobby nobody starts closes after 20 min | `src/room.js` `LOBBY_MS` |
| 30 messages a second, 16 KB a message, per connection | `src/room.js` |
| A round ends at the 3-minute bell; the leaderboard goes after 10 min | `src/room.js` |
| When a room ends, players are told (`ended`/`idle`) so their pages don't reconnect and open it again | `src/room.js`, `components/house/partyStore.js` |

Set once in the Cloudflare dashboard (it isn't in code): **Security → WAF → Rate limiting rules**, one rule (the free plan allows one): *Hostname equals `party.bennyhinn.life`*, counted by IP, **20 requests per 10 seconds**, action **Block** for 10 seconds. Cloudflare drops blocked requests before they reach the Worker, so they don't count toward its limits. Each player's connection is one request (messages over it don't count), so 5 friends on one Wi-Fi stay well under it.

To test against `npm run dev` from a script, send `Origin: http://localhost:3000`.

```bash
npm install
npm test          # the rules
npm run dev       # a local room server on http://localhost:8787
npm run deploy    # needs `npx wrangler login` once
```

Players connect to `wss://<host>/parties/snake-party/<room code>` and speak JSON: `hello`, `start`, `moves`, `stay`, `leave`, `rematch` and `ping` in; `welcome`, `state` (with live `events`), `resend`, `pong` and `error` out. See the comments in `src/room.js`.
