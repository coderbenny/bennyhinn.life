'use client';

import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { COMMIT, SCREEN, timeSince } from './deskLayout';

// The monitor on the desk: a terminal showing the commit this site was built
// from and how long ago it was made, redrawn every minute.

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SCREEN_LIGHT = 0.95;
const CLICK_SLOP_PX = 6;

function wrap(ctx, text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function draw(canvas, commit, now) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, w, h);
  // Title bar with the three window buttons.
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
  ctx.fillText('bennyhinn.life — zsh', w / 2, 38);
  ctx.textAlign = 'left';
  const pad = 40;
  let y = 120;
  const line = (text, colour, size = 32, weight = 400) => {
    ctx.fillStyle = colour;
    ctx.font = `${weight} ${size}px ${MONO}`;
    ctx.fillText(text, pad, y, w - 2 * pad);
    y += size * 1.5;
  };
  ctx.fillStyle = '#7ee787';
  ctx.font = `600 32px ${MONO}`;
  ctx.fillText('benny@nairobi', pad, y);
  const at = pad + ctx.measureText('benny@nairobi').width;
  ctx.fillStyle = '#c9d1d9';
  ctx.font = `400 32px ${MONO}`;
  ctx.fillText(' $ git log -1', at, y);
  y += 60;
  if (!commit) {
    line('No commit information in this build.', '#8b949e');
    return;
  }
  line(`commit ${commit.short}`, '#e3b341', 32, 600);
  line(`Date:  ${timeSince(commit.date, now)}`, '#c9d1d9');
  y += 16;
  ctx.font = `400 38px ${MONO}`;
  for (const l of wrap(ctx, commit.message, w - 2 * pad - 60).slice(0, 4)) {
    ctx.fillStyle = '#f0f6fc';
    ctx.fillText(l, pad + 60, y);
    y += 56;
  }
  y += 20;
  ctx.fillStyle = '#7ee787';
  ctx.font = `600 32px ${MONO}`;
  ctx.fillText('benny@nairobi', pad, y);
  ctx.fillStyle = '#c9d1d9';
  ctx.font = `400 32px ${MONO}`;
  ctx.fillText(' $ ', at, y);
  ctx.fillStyle = '#c9d1d9';
  ctx.fillRect(at + ctx.measureText(' $ ').width, y - 26, 18, 32);
}

/** onSelect  called when the screen is clicked (to walk up to it) */
export default function DeskMonitor({ visible, interactive, onSelect }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = Math.round((1024 * SCREEN.height) / SCREEN.width);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, texture: t };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    draw(canvas, COMMIT, now);
    texture.needsUpdate = true;
  }, [canvas, texture, now]);

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
