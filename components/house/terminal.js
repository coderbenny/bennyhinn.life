// The terminal on the desk monitor: what each command prints. Pure: it gets
// the typed line and the data it needs, and returns lines to print and,
// for some commands, something for the caller to do (start Snake, clear the
// screen, walk away from the desk).
//
// Commands work with or without the slash: "/help" and "help" are the same.

import { CONTACTS } from '../../constants/contact.js';
import { EXPERIENCE } from '../../constants/experience.js';
import { ARTIST } from '../../constants/music.js';

export const PROMPT = 'benny@nairobi ~ $';

// Each line has a kind, which sets its colour on screen.
const out = (text) => ({ kind: 'out', text });
const accent = (text) => ({ kind: 'accent', text });
const dim = (text) => ({ kind: 'dim', text });
const error = (text) => ({ kind: 'error', text });

export const COMMANDS = [
  { name: 'help', about: 'list the commands' },
  { name: 'whoami', about: 'who I am, in a few lines' },
  { name: 'contact', about: 'how to reach me' },
  { name: 'snake', about: 'play Snake on this screen' },
  { name: 'party', about: 'race up to 4 friends at Snake' },
  { name: 'clear', about: 'clear the screen' },
  { name: 'exit', about: 'step back from the desk' },
];

export const WELCOME = [dim('Type /help to see what this terminal can do.')];

function help() {
  const width = Math.max(...COMMANDS.map((c) => c.name.length)) + 3;
  return [accent('Commands:'), ...COMMANDS.map((c) => out(`  /${c.name.padEnd(width)}${c.about}`))];
}

function whoami() {
  const current = EXPERIENCE.find((e) => e.current);
  return [
    accent('Benny Hinn Mathew'),
    out('Software engineer in Nairobi, building scalable,'),
    out('production-ready web systems.'),
    ...(current ? [out(`Now: ${current.title}, ${current.company.split(' • ')[0]}.`)] : []),
    out(`Makes music as ${ARTIST.name}.`),
  ];
}

function contact() {
  const width = Math.max(...CONTACTS.map((c) => c.label.length)) + 2;
  return [accent('Get in touch:'), ...CONTACTS.map((c) => out(`  ${c.label.padEnd(width)}${c.value}`))];
}

/**
 * Runs one typed line. Returns { lines, action } where action is one of
 * 'snake', 'party', 'clear', 'exit' or null.
 */
export function run(input) {
  const typed = input.trim();
  const shown = typed.length > 60 ? `${typed.slice(0, 60)}…` : typed;
  const echo = { kind: 'prompt', text: `${PROMPT} ${shown}` };
  if (!typed) return { lines: [echo], action: null };
  const name = typed.replace(/^\//, '').split(/\s+/)[0].toLowerCase();
  switch (name) {
    case 'help':
      return { lines: [echo, ...help()], action: null };
    case 'whoami':
      return { lines: [echo, ...whoami()], action: null };
    case 'contact':
      return { lines: [echo, ...contact()], action: null };
    case 'snake':
      return { lines: [echo, dim('Starting Snake... arrows or WASD to steer, Esc to stop.')], action: 'snake' };
    case 'party':
      return { lines: [echo, dim('Starting a Snake party... pick a name, then invite your friends.')], action: 'party' };
    case 'clear':
      return { lines: [], action: 'clear' };
    case 'exit':
      return { lines: [echo, dim('logout')], action: 'exit' };
    default:
      return { lines: [echo, error(`command not found: ${name.slice(0, 40)}`), dim('Type /help for the list.')], action: null };
  }
}
