'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { EMAIL } from '@/constants/contact';

// The walkway, modelled and lit in Blender (scripts/blender/walkway.py) with
// the light baked into its textures. Everything is drawn unlit, so it looks
// like the Cycles render and costs almost nothing to draw.
// Blender (x, y, z) is three.js (x, z, -y).

const MODEL = '/house/walkway.glb';
const MAILBOX = new THREE.Vector3(-1.6, 1.19, 8.4);

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

export default function Walkway({ stage, onMailbox, onDoor, onLoaded }) {
  const { scene } = useGLTF(MODEL, false, true);
  const [hover, setHover] = useState(null); // 'mailbox' | 'door' | null
  useHoverCursor(Boolean(hover) && stage === 'outside');

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
        map.anisotropy = 8;
        o.material = new THREE.MeshBasicMaterial({ map });
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
  }, [scene]);

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
  const doorOpen = useRef(0);
  const flagUp = useRef(0);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 5);
    const door = parts.pivots.door;
    if (door) {
      const target = stage === 'entering' || stage === 'inside' ? 1 : hover === 'door' ? 0.04 : 0;
      doorOpen.current += (target - doorOpen.current) * (stage === 'entering' ? 1 - Math.exp(-dt * 2.2) : k);
      if (freeze.current !== null) doorOpen.current = freeze.current;
      door.rotation.y = doorOpen.current * 1.45; // about 83 degrees, like a door pushed open by hand
      parts.Door.material.color.setScalar(hover === 'door' && stage === 'outside' ? 1.18 : 1);
    }
    const flag = parts.pivots.flag;
    if (flag) {
      const target = hover === 'mailbox' || stage === 'letter' ? 1 : 0;
      flagUp.current += (target - flagUp.current) * (1 - Math.exp(-dt * 7));
      if (freezeFlag.current !== null) flagUp.current = freezeFlag.current;
      flag.rotation.x = flagUp.current * (Math.PI / 2);
    }
  });

  const interactive = stage === 'outside';
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
