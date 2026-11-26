'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { EMAIL } from '@/constants/contact';
import { getQuality } from './quality';

// The house: the walkway and the rooms inside, modelled and lit in Blender
// (scripts/blender/walkway.py) with the light baked into its textures. Everything is drawn unlit, so it looks
// like the Cycles render and costs almost nothing to draw.
// Blender (x, y, z) is three.js (x, z, -y).

// Phones get the same model with smaller textures (quality.js). This module
// only ever loads in the browser (House is loaded without server rendering).
const QUALITY = getQuality();
const MODEL = QUALITY.model;
const MAILBOX = new THREE.Vector3(-1.6, 1.19, 8.4);

// The way to write to Benny has to be found without looking for it: a warm
// glow behind the mailbox, a tag floating above it, and a note on the front
// door. All three open the letter. Sizes are metres in the scene.
const TAG = { y: 1.64, width: 0.78, height: 0.22, bob: 0.025 }; // floats above the mailbox (its top is about 1.4)
const GLOW = { z: MAILBOX.z - 0.15, size: 2.4, low: 0.5, high: 0.95 }; // just behind it, so the mailbox stands in front
// On the door's outside face at about eye height, left of the handle, in the
// door's own frame (its hinge is the origin; it is 1.0 wide, 2.17 high, 0.11 thick).
const NOTE = { x: 0.42, y: 1.22, z: 0.113, width: 0.44, height: 0.29 };
// The door's invisible click target (bigger than the door, easier to hit).
const DOOR_TARGET = { at: [-0.6, 1.45, 0.1], size: [1.2, 2.3, 0.6] };
const DOOR_TARGET_FRONT = DOOR_TARGET.at[2] + DOOR_TARGET.size[2] / 2;
const PULSE_SPEED = 2.4; // radians a second: one slow breath every ~2.6 s
const FADE_RATE = 6; // how quickly the signs fade out when the letter opens or the visitor goes in
const WARM = '#ffb066'; // the house's lamp colour (its hint text and buttons use the same)

/** A small envelope, drawn so it doesn't depend on an emoji font. */
function envelope(ctx, x, y, w, colour, line) {
  const h = w * 0.68;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = line;
  ctx.strokeStyle = colour;
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w / 2, y + h * 0.58);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();
}

/** The floating tag: a dark pill with a warm edge, an envelope and the words. */
function tagTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 288;
  const ctx = canvas.getContext('2d');
  const r = 130;
  const pill = new Path2D();
  pill.roundRect(14, 14, canvas.width - 28, canvas.height - 28, r);
  ctx.fillStyle = 'rgba(22, 20, 28, 0.86)';
  ctx.fill(pill);
  ctx.lineWidth = 10;
  ctx.strokeStyle = WARM;
  ctx.stroke(pill);
  envelope(ctx, 120, 100, 130, WARM, 12);
  ctx.fillStyle = '#fff4e6';
  ctx.textBaseline = 'middle';
  ctx.font = '600 104px Inter, -apple-system, "Segoe UI", sans-serif';
  ctx.fillText('Write to me', 300, canvas.height / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The note on the door: a cream card with an envelope, pointing to the mailbox. */
function noteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  const card = new Path2D();
  card.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 28);
  ctx.fillStyle = '#f6ecd9';
  ctx.fill(card);
  ctx.lineWidth = 12;
  ctx.strokeStyle = WARM;
  ctx.stroke(card);
  envelope(ctx, 215, 60, 170, '#a4501c', 13);
  ctx.fillStyle = '#3a2614';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 72px Inter, -apple-system, "Segoe UI", sans-serif';
  ctx.fillText('Write to me', canvas.width / 2, 250);
  ctx.font = '500 46px Inter, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = '#7a4a22';
  ctx.fillText('\u2190 at the mailbox', canvas.width / 2, 322);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** A soft warm halo: bright in the middle, gone at the edge. */
function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255, 176, 102, 1)');
  g.addColorStop(0.3, 'rgba(255, 150, 80, 0.5)');
  g.addColorStop(1, 'rgba(255, 140, 70, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// The plant by the living-room window sways a little, as if in a draught.
// It is part of the baked mesh, so the sway happens in the vertex shader:
// only vertices near the plant and above its pot's rim move, by a couple of
// centimetres. Positions are three.js metres (scripts/blender/walkway.py,
// living_room(): the plant stands at Blender (4.05, 0.75), its pot 0.72 high).
const SWAY = { centre: [4.05, -0.75], inner: 0.25, outer: 0.5, from: 0.76, full: 1.6, amount: 0.022 };

function addSway(material, time) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSwayTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSwayTime;')
      .replace(
        '#include <project_vertex>',
        `{
          vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
          float r = length(wp.xz - vec2(${SWAY.centre[0].toFixed(3)}, ${SWAY.centre[1].toFixed(3)}));
          float k = (1.0 - smoothstep(${SWAY.inner.toFixed(3)}, ${SWAY.outer.toFixed(3)}, r)) * smoothstep(${SWAY.from.toFixed(3)}, ${SWAY.full.toFixed(3)}, wp.y);
          if (k > 0.0) {
            float t = uSwayTime;
            vec3 off = vec3(
              sin(t * 1.3 + wp.y * 2.5) + 0.4 * sin(t * 2.9 + wp.x * 7.0),
              0.0,
              0.5 * sin(t * 1.1 + 1.7 + wp.y * 3.0)
            ) * ${SWAY.amount.toFixed(4)} * k;
            transformed += inverse(mat3(modelMatrix)) * off;
          }
        }
        #include <project_vertex>`
      );
  };
}

function plateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 439;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#8a6c3a');
  g.addColorStop(0.5, '#6f5530');
  g.addColorStop(1, '#5b4526');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Brushed lines.
  ctx.globalAlpha = 0.06;
  for (let y = 0; y < canvas.height; y += 3) {
    ctx.fillStyle = y % 2 ? '#fff' : '#000';
    ctx.fillRect(0, y, canvas.width, 1);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(20, 14, 6, 0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(24, 16, 6, 0.85)';
  ctx.font = '600 58px ui-monospace, "SF Mono", Menlo, monospace';
  ctx.fillText('B. HINN', canvas.width / 2, 130);
  ctx.font = '500 64px ui-monospace, "SF Mono", Menlo, monospace';
  ctx.fillText(EMAIL, canvas.width / 2, 250);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// On the canvas, like the other things you can use: the house layer's own
// cursor (house.module.css) would hide one set on the page body.
function useHoverCursor(hovered) {
  const { gl } = useThree();
  useEffect(() => {
    if (!hovered) return undefined;
    const el = gl.domElement;
    const before = el.style.cursor;
    el.style.cursor = 'pointer';
    return () => {
      el.style.cursor = before;
    };
  }, [gl, hovered]);
}

/**
 * doorOpen     the front door swings open (walking in, or anywhere inside)
 * flagUp       the mailbox flag is raised (the letter is open)
 * interactive  the mailbox and door respond to hover and clicks
 */
export default function Walkway({ doorOpen, flagUp: flagRaised, interactive, onMailbox, onDoor, onLoaded, reducedMotion }) {
  const { scene } = useGLTF(MODEL, false, true);
  const swayTime = useMemo(() => ({ value: 0 }), []);
  const [hover, setHover] = useState(null); // 'mailbox' | 'note' | 'door' | null
  useHoverCursor(Boolean(hover) && interactive);

  // Hover ends when the visitor walks away from the mailbox and door.
  useEffect(() => {
    if (!interactive) setHover(null);
  }, [interactive]);

  const parts = useMemo(() => {
    const found = {};
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const name = o.name || o.parent?.name;
      if (name === 'WindowGlass') {
        o.material = new THREE.MeshBasicMaterial({ color: '#cfd8e8', transparent: true, opacity: 0.07, depthWrite: false });
      } else if (name === 'MailPlate') {
        o.visible = false; // replaced by the engraved plate below
      } else if (o.material.map) {
        const map = o.material.map;
        map.anisotropy = QUALITY.anisotropy;
        // Foliage cards are single quads, seen from both sides.
        o.material = new THREE.MeshBasicMaterial({ map, side: name === 'Foliage' ? THREE.DoubleSide : THREE.FrontSide });
        // The plant is in the living room's mesh; the sway only touches vertices near it.
        if (name !== 'Foliage') addSway(o.material, swayTime);
      }
      found[name] = o;
    });

    // Compression re-centres each mesh, so moving parts are hung on a pivot
    // placed where their real hinge is, measured from the mesh itself.
    scene.updateMatrixWorld(true);
    const hinge = (mesh, at) => {
      if (mesh.parent.userData.pivot) return mesh.parent; // already hung (React may run this twice)
      const box = new THREE.Box3().setFromObject(mesh);
      const pivot = new THREE.Group();
      pivot.userData.pivot = true;
      pivot.position.copy(at(box));
      mesh.parent.add(pivot);
      pivot.updateMatrixWorld(true);
      pivot.attach(mesh);
      return pivot;
    };
    const pivots = {};
    // Front door: hinges on the left jamb (the handle is on the right), on the
    // inside face, so it swings into the hall.
    if (found.Door) pivots.door = hinge(found.Door, (b) => new THREE.Vector3(b.min.x, b.min.y, b.min.z));
    // Mailbox flag: pivots at the front end of its arm, near the bottom.
    if (found.MailFlag) pivots.flag = hinge(found.MailFlag, (b) => new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + 0.01, b.max.z - 0.01));
    return { ...found, pivots };
  }, [scene, swayTime]);

  const plate = useMemo(() => plateTexture(), []);
  const signs = useMemo(() => ({ tag: tagTexture(), note: noteTexture(), glow: glowTexture() }), []);
  useEffect(() => () => Object.values(signs).forEach((t) => t.dispose()), [signs]);
  const tag = useRef();
  const glow = useRef();

  // The note is hung on the door's hinge, so it swings in with the door.
  const note = useMemo(() => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(NOTE.width, NOTE.height),
      new THREE.MeshBasicMaterial({ map: signs.note, transparent: true, fog: false })
    );
    mesh.position.set(NOTE.x, NOTE.y, NOTE.z);
    return mesh;
  }, [signs]);
  useEffect(() => {
    const door = parts.pivots.door;
    if (!door) return undefined;
    door.add(note);
    return () => {
      door.remove(note);
      note.geometry.dispose();
      note.material.dispose();
    };
  }, [parts, note]);
  // Where the note's click target goes: in front of the door's own target,
  // which would otherwise catch the click and take the visitor inside.
  const noteAt = useMemo(() => {
    const door = parts.pivots.door;
    if (!door) return null;
    door.updateWorldMatrix(true, false);
    return new THREE.Vector3(NOTE.x, NOTE.y, NOTE.z).applyMatrix4(door.matrixWorld);
  }, [parts]);

  // Development only: lets test scripts freeze the door and inspect parts.
  const freeze = useRef(null);
  const freezeFlag = useRef(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return undefined;
    window.__house = {
      parts,
      setDoor: (v) => {
        freeze.current = v;
      },
      setFlag: (v) => {
        freezeFlag.current = v;
      },
    };
    return () => {
      delete window.__house;
    };
  }, [parts]);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded]);

  // Door swings open when the visitor goes in; the mailbox flag lifts on hover.
  const doorAmount = useRef(0); // 0 closed, 1 open
  const flagUp = useRef(0); // 0 down, 1 raised
  const shown = useRef(0); // the signs: 0 hidden, 1 shown
  const pulseTime = useRef(0);
  useFrame((_, dt) => {
    // The signs: shown while the mailbox can be used, breathing gently (still for reduced motion).
    shown.current += ((interactive ? 1 : 0) - shown.current) * (1 - Math.exp(-dt * FADE_RATE));
    if (!reducedMotion) pulseTime.current += dt;
    const breath = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(pulseTime.current * PULSE_SPEED);
    const lit = hover === 'mailbox' || hover === 'note' ? 1 : breath;
    if (glow.current) {
      glow.current.material.opacity = shown.current * (GLOW.low + (GLOW.high - GLOW.low) * lit);
      glow.current.visible = shown.current > 0.01;
    }
    if (tag.current) {
      tag.current.position.y = TAG.y + (reducedMotion ? 0 : Math.sin(pulseTime.current * PULSE_SPEED * 0.5) * TAG.bob);
      tag.current.material.opacity = shown.current;
      tag.current.visible = shown.current > 0.01;
    }
    note.material.color.setScalar(hover === 'note' ? 1.12 : 0.92 + 0.08 * breath);

    if (!reducedMotion) swayTime.value += dt;
    const k = 1 - Math.exp(-dt * 5);
    const door = parts.pivots.door;
    if (door) {
      const target = doorOpen ? 1 : hover === 'door' ? 0.04 : 0;
      doorAmount.current += (target - doorAmount.current) * (doorOpen ? 1 - Math.exp(-dt * 2.2) : k);
      if (freeze.current !== null) doorAmount.current = freeze.current;
      door.rotation.y = doorAmount.current * 1.66; // about 95 degrees: wide open, so the hall (and its arrivals board) is in clear view
      parts.Door.material.color.setScalar(hover === 'door' && interactive ? 1.18 : 1);
    }
    const flag = parts.pivots.flag;
    if (flag) {
      const target = hover === 'mailbox' || hover === 'note' || flagRaised ? 1 : 0;
      flagUp.current += (target - flagUp.current) * (1 - Math.exp(-dt * 7));
      if (freezeFlag.current !== null) flagUp.current = freezeFlag.current;
      flag.rotation.x = flagUp.current * (Math.PI / 2);
    }
  });

  const over = (what) => (e) => {
    e.stopPropagation();
    if (interactive) setHover(what);
  };
  const out = () => setHover(null);

  return (
    <group>
      <primitive object={scene} />

      {/* Engraved plate on the mailbox. */}
      <mesh position={[MAILBOX.x, 1.155, MAILBOX.z + 0.252]}>
        <planeGeometry args={[0.28, 0.12]} />
        <meshBasicMaterial map={plate} color={hover === 'mailbox' ? '#ffffff' : '#e8e2d6'} />
      </mesh>

      {/* The glow behind the mailbox and the tag above it. */}
      <sprite ref={glow} position={[MAILBOX.x, MAILBOX.y - 0.1, GLOW.z]} scale={[GLOW.size, GLOW.size, 1]} renderOrder={1}>
        <spriteMaterial map={signs.glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
      </sprite>
      <sprite
        ref={tag}
        position={[MAILBOX.x, TAG.y, MAILBOX.z]}
        scale={[TAG.width, TAG.height, 1]}
        renderOrder={2}
        onPointerOver={over('mailbox')}
        onPointerOut={out}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive) onMailbox();
        }}
      >
        <spriteMaterial map={signs.tag} transparent fog={false} />
      </sprite>

      {/* The note on the door opens the letter, not the door. */}
      {noteAt && (
        <mesh
          position={[noteAt.x, noteAt.y, DOOR_TARGET_FRONT + 0.06]}
          onPointerOver={over('note')}
          onPointerOut={out}
          onClick={(e) => {
            e.stopPropagation();
            if (interactive) onMailbox();
          }}
        >
          <boxGeometry args={[NOTE.width + 0.08, NOTE.height + 0.08, 0.1]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}

      {/* Generous invisible targets, easier to hit than the meshes themselves. */}
      <mesh
        position={[MAILBOX.x, 1.05, MAILBOX.z]}
        onPointerOver={over('mailbox')}
        onPointerOut={out}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive) onMailbox();
        }}
      >
        <boxGeometry args={[0.7, 1.1, 0.8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh
        position={DOOR_TARGET.at}
        onPointerOver={over('door')}
        onPointerOut={out}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive) onDoor();
        }}
      >
        <boxGeometry args={DOOR_TARGET.size} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}

useGLTF.preload(MODEL, false, true);
