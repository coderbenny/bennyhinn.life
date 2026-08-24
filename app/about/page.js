import Link from 'next/link';
import PageShell from '@/components/PageShell';

export const metadata = {
  title: 'About',
  description:
    'Benny Hinn Mathew is a VAS and full-stack engineer in Nairobi, Kenya, building telecom value-added services, AI workflows and marketplace platforms. Learn who writes this site and why.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About | Benny Hinn Mathew',
    description:
      'Who writes this site: a Nairobi-based VAS and full-stack engineer working on telecom services, AI workflows and marketplace platforms.',
    url: 'https://bennyhinn.life/about',
    type: 'profile',
  },
};

export default function AboutPage() {
  return (
    <PageShell
      active="/about"
      title="ABOUT"
      intro="Who writes this site, what I actually work on, and why these articles exist."
    >
      <h2>Who I am</h2>
      <p>
        I&apos;m Benny Hinn Mathew, a software engineer based in Nairobi, Kenya. I work across the
        stack — Python and Flask on the backend, Next.js and React on the frontend, Flutter on
        mobile, and Docker on Google Cloud Platform for everything in between. Most of what I build
        falls into three buckets: telecom value-added services (VAS), AI-assisted product workflows,
        and two-sided marketplace platforms.
      </p>

      <h2>What I do day to day</h2>
      <p>
        Since July 2024 I&apos;ve been a VAS Engineer at <strong>Zuri Health</strong> in Nairobi,
        where I architect telecom services — SMS, MMS, IVR and USSD — that carry more than 50,000
        healthcare transactions a month. That work involves integrating with five major telecom
        providers and holding 99.5% uptime on notification paths that patients actually depend on.
        A large part of the job is unglamorous: proactive monitoring, automated error detection, and
        shaving latency and cost out of delivery pipelines.
      </p>
      <p>
        Before engineering, I spent 2020&ndash;2022 as a Studio Technical Operator at Al Huda TV and
        Switch TV, directing live productions and running multi-camera operations for broadcasts
        reaching six-figure audiences. Live television is a good teacher for reliability work: there
        is no maintenance window, and every mistake is public. That mindset is where a lot of my
        interest in zero-downtime deployment came from.
      </p>

      <h2>Why this site has a blog</h2>
      <p>
        Most engineering writing about African fintech, logistics and health-tech is either
        marketing copy or a generic tutorial ported from somewhere else. The systems I work on have
        constraints that don&apos;t show up in those posts — M-PESA webhook semantics, USSD session
        limits, intermittent connectivity, geospatial matching over sparse data, and cost ceilings
        that make the &quot;just scale it&quot; advice useless.
      </p>
      <p>
        So the articles here are first-hand write-ups of problems I hit in production and how I
        actually resolved them: schema decisions, idempotency guarantees, race conditions, model
        serving, CI/CD gates. The code samples are drawn from real systems rather than invented for
        illustration. Where an approach has a downside, I try to say so.
      </p>

      <h2>Editorial approach</h2>
      <ul>
        <li>
          <strong>First-hand only.</strong> I write about systems I have built, operated, or broken.
          I don&apos;t publish round-ups of tools I haven&apos;t used.
        </li>
        <li>
          <strong>Corrections are made in place.</strong> If an article is wrong, I fix it and note
          the change rather than quietly deleting it.
        </li>
        <li>
          <strong>No paid placements.</strong> Nothing on this site is a sponsored review. The site
          does display advertising, which is disclosed in the{' '}
          <Link href="/privacy-policy">Privacy Policy</Link>.
        </li>
      </ul>

      <h2>Get in touch</h2>
      <p>
        Corrections, questions and work enquiries are all welcome — the fastest route is the{' '}
        <Link href="/contact">contact page</Link>, or email{' '}
        <a href="mailto:info@bennyhinn.life">info@bennyhinn.life</a> directly. You can also find me
        on <a href="https://github.com/coderbenny" rel="noopener noreferrer" target="_blank">GitHub</a>{' '}
        and{' '}
        <a href="https://www.linkedin.com/in/benny-mathew" rel="noopener noreferrer" target="_blank">
          LinkedIn
        </a>.
      </p>
    </PageShell>
  );
}
