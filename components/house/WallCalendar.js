'use client';

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { CALENDAR } from './deskLayout';
import { MONTHS, dayKey, monthGrid, monthTotal, nairobiTime } from './wallTime';

// A wall calendar beside the desk: this month in Nairobi, each day shaded by
// Benny's GitHub contributions that day, today ringed; above it, the whole
// past year in small. The data is public/house/contributions.json, written
// at build time by scripts/house-contributions.mjs.

const DATA = '/house/contributions.json';
const PAPER_LIGHT = 0.88;
const GREENS = ['#ece6d8', '#b7dcb0', '#7cc47a', '#3f9a4d', '#1f6b31']; // levels 0 to 4, on paper
const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif';

/** Loads the contributions once `load` is true; null until then, or if missing. */
function useContributions(load) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!load) return undefined;
    let cancelled = false;
    fetch(DATA)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && d?.days && setData(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [load]);
  return data;
}

function draw(canvas, data, today) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#faf7f0';
  ctx.fillRect(0, 0, w, h);
  const pad = 36;
  const days = data?.days ?? {};

  // Top: the past year, 53 weeks by 7 days, ending this week.
  ctx.fillStyle = '#26303a';
  ctx.fillRect(0, 0, w, 300);
  ctx.fillStyle = '#f4efe6';
  ctx.font = `700 40px ${SANS}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(data?.source === 'git' ? 'Commits to this site' : 'github.com/coderbenny', pad, 70, w - 2 * pad);
  ctx.fillStyle = '#aab4bf';
  ctx.font = `500 28px ${SANS}`;
  ctx.fillText(data ? `${data.total.toLocaleString('en')} contributions in the last year` : 'Contributions in the last year', pad, 112, w - 2 * pad);
  const yearGreens = ['#36414d', '#0e4429', '#006d32', '#26a641', '#39d353'];
  const cell = (w - 2 * pad) / 53;
  const end = Date.UTC(today.year, today.month, today.day);
  const endWeekday = (today.weekday + 6) % 7; // Monday first
  for (let week = 0; week < 53; week++) {
    for (let d = 0; d < 7; d++) {
      const back = (52 - week) * 7 + (endWeekday - d);
      if (back < 0) continue;
      const t = new Date(end - back * 86400000);
      const level = days[dayKey(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())]?.level ?? 0;
      ctx.fillStyle = yearGreens[level];
      ctx.fillRect(pad + week * cell, 140 + d * cell, cell - 2, cell - 2);
    }
  }

  // The binding: two rings through the top.
  for (const x of [w * 0.3, w * 0.7]) {
    ctx.fillStyle = '#faf7f0';
    ctx.beginPath();
    ctx.arc(x, 18, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // This month.
  let y = 370;
  ctx.fillStyle = '#1f1a14';
  ctx.font = `800 54px ${SANS}`;
  ctx.fillText(MONTHS[today.month].toUpperCase(), pad, y);
  ctx.fillStyle = '#9a3f1f';
  ctx.font = `700 40px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText(String(today.year), w - pad, y);
  ctx.textAlign = 'left';
  y += 26;
  const total = monthTotal(days, today.year, today.month);
  ctx.fillStyle = '#7a6f60';
  ctx.font = `500 26px ${SANS}`;
  ctx.fillText(data ? `${total.toLocaleString('en')} contributions so far this month` : '', pad, y + 20);
  y += 70;
  const col = (w - 2 * pad) / 7;
  ctx.font = `700 24px ${SANS}`;
  ctx.textAlign = 'center';
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d, i) => {
    ctx.fillStyle = i >= 5 ? '#9a3f1f' : '#7a6f60';
    ctx.fillText(d, pad + col * (i + 0.5), y);
  });
  y += 16;
  const weeks = monthGrid(today.year, today.month);
  const row = Math.min(col, (h - y - pad) / weeks.length);
  ctx.font = `600 30px ${SANS}`;
  weeks.forEach((week, r) => {
    week.forEach((day, i) => {
      if (!day) return;
      const cx = pad + col * (i + 0.5);
      const cy = y + row * (r + 0.5);
      const level = days[dayKey(today.year, today.month, day)]?.level ?? 0;
      const future = day > today.day;
      ctx.fillStyle = future ? '#f3efe6' : GREENS[level];
      ctx.fillRect(cx - col / 2 + 3, cy - row / 2 + 3, col - 6, row - 6);
      ctx.fillStyle = level >= 3 && !future ? '#f7f4ec' : future ? '#b9ae9c' : '#2b2520';
      ctx.fillText(String(day), cx, cy + 11);
      if (day === today.day) {
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(col, row) * 0.46, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  });
  ctx.textAlign = 'left';
}

export default function WallCalendar({ visible, load }) {
  const data = useContributions(load);
  // The day in Nairobi, checked once a minute so the page turns at midnight.
  const [key, setKey] = useState(() => {
    const t = nairobiTime(new Date());
    return dayKey(t.year, t.month, t.day);
  });
  useEffect(() => {
    const id = setInterval(() => {
      const t = nairobiTime(new Date());
      setKey(dayKey(t.year, t.month, t.day));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = Math.round((640 * CALENDAR.height) / CALENDAR.width);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { canvas: c, texture: t };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => {
    draw(canvas, data, nairobiTime(new Date()));
    texture.needsUpdate = true;
  }, [canvas, texture, data, key]);

  const { width: w, height: h } = CALENDAR;
  return (
    <group position={CALENDAR.position} visible={visible}>
      <mesh position={[0.01, -0.015, -0.002]}>
        <planeGeometry args={[w * 1.04, h * 1.03]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh rotation={[-0.025, 0, 0.006]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} color={new THREE.Color(1, 1, 1).multiplyScalar(PAPER_LIGHT)} />
      </mesh>
      {/* The nail it hangs from. */}
      <mesh position={[0, h / 2 + 0.03, 0.006]}>
        <circleGeometry args={[0.006, 12]} />
        <meshBasicMaterial color="#3a332c" />
      </mesh>
    </group>
  );
}
