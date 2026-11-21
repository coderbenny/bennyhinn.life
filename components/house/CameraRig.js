'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HOME, SPOTS, route, walkSeconds, withLooks } from './spots';

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Phones in portrait see less width, so every shot widens, and the walkway
// shot also steps back.
const PORTRAIT_FOV_SCALE = 1.35;
const MAX_FOV = 75;
const PORTRAIT_WALKWAY_STEP_BACK = 2.5;

// Drag to look around: how far, and how quickly the view follows the pointer.
const DRAG_RADIANS_PER_PIXEL = 0.004;
const MAX_YAW = THREE.MathUtils.degToRad(40);
const MAX_PITCH = THREE.MathUtils.degToRad(20);
const LOOK_DAMPING = 8;
const POSITION_DAMPING = 6;

const fovFor = (id, portrait) => Math.min(MAX_FOV, SPOTS[id].fov * (portrait ? PORTRAIT_FOV_SCALE : 1));

/**
 * Moves the camera to the spot `target`, walking the route between spots.
 * Calls `onArrived(id)` once it stands at `target`. With reduced motion it
 * cuts straight there instead of walking.
 */
export default function CameraRig({ target, onArrived, reducedMotion, dragEnabled }) {
  const { camera, size, pointer, gl } = useThree();
  const portrait = size.width < size.height;

  const pos = useRef(new THREE.Vector3(...SPOTS[target].pos));
  const look = useRef(new THREE.Vector3(...SPOTS[target].look));
  const at = useRef(target); // the last spot the camera reached
  const move = useRef(null); // { to, pos, look, t, seconds, fovFrom, fovTo, fromHome, toHome }
  const fov = useRef(fovFor(target, portrait));
  const started = useRef(false);
  // Drag offsets: target and current (damped) yaw and pitch, in radians.
  const drag = useRef({ yaw: 0, pitch: 0, curYaw: 0, curPitch: 0, active: false, x: 0, y: 0, startYaw: 0, startPitch: 0 });

  // Start a walk whenever the target changes.
  useEffect(() => {
    if (!started.current) {
      // First render: stand at the starting spot.
      started.current = true;
      onArrived(target);
      return;
    }
    const from = move.current ? move.current.to : at.current;
    if (target === from && !move.current) return;
    const points = withLooks(route(from, target));
    if (move.current) {
      // Turned around mid-walk: set off from where the camera is now.
      points[0] = { pos: pos.current.toArray(), look: look.current.toArray() };
    }
    if (reducedMotion || points.length < 2) {
      move.current = null;
      pos.current.set(...SPOTS[target].pos);
      look.current.set(...SPOTS[target].look);
      at.current = target;
      onArrived(target);
      return;
    }
    const posCurve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p.pos)), false, 'centripetal');
    const lookCurve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p.look)), false, 'centripetal');
    move.current = {
      to: target,
      pos: posCurve,
      look: lookCurve,
      t: 0,
      seconds: walkSeconds(posCurve.getLength()),
      fovFrom: fov.current,
      fovTo: fovFor(target, portrait),
      fromHome: from === HOME,
      toHome: target === HOME,
    };
    // A new walk faces forward again.
    drag.current.yaw = 0;
    drag.current.pitch = 0;
    // `portrait` is read when a walk starts; resizing mid-walk settles at the end.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reducedMotion, onArrived]);

  // Drag to look around, at rest at a spot inside the house.
  useEffect(() => {
    const el = gl.domElement;
    if (!dragEnabled) {
      el.style.cursor = '';
      drag.current.yaw = 0;
      drag.current.pitch = 0;
      return undefined;
    }
    el.style.cursor = 'grab';
    const d = drag.current;
    const down = (e) => {
      d.active = true;
      d.x = e.clientX;
      d.y = e.clientY;
      d.startYaw = d.yaw;
      d.startPitch = d.pitch;
      el.setPointerCapture?.(e.pointerId);
      el.style.cursor = 'grabbing';
    };
    const moveHandler = (e) => {
      if (!d.active) return;
      d.yaw = THREE.MathUtils.clamp(d.startYaw + (e.clientX - d.x) * DRAG_RADIANS_PER_PIXEL, -MAX_YAW, MAX_YAW);
      d.pitch = THREE.MathUtils.clamp(d.startPitch + (e.clientY - d.y) * DRAG_RADIANS_PER_PIXEL, -MAX_PITCH, MAX_PITCH);
    };
    const up = (e) => {
      d.active = false;
      el.releasePointerCapture?.(e.pointerId);
      el.style.cursor = 'grab';
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', moveHandler);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', moveHandler);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.style.cursor = '';
      d.active = false;
    };
  }, [gl, dragEnabled]);

  const finalPos = useRef(new THREE.Vector3());
  const finalLook = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));
  const right = useRef(new THREE.Vector3());

  useFrame(({ clock }, dt) => {
    if (process.env.NODE_ENV === 'development' && window.__houseCamera) {
      const c = window.__houseCamera;
      camera.position.set(...c.pos);
      camera.lookAt(...c.look);
      return;
    }

    // How much of the walkway's own behaviour applies: 1 standing there,
    // fading out as the camera walks away (and in as it walks back).
    let home = at.current === HOME ? 1 : 0;
    const m = move.current;
    if (m) {
      m.t = Math.min(1, m.t + dt / m.seconds);
      const e = ease(m.t);
      m.pos.getPointAt(e, pos.current);
      m.look.getPointAt(e, look.current);
      fov.current = THREE.MathUtils.lerp(m.fovFrom, m.fovTo, e);
      home = m.fromHome ? 1 - e : m.toHome ? e : 0;
      if (m.t >= 1) {
        move.current = null;
        at.current = m.to;
        onArrived(m.to);
      }
    } else {
      fov.current = THREE.MathUtils.lerp(fov.current, fovFor(at.current, portrait), 1 - Math.exp(-dt * LOOK_DAMPING));
    }

    finalPos.current.copy(pos.current);
    // At the walkway the shot breathes slowly and follows the pointer a little.
    if (!reducedMotion && home > 0) {
      const time = clock.elapsedTime;
      finalPos.current.x += (Math.sin(time * 0.11) * 0.18 + pointer.x * 0.35) * home;
      finalPos.current.y += (Math.sin(time * 0.16) * 0.04 + pointer.y * 0.12) * home;
    }
    if (portrait) finalPos.current.z += PORTRAIT_WALKWAY_STEP_BACK * home;

    // Turn the view by the drag offset, around the camera.
    const d = drag.current;
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * LOOK_DAMPING);
    d.curYaw += (d.yaw - d.curYaw) * k;
    d.curPitch += (d.pitch - d.curPitch) * k;
    dir.current.subVectors(look.current, pos.current);
    if (d.curYaw || d.curPitch) {
      dir.current.applyAxisAngle(up.current, d.curYaw);
      right.current.crossVectors(dir.current, up.current).normalize();
      dir.current.applyAxisAngle(right.current, d.curPitch);
    }

    camera.position.lerp(finalPos.current, reducedMotion ? 1 : 1 - Math.exp(-dt * POSITION_DAMPING));
    // Without a drag this is exactly the spot's look target, so the walkway
    // shot still pivots around the house as the pointer moves.
    finalLook.current.copy(pos.current).add(dir.current);
    camera.lookAt(finalLook.current);
    if (Math.abs(camera.fov - fov.current) > 0.01) {
      camera.fov = fov.current;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
