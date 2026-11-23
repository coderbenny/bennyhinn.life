import { PROJECTS } from '@/constants/projects';
import { TECH_STACK } from '@/constants/skills';
import { EXPERIENCE } from '@/constants/experience';
import { CONTACTS } from '@/constants/contact';
import { ARTIST, TRACKS, trackUrl } from '@/constants/music';
import { bookFor } from './shelf';
import { FRAMES, RECORDS, SPOTS } from './spots';
import { projectSpotId, shortName, subtitle } from './galleryLayout';
import { recordImage } from './recordWall';
import { CARDS, COMMIT, REPO_URL, commitUrl, timeSince } from './deskLayout';
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

const credit = (t) => (t.with.length ? `${ARTIST.name} with ${t.with.join(', ')}` : ARTIST.name);

/** The studio from the door: every track, straight to Spotify, and the way to the record wall. */
function Music({ onGo }) {
  return (
    <>
      <p className={styles.panelLead}>
        I make music as{' '}
        <a href={ARTIST.url} target="_blank" rel="noopener noreferrer">
          {ARTIST.name} on Spotify
        </a>
        . The records on the back wall are mine; pick one to listen to it.
      </p>
      <ol className={styles.panelList}>
        {TRACKS.map((t) => (
          <li key={t.spotifyId}>
            <a href={trackUrl(t)} target="_blank" rel="noopener noreferrer" aria-label={`${t.title} on Spotify (opens in a new tab)`}>
              {t.title}
            </a>
            {t.with.length > 0 && <span> with {t.with.join(', ')}</span>}
          </li>
        ))}
      </ol>
      <p>
        <button type="button" className={styles.panelBack} onClick={() => onGo('records')}>
          Go to the record wall →
        </button>
      </p>
    </>
  );
}

/** One record, taken off the wall: its cover, who is on it, and the way to Spotify. */
function Track({ id, onSelectTrack }) {
  const record = RECORDS.find((r) => r.track.spotifyId === id);
  if (!record) return null;
  const t = record.track;
  return (
    <>
      <p className={styles.panelEyebrow}>No. {record.index + 1} in my top tracks on Spotify</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- a small local cover, already sized */}
      <img className={styles.cover} src={recordImage(t)} alt={`Cover art for ${t.title}`} width={512} height={512} />
      <p className={styles.panelLead}>{credit(t)}</p>
      <p>
        <a className={styles.panelCta} href={trackUrl(t)} target="_blank" rel="noopener noreferrer">
          Listen on Spotify ↗
        </a>
      </p>
      <p className={styles.panelNote}>Opens Spotify in a new tab. Without a Spotify login it plays a preview.</p>
      <button type="button" className={styles.panelBack} onClick={() => onSelectTrack(null)}>
        ← All records
      </button>
    </>
  );
}

/** The record wall: every record, or one when it is off the wall. */
function RecordWall({ track, onSelectTrack }) {
  if (track) return <Track id={track} onSelectTrack={onSelectTrack} />;
  return (
    <>
      <p className={styles.panelLead}>
        Pick a record off the wall, or here, to see it and play it on Spotify. All of them are on{' '}
        <a href={ARTIST.url} target="_blank" rel="noopener noreferrer">
          {ARTIST.name}&apos;s Spotify page
        </a>
        .
      </p>
      <p className={styles.chips}>
        {RECORDS.map((r) => (
          <button key={r.id} type="button" className={styles.chip} onClick={() => onSelectTrack(r.track.spotifyId)}>
            {r.track.title}
          </button>
        ))}
      </p>
    </>
  );
}

/** The contact details, each a link. */
function ContactList() {
  return (
    <ul className={styles.panelList}>
      {CONTACTS.map((c) => (
        <li key={c.label}>
          <strong>{c.label}</strong>
          <p>
            <a href={c.href} {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {c.value}
            </a>
          </p>
        </li>
      ))}
    </ul>
  );
}

/** The latest commit, with how long ago it was made. */
function CommitNote() {
  if (!COMMIT) return <p className={styles.panelLead}>This build of the site has no commit information.</p>;
  return (
    <>
      <p className={styles.panelLead}>
        <q>{COMMIT.message}</q>
      </p>
      <p className={styles.panelNote}>
        <code>{COMMIT.short}</code> · {timeSince(COMMIT.date)}
      </p>
    </>
  );
}

/** The desk from the doorway: experience, contact, the latest commit. */
function Desk({ onGo }) {
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
      <ContactList />
      <h3 className={styles.panelSubtitle}>Latest commit to this site</h3>
      <CommitNote />
      <p className={styles.chips}>
        <button type="button" className={styles.chip} onClick={() => onGo('corkboard')}>
          Corkboard →
        </button>
        <button type="button" className={styles.chip} onClick={() => onGo('monitor')}>
          Monitor →
        </button>
      </p>
    </>
  );
}

/** One role, taken down from the corkboard. */
function Role({ role, onSelectCard }) {
  return (
    <>
      <p className={styles.panelEyebrow}>{role.current ? `${role.period} · current role` : role.period}</p>
      <p className={styles.panelLead}>{role.company}</p>
      <h3 className={styles.panelSubtitle}>What I did</h3>
      <ul className={styles.panelBullets}>
        {role.achievements.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <button type="button" className={styles.panelBack} onClick={() => onSelectCard(null)}>
        ← All cards
      </button>
    </>
  );
}

/** The corkboard: every card, or one when it is taken down. */
function Corkboard({ card, onSelectCard }) {
  const chosen = CARDS.find((c) => c.id === card);
  if (chosen?.kind === 'role') return <Role role={chosen.role} onSelectCard={onSelectCard} />;
  if (chosen?.kind === 'contact') {
    return (
      <>
        <p className={styles.panelLead}>The quickest way to reach me is email. You can also leave a note in the mailbox outside.</p>
        <ContactList />
        <button type="button" className={styles.panelBack} onClick={() => onSelectCard(null)}>
          ← All cards
        </button>
      </>
    );
  }
  return (
    <>
      <p className={styles.panelLead}>Where I have worked, and how to reach me. Pick a card off the board, or here.</p>
      <p className={styles.chips}>
        {CARDS.map((c) => (
          <button key={c.id} type="button" className={styles.chip} onClick={() => onSelectCard(c.id)}>
            {c.kind === 'role' ? c.role.title : 'Get in touch'}
          </button>
        ))}
      </p>
    </>
  );
}

/** The monitor: the commit this site was built from. */
function Monitor() {
  return (
    <>
      <p className={styles.panelLead}>The last change made to this site, read from git when it was built.</p>
      <CommitNote />
      <p>
        {COMMIT && (
          <a className={styles.panelCta} href={commitUrl(COMMIT)} target="_blank" rel="noopener noreferrer">
            See it on GitHub ↗
          </a>
        )}
      </p>
      <p className={styles.panelNote}>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          The whole site is open source
        </a>
        .
      </p>
    </>
  );
}

/** The panel title for a card taken down from the corkboard. */
export const cardTitle = (id) => {
  const c = CARDS.find((x) => x.id === id);
  if (!c) return undefined;
  return c.kind === 'role' ? c.role.title : 'Get in touch';
};

// Per spot: a line for the room card, the panel's button label and title,
// and its content. Spots without an entry have no panel. Every Content gets
// `spot`, `onGo` (walk to a spot), `skill` (the book that is out, if any),
// `onSelectSkill`, `track` (the record off the wall, by Spotify id),
// `onSelectTrack`, `card` (the corkboard card taken down) and `onSelectCard`;
// each uses what it needs.
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
  studio: {
    line: `Where I make music as ${ARTIST.name}. My records hang on the back wall.`,
    open: 'Music',
    title: ARTIST.name,
    Content: Music,
  },
  records: {
    line: 'Every record here is one of my tracks. Pick one to listen on Spotify.',
    open: 'All records',
    title: ARTIST.name,
    Content: RecordWall,
  },
  desk: {
    line: 'Where the work happens. My experience is on the corkboard; the last change to this site is on the screen.',
    open: 'Experience and contact',
    title: 'Experience and contact',
    Content: Desk,
  },
  corkboard: {
    line: 'Where I have worked, and how to reach me. Pick a card.',
    open: 'All cards',
    title: 'Corkboard',
    Content: Corkboard,
  },
  monitor: {
    line: 'A terminal: type /help on the screen to see what it can do. There is a game in there.',
    open: 'About this commit',
    title: 'Latest commit',
    Content: Monitor,
  },
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
