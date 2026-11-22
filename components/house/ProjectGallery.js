'use client';

import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { FRAME, frameImage, subtitle } from './galleryLayout';
import { FRAMES } from './spots';
import styles from './house.module.css';

// The framed projects on the gallery walls. Drawn unlit, like the rest of
// the scene; the walls behind them carry the baked light of the ceiling spots.

const MOULDING = '#2b2622';
const MAT = '#efe9dd';
const EMPTY = '#2a2c33'; // the picture while its image loads
const PICTURE_LIGHT = 0.94; // pictures sit a touch below full brightness, like a print under a lamp
const FACE_LIGHT = [0.62, 0.62, 0.8, 0.4, 0.75, 0.3]; // moulding: +x, -x, +y, -y, front, back
const DEPTH = 0.035; // metres the moulding stands off the wall
const LABEL = { width: 0.3, height: 0.123, below: 0.05 }; // metres; museum label under the frame
const CLICK_SLOP_PX = 6;

/**
 * Loads the frame pictures once `load` is true (the visitor has headed
 * inside), without suspending: frames show a dark card until theirs arrives.
 * Each picture is cropped to the frame's shape, keeping the top of the page.
 */
function usePictures(load) {
  const [pictures, setPictures] = useState({});
  useEffect(() => {
    if (!load) return undefined;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    const loaded = [];
    for (const f of FRAMES) {
      loader.load(
        frameImage(f.project),
        (tex) => {
          loaded.push(tex);
          if (cancelled) return;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          const aspect = tex.image.width / tex.image.height;
          if (aspect > FRAME.aspect) {
            tex.repeat.set(FRAME.aspect / aspect, 1);
            tex.offset.set((1 - tex.repeat.x) / 2, 0);
          } else {
            tex.repeat.set(1, aspect / FRAME.aspect);
            tex.offset.set(0, 1 - tex.repeat.y);
          }
          setPictures((p) => ({ ...p, [f.id]: tex }));
        },
        undefined,
        // A missing picture leaves the dark card; say which one, once.
        () => console.warn(`Gallery: could not load ${frameImage(f.project)}`)
      );
    }
    return () => {
      cancelled = true;
      for (const t of loaded) t.dispose();
    };
  }, [load]);
  return pictures;
}

/** The museum label: name, subtitle, category (and year), stack. */
function labelTexture(project) {
  const w = 1024;
  const h = Math.round((w * LABEL.height) / LABEL.width);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f6f2ea';
  ctx.fillRect(0, 0, w, h);
  const pad = 44;
  let y = pad;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#1f1a14';
  ctx.font = '700 62px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(project.name.split(' - ')[0], pad, y, w - 2 * pad);
  y += 78;
  ctx.fillStyle = '#4a4237';
  ctx.font = 'italic 400 40px ui-serif, Georgia, serif';
  ctx.fillText(subtitle(project), pad, y, w - 2 * pad);
  y += 62;
  ctx.fillStyle = '#7a6f60';
  ctx.font = '600 30px ui-sans-serif, system-ui, sans-serif';
  const meta = [project.category, project.year].filter(Boolean).join(' · ').toUpperCase();
  ctx.fillText(meta, pad, y, w - 2 * pad);
  y += 48;
  ctx.font = '400 32px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(project.tech.slice(0, 4).join(' · '), pad, y, w - 2 * pad);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** A soft shadow on the wall, a little below the frame. */
function shadowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function Frame({ frame, picture, shadow, highlighted, interactive, onHover, onSelect }) {
  const outerW = frame.width + 2 * (FRAME.border + FRAME.mat);
  const outerH = frame.height + 2 * (FRAME.border + FRAME.mat);
  const { moulding, label } = useMemo(() => {
    const base = new THREE.Color(MOULDING);
    return {
      moulding: FACE_LIGHT.map((l) => new THREE.MeshBasicMaterial({ color: base.clone().multiplyScalar(l) })),
      label: labelTexture(frame.project),
    };
  }, [frame]);
  useEffect(
    () => () => {
      for (const m of moulding) m.dispose();
      label.dispose();
    },
    [moulding, label]
  );
  // The moulding catches a little more light when the frame is picked out.
  useEffect(() => {
    const k = highlighted ? 1.6 : 1;
    const base = new THREE.Color(MOULDING);
    moulding.forEach((m, i) => m.color.copy(base).multiplyScalar(FACE_LIGHT[i] * k));
  }, [highlighted, moulding]);

  return (
    <group position={frame.position} rotation={[0, (frame.facing * Math.PI) / 2, 0]}>
      <mesh position={[0.02, -0.04, 0.002]}>
        <planeGeometry args={[outerW * 1.25, outerH * 1.35]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
      <mesh
        position={[0, 0, DEPTH / 2 + 0.004]}
        material={moulding}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (interactive) onHover(frame.id);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive && e.delta <= CLICK_SLOP_PX) onSelect(frame.id);
        }}
      >
        <boxGeometry args={[outerW, outerH, DEPTH]} />
      </mesh>
      <mesh position={[0, 0, DEPTH + 0.0045]}>
        <planeGeometry args={[outerW - 2 * FRAME.border, outerH - 2 * FRAME.border]} />
        <meshBasicMaterial color={new THREE.Color(MAT).multiplyScalar(0.9)} />
      </mesh>
      <mesh position={[0, 0, DEPTH + 0.005]}>
        <planeGeometry args={[frame.width, frame.height]} />
        {/* Keyed, so the picture gets a new material: one compiled without a
            texture would keep ignoring the map added to it later. */}
        {picture ? (
          <meshBasicMaterial key="picture" map={picture} color={new THREE.Color(1, 1, 1).multiplyScalar(PICTURE_LIGHT)} />
        ) : (
          <meshBasicMaterial key="empty" color={EMPTY} />
        )}
      </mesh>
      <mesh position={[-outerW / 2 + LABEL.width / 2, -outerH / 2 - LABEL.below - LABEL.height / 2, 0.006]}>
        <planeGeometry args={[LABEL.width, LABEL.height]} />
        <meshBasicMaterial map={label} color={new THREE.Color(1, 1, 1).multiplyScalar(0.92)} />
      </mesh>
    </group>
  );
}

/**
 * visible      draw the frames at all (not while standing outside with the door shut)
 * load         start loading the pictures (the visitor stands inside)
 * highlighted  the frame under the pointer or keyboard focus
 * interactive  frames respond to the pointer (the visitor is in the gallery)
 */
export default function Gallery({ visible, load, highlighted, interactive, onHover, onSelect, layer }) {
  const pictures = usePictures(load);
  const shadow = useMemo(() => shadowTexture(), []);
  useEffect(() => () => shadow.dispose(), [shadow]);

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

  const shown = interactive && FRAMES.find((f) => f.id === highlighted);
  return (
    <group visible={visible}>
      {FRAMES.map((f) => (
        <Frame
          key={f.id}
          frame={f}
          picture={pictures[f.id]}
          shadow={shadow}
          highlighted={highlighted === f.id}
          interactive={interactive}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
      {shown && (
        <Html
          position={[shown.position[0] + shown.facing * 0.05, shown.position[1] + shown.height / 2 + 0.14, shown.position[2]]}
          center
          portal={layer}
          zIndexRange={[20, 10]}
        >
          <span className={styles.sceneLabel} aria-hidden="true">
            {shown.name}
            <small>{shown.project.category}</small>
          </span>
        </Html>
      )}
    </group>
  );
}
