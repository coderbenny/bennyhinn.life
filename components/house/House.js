'use client';

import { Canvas } from '@react-three/fiber';
import Walkway from './Walkway';

export default function House({ onReady }) {
  return (
    <Canvas
      className="house-canvas"
      dpr={[1, 2]}
      shadows
      camera={{ fov: 45, near: 0.1, far: 120, position: [0.6, 1.6, 9] }}
      gl={{ antialias: true }}
      onCreated={() => requestAnimationFrame(() => onReady?.())}
    >
      <Walkway />
    </Canvas>
  );
}
