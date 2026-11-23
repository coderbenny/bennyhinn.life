// Benny's music, played in the studio. Spotify no longer lets new developer
// apps fetch an artist's top tracks, so this list is kept by hand.
// Order: Spotify's "Top tracks" for the artist, as of 2026-11-15.

export const ARTIST = {
  name: 'Benny On The Beat',
  spotifyId: '5pNeBBPAIviMt0gwl9h6vB',
  url: 'https://open.spotify.com/artist/5pNeBBPAIviMt0gwl9h6vB',
};

export const TRACKS = [
  { title: 'Mimi na Wewe', with: [], spotifyId: '0h0OmBMxVxUJ3NJ7HNY3tX' },
  { title: 'My Lover', with: ['Litty Elton'], spotifyId: '3B5O8DPYiNNvQsHXZSmCBZ' },
  { title: 'No Limit', with: [], spotifyId: '3JtRlJBvPzZhoMIVtwzKxQ' },
  { title: 'Flex', with: ['Hawi'], spotifyId: '0UhtAAP4qfeAzxNIgRomCK' },
  { title: 'Wasiwasi', with: [], spotifyId: '54ic8z9HiAZ60XfmDRzWja' },
  { title: 'BADDIE BOO', with: ['Audo Jackson'], spotifyId: '1QWpO5fv76rLdvpRYljkL6' },
  { title: 'Coast Life', with: [], spotifyId: '2A0fGWCRzCECJE9qe7nPyM' },
  { title: 'No Fake Love', with: [], spotifyId: '391z06JtVMVUgjXynxwOCb' },
  { title: 'Nobody', with: [], spotifyId: '3US4mnxohiaFrOOlZvAu2e' },
  { title: 'Betrayal', with: ['Thee Nitric', 'TalakidBeatz'], spotifyId: '6qQycr9PmIXVjgEyOmyt2P' },
];

export const trackUrl = (t) => `https://open.spotify.com/track/${t.spotifyId}`;

// Benny's music videos, played on the TV in the living room.
export const YOUTUBE_PLAYLIST = {
  id: 'PLiyoQyqShHh315leq94E8wi9XD91GPudL',
  title: 'Songs By Benny On The Beat',
  url: 'https://www.youtube.com/playlist?list=PLiyoQyqShHh315leq94E8wi9XD91GPudL',
};
