import Link from 'next/link';
import PageShell from '@/components/PageShell';

export const metadata = {
  title: 'Terms of Use',
  description:
    'The terms governing use of bennyhinn.life, including content ownership, use of code samples, disclaimers and limitation of liability.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <PageShell
      active="/terms"
      title="TERMS OF USE"
      intro="The ground rules for using this site and the material published on it."
      updated="24 August 2026"
    >
      <p>
        By accessing <strong>bennyhinn.life</strong> you agree to these Terms of Use. If you do not
        agree, please do not use the site.
      </p>

      <h2>1. Content ownership</h2>
      <p>
        All articles, images, diagrams and page designs on this site are the property of Benny Hinn
        Mathew unless otherwise credited. You may quote short excerpts for commentary, teaching or
        review provided you attribute them and link back to the original page. Republishing whole
        articles, or using them to train commercial models without permission, is not allowed.
      </p>

      <h2>2. Code samples</h2>
      <p>
        Code snippets published in articles are provided as illustrations of an approach, not as
        production-ready libraries. You are free to use and adapt them in your own projects. They
        come with no warranty of any kind, and you are responsible for reviewing, testing and
        securing anything you deploy.
      </p>

      <h2>3. Accuracy and no professional advice</h2>
      <p>
        Articles describe what worked in specific systems under specific constraints, at the time of
        writing. Software, APIs and pricing change. Nothing here constitutes professional,
        financial, medical or legal advice, and following an approach described on this site is at
        your own risk. If you spot an error, please{' '}
        <Link href="/contact">tell me</Link> — corrections are made in place.
      </p>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Attempt to gain unauthorised access to the site or its infrastructure.</li>
        <li>Scrape the site at a rate that degrades service for other readers.</li>
        <li>Use the contact form to send spam, malware or unlawful material.</li>
        <li>Interfere with the advertising served on the site or with its measurement.</li>
      </ul>

      <h2>5. Third-party links and advertising</h2>
      <p>
        The site links to external websites and displays third-party advertising. We do not control
        and are not responsible for the content, products or practices of those third parties.
        Advertising practices are described in the <Link href="/privacy-policy">Privacy Policy</Link>.
      </p>

      <h2>6. Availability</h2>
      <p>
        The site is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We make no
        guarantee that it will be uninterrupted or error-free, and we may change, suspend or remove
        any part of it at any time without notice.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Benny Hinn Mathew shall not be liable for any
        indirect, incidental or consequential loss arising from your use of this site or reliance on
        its content, including loss of data, revenue or profits.
      </p>

      <h2>8. Governing law</h2>
      <p>
        These terms are governed by the laws of Kenya, and any dispute arising from them is subject
        to the jurisdiction of the Kenyan courts.
      </p>

      <h2>9. Changes</h2>
      <p>
        These terms may be revised from time to time. The &quot;Last updated&quot; date above shows
        when they were last changed.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these terms: <a href="mailto:info@bennyhinn.life">info@bennyhinn.life</a>.
      </p>
    </PageShell>
  );
}
