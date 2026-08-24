import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import gfm from 'remark-gfm';

const postsDirectory = path.join(process.cwd(), 'content/blog');

export const AUTHOR = {
  name: 'Benny Hinn Mathew',
  url: 'https://bennyhinn.life/about',
  jobTitle: 'VAS & Full-Stack Engineer',
  image: 'https://bennyhinn.life/benny-logo.jpeg',
  sameAs: [
    'https://github.com/coderbenny',
    'https://www.linkedin.com/in/benny-mathew',
  ],
};

// ~225 wpm is the usual figure for technical prose read on screen.
export function readingTime(markdown) {
  const words = markdown.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 225));
}

export function getPostSlugs() {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }
  return fs.readdirSync(postsDirectory);
}

export function getPostBySlug(slug) {
  const realSlug = slug.replace(/\.md$/, '');
  const fullPath = path.join(postsDirectory, `${realSlug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug: realSlug,
    meta: {
      ...data,
      tags: data.tags || [],
      category: data.category || 'Engineering',
      readingTime: readingTime(content),
    },
    content,
  };
}

export function getAllPosts() {
  const slugs = getPostSlugs();
  return slugs
    .filter((slug) => slug.endsWith('.md'))
    .map((slug) => getPostBySlug(slug))
    .filter((post) => post !== null)
    .sort((a, b) => (a.meta.date > b.meta.date ? -1 : 1));
}

/**
 * Related posts, ranked by shared tags then by recency. Keeps every article
 * within two clicks of the others so crawlers (and readers) don't hit dead ends.
 */
export function getRelatedPosts(slug, limit = 3) {
  const all = getAllPosts();
  const current = all.find((p) => p.slug === slug);
  if (!current) return [];

  const currentTags = new Set(current.meta.tags);

  return all
    .filter((p) => p.slug !== slug)
    .map((p) => ({
      post: p,
      score: p.meta.tags.filter((t) => currentTags.has(t)).length,
    }))
    .sort((a, b) => b.score - a.score || (a.post.meta.date > b.post.meta.date ? -1 : 1))
    .slice(0, limit)
    .map((x) => x.post);
}

export function getAllTags() {
  const counts = new Map();
  for (const post of getAllPosts()) {
    for (const tag of post.meta.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function markdownToHtml(markdown) {
  // gfm adds tables, strikethrough and autolinks; sanitize:false keeps our own
  // authored markup (all content is first-party, no user submissions).
  const result = await remark()
    .use(gfm)
    .use(html, { sanitize: false })
    .process(markdown);
  return result.toString();
}
