'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { BOOKS } from './shelf';
import styles from './house.module.css';

// The books on the skills shelf. The shelf is baked into the house model;
// the books are drawn here, unlit like the rest of the scene, with simple
// shading per face so they sit in the room's light.

// Per face of a box (+x spine, -x back, +y top, -y bottom, +z and -z covers):
// how much of the room's light each one catches.
const FACE_LIGHT = [0.86, 0.35, 0.78, 0.3, 0.6, 0.6];
const TILT = -0.16; // radians: the top leans out towards the room on hover
const PULL = 0.3; // metres: how far a chosen book slides out
const PULLED_TILT = -0.09; // radians: a chosen book also leans, so it reads as taken off the shelf
const MOTION = 9; // how quickly books follow, per second
const CLICK_SLOP_PX = 6; // a drag that moves further than this is not a click

function luminance(hex) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/** The spine: cloth colour, two gilt bands, the name running up the spine. */
function spineTexture(book) {
  const [, height, thickness] = book.size;
  const w = 64;
  const h = Math.min(512, Math.round((w * height) / thickness));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(book.color).multiplyScalar(FACE_LIGHT[0]);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `#${base.clone().multiplyScalar(1.08).getHexString()}`);
  g.addColorStop(1, `#${base.clone().multiplyScalar(0.8).getHexString()}`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const ink = luminance(book.color) > 0.4 ? 'rgba(40, 30, 20, 0.85)' : 'rgba(232, 205, 150, 0.9)';
  ctx.fillStyle = ink;
  const band = Math.max(2, Math.round(h * 0.012));
  for (const y of [h * 0.07, h * 0.1, h * 0.9, h * 0.93]) ctx.fillRect(0, Math.round(y), w, band);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = Math.round(w * 0.5);
  ctx.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`;
  const room = h * 0.68;
  while (ctx.measureText(book.skill).width > room && size > 10) {
    size -= 2;
    ctx.font = `600 ${size}px ui-sans-serif, system-ui, sans-serif`;
  }
  ctx.fillText(book.skill, 0, 0);
  ctx.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function Book({ book, highlighted, chosen, interactive, onHover, onSelect }) {
  const pivot = useRef(null);
  const [depth, height] = book.size;
  const materials = useMemo(() => {
    const spine = spineTexture(book);
    return FACE_LIGHT.map((light, i) =>
      i === 0
        ? new THREE.MeshBasicMaterial({ map: spine })
        : new THREE.MeshBasicMaterial({ color: new THREE.Color(book.color).multiplyScalar(light) })
    );
  }, [book]);
  useEffect(
    () => () => {
      for (const m of materials) {
        m.map?.dispose();
        m.dispose();
      }
    },
    [materials]
  );

  // Pivot on the bottom front edge, the edge a finger tips a book out by.
  const pivotAt = useMemo(() => [book.position[0] + depth / 2, book.position[1] - height / 2, book.position[2]], [book, depth, height]);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * MOTION);
    const p = pivot.current;
    p.position.x += (pivotAt[0] + (chosen ? PULL : 0) - p.position.x) * k;
    p.rotation.z += ((chosen ? PULLED_TILT : highlighted ? TILT : 0) - p.rotation.z) * k;
  });

  return (
    <group ref={pivot} position={pivotAt}>
      <mesh
        position={[-depth / 2, height / 2, 0]}
        material={materials}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (interactive) onHover(book.skill);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive && e.delta <= CLICK_SLOP_PX) onSelect(book.skill);
        }}
      >
        <boxGeometry args={book.size} />
      </mesh>
    </group>
  );
}

/**
 * highlighted  the skill under the pointer or keyboard focus: its book tips out
 * chosen       the skill whose panel is open: its book slides out
 */
export default function Bookshelf({ highlighted, chosen, interactive, onHover, onSelect, layer }) {
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

  const label = BOOKS.find((b) => b.skill === highlighted && b.skill !== chosen);
  return (
    <group>
      {BOOKS.map((b) => (
        <Book
          key={b.skill}
          book={b}
          highlighted={highlighted === b.skill}
          chosen={chosen === b.skill}
          interactive={interactive}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
      {interactive && label && (
        <Html position={[label.position[0] + label.size[0] / 2, label.position[1] + label.size[1] / 2 + 0.05, label.position[2]]} center portal={layer} zIndexRange={[20, 10]}>
          <span className={styles.bookLabel} aria-hidden="true">
            {label.skill}
            <small>{label.area}</small>
          </span>
        </Html>
      )}
    </group>
  );
}
