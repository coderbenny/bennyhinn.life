'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ARTIST } from '@/constants/music';
import { RECORD, recordImage } from './recordWall';
import { RECORDS } from './spots';
import styles from './house.module.css';

// The record wall in the studio: each of Benny's tracks as a vinyl record,
// its sleeve showing the cover art, the disc half out of it. Drawn unlit,
// like the rest of the scene; the wall behind carries the baked light of the
// ceiling spots aimed at it.

const COVER_LIGHT = 0.93; // covers sit a touch below full brightness, like a print under a lamp
const EDGE = '#1b1a1d'; // the sleeve's card edges
const EDGE_LIGHT = [0.9, 0.5, 1.0, 0.35, 1, 0.3]; // +x, -x, +y, -y, front, back
const EMPTY = '#2a2c33'; // a cover while it loads
const SLEEVE_DEPTH = 0.006;
const LABEL_RADIUS = 0.05; // the disc's centre label, printed with the cover
const LIFT = 0.03; // metres a picked-out record comes off the wall
const SLIDE = { highlighted: 0.05, chosen: 0.11 }; // how much further the disc slides out
const SPIN = 3.49; // radians per second: 33⅓ rpm
const MOTION = 9;
const CLICK_SLOP_PX = 6;
const REST_OFFSET = RECORD.sleeve / 2 + RECORD.peek - RECORD.disc / 2; // disc centre, from the sleeve centre

/** Loads the covers once `load` is true, without suspending. */
function useCovers(load) {
  const [covers, setCovers] = useState({});
  useEffect(() => {
    if (!load) return undefined;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    const loaded = [];
    for (const r of RECORDS) {
      loader.load(
        recordImage(r.track),
        (tex) => {
          loaded.push(tex);
          if (cancelled) return;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          setCovers((c) => ({ ...c, [r.id]: tex }));
        },
        undefined,
        () => console.warn(`Records: could not load ${recordImage(r.track)}`)
      );
    }
    return () => {
      cancelled = true;
      for (const t of loaded) t.dispose();
    };
  }, [load]);
  return covers;
}

/** Black vinyl: fine grooves, a blank run-out round the label, two soft highlights. */
function vinylTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  ctx.fillStyle = '#0b0b0d';
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  for (let r = c * 0.97; r > c * 0.42; r -= 1.6) {
    ctx.strokeStyle = `rgba(255,255,255,${0.025 + 0.03 * Math.abs(Math.sin(r * 0.21))})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Light catching the grooves on opposite sides, as on a real record.
  if (ctx.createConicGradient) {
    const g = ctx.createConicGradient(-0.6, c, c);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.08, 'rgba(255,255,255,0.16)');
    g.addColorStop(0.16, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(0.58, 'rgba(255,255,255,0.12)');
    g.addColorStop(0.66, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.97, 0, Math.PI * 2);
    ctx.arc(c, c, c * 0.42, 0, Math.PI * 2, true);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A soft shadow on the wall, a little below and right of the record. */
function shadowTexture() {
  const w = 256;
  const h = 160;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.filter = 'blur(10px)';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(w * 0.12, h * 0.14, w * 0.76, h * 0.72);
  return new THREE.CanvasTexture(canvas);
}

function Record({ record, cover, vinyl, shadow, highlighted, chosen, interactive, onHover, onSelect }) {
  const lift = useRef(null);
  const disc = useRef(null);
  const spin = useRef(null);
  const edges = useMemo(() => EDGE_LIGHT.map((l) => new THREE.MeshBasicMaterial({ color: new THREE.Color(EDGE).multiplyScalar(l) })), []);
  useEffect(() => () => edges.forEach((m) => m.dispose()), [edges]);
  // The sleeve's front face shows the cover; keyed so a material compiled
  // without a map is replaced once the cover arrives.
  const front = useMemo(
    () => (cover ? new THREE.MeshBasicMaterial({ map: cover, color: new THREE.Color(1, 1, 1).multiplyScalar(COVER_LIGHT) }) : new THREE.MeshBasicMaterial({ color: EMPTY })),
    [cover]
  );
  useEffect(() => () => front.dispose(), [front]);
  const sleeveMaterials = useMemo(() => [edges[0], edges[1], edges[2], edges[3], front, edges[5]], [edges, front]);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * MOTION);
    const out = chosen ? SLIDE.chosen : highlighted ? SLIDE.highlighted : 0;
    disc.current.position.x += (REST_OFFSET + out - disc.current.position.x) * k;
    const z = chosen || highlighted ? LIFT : 0;
    lift.current.position.z += (z - lift.current.position.z) * k;
    if (chosen) spin.current.rotation.z -= dt * SPIN;
  });

  const handlers = {
    onPointerOver: (e) => {
      e.stopPropagation();
      if (interactive) onHover(record.id);
    },
    onPointerOut: () => onHover(null),
    onClick: (e) => {
      e.stopPropagation();
      if (interactive && e.delta <= CLICK_SLOP_PX) onSelect(record.id);
    },
  };

  return (
    <group position={record.position}>
      <mesh position={[0.06, -0.03, 0.001]}>
        <planeGeometry args={[RECORD.sleeve + RECORD.peek + 0.16, RECORD.sleeve + 0.12]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
      <group ref={lift}>
        <group ref={disc} position={[REST_OFFSET, 0, 0.004]}>
          <group ref={spin}>
            <mesh>
              <circleGeometry args={[RECORD.disc / 2, 64]} />
              <meshBasicMaterial map={vinyl} />
            </mesh>
            <mesh position={[0, 0, 0.0005]}>
              <circleGeometry args={[LABEL_RADIUS, 48]} />
              {cover ? <meshBasicMaterial key="cover" map={cover} color={new THREE.Color(1, 1, 1).multiplyScalar(0.85)} /> : <meshBasicMaterial key="empty" color="#7a2a26" />}
            </mesh>
            <mesh position={[0, 0, 0.001]}>
              <circleGeometry args={[0.004, 16]} />
              <meshBasicMaterial color="#0b0b0d" />
            </mesh>
          </group>
        </group>
        <mesh position={[0, 0, 0.004 + SLEEVE_DEPTH / 2 + 0.002]} material={sleeveMaterials}>
          <boxGeometry args={[RECORD.sleeve, RECORD.sleeve, SLEEVE_DEPTH]} />
        </mesh>
        {/* One target over sleeve and disc, easier to hit than either. */}
        <mesh position={[(RECORD.peek + 0.02) / 2, 0, 0.02]} {...handlers}>
          <planeGeometry args={[RECORD.sleeve + RECORD.peek + 0.02, RECORD.sleeve + 0.02]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * visible      draw the records at all (not while standing outside with the door shut)
 * load         start loading the covers (the visitor stands inside)
 * highlighted  the record under the pointer or keyboard focus: it comes off the wall
 * chosen       the record whose page is open: its disc slides out and spins
 * interactive  records respond to the pointer (the visitor is in the studio)
 */
export default function StudioRecords({ visible, load, highlighted, chosen, interactive, onHover, onSelect, layer }) {
  const covers = useCovers(load);
  const vinyl = useMemo(() => vinylTexture(), []);
  const shadow = useMemo(() => shadowTexture(), []);
  useEffect(
    () => () => {
      vinyl.dispose();
      shadow.dispose();
    },
    [vinyl, shadow]
  );

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

  const shown = interactive && RECORDS.find((r) => r.id === highlighted && r.id !== chosen);
  return (
    <group visible={visible}>
      {RECORDS.map((r) => (
        <Record
          key={r.id}
          record={r}
          cover={covers[r.id]}
          vinyl={vinyl}
          shadow={shadow}
          highlighted={highlighted === r.id}
          chosen={chosen === r.id}
          interactive={interactive}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
      {shown && (
        <Html position={[shown.position[0] + RECORD.peek / 2, shown.position[1] + RECORD.sleeve / 2 + 0.09, shown.position[2] + LIFT]} center portal={layer} zIndexRange={[20, 10]}>
          <span className={styles.sceneLabel} aria-hidden="true">
            {shown.track.title}
            <small>{shown.track.with.length ? `${ARTIST.name} with ${shown.track.with.join(', ')}` : ARTIST.name}</small>
          </span>
        </Html>
      )}
    </group>
  );
}
