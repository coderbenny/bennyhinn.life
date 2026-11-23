'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { YOUTUBE_PLAYLIST } from '@/constants/music';
import { PLAYER, PLAYER_DISTANCE_FACTOR, TV, playerUrl } from './livingLayout';
import { attach } from './tvStore';
import { isMuted } from './sound';
import styles from './house.module.css';

// The TV on the living-room wall. Its body is drawn here; the picture is
// YouTube's own player (Benny's playlist), laid exactly over the screen with
// drei's Html in transform mode. A page element cannot sit inside the 3D
// scene, so the player is only shown while the visitor sits facing the TV;
// elsewhere it keeps playing out of sight (so the music carries on in the
// room) and the screen shows a still of the first video.

const POSTER = '/house/tv-poster.webp';
const BODY = '#121214';
const BODY_LIGHT = [0.55, 0.4, 0.75, 0.3, 1, 0.5]; // +x, -x, +y, -y, front, back
const POSTER_LIGHT = 0.78; // a lit screen, a little dimmer than the real picture

/**
 * on       the player is in the page (the visitor has come into the living room)
 * showing  the player is on screen (the visitor sits facing the TV)
 */
export default function SmartTv({ visible, on, showing }) {
  const poster = useMemo(() => {
    const t = new THREE.TextureLoader().load(POSTER);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  useEffect(() => () => poster.dispose(), [poster]);
  const body = useMemo(() => BODY_LIGHT.map((l) => new THREE.MeshBasicMaterial({ color: new THREE.Color(BODY).multiplyScalar(l) })), []);
  useEffect(() => () => body.forEach((m) => m.dispose()), [body]);

  // The player's address is fixed when it first appears (sound on or off at
  // that moment); after that, mute and play are sent as messages.
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (on && !src) setSrc(playerUrl(YOUTUBE_PLAYLIST.id, { muted: isMuted(), origin: window.location.origin }));
    if (!on) setSrc(null);
  }, [on, src]);

  // drei renders Html content in a root of its own, so the iframe is handed
  // to the player store when it actually mounts, not when this renders.
  const frameRef = useCallback((el) => attach(el), []);

  const w = TV.width + 2 * TV.bezel;
  const h = TV.height + 2 * TV.bezel;
  return (
    // Turned to face -x, into the room; the screen is the group's +z face.
    <group position={[TV.wallX - TV.depth / 2 - 0.01, TV.centre[0], TV.centre[1]]} rotation={[0, -Math.PI / 2, 0]} visible={visible}>
      <mesh material={body}>
        <boxGeometry args={[w, h, TV.depth]} />
      </mesh>
      <mesh position={[0, 0, TV.depth / 2 + 0.001]}>
        <planeGeometry args={[TV.width, TV.height]} />
        <meshBasicMaterial map={poster} color={new THREE.Color(1, 1, 1).multiplyScalar(POSTER_LIGHT)} />
      </mesh>
      {/* A small standby light under the screen. */}
      <mesh position={[w / 2 - 0.05, -h / 2 + 0.006, TV.depth / 2 + 0.001]}>
        <circleGeometry args={[0.0025, 12]} />
        <meshBasicMaterial color={src ? '#ffffff' : '#c0392b'} />
      </mesh>
      {src && (
        <Html
          transform
          position={[0, 0, TV.depth / 2 + 0.002]}
          distanceFactor={PLAYER_DISTANCE_FACTOR}
          zIndexRange={[5, 0]}
          style={{ visibility: showing ? 'visible' : 'hidden', pointerEvents: showing ? 'auto' : 'none' }}
        >
          <iframe
            ref={frameRef}
            className={styles.tvPlayer}
            src={src}
            width={PLAYER.width}
            height={PLAYER.height}
            title={`${YOUTUBE_PLAYLIST.title} on YouTube`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            tabIndex={showing ? 0 : -1}
          />
        </Html>
      )}
    </group>
  );
}
