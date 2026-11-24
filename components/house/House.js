'use client';

import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import Link from 'next/link';
import Walkway from './Walkway';
import Sky from './Sky';
import { FPS_BOUNDS, getQuality } from './quality';
import { FpsBadge, FpsProbe, useFpsMeter } from './FpsMeter';
import CameraRig from './CameraRig';
import Hotspots from './Hotspots';
import Bookshelf from './Bookshelf';
import ProjectGallery from './ProjectGallery';
import StudioRecords from './StudioRecords';
import Corkboard from './Corkboard';
import DeskMonitor from './DeskMonitor';
import TerminalInput, { useTerminal } from './TerminalInput';
import { setOnExit } from './terminalStore';
import WallClock from './WallClock';
import WallCalendar from './WallCalendar';
import DeskMug from './DeskMug';
import SmartTv, { TvPlayer } from './SmartTv';
import ArrivalsBoard, { nextBoardPage } from './ArrivalsBoard';
import LivingPainting from './LivingPainting';
import BeatStation from './BeatStation';
import { PAD_KEYS, PAD_SOUNDS } from './beatLayout';
import { PLAYING, command as tvCommand, getTvState, markBlocked, subscribeTv } from './tvStore';
import { drum, onMutedChange, play } from './sound';
import { CARDS } from './deskLayout';
import { BOOKS } from './shelf';
import LetterPanel from './LetterPanel';
import RoomPanel from './RoomPanel';
import { ROOMS, cardTitle } from './RoomContent';
import { FRAMES, HOME, RECORDS, SPOTS } from './spots';
import useSpotHistory from './useSpotHistory';
import styles from './house.module.css';

// Wide enough for panels to sit beside the scene rather than over it
// (matches the panel's breakpoint in house.module.css).
const WIDE_SCREEN = '(min-width: 768px)';

// `target` is where the camera is heading, `at` where it last stood; while
// they differ the camera is walking. The address bar follows `target`.
export default function House({ onReady }) {
  const { target, goTo, back } = useSpotHistory();
  const [at, setAt] = useState(null);
  // The device's quality level (quality.js); the pixel ratio starts at the
  // level's highest and steps down while the frame rate stays low.
  const [quality] = useState(getQuality);
  const [dpr, setDpr] = useState(quality.dpr[1]);
  const showFps = useFpsMeter();
  const [letterOpen, setLetterOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  // The skills shelf: the book whose panel is open, and the book under the
  // pointer or keyboard focus.
  const [skill, setSkill] = useState(null);
  const [bookHover, setBookHover] = useState(null);
  const [bookFocus, setBookFocus] = useState(null);
  // The gallery: the frame under the pointer or keyboard focus.
  const [frameHover, setFrameHover] = useState(null);
  const [frameFocus, setFrameFocus] = useState(null);
  // The record wall: the record off the wall (its Spotify id), and the record
  // under the pointer or keyboard focus (its record id).
  const [track, setTrack] = useState(null);
  const [recordHover, setRecordHover] = useState(null);
  const [recordFocus, setRecordFocus] = useState(null);
  // A record clicked from the studio door: picked once the walk to the wall ends.
  const pendingTrack = useRef(null);
  // The corkboard: the card taken down, and the card under the pointer or
  // keyboard focus; a card clicked from the desk doorway is taken down once
  // the walk to the board ends.
  const [card, setCard] = useState(null);
  const [cardHover, setCardHover] = useState(null);
  const [cardFocus, setCardFocus] = useState(null);
  const pendingCard = useRef(null);

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
  const atFrame = Boolean(at && SPOTS[at]?.frame);
  const trackTitle = RECORDS.find((r) => r.track.spotifyId === track)?.track.title;

  // Panels and the letter belong to the spot they were opened at.
  useEffect(() => {
    setPanelOpen(false);
    setSkill(null);
    setBookHover(null);
    setBookFocus(null);
    setFrameHover(null);
    setFrameFocus(null);
    setTrack(null);
    setRecordHover(null);
    setRecordFocus(null);
    setCard(null);
    setCardHover(null);
    setCardFocus(null);
    if (target !== 'records') pendingTrack.current = null;
    if (target !== 'corkboard') pendingCard.current = null;
    if (target !== HOME) setLetterOpen(false);
  }, [target]);

  // Sounds, each in answer to something the visitor did.
  // The door: not on the first load (a deep link starts inside, and nothing
  // was clicked yet), only when it opens or closes after that.
  const wasOutside = useRef(null);
  useEffect(() => {
    if (at === null) return;
    if (wasOutside.current === null) wasOutside.current = outside;
    else if (wasOutside.current && !outside) play('door');
    else if (!wasOutside.current && outside) play('close');
    wasOutside.current = outside;
  }, [outside, at]);
  useEffect(() => {
    if (letterOpen) play('flag');
  }, [letterOpen]);
  useEffect(() => {
    if (skill) play('book');
  }, [skill]);
  useEffect(() => {
    if (track) play('record');
  }, [track]);
  useEffect(() => {
    if (card) play('card');
  }, [card]);

  // The TV starts playing the first time the visitor comes into the living
  // room (the click that brought them counts as permission to play), pauses
  // when they leave, and carries on when they come back. If the browser
  // still refuses sound, it plays muted and the card offers to unmute.
  const tv = useSyncExternalStore(subscribeTv, getTvState, getTvState);
  const inLiving = at === 'living' || at === 'tv';
  const [tvOn, setTvOn] = useState(false);
  useEffect(() => {
    if (inLiving) setTvOn(true);
    if (outside) setTvOn(false);
  }, [inLiving, outside]);
  useEffect(() => {
    if (!tv.ready) return undefined;
    if (!inLiving) {
      tvCommand('pauseVideo');
      return undefined;
    }
    tvCommand('playVideo');
    const check = setTimeout(() => {
      if (getTvState().playerState !== PLAYING) {
        tvCommand('mute');
        tvCommand('playVideo');
        markBlocked(true);
      }
    }, 3000);
    return () => clearTimeout(check);
  }, [tv.ready, inLiving]);
  useEffect(() => onMutedChange((m) => tvCommand(m ? 'mute' : 'unMute')), []);
  const unmuteTv = useCallback(() => {
    tvCommand('unMute');
    tvCommand('playVideo');
    markBlocked(false);
  }, []);

  const go = useCallback(
    (id) => {
      setTouched(true);
      goTo(id);
    },
    [goTo]
  );

  const hotspotLayer = useRef(null);

  // The desk terminal: `exit` steps back from the monitor; on a touch screen
  // the text box waits for a tap on the screen, so the keyboard does not pop up.
  const terminal = useRef(null);
  const terminalMode = useTerminal().mode;
  const [coarsePointer, setCoarsePointer] = useState(false);
  useEffect(() => setCoarsePointer(window.matchMedia('(pointer: coarse)').matches), []);
  useEffect(() => {
    setOnExit(back);
    return () => setOnExit(null);
  }, [back]);

  // Where focus goes once a closed dialog's buttons are back on screen: set
  // when a dialog closes, used right after the next render (not the next
  // animation frame, which can be slow while the scene draws).
  const refocus = useRef(null);
  useEffect(() => {
    if (!refocus.current) return;
    const el = refocus.current();
    if (!el) return;
    refocus.current = null;
    el.focus();
  });

  // The Mailbox button is hidden while the letter is open, so focus goes back
  // to it once it is on screen again.
  const mailboxButton = useRef(null);
  const openLetter = useCallback(() => {
    setTouched(true);
    setLetterOpen(true);
  }, []);
  const closeLetter = useCallback(() => {
    setLetterOpen(false);
    refocus.current = () => mailboxButton.current;
  }, []);

  // Closing a room's panel returns focus to whatever opened it (the room
  // card's button, or a book's button), or to the card's button if that is gone.
  const panelButton = useRef(null);
  const openedFrom = useRef(null);
  const openPanel = useCallback(() => {
    openedFrom.current = document.activeElement;
    setPanelOpen(true);
  }, []);
  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setSkill(null);
    setTrack(null);
    setCard(null);
    refocus.current = () => {
      const from = openedFrom.current;
      return from instanceof HTMLElement && from.isConnected && from !== document.body ? from : panelButton.current;
    };
  }, []);

  // Choosing a book pulls it out and opens its page in the panel; choosing
  // none goes back to the list of all skills.
  const selectSkill = useCallback(
    (id) => {
      setSkill(id);
      if (id && !panelOpen) openPanel();
    },
    [panelOpen, openPanel]
  );

  // Taking a record off the wall opens its page; none goes back to all records.
  const selectTrack = useCallback(
    (id) => {
      setTrack(id);
      if (id && !panelOpen) openPanel();
    },
    [panelOpen, openPanel]
  );

  // A record clicked at the wall is taken off it; clicked from the studio
  // door, the camera walks to the wall first.
  const pickRecord = useCallback(
    (recordId) => {
      const r = RECORDS.find((x) => x.id === recordId);
      if (!r) return;
      if (at === 'records') selectTrack(r.track.spotifyId);
      else {
        pendingTrack.current = r.track.spotifyId;
        go('records');
      }
    },
    [at, selectTrack, go]
  );

  // Taking a card off the corkboard opens its page; none goes back to all cards.
  const selectCard = useCallback(
    (id) => {
      setCard(id);
      if (id && !panelOpen) openPanel();
    },
    [panelOpen, openPanel]
  );
  const pickCard = useCallback(
    (id) => {
      if (at === 'corkboard') selectCard(id);
      else {
        pendingCard.current = id;
        go('corkboard');
      }
    },
    [at, selectCard, go]
  );

  // On arrival, keyboard and screen-reader users land on the room's name,
  // unless they are already focused on something on screen.
  const roomHeading = useRef(null);
  const arrived = useCallback((id) => {
    setAt(id);
    if (id === 'records' && pendingTrack.current) {
      setTrack(pendingTrack.current);
      pendingTrack.current = null;
      openedFrom.current = null;
      setPanelOpen(true);
    }
    if (id === 'corkboard' && pendingCard.current) {
      setCard(pendingCard.current);
      pendingCard.current = null;
      openedFrom.current = null;
      setPanelOpen(true);
    }
    // Up close to a frame on a wide screen, its panel opens beside it. On a
    // phone the panel would cover the picture, so it waits for a tap.
    if (ROOMS[id]?.autoOpen && window.matchMedia(WIDE_SCREEN).matches) {
      openedFrom.current = null;
      setPanelOpen(true);
    }
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
        dpr={Math.min(dpr, window.devicePixelRatio || 1)}
        camera={{ fov: SPOTS[target].fov, near: 0.1, far: 150, position: SPOTS[target].pos }}
        gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }}
      >
        <PerformanceMonitor
          factor={1}
          // Fixed bounds: drei's default asks 120 Hz screens for 60 fps or
          // more, so a phone running smoothly at 50 fps was being blurred.
          bounds={() => FPS_BOUNDS}
          onChange={({ factor }) => {
            const [low, high] = quality.dpr;
            setDpr(Math.round((low + (high - low) * factor) * 4) / 4);
          }}
          onFallback={() => setDpr(quality.dpr[0])}
        />
        {showFps && <FpsProbe level={quality.level} />}
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
            reducedMotion={reducedMotion}
          />
          {/* Inside the boundary: hotspots appear with the house, not before it. */}
          <Hotspots spot={at ?? target} visible={!moving && !panelOpen} onGo={go} layer={hotspotLayer} />
          <Bookshelf
            highlighted={bookFocus ?? bookHover}
            chosen={skill}
            interactive={at === 'living' && !moving}
            onHover={setBookHover}
            onSelect={selectSkill}
            layer={hotspotLayer}
          />
          <ProjectGallery
            visible={!outside}
            // Once the visitor stands inside: loading during the walk in from the
            // walkway would stall the walk while the pictures upload.
            load={at !== null && at !== HOME}
            highlighted={frameFocus ?? frameHover}
            interactive={!moving && (at === 'gallery' || atFrame)}
            onHover={setFrameHover}
            onSelect={go}
            layer={hotspotLayer}
          />
          <StudioRecords
            visible={!outside}
            load={at !== null && at !== HOME}
            highlighted={recordFocus ?? recordHover}
            chosen={RECORDS.find((r) => r.track.spotifyId === track)?.id ?? null}
            interactive={!moving && (at === 'studio' || at === 'records')}
            onHover={setRecordHover}
            onSelect={pickRecord}
            layer={hotspotLayer}
          />
          <Corkboard
            visible={!outside}
            highlighted={cardFocus ?? cardHover}
            chosen={card}
            interactive={!moving && (at === 'desk' || at === 'corkboard')}
            onHover={setCardHover}
            onSelect={pickCard}
            layer={hotspotLayer}
          />
          <DeskMonitor
            visible={!outside}
            interactive={!moving && (at === 'desk' || at === 'monitor')}
            onSelect={() => (at === 'monitor' ? terminal.current?.focus() : go('monitor'))}
          />
          <WallClock visible={!outside} reducedMotion={reducedMotion} />
          <WallCalendar visible={!outside} load={at !== null && at !== HOME} />
          <DeskMug visible={!outside} reducedMotion={reducedMotion} />
          <SmartTv visible={!outside} on={tvOn} />
          <ArrivalsBoard visible={!outside} interactive={!moving && at === 'entry'} reducedMotion={reducedMotion} />
          <LivingPainting
            visible={!outside}
            interactive={!moving && (at === 'gallery' || at === 'painting')}
            reducedMotion={reducedMotion}
            onSelect={at === 'gallery' ? () => go('painting') : undefined}
          />
          <BeatStation active={!moving && at === 'beats'} />
        </Suspense>
        <CameraRig target={target} onArrived={arrived} reducedMotion={reducedMotion} dragEnabled={!moving && at !== HOME && at !== null} />
      </Canvas>

      <div ref={hotspotLayer} className={styles.hotspotLayer} />
      {/* The TV's picture: a page element the scene keeps over the screen (SmartTv.js).
          After the hotspots, so Tab reaches the doorways first. */}
      <TvPlayer on={tvOn} showing={at === 'tv' && !moving && !panelOpen} />
      {showFps && <FpsBadge />}

      {/* The books, for keyboards and screen readers: focusing one tips its
          book out and shows its name beside it. */}
      {at === 'living' && !moving && !panelOpen && (
        <ul className={styles.srOnly} aria-label="Books on the shelf">
          {BOOKS.map((b) => (
            <li key={b.skill}>
              <button
                type="button"
                onFocus={() => setBookFocus(b.skill)}
                onBlur={() => setBookFocus(null)}
                onClick={() => selectSkill(b.skill)}
              >
                {b.skill}, {b.area}
              </button>
            </li>
          ))}
        </ul>
      )}

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

      {/* The frames, for keyboards and screen readers. */}
      {at === 'gallery' && !moving && !panelOpen && (
        <ul className={styles.srOnly} aria-label="Projects on the walls">
          {FRAMES.map((f) => (
            <li key={f.id}>
              <button type="button" onFocus={() => setFrameFocus(f.id)} onBlur={() => setFrameFocus(null)} onClick={() => go(f.id)}>
                {f.name}, framed in the gallery
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* The records, for keyboards and screen readers. */}
      {at === 'records' && !moving && !panelOpen && (
        <ul className={styles.srOnly} aria-label="Records on the wall">
          {RECORDS.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onFocus={() => setRecordFocus(r.id)}
                onBlur={() => setRecordFocus(null)}
                onClick={() => selectTrack(r.track.spotifyId)}
              >
                {r.track.title}, a record on the wall
              </button>
            </li>
          ))}
        </ul>
      )}

      {at === 'monitor' && !moving && !panelOpen && <TerminalInput ref={terminal} autoFocus={!coarsePointer} />}

      {/* The drum pads, for screen readers (keyboards also have the letter keys). */}
      {at === 'beats' && !moving && (
        <ul className={styles.srOnly} aria-label="Drum pads">
          {PAD_SOUNDS.map((name, i) => (
            <li key={name}>
              <button type="button" onClick={() => drum(name)}>
                {name}, key {PAD_KEYS[i].toUpperCase()}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* The corkboard cards, for keyboards and screen readers. */}
      {at === 'corkboard' && !moving && !panelOpen && (
        <ul className={styles.srOnly} aria-label="Cards on the corkboard">
          {CARDS.map((c) => (
            <li key={c.id}>
              <button type="button" onFocus={() => setCardFocus(c.id)} onBlur={() => setCardFocus(null)} onClick={() => selectCard(c.id)}>
                {cardTitle(c.id)}, a card on the corkboard
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* On a phone, Snake needs the whole screen and the arrow pad: the room card steps aside. */}
      {room && !panelOpen && !(coarsePointer && at === 'monitor' && terminalMode === 'snake') && (
        <div className={styles.card}>
          <h2 ref={roomHeading} tabIndex={-1} className={styles.cardTitle}>
            {SPOTS[at].label}
          </h2>
          <p>{room.line}</p>
          <div className={styles.cardActions}>
            {room.open && (
              <button ref={panelButton} type="button" className={styles.keyButton} onClick={openPanel}>
                {room.open}
              </button>
            )}
            {at === 'entry' && (
              <button type="button" className={styles.keyButton} onClick={nextBoardPage}>
                Flip the board
              </button>
            )}
            {room.also?.map((a) => (
              <button key={a.to} type="button" className={styles.keyButton} onClick={() => go(a.to)}>
                {a.label}
              </button>
            ))}
            {inLiving && tv.blocked && (
              <button type="button" className={styles.keyButton} onClick={unmuteTv}>
                🔊 Unmute the TV
              </button>
            )}
            {at === 'tv' && tv.ready && (
              <>
                <button type="button" className={styles.keyButton} onClick={() => tvCommand('previousVideo')} aria-label="Previous video">
                  ⏮
                </button>
                <button
                  type="button"
                  className={styles.keyButton}
                  onClick={() => tvCommand(tv.playerState === PLAYING ? 'pauseVideo' : 'playVideo')}
                  aria-label={tv.playerState === PLAYING ? 'Pause' : 'Play'}
                >
                  {tv.playerState === PLAYING ? '⏸' : '▶'}
                </button>
                <button type="button" className={styles.keyButton} onClick={() => tvCommand('nextVideo')} aria-label="Next video">
                  ⏭
                </button>
              </>
            )}
            {room.previous && (
              <>
                <button type="button" className={styles.keyButton} onClick={() => go(room.previous)} aria-label={`Previous project: ${SPOTS[room.previous].label}`}>
                  ← Previous
                </button>
                <button type="button" className={styles.keyButton} onClick={() => go(room.next)} aria-label={`Next project: ${SPOTS[room.next].label}`}>
                  Next →
                </button>
              </>
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
        <RoomPanel title={skill ?? trackTitle ?? cardTitle(card) ?? room.title} contentKey={skill ?? track ?? card} onClose={closePanel}>
          <room.Content
            spot={at}
            onGo={go}
            skill={skill}
            onSelectSkill={selectSkill}
            track={track}
            onSelectTrack={selectTrack}
            card={card}
            onSelectCard={selectCard}
          />
          {room.previous && (
            <nav className={styles.panelNav} aria-label="Other projects">
              <button type="button" className={styles.chip} onClick={() => go(room.previous)}>
                ← {SPOTS[room.previous].label}
              </button>
              <button type="button" className={styles.chip} onClick={() => go(room.next)}>
                {SPOTS[room.next].label} →
              </button>
            </nav>
          )}
        </RoomPanel>
      )}
    </>
  );
}
