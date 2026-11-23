'use client';

import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HOTSPOTS, SPOTS } from './spots';
import styles from './house.module.css';

// Buttons pinned to the doorways of the current spot. They are real buttons
// in the page, so Tab moves between them and Enter opens them, and screen
// readers announce them by the room they lead to. They are drawn into
// `layer`, a container placed before the room card, so Tab reaches the
// doorways first.
// Hotspots are centred on their point, so keep that point this far from the
// screen's sides: a doorway at the edge of a narrow phone shot stays tappable.
const EDGE_MARGIN_PX = 76;
const projected = new THREE.Vector3();

function clampedPosition(el, camera, size) {
  projected.setFromMatrixPosition(el.matrixWorld).project(camera);
  const x = ((projected.x + 1) / 2) * size.width;
  const y = ((1 - projected.y) / 2) * size.height;
  return [Math.min(size.width - EDGE_MARGIN_PX, Math.max(EDGE_MARGIN_PX, x)), y];
}

export default function Hotspots({ spot, visible, onGo, layer }) {
  const portrait = useThree((s) => s.size.width < s.size.height);
  if (!visible) return null;
  return HOTSPOTS[spot].map((h) => (
    <Html key={h.to} position={(portrait && h.portraitAt) || h.at} center zIndexRange={[20, 10]} portal={layer} calculatePosition={clampedPosition}>
      <button type="button" className={styles.hotspot} onClick={() => onGo(h.to)}>
        <span className={styles.hotspotDot} aria-hidden="true" />
        {SPOTS[h.to].label}
      </button>
    </Html>
  ));
}
