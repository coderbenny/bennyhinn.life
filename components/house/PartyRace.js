'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { GRID } from './snake';
import { drawBoard } from './partyDraw';
import { REASONS, clock, finalSeconds, liveRanking, medal, resultsText, revealed, timeLeft } from './partyView';
import { getPlay, steer, subscribePlay } from './partyPlay';
import { leaveParty, rematch, serverNow, stayForResults } from './partyStore';
import { downloadResults, shareResults } from './partyImage';
import { print } from './terminalStore';
import { play } from './sound';
import styles from './house.module.css';

// The Snake party's race and results, on the page: the clock, the live
// ranking (rows slide as players overtake), your controls, what to do once
// you're out, and the leaderboard revealed from last place up, with awards,
// a picture to keep, and the host's rematch.

const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
const ROW_PX = 40;

// Your score, read straight from your game (changes only when you eat).
const myScore = () => getPlay().game?.score ?? null;
const myOver = () => getPlay().game?.over ?? false;
const myReason = () => getPlay().game?.reason ?? null;
const useMine = (read) => useSyncExternalStore(subscribePlay, read, read);

/** The clock, a few times a second; ticks in the last ten seconds. */
function useClock(endsAt) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    let lastTick = null;
    const id = setInterval(() => {
      const t = serverNow();
      setNow(t);
      const s = finalSeconds(endsAt, t);
      if (s && s !== lastTick) {
        lastTick = s;
        play('tick');
      }
    }, 200);
    return () => clearInterval(id);
  }, [endsAt]);
  return now;
}

/** Arrow keys and WASD steer; on touch screens, swipes too. */
function useSteering(active) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      const dir = KEYS[e.key] ?? KEYS[e.key.toLowerCase?.()];
      if (!dir || e.target?.tagName === 'INPUT') return;
      e.preventDefault();
      steer(dir);
    };
    let start = null;
    const onStart = (e) => {
      start = e.touches[0] ? [e.touches[0].clientX, e.touches[0].clientY] : null;
    };
    const onEnd = (e) => {
      const t = e.changedTouches[0];
      if (!start || !t) return;
      const [dx, dy] = [t.clientX - start[0], t.clientY - start[1]];
      start = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return; // a tap, not a swipe
      steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [active]);
}

function Pad() {
  return (
    <div className={styles.snakePad} role="group" aria-label="Steer your snake">
      <button type="button" className={styles.padUp} aria-label="Up" onClick={() => steer('up')}>
        ↑
      </button>
      <button type="button" className={styles.padLeft} aria-label="Left" onClick={() => steer('left')}>
        ←
      </button>
      <button type="button" className={styles.padRight} aria-label="Right" onClick={() => steer('right')}>
        →
      </button>
      <button type="button" className={styles.padDown} aria-label="Down" onClick={() => steer('down')}>
        ↓
      </button>
    </div>
  );
}

/**
 * Phones: the monitor in the scene is too small to play on, so during the
 * race your board is also drawn big, the width of the screen, between the
 * ranking and the arrow pad. Same drawing as the monitor (partyDraw.js).
 */
function PhoneBoard({ color }) {
  const canvas = useRef(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return undefined;
    const ctx = el.getContext('2d');
    let frame;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(el.clientWidth * dpr);
      const h = Math.round(el.clientHeight * dpr);
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
      }
      const cell = Math.min(w / GRID.cols, h / GRID.rows);
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, w, h);
      const ox = (w - cell * GRID.cols) / 2;
      const oy = (h - cell * GRID.rows) / 2;
      ctx.strokeStyle = `${color}88`;
      ctx.lineWidth = Math.max(1, dpr);
      ctx.strokeRect(ox + 0.5, oy + 0.5, cell * GRID.cols - 1, cell * GRID.rows - 1);
      const race = getPlay();
      drawBoard(ctx, { game: race.game, color, pops: race.pops, now: serverNow(), ox, oy, cell });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [color]);
  return <canvas ref={canvas} className={styles.partyPhoneBoard} aria-hidden="true" />;
}

/** The live ranking: each row slides to its place, so overtakes show. */
function Ranking({ rows, you }) {
  return (
    <ol className={styles.partyRanking} style={{ height: rows.length * ROW_PX }} aria-label="Live ranking">
      {rows.map((r, i) => (
        <li
          key={r.id}
          className={styles.partyRankRow}
          style={{ '--player': r.color, transform: `translateY(${i * ROW_PX}px)` }}
          data-you={r.id === you ? '' : undefined}
          data-out={r.status === 'out' || r.status === 'left' ? '' : undefined}
        >
          <span className={styles.partyRankPlace}>{r.place}</span>
          <span className={styles.partyChipName}>
            {r.name}
            {r.id === you && <span className={styles.srOnly}> (you)</span>}
          </span>
          {r.status === 'out' && <span aria-label="out">💥</span>}
          {r.status === 'left' && <span aria-label="left">🚪</span>}
          <span key={r.score} className={styles.partyRankScore}>
            {r.score}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function Race({ party, coarse }) {
  const room = party.room;
  const now = useClock(room.endsAt);
  const score = useMine(myScore);
  const over = useMine(myOver);
  const reason = useMine(myReason);
  const mine = room.players.find((p) => p.id === party.you);
  const inRound = Boolean(mine && score !== null);
  const [waiting, setWaiting] = useState(false);
  useSteering(inRound && !over);
  const rows = useMemo(() => liveRanking(room.players, party.you, score), [room.players, party.you, score]);
  const left = timeLeft(room.endsAt, now) ?? 0;
  const last = finalSeconds(room.endsAt, now);
  const myPlace = rows.find((r) => r.id === party.you)?.place;

  const leave = () => {
    print([
      {
        kind: 'dim',
        text: `You left the Snake party with ${score ?? 0} points; your score stands. Open the invite link again within 10 minutes of the end to see the results.`,
      },
    ]);
    leaveParty();
  };

  return (
    <>
      <div className={styles.partyRaceHead}>
        <h2 className={styles.partyTitle}>{over ? (reason === 'time' ? 'Time!' : 'Crashed!') : 'Round on!'}</h2>
        <span className={styles.partyClock} data-last={last ? '' : undefined} role="timer" aria-label={`${clock(left)} left`}>
          {clock(left)}
        </span>
      </div>
      <div className={styles.partyBar} aria-hidden="true">
        <span style={{ transform: `scaleX(${left / (room.endsAt - room.startAt)})` }} data-last={last ? '' : undefined} />
      </div>
      {inRound && !over && (
        <p className={styles.partyLead}>
          You’re {myPlace ? medal(myPlace).replace('.', 'th') : '…'} with <b>{score}</b>. Arrow keys or WASD
          {coarse ? ', or swipe' : ''}.
        </p>
      )}
      {over && (
        <p className={styles.partyLead} role="status" data-crashed="">
          {reason === 'time' ? 'You made it to the bell' : 'Out'} with <b>{score}</b> points.{' '}
          {waiting ? 'Waiting for the others… the results show here.' : 'Wait for the results, or leave: your score stands either way.'}
        </p>
      )}
      <Ranking rows={rows} you={party.you} />
      <div className={styles.partyActions}>
        {over && !waiting && (
          <button
            type="button"
            className={`${styles.keyButton} ${styles.partyPrimary}`}
            onClick={() => {
              stayForResults();
              setWaiting(true);
            }}
          >
            Wait for results
          </button>
        )}
        <button type="button" className={styles.keyButton} onClick={leave}>
          Leave
        </button>
      </div>
      {/* Outside the panel (its blur and slide would trap fixed positions inside it). */}
      {coarse &&
        inRound &&
        !over &&
        createPortal(
          <>
            <PhoneBoard color={mine.color} />
            <Pad />
          </>,
          document.getElementById('house') ?? document.body,
        )}
    </>
  );
}

/** A burst of confetti in the players' colours (once, when the winner shows). */
function Confetti({ colors }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        drift: (Math.random() - 0.5) * 160,
        spin: Math.random() * 720 - 360,
        color: colors[i % colors.length],
      })),
    [colors],
  );
  return (
    <div className={styles.partyConfetti} aria-hidden="true">
      {bits.map((b, i) => (
        <span key={i} style={{ left: `${b.left}%`, background: b.color, animationDelay: `${b.delay}s`, '--drift': `${b.drift}px`, '--spin': `${b.spin}deg` }} />
      ))}
    </div>
  );
}

export function Results({ party, reducedMotion }) {
  const { results } = party.room;
  const rows = results.ranking;
  const isHost = party.room.host === party.you && party.you !== null;
  const host = party.room.players.find((p) => p.id === party.room.host);
  // The reveal: last place first, a snare hit for each, the fanfare for the winner.
  const startedAt = useRef(performance.now());
  const [shown, setShown] = useState(reducedMotion ? rows.length : 1);
  useEffect(() => {
    if (reducedMotion) return undefined;
    play('drum');
    const id = setInterval(() => {
      const n = revealed(rows.length, performance.now() - startedAt.current);
      setShown((was) => {
        if (n > was) play(n === rows.length ? 'win' : 'drum');
        return n;
      });
      if (n >= rows.length) clearInterval(id);
    }, 80);
    return () => clearInterval(id);
  }, [rows.length, reducedMotion]);
  const done = shown >= rows.length;
  const [shareNote, setShareNote] = useState('');
  const awards = results.awards;
  const nameOf = (id) => rows.find((r) => r.id === id);
  const award = (id, label, detail) => {
    const r = nameOf(id);
    return r ? (
      <li className={styles.partyAward} style={{ '--player': r.color }}>
        {label}: <b>{r.name}</b> {detail(r)}
      </li>
    ) : null;
  };

  return (
    <>
      {done && !reducedMotion && <Confetti colors={rows.map((r) => r.color)} />}
      <h2 className={styles.partyTitle}>Round over</h2>
      <ol className={styles.partyResults} aria-label="Results">
        {rows.map((r, i) => {
          const visible = rows.length - i <= shown;
          return (
            <li
              key={r.id}
              className={styles.partyResultRow}
              style={{ '--player': r.color }}
              data-hidden={visible ? undefined : ''}
              data-winner={r.place === 1 && visible ? '' : undefined}
              data-you={r.id === party.you ? '' : undefined}
              aria-hidden={visible ? undefined : 'true'}
            >
              <span className={styles.partyResultMedal}>{visible ? medal(r.place) : '?'}</span>
              <span className={styles.partyResultName}>
                {visible ? r.name : '…'}
                {visible && r.id === party.you && <span className={styles.partyYou}> (you)</span>}
                {visible && <small>{[REASONS[r.reason], r.golden ? `${r.golden} golden` : null].filter(Boolean).join(' · ')}</small>}
              </span>
              <span className={styles.partyRankScore}>{visible ? r.score : ''}</span>
            </li>
          );
        })}
      </ol>
      {done && (
        <>
          <ul className={styles.partyAwards} aria-label="Awards">
            {award(awards.golden, '🍯 Most golden', (r) => `(${r.golden})`)}
            {award(awards.longest, '🐍 Longest snake', (r) => `(${r.length})`)}
            {award(awards.survivor, '⏱ Lasted longest', (r) => `(${clock(r.lastedMs)})`)}
          </ul>
          <p className={styles.partyNote}>These results disappear about 10 minutes after the round. Download a copy to keep them.</p>
          <div className={styles.partyActions}>
            <button type="button" className={`${styles.keyButton} ${styles.partyPrimary}`} onClick={() => downloadResults(results, party.code)}>
              Download image
            </button>
            <button
              type="button"
              className={styles.keyButton}
              onClick={async () => {
                const how = await shareResults(results, party.code, resultsText(results));
                setShareNote(how === 'copied' ? 'Results copied' : '');
              }}
            >
              {shareNote || 'Share results'}
            </button>
            {isHost && (
              <button type="button" className={styles.keyButton} onClick={rematch}>
                Play again
              </button>
            )}
            <button type="button" className={styles.keyButton} onClick={leaveParty}>
              Leave
            </button>
          </div>
          {!isHost && party.you && <p className={styles.partyNote}>{host ? `${host.name} can start another round.` : ''}</p>}
        </>
      )}
      <span className={styles.srOnly} aria-live="polite">
        {done ? `Results: ${rows.map((r) => `${r.place}, ${r.name}, ${r.score} points`).join('; ')}.` : ''}
      </span>
    </>
  );
}
