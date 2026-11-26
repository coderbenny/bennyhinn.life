'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { YOUTUBE_PLAYLIST } from '@/constants/music';
import { TV, playerUrl } from './livingLayout';
import { attach } from './tvStore';
import { isMuted } from './sound';
import styles from './house.module.css';

// The TV on the living-room wall. Its body is drawn in the scene (SmartTv);
// the picture is YouTube's own player (Benny's playlist), a plain page element
// (TvPlayer) laid over the screen. Every frame the scene measures where the
// screen's corners fall on the page and moves the player there.
//
// Not drei's Html in transform mode: that shrinks a large player with a CSS 3D
// transform, and iPhone Safari draws iframes under such transforms at the
// wrong size and place (the video spilled past the TV). A flat element at its
// real size is drawn right everywhere. The TV is seen straight on, so the
// screen's outline on the page is a rectangle.
//
// The player is only shown while the visitor sits facing the TV; elsewhere it
// keeps playing out of sight (so the music carries on in the room) and the
// screen shows a still of the first video.

const POSTER = '/house/tv-poster.webp';
const BODY = '#121214';
const BODY_LIGHT = [0.55, 0.4, 0.75, 0.3, 1, 0.5]; // +x, -x, +y, -y, front, back
const POSTER_LIGHT = 0.78; // a lit screen, a little dimmer than the real picture

// The player's box on the page, shared by the scene (which measures it) and
// the page element (which is placed by it).
let box = null;
const setBox = (el) => {
  box = el;
};

const corner = new THREE.Vector3();
const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/**
 * In the scene: the TV's body and its poster.
 * on  the player is in the page (the visitor has come into the living room)
 */
export default function SmartTv({ visible = true, on }) {
  const poster = useMemo(() => {
    const t = new THREE.TextureLoader().load(POSTER);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  useEffect(() => () => poster.dispose(), [poster]);
  const body = useMemo(() => BODY_LIGHT.map((l) => new THREE.MeshBasicMaterial({ color: new THREE.Color(BODY).multiplyScalar(l) })), []);
  useEffect(() => () => body.forEach((m) => m.dispose()), [body]);

  // Each frame: where the screen is on the page. Written straight to the
  // player's box, only when it moves, so React doesn't re-render.
  const screen = useRef(null);
  const last = useRef('');
  const { camera, gl } = useThree();
  useFrame(() => {
    if (!box || !screen.current) return;
    const canvas = gl.domElement.getBoundingClientRect();
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    let behind = false;
    for (const [sx, sy] of CORNERS) {
      corner.set((sx * TV.width) / 2, (sy * TV.height) / 2, 0);
      screen.current.localToWorld(corner).project(camera);
      if (corner.z > 1) behind = true;
      const x = canvas.left + ((corner.x + 1) / 2) * canvas.width;
      const y = canvas.top + ((1 - corner.y) / 2) * canvas.height;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    const key = behind ? 'behind' : [left, top, right - left, bottom - top].map((v) => v.toFixed(1)).join();
    if (key === last.current) return;
    last.current = key;
    if (behind) {
      box.dataset.behind = '';
      return;
    }
    delete box.dataset.behind;
    Object.assign(box.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${right - left}px`,
      height: `${bottom - top}px`,
    });
  });

  const w = TV.width + 2 * TV.bezel;
  const h = TV.height + 2 * TV.bezel;
  return (
    // Turned to face -x, into the room; the screen is the group's +z face.
    <group position={[TV.wallX - TV.depth / 2 - 0.01, TV.centre[0], TV.centre[1]]} rotation={[0, -Math.PI / 2, 0]} visible={visible}>
      <mesh material={body}>
        <boxGeometry args={[w, h, TV.depth]} />
      </mesh>
      <mesh ref={screen} position={[0, 0, TV.depth / 2 + 0.001]}>
        <planeGeometry args={[TV.width, TV.height]} />
        <meshBasicMaterial map={poster} color={new THREE.Color(1, 1, 1).multiplyScalar(POSTER_LIGHT)} />
      </mesh>
      {/* A small standby light under the screen. */}
      <mesh position={[w / 2 - 0.05, -h / 2 + 0.006, TV.depth / 2 + 0.001]}>
        <circleGeometry args={[0.0025, 12]} />
        <meshBasicMaterial color={on ? '#ffffff' : '#c0392b'} />
      </mesh>
    </group>
  );
}

/**
 * On the page, beside the canvas: YouTube's player, placed over the screen.
 * on       the player is in the page
 * showing  the player is on screen (the visitor sits facing the TV)
 */
export function TvPlayer({ on, showing }) {
  // The player's address is fixed when it first appears (sound on or off at
  // that moment); after that, mute and play are sent as messages.
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (on && !src) setSrc(playerUrl(YOUTUBE_PLAYLIST.id, { muted: isMuted(), origin: window.location.origin }));
    if (!on) setSrc(null);
  }, [on, src]);
  const frameRef = useCallback((el) => attach(el), []);

  if (!src) return null;
  return (
    <div ref={setBox} className={styles.tvBox} data-showing={showing ? '' : undefined}>
      <iframe
        ref={frameRef}
        className={styles.tvPlayer}
        src={src}
        title={`${YOUTUBE_PLAYLIST.title} on YouTube`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={showing ? 0 : -1}
      />
    </div>
  );
}
