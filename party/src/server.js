// The Snake party room on Cloudflare: one Durable Object per room, through
// PartyServer. The rules are all in room.js; this file only connects them to
// real connections, a real clock and timers.
//
// No hibernation: a room stays awake while players are connected and keeps
// everything in memory, so nothing about a game is ever written down. The one
// exception is the finished leaderboard, kept in the room's storage for
// RESULTS_KEEP_MS so a player who left early can come back and see it, then
// deleted by an alarm.

import { Server } from 'partyserver';
import { RESULTS_KEEP_MS, Room } from './room.js';

export class SnakeParty extends Server {
  async onStart() {
    this.timer = null;
    this.room = new Room({
      now: () => Date.now(),
      send: (id, msg) => {
        try {
          this.getConnection(id)?.send(JSON.stringify(msg));
        } catch {
          // The connection went while we were talking; onClose tidies up.
        }
      },
      close: (id) => {
        try {
          this.getConnection(id)?.close(1000, 'bye');
        } catch {
          // already closed
        }
        this.room.disconnect(id);
      },
      wakeAt: (at) => {
        clearTimeout(this.timer);
        this.timer = at === null ? null : setTimeout(() => this.room.wake(), Math.max(0, at - Date.now()));
      },
      keepResults: (results) => {
        this.ctx.storage.put('results', results);
        this.ctx.storage.setAlarm(Date.now() + RESULTS_KEEP_MS);
      },
      dropResults: () => {
        this.ctx.storage.delete('results');
        this.ctx.storage.deleteAlarm();
      },
    });
    // The room may have slept since its round ended: the kept leaderboard is still shown.
    const kept = await this.ctx.storage.get('results');
    if (kept) this.room.restore(kept);
  }

  onConnect(connection) {
    this.room.connect(connection.id);
  }

  onMessage(connection, message) {
    // Only text is spoken here; anything else counts as a bad message.
    this.room.message(connection.id, typeof message === 'string' ? message : null);
  }

  onClose(connection) {
    this.room.disconnect(connection.id);
  }

  onError(connection) {
    this.room.disconnect(connection.id);
  }

  /** The kept leaderboard's time is up: it goes, and so does anyone still looking at it. */
  async onAlarm() {
    await this.ctx.storage.delete('results');
    for (const c of this.getConnections()) {
      try {
        c.close(1000, 'ended');
      } catch {
        // already closed
      }
    }
    this.room?.reset();
  }
}
