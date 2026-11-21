'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Link from 'next/link';
import Walkway from './Walkway';
import Sky from './Sky';
import CameraRig from './CameraRig';
import LetterPanel from './LetterPanel';
import styles from './house.module.css';

// stage: outside -> (letter) -> entering -> inside
export default function House({ onReady }) {
  const [stage, setStage] = useState('outside');
  const [touched, setTouched] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const openLetter = useCallback(() => {
    setTouched(true);
    setStage('letter');
  }, []);
  const enter = useCallback(() => {
    setTouched(true);
    setStage('entering');
  }, []);
  const arrived = useCallback(() => setStage('inside'), []);

  // The Mailbox button is hidden while the letter is open, so focus goes back
  // to it once it is on screen again.
  const mailboxButton = useRef(null);
  const closeLetter = useCallback(() => {
    setStage('outside');
    requestAnimationFrame(() => mailboxButton.current?.focus());
  }, []);

  return (
    <>
      <Canvas
        className="house-canvas"
        flat
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.1, far: 150, position: [0.2, 1.6, 13.6] }}
        gl={{ antialias: true }}
      >
        <fog attach="fog" args={['#262d3d', 16, 38]} />
        <Sky />
        <Suspense fallback={null}>
          <Walkway stage={stage} onMailbox={openLetter} onDoor={enter} onLoaded={onReady} />
        </Suspense>
        <CameraRig stage={stage} onArrived={arrived} reducedMotion={reducedMotion} />
      </Canvas>

      {stage === 'outside' && !touched && (
        <p className={styles.hint}>
          Open the <strong>mailbox</strong> to leave a note, or the <strong>door</strong> to come in.
        </p>
      )}

      {stage === 'outside' && (
        <div className={styles.keys}>
          <button ref={mailboxButton} type="button" className={styles.keyButton} onClick={openLetter}>
            Mailbox
          </button>
          <button type="button" className={styles.keyButton} onClick={enter}>
            Come in
          </button>
        </div>
      )}

      {stage === 'letter' && <LetterPanel onClose={closeLetter} />}

      {stage === 'inside' && (
        <div className={styles.card}>
          <p>
            Karibu. The rest of the house is still being built: the bookshelf of skills, the gallery of projects and the
            music studio come next.
          </p>
          <div className={styles.cardActions}>
            <button type="button" className={styles.keyButton} onClick={() => setStage('outside')}>
              Back outside
            </button>
            <Link href="/classic" className={styles.keyButton}>
              See the full portfolio
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
