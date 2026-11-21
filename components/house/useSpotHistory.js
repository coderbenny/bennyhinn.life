'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SPOTS, spotFromSearch, spotUrl } from './spots';

/**
 * The spot the visitor is heading to, kept in the address bar so every room
 * can be linked to (`/?room=studio`) and the browser's Back button walks
 * back through the house.
 *
 * Each move pushes a history entry that records how many moves deep it is.
 * `back()` steps back through those entries; a visitor who arrived straight
 * at a room has none, so `back()` walks to the room's parent instead of
 * leaving the site.
 */
export default function useSpotHistory() {
  const [target, setTarget] = useState(() => spotFromSearch(window.location.search));

  useEffect(() => {
    // Mark the entry the visitor arrived on, keeping the router's own state.
    window.history.replaceState({ ...window.history.state, houseDepth: 0 }, '', spotUrl(target));
    const onPop = () => setTarget(spotFromSearch(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // Only on mount: later moves update the entry themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The latest target, for the handlers below. History is changed outside
  // state updaters, which React may run twice.
  const current = useRef(target);
  current.current = target;

  const goTo = useCallback((id) => {
    if (id === current.current) return;
    const depth = (window.history.state?.houseDepth ?? 0) + 1;
    window.history.pushState({ houseDepth: depth }, '', spotUrl(id));
    current.current = id;
    setTarget(id);
  }, []);

  const back = useCallback(() => {
    if ((window.history.state?.houseDepth ?? 0) > 0) {
      window.history.back(); // the popstate listener moves the camera
      return;
    }
    const parent = SPOTS[current.current].parent;
    if (!parent) return;
    window.history.replaceState({ ...window.history.state, houseDepth: 0 }, '', spotUrl(parent));
    current.current = parent;
    setTarget(parent);
  }, []);

  return { target, goTo, back };
}
