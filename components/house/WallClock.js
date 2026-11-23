'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CLOCK } from './deskLayout';
import { handAngles, nairobiTime } from './wallTime';

// A wall clock over the desk, on Nairobi time. Drawn unlit, like the rest of
// the scene, at the brightness of the wall around it.

const FACE_LIGHT = 0.86;
const SERIF = 'ui-serif, Georgia, "Times New Roman", serif';
const SANS = 'ui-sans-serif, system-ui, sans-serif';

function faceTexture() {
  const s = 512;
  const c = s / 2;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(c * 0.8, c * 0.7, s * 0.05, c, c, c);
  g.addColorStop(0, '#fbf7ee');
  g.addColorStop(1, '#e7dfcf');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  // Minute ticks, heavier at the hours.
  ctx.strokeStyle = '#2b2520';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const hour = i % 5 === 0;
    ctx.lineWidth = hour ? 7 : 2.5;
    const r0 = c * (hour ? 0.8 : 0.86);
    const r1 = c * 0.92;
    ctx.beginPath();
    ctx.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0);
    ctx.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1);
    ctx.stroke();
  }
  ctx.fillStyle = '#2b2520';
  ctx.font = `600 64px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let h = 1; h <= 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    ctx.fillText(String(h), c + Math.sin(a) * c * 0.64, c - Math.cos(a) * c * 0.64 + 4);
  }
  ctx.fillStyle = '#8a7c68';
  ctx.font = `600 26px ${SANS}`;
  ctx.fillText('NAIROBI', c, c + c * 0.36);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** A hand, pivoting at the clock's centre: `length` towards twelve, `tail` behind. */
function Hand({ handRef, width, length, tail, colour, z }) {
  return (
    <group ref={handRef} position={[0, 0, z]}>
      <mesh position={[0, (length - tail) / 2, 0]}>
        <planeGeometry args={[width, length + tail]} />
        <meshBasicMaterial color={colour} />
      </mesh>
    </group>
  );
}

/** reducedMotion  the second hand stays still; the others still keep time */
export default function WallClock({ visible, reducedMotion }) {
  const face = useMemo(() => faceTexture(), []);
  useEffect(() => () => face.dispose(), [face]);
  const hour = useRef(null);
  const minute = useRef(null);
  const second = useRef(null);
  const r = CLOCK.radius;

  useFrame(() => {
    const a = handAngles(nairobiTime(new Date()));
    hour.current.rotation.z = -a.hour;
    minute.current.rotation.z = -a.minute;
    second.current.visible = !reducedMotion;
    second.current.rotation.z = -a.second;
  });

  return (
    <group position={CLOCK.position} visible={visible}>
      <mesh position={[0.012, -0.018, -0.002]}>
        <circleGeometry args={[r * 1.12, 48]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {/* The rim, then the face inside it. */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.012]}>
        <cylinderGeometry args={[r * 1.08, r * 1.08, 0.024, 48, 1, true]} />
        <meshBasicMaterial color="#3a332c" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.022]}>
        <ringGeometry args={[r, r * 1.08, 48]} />
        <meshBasicMaterial color="#2a241f" />
      </mesh>
      <mesh position={[0, 0, 0.018]}>
        <circleGeometry args={[r, 48]} />
        <meshBasicMaterial map={face} color={new THREE.Color(1, 1, 1).multiplyScalar(FACE_LIGHT)} />
      </mesh>
      <Hand handRef={hour} width={0.011} length={r * 0.5} tail={r * 0.1} colour="#221d19" z={0.02} />
      <Hand handRef={minute} width={0.007} length={r * 0.76} tail={r * 0.12} colour="#221d19" z={0.021} />
      <Hand handRef={second} width={0.0028} length={r * 0.82} tail={r * 0.2} colour="#b3302b" z={0.022} />
      <mesh position={[0, 0, 0.023]}>
        <circleGeometry args={[0.006, 16]} />
        <meshBasicMaterial color="#b3302b" />
      </mesh>
    </group>
  );
}
