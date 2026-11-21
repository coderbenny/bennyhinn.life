import { PROJECTS } from '@/constants/projects';
import { TECH_STACK } from '@/constants/skills';
import { EXPERIENCE } from '@/constants/experience';
import { CONTACTS } from '@/constants/contact';
import { ARTIST, TRACKS, trackUrl } from '@/constants/music';
import styles from './house.module.css';

// What each room holds, from the same data files the classic page uses.
// Later phases turn these into objects in the room (books, frames, records,
// the corkboard); the panels stay as the readable version of each.

function Skills() {
  return (
    <dl className={styles.panelList}>
      {Object.entries(TECH_STACK).map(([area, items]) => (
        <div key={area}>
          <dt>{area}</dt>
          <dd>{items.join(', ')}</dd>
        </div>
      ))}
    </dl>
  );
}

function Projects() {
  return (
    <ul className={styles.panelList}>
      {PROJECTS.map((p) => (
        <li key={p.name}>
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            {p.name}
          </a>
          <p>{p.impact}</p>
        </li>
      ))}
    </ul>
  );
}

function Music() {
  return (
    <>
      <p className={styles.panelLead}>
        I make music as{' '}
        <a href={ARTIST.url} target="_blank" rel="noopener noreferrer">
          {ARTIST.name} on Spotify
        </a>
        .
      </p>
      <ol className={styles.panelList}>
        {TRACKS.map((t) => (
          <li key={t.spotifyId}>
            <a href={trackUrl(t)} target="_blank" rel="noopener noreferrer">
              {t.title}
            </a>
            {t.with.length > 0 && <span> with {t.with.join(', ')}</span>}
          </li>
        ))}
      </ol>
    </>
  );
}

function Desk() {
  return (
    <>
      <h3 className={styles.panelSubtitle}>Experience</h3>
      <ul className={styles.panelList}>
        {EXPERIENCE.map((e) => (
          <li key={e.title}>
            <strong>{e.title}</strong>
            <p>
              {e.company} · {e.period}
            </p>
          </li>
        ))}
      </ul>
      <h3 className={styles.panelSubtitle}>Contact</h3>
      <ul className={styles.panelList}>
        {CONTACTS.map((c) => (
          <li key={c.label}>
            {c.label}: <a href={c.href}>{c.value}</a>
          </li>
        ))}
      </ul>
    </>
  );
}

// Per spot: a line for the room card, the panel's button label and title,
// and its content. Spots without an entry have no panel.
export const ROOMS = {
  entry: { line: 'The gallery is straight ahead; the living room is through the opening on the right.' },
  living: { line: 'Where the books are: the tools I build with.', open: 'Skills', title: 'Skills', Content: Skills },
  gallery: {
    line: 'The projects hang here. The studio is on the left, the desk on the right.',
    open: 'Projects',
    title: 'Projects',
    Content: Projects,
  },
  studio: { line: 'Where I make music.', open: 'Music', title: ARTIST.name, Content: Music },
  desk: { line: 'Where the work happens.', open: 'Experience and contact', title: 'Experience and contact', Content: Desk },
};
