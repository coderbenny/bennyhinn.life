// Snake party links: room codes, tokens and the invite address. Pure, and
// shared with the room server (party/src/index.js), so both sides agree on
// what a room code looks like.

/** Room codes: 8 characters from an alphabet without look-alikes (no 0/o, 1/l/i). */
export const CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';
export const CODE_LENGTH = 8;
export const ROOM_CODE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

export const isRoomCode = (code) => typeof code === 'string' && ROOM_CODE.test(code);

/** A fresh room code from the secure random generator (31^8: about 850 billion codes). */
export function newRoomCode() {
  const bytes = new Uint8Array(CODE_LENGTH * 2);
  globalThis.crypto.getRandomValues(bytes);
  let code = '';
  // Rejection sampling: a byte only counts below the largest multiple of 31
  // that fits, so every character is equally likely.
  const limit = 256 - (256 % CODE_ALPHABET.length);
  for (const b of bytes) {
    if (code.length === CODE_LENGTH) break;
    if (b < limit) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  }
  return code.length === CODE_LENGTH ? code : newRoomCode();
}

/** A player's secret for one room (proves "I'm the same player" after a reload). */
export function newToken() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The invite: the house, straight to the desk monitor, into the party. */
export const inviteUrl = (origin, code) => `${origin}/?room=monitor&party=${code}`;

/** The party in an address's query, if it names a well-formed one. */
export function partyFromSearch(search) {
  try {
    const code = new URLSearchParams(search).get('party');
    return isRoomCode(code) ? code : null;
  } catch {
    return null;
  }
}

/** What goes with the link when it's shared (WhatsApp and the like). */
export const shareText = (hostName) =>
  hostName ? `${hostName} invites you to a game of Snake at bennyhinn.life. Up to 5 players, 3 minutes. Join:` : 'A game of Snake at bennyhinn.life. Up to 5 players, 3 minutes. Join:';

/** The party name the room server routes on (SnakeParty, kebab-cased by PartyServer). */
export const PARTY_NAME = 'snake-party';
