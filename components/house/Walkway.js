'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
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

function useHoverCursor(hovered) {
  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);
}

/**
 * doorOpen     the front door swings open (walking in, or anywhere inside)
 * flagUp       the mailbox flag is raised (the letter is open)
 * interactive  the mailbox and door respond to hover and clicks
 */
export default function Walkway({ doorOpen, flagUp: flagRaised, interactive, onMailbox, onDoor, onLoaded, reducedMotion }) {
  const { scene } = useGLTF(MODEL, false, true);
  const swayTime = useMemo(() => ({ value: 0 }), []);
  const [hover, setHover] = useState(null); // 'mailbox' | 'door' | null
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
  useFrame((_, dt) => {
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
      const target = hover === 'mailbox' || flagRaised ? 1 : 0;
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
        position={[-0.6, 1.45, 0.1]}
        onPointerOver={over('door')}
        onPointerOut={out}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive) onDoor();
        }}
      >
        <boxGeometry args={[1.2, 2.3, 0.6]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}

useGLTF.preload(MODEL, false, true);
