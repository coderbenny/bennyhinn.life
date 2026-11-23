'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MUG } from './deskLayout';

// A mug of coffee on the desk, with steam curling up from it. The mug is
// drawn unlit with its shading painted on; the steam is a few soft wisps
// drawn by a small shader, always turned towards the camera.

/** Wraps round the mug: lit from the left (the desk lamp), shadowed on the right. */
function shadingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  // u runs round the cylinder; three.js starts it at +z (facing the room).
  g.addColorStop(0, '#d9d2c4');
  g.addColorStop(0.25, '#8f897f');
  g.addColorStop(0.5, '#5f5a53');
  g.addColorStop(0.75, '#e6dfd1');
  g.addColorStop(1, '#d9d2c4');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 8);
  // A terracotta band round the middle.
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#c86a45';
  ctx.fillRect(0, 3, 256, 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const steamVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// One wisp: a soft line that sways more the higher it rises, fading in at
// the cup and out at the top.
const steamFragment = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  varying vec2 vUv;
  void main() {
    float y = vUv.y;
    float t = uTime * 0.55 + uPhase;
    float centre = 0.5
      + sin(y * 5.5 - t * 2.1) * 0.16 * y
      + sin(y * 11.0 - t * 3.3 + uPhase) * 0.05 * y;
    float width = mix(0.05, 0.2, y);
    float line = 1.0 - smoothstep(0.0, width, abs(vUv.x - centre));
    float fade = smoothstep(0.0, 0.18, y) * (1.0 - smoothstep(0.45, 1.0, y));
    // Rising puffs, so the wisp breaks up rather than standing still.
    float puffs = 0.55 + 0.45 * sin(y * 9.0 - t * 4.0 + uPhase * 2.0);
    gl_FragColor = vec4(vec3(0.93), line * fade * puffs * 0.26);
  }
`;

function Wisp({ phase, offset, time }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: time, uPhase: { value: phase } },
        vertexShader: steamVertex,
        fragmentShader: steamFragment,
        transparent: true,
        depthWrite: false,
      }),
    [phase, time]
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh position={[offset, 0.13, 0]} material={material}>
      <planeGeometry args={[0.09, 0.22]} />
    </mesh>
  );
}

/** reducedMotion  the steam holds still */
export default function DeskMug({ visible, reducedMotion }) {
  const shading = useMemo(() => shadingTexture(), []);
  useEffect(() => () => shading.dispose(), [shading]);
  const time = useMemo(() => ({ value: 0 }), []);
  const steam = useRef(null);
  const { radius: r, height: h } = MUG;

  useFrame((state, dt) => {
    if (!reducedMotion) time.value += dt;
    // Turn the steam to face the camera, around the vertical only.
    const g = steam.current;
    const cam = state.camera.position;
    g.rotation.y = Math.atan2(cam.x - MUG.position[0], cam.z - MUG.position[2]);
  });

  return (
    <group position={MUG.position} visible={visible}>
      {/* A soft contact shadow on the desk. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.006, 0.001, 0.004]}>
        <circleGeometry args={[r * 1.35, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r * 0.94, h, 32, 1, true]} />
        <meshBasicMaterial map={shading} side={THREE.DoubleSide} />
      </mesh>
      {/* Coffee, a little below the rim. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, h - 0.012, 0]}>
        <circleGeometry args={[r * 0.97, 32]} />
        <meshBasicMaterial color="#2a1a10" />
      </mesh>
      {/* The handle, on the right as seen from the room. */}
      <mesh position={[r - 0.004, h * 0.5, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <torusGeometry args={[0.024, 0.0065, 10, 24, Math.PI]} />
        <meshBasicMaterial color="#8a847a" />
      </mesh>
      <group ref={steam} position={[0, h - 0.01, 0]}>
        <Wisp phase={0} offset={-0.012} time={time} />
        <Wisp phase={2.1} offset={0.014} time={time} />
        <Wisp phase={4.3} offset={0.0} time={time} />
      </group>
    </group>
  );
}
