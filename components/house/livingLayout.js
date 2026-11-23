// The living room's TV: a 50-inch screen on the right-hand wall's media wall,
// facing the sofa. Coordinates are three.js metres (Blender (x, y, z) is
// (x, z, -y) here); the wall and the console under the TV are modelled in
// scripts/blender/walkway.py (living_room()), which uses the same numbers.

export const TV = {
  wallX: 4.35, // the face of the oak slats on the media wall (the wall itself is at 4.4)
  centre: [1.58, -3.35], // height, and position along the wall (z)
  width: 1.11, // a 50-inch 16:9 picture
  height: 0.624,
  bezel: 0.012,
  depth: 0.035,
};

/** The YouTube player's size in CSS pixels, and the drei Html factor that makes it exactly TV.width wide. */
export const PLAYER = { width: 1120, height: 630 };
export const PLAYER_DISTANCE_FACTOR = (TV.width * 400) / PLAYER.width;

export const YOUTUBE_ORIGIN = 'https://www.youtube-nocookie.com';

/** The embed address: the whole playlist, playing from the start, looping. */
export function playerUrl(playlistId, { muted, origin }) {
  const q = new URLSearchParams({
    list: playlistId,
    autoplay: '1',
    mute: muted ? '1' : '0',
    loop: '1',
    playsinline: '1',
    enablejsapi: '1',
    rel: '0',
    modestbranding: '1',
    origin,
  });
  return `${YOUTUBE_ORIGIN}/embed/videoseries?${q}`;
}
