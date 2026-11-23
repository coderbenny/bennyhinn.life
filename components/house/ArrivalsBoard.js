'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BOARD, PAGE_COUNT, boardPage, nextFlap } from './splitFlap';
import { nairobiTime } from './wallTime';
import { play } from './sound';

// The split-flap arrivals board in the entry hall. Each letter is a wheel of
// flaps that turns, one flap at a time, to the next line; a click (or the
// hidden button for keyboards) moves it on, and it moves on by itself every
// so often while the visitor stands in the hall.

const FLAP_MS = 55;
const AUTO_MS = 11000;
const CLICK_SLOP_PX = 6;
const MONO = '"DIN Alternate", "Arial Narrow", ui-sans-serif, sans-serif';

// Which page the board shows, shared with the hidden keyboard button.
let page = 0;
const listeners = new Set();
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getPage = () => page;
/** Moves the board on to its next page. */
export function nextBoardPage() {
  page = (page + 1) % PAGE_COUNT;
  for (const l of listeners) l();
}

function draw(ctx, rows, time) {
  const { width: w, height: h } = ctx.canvas;
  ctx.fillStyle = '#121316';
  ctx.fillRect(0, 0, w, h);
  // Header: what the board is, and the time in Nairobi.
  const head = 92;
  ctx.fillStyle = '#e8a33d';
  ctx.font = `700 44px ${MONO}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('ARRIVALS', 40, head / 2 + 4);
  ctx.fillStyle = '#8b8f98';
  ctx.font = `600 30px ${MONO}`;
  ctx.fillText('NAIROBI', 260, head / 2 + 6);
  ctx.fillStyle = '#e8a33d';
  ctx.font = `700 44px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(time, w - 40, head / 2 + 4);
  ctx.textAlign = 'center';
  const pad = 24;
  const gap = 6;
  const cw = (w - 2 * pad - gap * (BOARD.cols - 1)) / BOARD.cols;
  const ch = (h - head - pad - gap * (BOARD.rows - 1)) / BOARD.rows;
  ctx.font = `700 ${Math.round(ch * 0.72)}px ${MONO}`;
  rows.forEach((line, r) => {
    for (let c = 0; c < BOARD.cols; c++) {
      const x = pad + c * (cw + gap);
      const y = head + r * (ch + gap);
      // The two halves of the flap, the top a shade lighter.
      ctx.fillStyle = '#22242a';
      ctx.fillRect(x, y, cw, ch / 2);
      ctx.fillStyle = '#1b1d22';
      ctx.fillRect(x, y + ch / 2, cw, ch / 2);
      ctx.fillStyle = '#f2ead8';
      ctx.fillText(line[c], x + cw / 2, y + ch / 2 + 3);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x, y + ch / 2 - 1, cw, 2);
    }
  });
  ctx.textAlign = 'left';
}

const clock = () => {
  const t = nairobiTime(new Date());
  return `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}`;
};

/**
 * interactive    the board takes clicks (the visitor is in the hall)
 * reducedMotion  lines change at once, without the flaps turning
 */
export default function ArrivalsBoard({ visible, interactive, reducedMotion }) {
  const current = useSyncExternalStore(subscribe, getPage, getPage);
  const target = useMemo(() => boardPage(current, nairobiTime(new Date()).hours), [current]);
  const [shown, setShown] = useState(() => target);
  const [time, setTime] = useState(clock);

  // Turn the flaps towards the target, one flap per tick.
  useEffect(() => {
    if (reducedMotion) {
      setShown(target);
      return undefined;
    }
    let rows = null;
    const id = setInterval(() => {
      setShown((prev) => {
        rows = prev.map((line, r) =>
          line
            .split('')
            .map((c, i) => nextFlap(c, target[r][i]))
            .join('')
        );
        return rows;
      });
      if (rows && rows.every((l, r) => l === target[r])) clearInterval(id);
    }, FLAP_MS);
    return () => clearInterval(id);
  }, [target, reducedMotion]);

  // The clatter of the flaps, when the board changes in front of the visitor.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (interactive && !reducedMotion) play('flaps');
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  // Moves on by itself while the visitor is in the hall; the clock ticks.
  useEffect(() => {
    if (!interactive) return undefined;
    const id = setInterval(nextBoardPage, AUTO_MS);
    return () => clearInterval(id);
  }, [interactive, current]);
  useEffect(() => {
    const id = setInterval(() => setTime(clock()), 20_000);
    return () => clearInterval(id);
  }, []);

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = Math.round((1024 * BOARD.height) / BOARD.width);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, texture: t };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    draw(canvas.getContext('2d'), shown, time);
    texture.needsUpdate = true;
  }, [canvas, texture, shown, time]);

  const [hover, setHover] = useState(false);
  const { gl } = useThree();
  useEffect(() => {
    if (!interactive || !hover) return undefined;
    const el = gl.domElement;
    const before = el.style.cursor;
    el.style.cursor = 'pointer';
    return () => {
      el.style.cursor = before;
    };
  }, [gl, interactive, hover]);

  return (
    <mesh
      position={BOARD.centre}
      visible={visible}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (interactive) setHover(true);
      }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive && e.delta <= CLICK_SLOP_PX) nextBoardPage();
      }}
    >
      <planeGeometry args={[BOARD.width, BOARD.height]} />
      <meshBasicMaterial map={texture} color={new THREE.Color(1, 1, 1).multiplyScalar(hover && interactive ? 1 : 0.92)} />
    </mesh>
  );
}
