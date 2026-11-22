import { PROJECTS } from '@/constants/projects';
import { TECH_STACK } from '@/constants/skills';
import { EXPERIENCE } from '@/constants/experience';
import { CONTACTS } from '@/constants/contact';
import { ARTIST, TRACKS, trackUrl } from '@/constants/music';
import { bookFor } from './shelf';
import { FRAMES, SPOTS } from './spots';
import { projectSpotId, shortName, subtitle } from './galleryLayout';
import styles from './house.module.css';

// What each room holds, from the same data files the classic page uses.
// Later phases turn these into objects in the room (books, frames, records,
// the corkboard); the panels stay as the readable version of each.

/** All skills by area. Each opens its book. */
function Skills({ onSelectSkill }) {
  return (
    <>
      <p className={styles.panelLead}>One book per tool. The thicker the book, the more projects and roles use it.</p>
      <dl className={styles.panelList}>
        {Object.entries(TECH_STACK).map(([area, items]) => (
          <div key={area}>
            <dt>{area}</dt>
            <dd className={styles.chips}>
              {items.map((skill) => (
                <button key={skill} type="button" className={styles.chip} onClick={() => onSelectSkill(skill)}>
                  {skill}
                </button>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** One book, pulled off the shelf: what it is and where it has been used. */
function Skill({ skill, onSelectSkill, onGo }) {
  const book = bookFor(skill);
  if (!book) return null;
  const { projects, roles } = book;
  return (
    <>
      <p className={styles.panelEyebrow}>{book.area}</p>
      <p className={styles.panelLead}>{book.note}</p>
      {projects.length > 0 && (
        <>
          <h3 className={styles.panelSubtitle}>
            Used in {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </h3>
          <ul className={styles.panelList}>
            {projects.map((p) => (
              <li key={p.name}>
                <ProjectLink project={p} onGo={onGo} />
              </li>
            ))}
          </ul>
        </>
      )}
      {roles.length > 0 && (
        <>
          <h3 className={styles.panelSubtitle}>Used at work</h3>
          <ul className={styles.panelList}>
            {roles.map((r) => (
              <li key={r.title}>
                <strong>{r.title}</strong>
                <p>{r.company}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      {projects.length === 0 && roles.length === 0 && (
        <p className={styles.panelLead}>Part of my toolkit, though none of the projects listed here use it yet.</p>
      )}
      <button type="button" className={styles.panelBack} onClick={() => onSelectSkill(null)}>
        ← All skills
      </button>
    </>
  );
}

/** The living room: the overview, or one skill when a book is out. */
function LivingRoom({ skill, onSelectSkill, onGo }) {
  return skill ? <Skill skill={skill} onSelectSkill={onSelectSkill} onGo={onGo} /> : <Skills onSelectSkill={onSelectSkill} />;
}

/** A project's name, walking to its frame in the gallery; and its live site. */
function ProjectLink({ project, onGo }) {
  return (
    <span className={styles.projectLink}>
      <button type="button" className={styles.linkButton} onClick={() => onGo(projectSpotId(project))}>
        {shortName(project)}
      </button>
      <a href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`${shortName(project)} live site (opens in a new tab)`}>
        site ↗
      </a>
    </span>
  );
}

function Projects({ onGo }) {
  return (
    <ul className={styles.panelList}>
      {PROJECTS.map((p) => (
        <li key={p.name}>
          <ProjectLink project={p} onGo={onGo} />
          <p>{p.impact}</p>
        </li>
      ))}
    </ul>
  );
}

/** One framed project, seen up close. */
function Project({ spot }) {
  const { project } = SPOTS[spot].frame;
  return (
    <>
      <p className={styles.panelEyebrow}>{[project.category, project.year].filter(Boolean).join(' · ')}</p>
      <p className={styles.panelLead}>
        <em>{subtitle(project)}</em>
      </p>
      <p className={styles.panelLead}>{project.description}</p>
      <h3 className={styles.panelSubtitle}>Stack</h3>
      <p className={styles.chips}>
        {project.tech.map((t) => (
          <span key={t} className={styles.tag}>
            {t}
          </span>
        ))}
      </p>
      <h3 className={styles.panelSubtitle}>Outcome</h3>
      <p className={styles.panelLead}>{project.impact}</p>
      <p>
        <a className={styles.panelCta} href={project.url} target="_blank" rel="noopener noreferrer">
          Visit {shortName(project)} ↗
        </a>
      </p>
    </>
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
// and its content. Spots without an entry have no panel. Every Content gets
// `spot`, `onGo` (walk to a spot), `skill` (the book that is out, if any) and
// `onSelectSkill`; each uses what it needs.
export const ROOMS = {
  entry: { line: 'The gallery is straight ahead; the living room is through the opening on the right.' },
  living: {
    line: 'One book for every tool I build with. Pick one off the shelf.',
    open: 'Skills',
    title: 'Skills',
    Content: LivingRoom,
  },
  gallery: {
    line: 'The projects hang here. The studio is on the left, the desk on the right.',
    open: 'Projects',
    title: 'Projects',
    Content: Projects,
  },
  studio: { line: 'Where I make music.', open: 'Music', title: ARTIST.name, Content: Music },
  desk: { line: 'Where the work happens.', open: 'Experience and contact', title: 'Experience and contact', Content: Desk },
  // Each framed project: its panel opens by itself on wide screens.
  ...Object.fromEntries(
    FRAMES.map((f, i) => [
      f.id,
      {
        line: f.project.impact,
        open: 'About this project',
        title: f.name,
        Content: Project,
        autoOpen: true,
        previous: FRAMES[(i - 1 + FRAMES.length) % FRAMES.length].id,
        next: FRAMES[(i + 1) % FRAMES.length].id,
      },
    ])
  ),
};
