// The picture shown when a link to the site is shared (WhatsApp, LinkedIn, X,
// Slack...): the house at dusk from the walkway, with Benny's name. 1200×630,
// the size those apps expect. Pages without their own picture use this one.
export const SHARE_IMAGE = {
  url: '/og-house.jpg',
  width: 1200,
  height: 630,
  alt: 'Benny Hinn Mathew, full-stack and AI engineer: his house at dusk, at bennyhinn.life',
};

export const SHARE_IMAGE_URL = `https://bennyhinn.life${SHARE_IMAGE.url}`;
