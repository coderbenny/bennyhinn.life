import Link from 'next/link';
import { PROJECTS } from '@/constants/projects';
import { TECH_STACK } from '@/constants/skills';
import { EXPERIENCE } from '@/constants/experience';
import { CONTACTS } from '@/constants/contact';
import { ARTIST, TRACKS, trackUrl } from '@/constants/music';
import styles from './house.module.css';

// Everything in the house, as readable HTML. Shown when the house cannot load.
export default function HomeContent() {
  return (
    <article className={styles.content}>
      <header>
        <h1>Benny Hinn Mathew</h1>
        <p>
          Full-stack and AI engineer in Nairobi, Kenya. I build marketplaces, payment flows and telecom
          services, and I make music as {ARTIST.name}.
        </p>
        <p>
          <Link href="/classic">Open the full portfolio page</Link>
        </p>
      </header>

      <section aria-labelledby="home-projects">
        <h2 id="home-projects">Projects</h2>
        <ul>
          {PROJECTS.map((p) => (
            <li key={p.name}>
              <a href={p.url}>{p.name}</a>: {p.description}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="home-skills">
        <h2 id="home-skills">Skills</h2>
        <dl>
          {Object.entries(TECH_STACK).map(([area, items]) => (
            <div key={area}>
              <dt>{area}</dt>
              <dd>{items.join(', ')}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="home-experience">
        <h2 id="home-experience">Experience</h2>
        <ul>
          {EXPERIENCE.map((e) => (
            <li key={e.title}>
              {e.title}, {e.company} ({e.period})
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="home-music">
        <h2 id="home-music">Music</h2>
        <p>
          <a href={ARTIST.url}>{ARTIST.name} on Spotify</a>
        </p>
        <ul>
          {TRACKS.map((t) => (
            <li key={t.spotifyId}>
              <a href={trackUrl(t)}>{t.title}</a>
              {t.with.length > 0 && ` (with ${t.with.join(', ')})`}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="home-contact">
        <h2 id="home-contact">Contact</h2>
        <ul>
          {CONTACTS.map((c) => (
            <li key={c.label}>
              {c.label}: <a href={c.href}>{c.value}</a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
