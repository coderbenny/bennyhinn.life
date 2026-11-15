'use client';

import { useFrame } from '@react-three/fiber';

// Placeholder for Phase 0: blocks in the right places so the camera, the
// loading and the page wiring can be built. Phase 1 replaces this with the
// modelled walkway from Blender.

const DUSK = '#1b1f2e';
const WARM = '#ffb066';

function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color="#1f2620" roughness={1} />
    </mesh>
  );
}

function Path() {
  const stones = Array.from({ length: 7 }, (_, i) => i);
  return stones.map((i) => (
    <mesh key={i} position={[0, 0.02, 6.4 - i * 1.05]} receiveShadow>
      <boxGeometry args={[1.3, 0.04, 0.7]} />
      <meshStandardMaterial color="#5b5a57" roughness={0.9} />
    </mesh>
  ));
}

function Facade() {
  return (
    <group position={[0, 0, -1.5]}>
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[7, 3.2, 3]} />
        <meshStandardMaterial color="#b9b2a7" roughness={0.85} />
      </mesh>
      {/* Flat roof with a thin overhang. */}
      <mesh position={[0, 3.28, 0.15]} castShadow>
        <boxGeometry args={[7.6, 0.16, 3.6]} />
        <meshStandardMaterial color="#2a2b2f" roughness={0.7} />
      </mesh>
      {/* Door. */}
      <mesh position={[0, 1.05, 1.51]}>
        <boxGeometry args={[1, 2.1, 0.05]} />
        <meshStandardMaterial color="#5a3b26" roughness={0.6} />
      </mesh>
      {/* Lit window. */}
      <mesh position={[2.1, 1.6, 1.51]}>
        <planeGeometry args={[1.8, 1.3]} />
        <meshStandardMaterial color={WARM} emissive={WARM} emissiveIntensity={1.4} />
      </mesh>
      <pointLight position={[2.1, 1.6, 2.2]} color={WARM} intensity={6} distance={7} decay={2} />
      {/* Porch light over the door. */}
      <pointLight position={[0, 2.5, 2]} color={WARM} intensity={4} distance={5} decay={2} castShadow />
    </group>
  );
}

function Mailbox() {
  return (
    <group position={[-1.5, 0, 5.2]} rotation-y={0.35}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.08, 1, 0.08]} />
        <meshStandardMaterial color="#2a2b2f" />
      </mesh>
      <mesh position={[0, 1.12, 0]} castShadow>
        <boxGeometry args={[0.32, 0.26, 0.5]} />
        <meshStandardMaterial color="#c4472f" roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Phase 1: a plate with the email, a flag that lifts on hover. */}
    </group>
  );
}

function Drift() {
  // A very slow sway, so the first shot feels alive without moving much.
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;
    camera.position.x = 0.6 + Math.sin(t * 0.12) * 0.25;
    camera.position.y = 1.6 + Math.sin(t * 0.17) * 0.05;
    camera.lookAt(0, 1.3, 0);
  });
  return null;
}

export default function Walkway() {
  return (
    <>
      <color attach="background" args={[DUSK]} />
      <fog attach="fog" args={[DUSK, 12, 40]} />
      <hemisphereLight args={['#6d7aa8', '#1a1a14', 0.6]} />
      <directionalLight position={[-6, 8, 4]} intensity={0.35} color="#9fb0e0" castShadow />
      <Ground />
      <Path />
      <Facade />
      <Mailbox />
      <Drift />
    </>
  );
}
