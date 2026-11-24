'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SCREEN } from './deskLayout';
import { GRID } from './snake';
import { PROMPT } from './terminal';
import { useTerminal } from './TerminalInput';
import { useParty } from './PartyPanel';
import { serverNow } from './partyStore';
import { MAX_PLAYERS_SHOWN, countdownAt } from './partyView';

// The monitor on the desk: a terminal. It opens on the site's latest commit;
// walking up to it, visitors can type commands (/help lists them) and play
// Snake. The state lives in terminalStore.js; this draws it.

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SCREEN_LIGHT = 0.95;
const CLICK_SLOP_PX = 6;
const BLINK_MS = 530;
const COLOURS = {
  prompt: '#c9d1d9',
  commit: '#e3b341',
  out: '#c9d1d9',
  accent: '#7ee787',
  dim: '#8b949e',
  error: '#ff7b72',
  blank: '#c9d1d9',
};

function titleBar(ctx, w, title) {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, w, ctx.canvas.height);
  ctx.fillStyle = '#1b2230';
  ctx.fillRect(0, 0, w, 58);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(36 + i * 34, 29, 10, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#8b949e';
  ctx.font = `500 26px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 38);
  ctx.textAlign = 'left';
}

/** A prompt's user and host in green, like the shell would colour them. */
function promptLine(ctx, x, y, text) {
  const [user] = PROMPT.split(' ');
  if (!text.startsWith(user)) {
    ctx.fillText(text, x, y);
    return;
  }
  ctx.fillStyle = COLOURS.accent;
  ctx.fillText(user, x, y);
  const after = x + ctx.measureText(user).width;
  ctx.fillStyle = COLOURS.prompt;
  ctx.fillText(text.slice(user.length), after, y);
}

function drawShell(ctx, t, cursorOn) {
  const { width: w, height: h } = ctx.canvas;
  titleBar(ctx, w, 'bennyhinn.life — zsh');
  const pad = 36;
  const size = 28;
  const lineH = 40;
  ctx.font = `400 ${size}px ${MONO}`;
  ctx.textBaseline = 'alphabetic';
  const rows = Math.floor((h - 58 - 30) / lineH);
  const typed = `${PROMPT} ${t.input}`;
  const shown = [...t.lines, { kind: 'prompt', text: typed, current: true }].slice(-rows);
  let y = 58 + lineH;
  for (const l of shown) {
    ctx.fillStyle = COLOURS[l.kind] ?? COLOURS.out;
    if (l.kind === 'prompt') promptLine(ctx, pad, y, l.text);
    else ctx.fillText(l.text, pad, y, w - 2 * pad);
    if (l.current && cursorOn) {
      ctx.fillStyle = '#c9d1d9';
      ctx.fillRect(pad + ctx.measureText(l.text).width + 4, y - size + 4, 15, size);
    }
    y += lineH;
  }
}

function drawSnake(ctx, t) {
  const { width: w, height: h } = ctx.canvas;
  titleBar(ctx, w, `snake — ${t.game.score} points · best ${t.best}`);
  const top = 70;
  const cell = Math.min((w - 40) / GRID.cols, (h - top - 16) / GRID.rows);
  const ox = (w - cell * GRID.cols) / 2;
  const oy = top + (h - top - 16 - cell * GRID.rows) / 2;
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox - 2, oy - 2, cell * GRID.cols + 4, cell * GRID.rows + 4);
  const { snake, food, golden, over } = t.game;
  if (food) {
    const fx = ox + (food[0] + 0.5) * cell;
    const fy = oy + (food[1] + 0.5) * cell;
    if (golden) {
      // A golden fruit (worth GOLDEN.points): a halo that breathes with the steps.
      const pulse = 0.5 + 0.5 * Math.sin(t.game.steps * 0.9);
      ctx.fillStyle = `rgba(255, 196, 64, ${0.18 + 0.22 * pulse})`;
      ctx.beginPath();
      ctx.arc(fx, fy, cell * (0.62 + 0.12 * pulse), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = golden ? '#ffc940' : '#ff7b72';
    ctx.beginPath();
    ctx.arc(fx, fy, cell * (golden ? 0.42 : 0.38), 0, Math.PI * 2);
    ctx.fill();
  }
  snake.forEach(([x, y], i) => {
    ctx.fillStyle = i === 0 ? '#aff5b4' : '#3fb950';
    ctx.fillRect(ox + x * cell + 1.5, oy + y * cell + 1.5, cell - 3, cell - 3);
  });
  if (over) {
    ctx.fillStyle = 'rgba(13, 17, 23, 0.78)';
    ctx.fillRect(0, 58, w, h - 58);
    ctx.textAlign = 'center';
    ctx.fillStyle = t.game.won ? '#7ee787' : '#ff7b72';
    ctx.font = `700 52px ${MONO}`;
    ctx.fillText(t.game.won ? 'YOU WIN' : 'GAME OVER', w / 2, h / 2 - 10);
    ctx.fillStyle = '#c9d1d9';
    ctx.font = `400 28px ${MONO}`;
    ctx.fillText(`${t.game.score} points · Enter to play again · Esc to stop`, w / 2, h / 2 + 40);
    ctx.textAlign = 'left';
  }
}

// ---- The Snake party on the screen ------------------------------------------------

const PARTY_FPS = 20;

/** A little snake wiggling in place: `len` squares along a sine wave. */
function wiggle(ctx, x, y, { color, len = 6, size = 16, t, phase = 0, amp = 6 }) {
  for (let i = len - 1; i >= 0; i--) {
    const sx = x + i * (size + 2);
    const sy = y + Math.sin(t * 6 + phase - i * 0.7) * amp;
    ctx.globalAlpha = i === 0 ? 1 : 0.55 + 0.45 * (1 - i / len);
    ctx.fillStyle = color;
    ctx.fillRect(sx, sy - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
}

/** The party as the monitor shows it, at time `t` (seconds) and room clock `now`. */
function drawParty(ctx, party, t, now) {
  const { width: w, height: h } = ctx.canvas;
  const room = party.room;
  titleBar(ctx, w, `snake party${party.code ? ` · ${party.code}` : ''}`);
  ctx.textAlign = 'center';
  const phase = party.status === 'in' ? room?.phase : party.status;

  if (phase === 'countdown' || (phase === 'playing' && countdownAt(room.startAt, now) === 0)) {
    const n = countdownAt(room.startAt, now);
    const into = n > 0 ? 1 - ((room.startAt - now) / 1000 - (n - 1)) : (now - room.startAt) / 900;
    const cx = w / 2;
    const cy = h / 2 + 30;
    // A ring that closes once a second, and the number, bursting in.
    ctx.strokeStyle = n === 0 ? '#7ee787' : '#ffc940';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, 1 - into));
    ctx.stroke();
    const scale = 1 + 0.35 * Math.max(0, 1 - into * 3);
    ctx.fillStyle = n === 0 ? '#7ee787' : '#f0f6fc';
    ctx.font = `800 ${Math.round((n === 0 ? 120 : 190) * scale)}px ${MONO}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(n === 0 ? 'GO!' : String(Math.max(n, 1)), cx, cy + 6);
    ctx.textBaseline = 'alphabetic';
    // Everyone's colour round the edge.
    room.players.forEach((p, i) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(w / 2 - (room.players.length * 60) / 2 + i * 60 + 10, h - 52, 40, 12);
    });
  } else if (phase === 'lobby') {
    ctx.fillStyle = '#7ee787';
    ctx.font = `800 54px ${MONO}`;
    ctx.fillText('SNAKE PARTY', w / 2, 128);
    const top = 180;
    const row = Math.min(62, (h - top - 90) / MAX_PLAYERS_SHOWN);
    for (let i = 0; i < MAX_PLAYERS_SHOWN; i++) {
      const p = room.players[i];
      const y = top + i * row + row / 2;
      ctx.textAlign = 'left';
      if (p) {
        wiggle(ctx, 120, y, { color: p.color, t, phase: i * 1.3, size: 18, amp: p.online ? 7 : 0 });
        ctx.fillStyle = p.online ? '#f0f6fc' : '#6e7681';
        ctx.font = `700 36px ${MONO}`;
        ctx.fillText(p.name + (p.id === room.host ? '  ♛' : ''), 280, y + 12);
        if (p.id === party.you) {
          ctx.fillStyle = '#8b949e';
          ctx.font = `500 26px ${MONO}`;
          ctx.fillText('you', w - 160, y + 10);
        }
      } else {
        ctx.fillStyle = '#30363d';
        ctx.font = `500 30px ${MONO}`;
        ctx.fillText('·  ·  ·  waiting', 120, y + 10);
      }
    }
    ctx.textAlign = 'center';
    const enough = room.players.length >= 2;
    const pulse = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.fillStyle = enough ? `rgba(126, 231, 135, ${pulse})` : '#8b949e';
    ctx.font = `600 28px ${MONO}`;
    const host = room.players.find((p) => p.id === room.host);
    ctx.fillText(
      enough ? (room.host === party.you ? 'READY · press Start' : `READY · ${host?.name ?? 'the host'} starts`) : `${room.players.length}/${MAX_PLAYERS_SHOWN} · waiting for players`,
      w / 2,
      h - 34
    );
  } else if (phase === 'error') {
    ctx.fillStyle = '#ff7b72';
    ctx.font = `700 40px ${MONO}`;
    ctx.fillText('PARTY OVER', w / 2, h / 2 - 10);
    ctx.fillStyle = '#8b949e';
    ctx.font = `500 26px ${MONO}`;
    ctx.fillText(party.error?.code === 'full' ? 'this party is full' : 'this party has ended', w / 2, h / 2 + 34);
  } else if (phase === 'playing' || phase === 'results') {
    ctx.fillStyle = '#7ee787';
    ctx.font = `800 54px ${MONO}`;
    ctx.fillText(phase === 'playing' ? 'ROUND ON' : 'ROUND OVER', w / 2, h / 2);
  } else {
    // Naming or connecting: a title screen with the five colours wiggling by.
    ['#3fb950', '#58a6ff', '#f778ba', '#ffa657', '#d2a8ff'].forEach((color, i) => {
      const x = ((t * 90 + i * 210) % (w + 200)) - 160;
      wiggle(ctx, x, 120 + i * 62, { color, t, phase: i, size: 16, amp: 8 });
    });
    ctx.fillStyle = 'rgba(13, 17, 23, 0.7)';
    ctx.fillRect(w / 2 - 300, h / 2 - 70, 600, 130);
    ctx.fillStyle = '#7ee787';
    ctx.font = `800 64px ${MONO}`;
    ctx.fillText('SNAKE PARTY', w / 2, h / 2 + 4);
    ctx.fillStyle = '#c9d1d9';
    ctx.font = `500 26px ${MONO}`;
    ctx.fillText(phase === 'connecting' ? 'joining…' : 'up to 5 players · 3 minutes', w / 2, h / 2 + 44);
  }
  ctx.textAlign = 'left';
}

/**
 * interactive  the screen responds to the pointer (at the desk, or at the monitor)
 * onSelect     called when the screen is clicked: walk up to it, or start typing
 */
export default function DeskMonitor({ visible, interactive, onSelect }) {
  const t = useTerminal();
  const [cursorOn, setCursorOn] = useState(true);
  useEffect(() => {
    if (!t.focused) {
      setCursorOn(true);
      return undefined;
    }
    const id = setInterval(() => setCursorOn((c) => !c), BLINK_MS);
    return () => clearInterval(id);
  }, [t.focused]);

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = Math.round((1024 * SCREEN.height) / SCREEN.width);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return { canvas: c, texture: tex };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  // The terminal, drawn when it changes; a party, drawn PARTY_FPS times a
  // second while it's on (its snakes wiggle and its countdown ticks).
  const party = useParty();
  const partyOn = party.status !== 'idle';
  useEffect(() => {
    if (partyOn) return;
    const ctx = canvas.getContext('2d');
    if (t.mode === 'snake' && t.game) drawSnake(ctx, t);
    else drawShell(ctx, t, cursorOn);
    texture.needsUpdate = true;
  }, [canvas, texture, t, cursorOn, partyOn]);
  const since = useRef(1);
  useFrame(({ clock }, dt) => {
    if (!partyOn || !visible) return;
    since.current += dt;
    if (since.current < 1 / PARTY_FPS) return;
    since.current = 0;
    drawParty(canvas.getContext('2d'), party, clock.elapsedTime, serverNow());
    texture.needsUpdate = true;
  });

  const [hover, setHover] = useState(false);
  const { gl } = useThree();
  useEffect(() => {
    if (!interactive || !hover) return undefined;
    const el = gl.domElement;
    const before = el.style.cursor;
    el.style.cursor = 'text';
    return () => {
      el.style.cursor = before;
    };
  }, [gl, interactive, hover]);

  return (
    <mesh
      visible={visible}
      position={[SCREEN.centre[0], SCREEN.centre[1], SCREEN.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (interactive) setHover(true);
      }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive && e.delta <= CLICK_SLOP_PX) onSelect();
      }}
    >
      <planeGeometry args={[SCREEN.width, SCREEN.height]} />
      <meshBasicMaterial map={texture} color={new THREE.Color(1, 1, 1).multiplyScalar(hover && interactive ? 1 : SCREEN_LIGHT)} />
    </mesh>
  );
}
