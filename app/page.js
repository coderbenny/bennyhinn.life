import HomeContent from '@/components/house/HomeContent';
import HouseLoader from '@/components/house/HouseLoader';
import { CONTACTS, EMAIL } from '@/constants/contact';
import { ARTIST } from '@/constants/music';

export const metadata = {
  title: { absolute: 'Benny Hinn Mathew | Software Engineer in Nairobi' },
  description:
    'Walk through Benny Hinn Mathew’s house: projects in the gallery, skills on the bookshelf, music in the studio and experience at the desk. Full-stack and AI engineer in Nairobi, Kenya.',
  alternates: { canonical: '/' },
};

// Who the site is about, for search engines.
const person = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Benny Hinn Mathew',
  url: 'https://bennyhinn.life',
  jobTitle: 'Software Engineer',
  email: `mailto:${EMAIL}`,
  address: { '@type': 'PostalAddress', addressLocality: 'Nairobi', addressCountry: 'KE' },
  sameAs: [...CONTACTS.filter((c) => c.href.startsWith('https://')).map((c) => c.href), ARTIST.url].filter(Boolean),
};

// The home page is the house. Underneath it, the same content as plain HTML,
// for search engines, screen readers and devices without WebGL.
export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} />
      <HomeContent />
      <HouseLoader />
      <noscript>
        <style>{'#house{display:none!important}'}</style>
      </noscript>
    </>
  );
}
