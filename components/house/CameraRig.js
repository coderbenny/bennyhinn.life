'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Where the camera stands and looks, in three.js coordinates.
const SHOTS = {
  walkway: { pos: [0.2, 1.6, 13.6], look: [-0.4, 1.45, 1.0] },
  porch: { pos: [-0.6, 1.6, 3.4], look: [-0.6, 1.5, 0] },
  hall: { pos: [-0.6, 1.6, -0.55], look: [-0.75, 1.3, -4.2] },
};

const ENTER_SECONDS = 3.4;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function CameraRig({ stage, onArrived, reducedMotion }) {
  const { camera, size, pointer } = useThree();
  const portrait = size.width < size.height;

  const path = useMemo(() => {
    const p = (shot) => new THREE.Vector3(...SHOTS[shot].pos);
    const l = (shot) => new THREE.Vector3(...SHOTS[shot].look);
    return {
      pos: new THREE.CatmullRomCurve3([p('walkway'), p('porch'), p('hall')]),
      look: new THREE.CatmullRomCurve3([l('walkway'), l('porch'), l('hall')]),
    };
  }, []);

  // Phones in portrait see less width, so the first shot steps back and widens.
  useEffect(() => {
    camera.fov = portrait ? 62 : 45;
    camera.updateProjectionMatrix();
  }, [camera, portrait]);

  const progress = useRef(0); // 0 = walkway, 1 = hall
  const arrived = useRef(stage === 'inside');
  const look = useRef(new THREE.Vector3());
  const pos = useRef(new THREE.Vector3());

  useFrame(({ clock }, dt) => {
    if (process.env.NODE_ENV === 'development' && window.__houseCamera) {
      const c = window.__houseCamera;
      camera.position.set(...c.pos);
      camera.lookAt(...c.look);
      return;
    }
    const going = stage === 'entering' || stage === 'inside';
    const step = reducedMotion ? 1 : dt / ENTER_SECONDS;
    progress.current = THREE.MathUtils.clamp(progress.current + (going ? step : -step), 0, 1);
    if (going && progress.current === 1 && !arrived.current) {
      arrived.current = true;
      onArrived?.();
    }
    if (!going) arrived.current = false;

    const t = ease(progress.current);
    path.pos.getPoint(t, pos.current);
    path.look.getPoint(t, look.current);

    // At the walkway the shot breathes slowly and follows the pointer a little.
    const still = 1 - t;
    if (!reducedMotion && still > 0) {
      const time = clock.elapsedTime;
      pos.current.x += (Math.sin(time * 0.11) * 0.18 + pointer.x * 0.35) * still;
      pos.current.y += (Math.sin(time * 0.16) * 0.04 + pointer.y * 0.12) * still;
    }
    if (portrait) pos.current.z += 2.5 * still;

    camera.position.lerp(pos.current, reducedMotion ? 1 : 1 - Math.exp(-dt * 6));
    camera.lookAt(look.current);
  });

  return null;
}
