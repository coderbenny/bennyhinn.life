import { execSync } from 'node:child_process';

/**
 * The site's latest commit, for the monitor on the desk in the 3D house:
 * read from git when the site is built (or the dev server starts), or from
 * the variables Vercel sets when git history is not available. Empty if
 * neither is.
 */
function latestCommit() {
  try {
    const [sha, date, ...subject] = execSync('git log -1 --format=%H%n%cI%n%s', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .split('\n');
    return { sha, date, message: subject.join(' ') };
  } catch {
    const sha = process.env.VERCEL_GIT_COMMIT_SHA;
    if (!sha) return null;
    const message = (process.env.VERCEL_GIT_COMMIT_MESSAGE || '').split('\n')[0];
    return { sha, date: new Date().toISOString(), message };
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  env: {
    HOUSE_COMMIT: JSON.stringify(latestCommit()),
  },
};

export default nextConfig;
