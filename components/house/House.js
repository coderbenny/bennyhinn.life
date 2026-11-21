'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Link from 'next/link';
import Walkway from './Walkway';
import Sky from './Sky';
import CameraRig from './CameraRig';
import Hotspots from './Hotspots';
import LetterPanel from './LetterPanel';
import RoomPanel from './RoomPanel';
import { ROOMS } from './RoomContent';
import { HOME, SPOTS } from './spots';
import useSpotHistory from './useSpotHistory';
import styles from './house.module.css';

// `target` is where the camera is heading, `at` where it last stood; while
// they differ the camera is walking. The address bar follows `target`.
export default function House({ onReady }) {
  const { target, goTo, back } = useSpotHistory();
  const [at, setAt] = useState(null);
  const [letterOpen, setLetterOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = (e) => setReducedMotion(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const moving = at !== target;
  const outside = target === HOME && at === HOME;
  const room = !moving && at !== HOME ? ROOMS[at] : null;

  // Panels and the letter belong to the spot they were opened at.
  useEffect(() => {
    setPanelOpen(false);
    if (target !== HOME) setLetterOpen(false);
  }, [target]);

  const go = useCallback(
    (id) => {
      setTouched(true);
      goTo(id);
    },
    [goTo]
  );

  const hotspotLayer = useRef(null);

  // The Mailbox button is hidden while the letter is open, so focus goes back
  // to it once it is on screen again.
  const mailboxButton = useRef(null);
  const openLetter = useCallback(() => {
    setTouched(true);
    setLetterOpen(true);
  }, []);
  const closeLetter = useCallback(() => {
    setLetterOpen(false);
    requestAnimationFrame(() => mailboxButton.current?.focus());
  }, []);

  // Closing a room's panel returns focus to the button that opened it.
  const panelButton = useRef(null);
  const closePanel = useCallback(() => {
    setPanelOpen(false);
    requestAnimationFrame(() => panelButton.current?.focus());
  }, []);

  // On arrival, keyboard and screen-reader users land on the room's name,
  // unless they are already focused on something on screen.
  const roomHeading = useRef(null);
  const arrived = useCallback((id) => {
    setAt(id);
    requestAnimationFrame(() => {
      const lost = !document.activeElement || document.activeElement === document.body;
      if (lost) roomHeading.current?.focus({ preventScroll: true });
    });
  }, []);

  // Esc goes back one spot. Open dialogs catch Esc first and close themselves.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !moving && target !== HOME) back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moving, target, back]);

  return (
    <>
      <Canvas
        className="house-canvas"
        flat
        dpr={[1, 2]}
        camera={{ fov: SPOTS[target].fov, near: 0.1, far: 150, position: SPOTS[target].pos }}
        gl={{ antialias: true }}
      >
        <fog attach="fog" args={['#262d3d', 16, 38]} />
        <Sky />
        <Suspense fallback={null}>
          <Walkway
            doorOpen={!outside}
            flagUp={letterOpen}
            interactive={outside && !letterOpen}
            onMailbox={openLetter}
            onDoor={() => go('entry')}
            onLoaded={onReady}
          />
          {/* Inside the boundary: hotspots appear with the house, not before it. */}
          <Hotspots spot={at ?? target} visible={!moving && !panelOpen} onGo={go} layer={hotspotLayer} />
        </Suspense>
        <CameraRig target={target} onArrived={arrived} reducedMotion={reducedMotion} dragEnabled={!moving && at !== HOME && at !== null} />
      </Canvas>

      <div ref={hotspotLayer} className={styles.hotspotLayer} />

      {outside && !touched && !letterOpen && (
        <p className={styles.hint}>
          Open the <strong>mailbox</strong> to leave a note, or the <strong>door</strong> to come in.
        </p>
      )}

      {outside && !letterOpen && (
        <div className={styles.keys}>
          <button ref={mailboxButton} type="button" className={styles.keyButton} onClick={openLetter}>
            Mailbox
          </button>
          <button type="button" className={styles.keyButton} onClick={() => go('entry')}>
            Come in
          </button>
        </div>
      )}

      {letterOpen && <LetterPanel onClose={closeLetter} />}

      {room && !panelOpen && (
        <div className={styles.card}>
          <h2 ref={roomHeading} tabIndex={-1} className={styles.cardTitle}>
            {SPOTS[at].label}
          </h2>
          <p>{room.line}</p>
          <div className={styles.cardActions}>
            {room.open && (
              <button ref={panelButton} type="button" className={styles.keyButton} onClick={() => setPanelOpen(true)}>
                {room.open}
              </button>
            )}
            <button type="button" className={styles.keyButton} onClick={back}>
              Back
            </button>
            {at === 'entry' && (
              <Link href="/classic" className={styles.keyButton}>
                See the full portfolio
              </Link>
            )}
          </div>
        </div>
      )}

      {room && panelOpen && room.Content && (
        <RoomPanel title={room.title} onClose={closePanel}>
          <room.Content />
        </RoomPanel>
      )}
    </>
  );
}
