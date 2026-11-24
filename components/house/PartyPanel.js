"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MAX_PLAYERS_SHOWN, countdownAt } from "./partyView";
import {
  cancelParty,
  copyInvite,
  getParty,
  joinParty,
  leaveParty,
  partyInvite,
  serverNow,
  shareInvite,
  startRound,
  subscribeParty,
} from "./partyStore";
import { play } from "./sound";
import styles from "./house.module.css";

// The Snake party, on the page beside the desk monitor: the name box, the
// lobby (invite, players popping in, the host's Start), the 3-2-1 countdown
// over the whole scene, and a feed of what's happening. The monitor in the
// scene shows the same party (DeskMonitor.js); this is the part you click,
// type in and hear through a screen reader.

export const useParty = () =>
  useSyncExternalStore(subscribeParty, getParty, getParty);

/** The countdown's number (3, 2, 1, 0 for GO, null outside it), ticking with the room's clock. */
function useCountdown(room) {
  const [n, setN] = useState(null);
  useEffect(() => {
    if (room?.phase !== "countdown" && room?.phase !== "playing") {
      setN(null);
      return undefined;
    }
    let last = null;
    const id = setInterval(() => {
      const next = countdownAt(room.startAt, serverNow());
      if (next === last) return;
      last = next;
      setN(next);
      if (next === 3 || next === 2 || next === 1) play("tick");
      if (next === 0) play("go");
    }, 50);
    return () => clearInterval(id);
  }, [room?.phase, room?.startAt]);
  return n;
}

function Feed({ feed }) {
  return (
    <ol
      className={styles.partyFeed}
      aria-live="polite"
      aria-label="What's happening"
    >
      {feed.map((f) => (
        <li
          key={f.id}
          className={styles.partyFeedItem}
          data-kind={f.kind}
          style={f.color ? { "--player": f.color } : undefined}
        >
          {f.text}
        </li>
      ))}
    </ol>
  );
}

function Naming({ party }) {
  const input = useRef(null);
  const [name, setName] = useState(party.name);
  useEffect(() => input.current?.focus({ preventScroll: true }), []);
  return (
    <form
      className={styles.partyForm}
      onSubmit={(e) => {
        e.preventDefault();
        joinParty(name);
      }}
    >
      <h2 className={styles.partyTitle}>
        {party.create
          ? "Start a Snake party"
          : "You’re invited to a Snake party"}
      </h2>
      <p className={styles.partyLead}>
        Up to 5 players race the same game for 3 minutes. Golden fruit are worth
        3. Highest score wins.
      </p>
      <label className={styles.partyLabel} htmlFor="party-name">
        Your name
      </label>
      <input
        ref={input}
        id="party-name"
        className={styles.partyInput}
        value={name}
        maxLength={12}
        autoComplete="nickname"
        enterKeyHint="go"
        onChange={(e) => setName(e.target.value)}
        aria-describedby={party.error ? "party-error" : undefined}
      />
      {party.error && (
        <p id="party-error" className={styles.partyError} role="alert">
          {party.error.message}
        </p>
      )}
      <div className={styles.partyActions}>
        <button
          type="submit"
          className={`${styles.keyButton} ${styles.partyPrimary}`}
        >
          {party.create ? "Create the party" : "Join the party"}
        </button>
        <button
          type="button"
          className={styles.keyButton}
          onClick={cancelParty}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Invite() {
  const [copied, setCopied] = useState(false);
  const url = partyInvite();
  return (
    <div className={styles.partyInvite}>
      <span className={styles.partyLabel}>Invite friends</span>
      <div className={styles.partyLinkRow}>
        <input
          className={styles.partyLink}
          value={url ?? ""}
          readOnly
          aria-label="Invite link"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          className={styles.keyButton}
          onClick={async () => {
            if (await copyInvite()) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          type="button"
          className={styles.keyButton}
          onClick={shareInvite}
        >
          Share
        </button>
      </div>
      <span className={styles.srOnly} aria-live="polite">
        {copied ? "Invite link copied" : ""}
      </span>
    </div>
  );
}

function Players({ room, you }) {
  const slots = Math.max(0, MAX_PLAYERS_SHOWN - room.players.length);
  return (
    <>
      <span className={styles.partyLabel} aria-hidden="true">
        Players · {room.players.length}/{MAX_PLAYERS_SHOWN}
      </span>
      <ul
        className={styles.partyPlayers}
        aria-label={`Players, ${room.players.length} of ${MAX_PLAYERS_SHOWN}`}
      >
        {room.players.map((p) => (
          <li
            key={p.id}
            className={styles.partyChip}
            style={{ "--player": p.color }}
            data-away={p.online ? undefined : ""}
          >
            <span className={styles.partyChipSnake} aria-hidden="true" />
            <span className={styles.partyChipName}>{p.name}</span>
            {p.id === room.host && (
              <span className={styles.partyBadge} title="Host">
                <span aria-hidden="true">👑 </span>host
              </span>
            )}
            {p.id === you && <span className={styles.partyBadge}>you</span>}
            {!p.online && <span className={styles.partyBadge}>away</span>}
          </li>
        ))}
        {Array.from({ length: slots }, (_, i) => (
          <li key={`slot${i}`} className={styles.partySlot} aria-hidden="true">
            waiting for a player…
          </li>
        ))}
      </ul>
    </>
  );
}

function Lobby({ party }) {
  const { room, you } = party;
  const isHost = room.host === you;
  const host = room.players.find((p) => p.id === room.host);
  const enough = room.players.length >= 2;
  return (
    <>
      <h2 className={styles.partyTitle}>Snake party</h2>
      <Invite />
      <Players room={room} you={you} />
      <div className={styles.partyActions}>
        {isHost ? (
          <button
            type="button"
            className={`${styles.keyButton} ${styles.partyPrimary}`}
            data-ready={enough ? "" : undefined}
            disabled={!enough}
            onClick={startRound}
          >
            {enough
              ? `Start the round · ${room.players.length} players`
              : "Waiting for one more player…"}
          </button>
        ) : (
          <p className={styles.partyLead}>
            Waiting for {host?.name ?? "the host"} to start…
          </p>
        )}
        <button type="button" className={styles.keyButton} onClick={leaveParty}>
          Leave
        </button>
      </div>
    </>
  );
}

/** The big 3, 2, 1, GO over the scene. */
function Countdown({ n }) {
  if (n === null || n < 0) return null;
  return (
    <div className={styles.partyCountdown} aria-hidden="true">
      <span
        key={n}
        className={styles.partyCountdownNumber}
        data-go={n === 0 ? "" : undefined}
      >
        {n === 0 ? "GO!" : n}
      </span>
    </div>
  );
}

export default function PartyPanel() {
  const party = useParty();
  const n = useCountdown(party.room);

  // Mid-party, Esc doesn't walk away from the desk: Leave does that.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const s = getParty();
      if (s.status === "naming") {
        e.stopImmediatePropagation();
        cancelParty();
      } else if (s.status === "in" || s.status === "connecting") {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  if (party.status === "idle") return null;
  const phase = party.room?.phase;
  return (
    <>
      <Countdown n={n} />
      <Feed feed={party.feed} />
      <section
        className={styles.partyPanel}
        aria-label="Snake party"
        data-phase={phase ?? party.status}
      >
        {party.status === "naming" && <Naming party={party} />}
        {party.status === "connecting" && (
          <>
            <h2 className={styles.partyTitle}>Snake party</h2>
            <p className={styles.partyLead} role="status">
              Joining the party…
            </p>
          </>
        )}
        {party.status === "error" && (
          <>
            <h2 className={styles.partyTitle}>Snake party</h2>
            <p className={styles.partyError} role="alert">
              {party.error?.message}
            </p>
            <div className={styles.partyActions}>
              <button
                type="button"
                className={styles.keyButton}
                onClick={cancelParty}
              >
                Back to the terminal
              </button>
            </div>
          </>
        )}
        {party.status === "in" && phase === "lobby" && <Lobby party={party} />}
        {party.status === "in" && phase === "countdown" && (
          <>
            <h2 className={styles.partyTitle}>Get ready!</h2>
            <p className={styles.partyLead} role="status">
              {n > 0 ? `Starting in ${n}…` : "Go!"} Use the arrow keys or WASD
              <span className={styles.partyTouchOnly}> (or the arrow pad)</span>
              .
            </p>
            <Players room={party.room} you={party.you} />
          </>
        )}
        {party.status === "in" &&
          (phase === "playing" || phase === "results") && (
            <>
              <h2 className={styles.partyTitle}>
                {phase === "playing" ? "Round on!" : "Round over"}
              </h2>
              <p className={styles.partyLead}>
                The race itself arrives in the next step.
              </p>
              <div className={styles.partyActions}>
                <button
                  type="button"
                  className={styles.keyButton}
                  onClick={leaveParty}
                >
                  Leave
                </button>
              </div>
            </>
          )}
        {!party.online && party.status === "in" && (
          <p className={styles.partyWarn} role="status">
            Connection lost, reconnecting…
          </p>
        )}
      </section>
    </>
  );
}
