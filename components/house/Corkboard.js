'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CONTACTS } from '@/constants/contact';
import { CARDS } from './deskLayout';
import styles from './house.module.css';

// The cards pinned to the corkboard in the desk nook: one index card per
// role, and one with the contact details. Drawn unlit, like the rest of the
// scene, a touch darker than white so they sit in the room's lamplight.

const CARD_LIGHT = 0.9;
const LIFT = 0.025; // metres a picked-out card comes off the board
const MOTION = 9;
const CLICK_SLOP_PX = 6;
const PIN_COLOURS = ['#c0392b', '#2f6db5', '#e0a526', '#3e8e5a'];
const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const HAND = '"Bradley Hand", "Segoe Print", "Comic Sans MS", cursive';

/** Wraps `text` to `width` pixels; returns the lines. */
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

/** A ruled index card: red margin rule, blue lines, the text on top. */
function indexCard(card, draw) {
  const w = 1024;
  const h = Math.round((w * card.height) / card.width);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fbf8f1';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(70, 120, 190, 0.22)';
  ctx.lineWidth = 2;
  for (let y = 170; y < h - 20; y += 52) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(200, 60, 60, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 130);
  ctx.lineTo(w, 130);
  ctx.stroke();
  ctx.textBaseline = 'alphabetic';
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function roleTexture(card) {
  const { role } = card;
  return indexCard(card, (ctx, w) => {
    const pad = 56;
    ctx.fillStyle = '#1f1a14';
    ctx.font = `700 64px ${SANS}`;
    ctx.fillText(role.title, pad, 104, w - 2 * pad - (role.current ? 170 : 0));
    if (role.current) {
      // A rubber stamp for the role in progress.
      ctx.save();
      ctx.translate(w - pad - 70, 82);
      ctx.rotate(-0.12);
      ctx.strokeStyle = 'rgba(180, 40, 30, 0.8)';
      ctx.lineWidth = 5;
      ctx.strokeRect(-72, -34, 144, 64);
      ctx.fillStyle = 'rgba(180, 40, 30, 0.85)';
      ctx.font = `800 40px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText('NOW', 0, 12);
      ctx.restore();
    }
    ctx.fillStyle = '#4a4237';
    ctx.font = `500 40px ${SANS}`;
    ctx.fillText(role.company, pad, 205, w - 2 * pad);
    ctx.fillStyle = '#7a6f60';
    ctx.font = `600 34px ${SANS}`;
    ctx.fillText(role.period.toUpperCase(), pad, 257, w - 2 * pad);
    ctx.fillStyle = '#2c3e66';
    ctx.font = `400 38px ${HAND}`;
    let y = 361;
    for (const a of role.achievements.slice(0, 3)) {
      const lines = wrap(ctx, a, w - 2 * pad - 40);
      ctx.fillText('–', pad, y);
      for (const l of lines) {
        if (y > 900) break;
        ctx.fillText(l, pad + 40, y);
        y += 52;
      }
    }
  });
}

function contactTexture(card) {
  return indexCard(card, (ctx, w) => {
    const pad = 56;
    ctx.fillStyle = '#1f1a14';
    ctx.font = `700 64px ${SANS}`;
    ctx.fillText('Get in touch', pad, 104, w - 2 * pad);
    let y = 222;
    for (const c of CONTACTS) {
      ctx.fillStyle = '#7a6f60';
      ctx.font = `600 30px ${SANS}`;
      ctx.fillText(c.label.toUpperCase(), pad, y);
      ctx.fillStyle = '#2c3e66';
      ctx.font = `400 44px ${HAND}`;
      ctx.fillText(c.value, pad + 230, y + 2, w - pad - 230 - pad);
      y += 104;
    }
  });
}

function Card({ card, index, highlighted, chosen, interactive, onHover, onSelect }) {
  const lift = useRef(null);
  const texture = useMemo(() => (card.kind === 'role' ? roleTexture(card) : contactTexture(card)), [card]);
  useEffect(() => () => texture.dispose(), [texture]);
  const picked = highlighted || chosen;

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * MOTION);
    const g = lift.current;
    g.position.z += ((picked ? LIFT : 0) - g.position.z) * k;
    g.rotation.z += ((picked ? 0 : card.tilt) - g.rotation.z) * k;
  });

  return (
    // Turned to face -x: the card's own +x runs along the board towards +z.
    <group position={card.position} rotation={[0, -Math.PI / 2, 0]}>
      <group ref={lift} rotation={[0, 0, card.tilt]}>
        <mesh position={[0.012, -0.014, -0.001]}>
          <planeGeometry args={[card.width, card.height]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
        </mesh>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            if (interactive) onHover(card.id);
          }}
          onPointerOut={() => onHover(null)}
          onClick={(e) => {
            e.stopPropagation();
            if (interactive && e.delta <= CLICK_SLOP_PX) onSelect(card.id);
          }}
        >
          <planeGeometry args={[card.width, card.height]} />
          <meshBasicMaterial map={texture} color={new THREE.Color(1, 1, 1).multiplyScalar(picked ? 1 : CARD_LIGHT)} />
        </mesh>
        {/* The pushpin, in the top margin above the title. */}
        <mesh position={[0, card.height / 2 - 0.018, 0.008]}>
          <sphereGeometry args={[0.013, 16, 12]} />
          <meshBasicMaterial color={PIN_COLOURS[index % PIN_COLOURS.length]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * highlighted  the card under the pointer or keyboard focus: it comes off the board
 * chosen       the card whose page is open
 * interactive  cards respond to the pointer (the visitor is at the desk)
 */
export default function Corkboard({ visible, highlighted, chosen, interactive, onHover, onSelect, layer }) {
  const { gl } = useThree();
  useEffect(() => {
    if (!interactive || !highlighted) return undefined;
    const el = gl.domElement;
    const before = el.style.cursor;
    el.style.cursor = 'pointer';
    return () => {
      el.style.cursor = before;
    };
  }, [gl, interactive, highlighted]);

  const shown = interactive && CARDS.find((c) => c.id === highlighted && c.id !== chosen);
  return (
    <group visible={visible}>
      {CARDS.map((c, i) => (
        <Card
          key={c.id}
          card={c}
          index={i}
          highlighted={highlighted === c.id}
          chosen={chosen === c.id}
          interactive={interactive}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
      {shown && (
        <Html position={[shown.position[0] - 0.05, shown.position[1] + shown.height / 2 + 0.08, shown.position[2]]} center portal={layer} zIndexRange={[20, 10]}>
          <span className={styles.sceneLabel} aria-hidden="true">
            {shown.kind === 'role' ? shown.role.title : 'Get in touch'}
            <small>{shown.kind === 'role' ? shown.role.company.split(' • ')[0] : 'Email, phone, LinkedIn, GitHub'}</small>
          </span>
        </Html>
      )}
    </group>
  );
}
