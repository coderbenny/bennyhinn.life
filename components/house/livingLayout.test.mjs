// Checks for the living-room TV. Run: npm run test:house
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { TV, PLAYER, PLAYER_DISTANCE_FACTOR, playerUrl, YOUTUBE_ORIGIN } from './livingLayout.js';
import { YOUTUBE_PLAYLIST } from '../../constants/music.js';

// The player is exactly as wide as the screen: drei maps a CSS pixel to distanceFactor / 400 metres.
assert.ok(Math.abs(PLAYER.width * (PLAYER_DISTANCE_FACTOR / 400) - TV.width) < 1e-9);
assert.ok(Math.abs(PLAYER.width / PLAYER.height - TV.width / TV.height) < 0.01, 'player and screen are both 16:9');
assert.ok(Math.abs(Math.hypot(TV.width, TV.height) / 0.0254 - 50) < 0.5, 'a 50-inch picture');
// The address: privacy-enhanced embed, the whole playlist, controllable by messages.
const url = new URL(playerUrl(YOUTUBE_PLAYLIST.id, { muted: false, origin: 'https://bennyhinn.life' }));
assert.equal(url.origin, YOUTUBE_ORIGIN);
assert.equal(url.pathname, '/embed/videoseries');
assert.equal(url.searchParams.get('list'), YOUTUBE_PLAYLIST.id);
assert.equal(url.searchParams.get('enablejsapi'), '1');
assert.equal(url.searchParams.get('origin'), 'https://bennyhinn.life');
assert.equal(url.searchParams.get('mute'), '0');
assert.equal(new URL(playerUrl('x', { muted: true, origin: 'o' })).searchParams.get('mute'), '1');
assert.match(YOUTUBE_PLAYLIST.id, /^PL[\w-]{16,}$/);
assert.ok(!YOUTUBE_PLAYLIST.url.includes('si='), 'no share-tracking code in the link');
assert.ok(existsSync('public/house/tv-poster.webp'), 'missing the TV poster: run npm run house:tv');
console.log('tv: all checks passed');
