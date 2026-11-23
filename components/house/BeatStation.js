'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { KEYS, PADS, PAD_KEYS, PAD_SOUNDS, noteHz } from './beatLayout';
import { drum, note } from './sound';

// Makes the studio desk's drum pads and MIDI keyboard playable. The pads and
// keys themselves are baked into the house; this lays an invisible target
// over each, plays its sound when pressed, and lights it up for a moment.
// On a keyboard, Z X C V / A S D F / Q W E R / 1 2 3 4 play the pads, laid
// out like the pads (bottom row first).

const FLASH_MS = 180;
const PAD_GLOW = '#ffb46b';
const KEY_GLOW = '#8fd3ff';

function Target({ position, size, height, glow, onPress, flashAt }) {
  const light = useRef(null);
  useFrame(() => {
    const since = performance.now() - (flashAt.current ?? -1e9);
    const k = Math.max(0, 1 - since / FLASH_MS);
    light.current.material.opacity = 0.75 * k;
    light.current.visible = k > 0;
  });
  return (
    <group position={position}>
      <mesh
        position={[0, height / 2, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPress();
        }}
      >
        <boxGeometry args={[size[0], height, size[1]]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh ref={light} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]} visible={false}>
        <planeGeometry args={[size[0] * 0.92, size[1] * 0.92]} />
        <meshBasicMaterial color={glow} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/** active  the visitor sits at the beat station: pads and keys play */
export default function BeatStation({ active }) {
  const padFlash = useMemo(() => PADS.map(() => ({ current: null })), []);
  const keyFlash = useMemo(() => KEYS.map(() => ({ current: null })), []);

  const hitPad = (i) => {
    padFlash[i].current = performance.now();
    drum(PAD_SOUNDS[i]);
  };

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.matches('input, textarea, [contenteditable="true"]')) return;
      const i = PAD_KEYS.indexOf(e.key.toLowerCase());
      if (i < 0) return;
      e.preventDefault();
      hitPad(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;
  return (
    <group>
      {PADS.map((p) => (
        <Target key={`pad-${p.index}`} position={p.position} size={p.size} height={0.02} glow={PAD_GLOW} flashAt={padFlash[p.index]} onPress={() => hitPad(p.index)} />
      ))}
      {KEYS.map((k, i) => (
        <Target
          key={`key-${k.note}`}
          position={k.position}
          size={k.size}
          height={k.black ? 0.016 : 0.012}
          glow={KEY_GLOW}
          flashAt={keyFlash[i]}
          onPress={() => {
            keyFlash[i].current = performance.now();
            note(noteHz(k.note));
          }}
        />
      ))}
    </group>
  );
}
