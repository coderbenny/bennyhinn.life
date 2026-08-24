import Link from 'next/link';
import PageShell from '@/components/PageShell';

export const metadata = {
  title: 'Privacy Policy',
  description:
    'How bennyhinn.life handles personal data, cookies and third-party advertising, including Google AdSense and the DoubleClick DART cookie.',
  alternates: { canonical: '/privacy-policy' },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <PageShell
      active="/privacy-policy"
      title="PRIVACY POLICY"
      intro="What this site collects, why, and how to opt out."
      updated="24 August 2026"
    >
      <p>
        This Privacy Policy explains how <strong>bennyhinn.life</strong> (&quot;the site&quot;,
        &quot;we&quot;) collects, uses and safeguards information when you visit. The site is owned
        and operated by Benny Hinn Mathew, Nairobi, Kenya. Questions about this policy can be sent
        to <a href="mailto:info@bennyhinn.life">info@bennyhinn.life</a>.
      </p>

      <h2>1. Information we collect</h2>
      <h3>Information you give us</h3>
      <p>
        If you submit the form on the <Link href="/contact">contact page</Link>, we collect the{' '}
        <strong>name</strong>, <strong>email address</strong> and <strong>message</strong> you
        enter. This is used solely to read and reply to your enquiry. Messages are delivered by
        email through <a href="https://resend.com" rel="noopener noreferrer" target="_blank">Resend</a>,
        our transactional email provider, and are retained in the site owner&apos;s mailbox for as
        long as needed to handle the correspondence.
      </p>
      <h3>Information collected automatically</h3>
      <p>
        Like most websites, our hosting infrastructure records standard technical information when a
        page is requested — IP address, browser type and version, device type, referring page,
        pages viewed, and the date and time of the request. This is used for security, abuse
        prevention and aggregate traffic understanding. It is not used to build a personal profile
        of you.
      </p>

      <h2>2. Cookies</h2>
      <p>
        A cookie is a small text file placed on your device by a website. This site does not set
        cookies for its own analytics or personalisation. Cookies present on the site are set by
        third parties, principally our advertising partner, as described below. You can refuse or
        delete cookies through your browser settings; doing so does not prevent you from reading any
        content here.
      </p>

      <h2>3. Advertising and Google AdSense</h2>
      <p>
        This site displays advertising served by <strong>Google AdSense</strong>. In connection with
        that:
      </p>
      <ul>
        <li>
          Third-party vendors, including Google, use cookies to serve ads based on your prior visits
          to this website or other websites.
        </li>
        <li>
          Google&apos;s use of advertising cookies — including the{' '}
          <strong>DoubleClick DART cookie</strong> — enables it and its partners to serve ads to you
          based on your visit to this site and/or other sites on the Internet.
        </li>
        <li>
          You may opt out of personalised advertising by visiting{' '}
          <a href="https://www.google.com/settings/ads" rel="noopener noreferrer" target="_blank">
            Google Ads Settings
          </a>
          . You can opt out of third-party vendor cookies more broadly at{' '}
          <a href="https://www.aboutads.info/choices/" rel="noopener noreferrer" target="_blank">
            aboutads.info/choices
          </a>{' '}
          or{' '}
          <a href="https://optout.networkadvertising.org/" rel="noopener noreferrer" target="_blank">
            the NAI opt-out page
          </a>
          .
        </li>
        <li>
          Google&apos;s own handling of data is governed by the{' '}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            rel="noopener noreferrer"
            target="_blank"
          >
            Google Privacy &amp; Terms
          </a>
          .
        </li>
      </ul>
      <p>
        We do not control the cookies set by third-party advertisers and we have no access to the
        information they collect. Their practices are governed by their own privacy policies.
      </p>

      <h2>4. How we use information</h2>
      <ul>
        <li>To respond to messages you send us.</li>
        <li>To operate, secure and maintain the site.</li>
        <li>To understand, in aggregate, which articles are read.</li>
        <li>To display advertising that funds the running costs of the site.</li>
      </ul>
      <p>
        We do not sell, rent or trade your personal information, and we do not send marketing email.
      </p>

      <h2>5. Third-party services</h2>
      <p>The site relies on the following processors:</p>
      <ul>
        <li>
          <strong>Google AdSense</strong> &mdash; advertising delivery and measurement.
        </li>
        <li>
          <strong>Resend</strong> &mdash; delivery of contact-form messages by email.
        </li>
        <li>
          <strong>Our hosting provider</strong> &mdash; serving pages and retaining short-term
          server logs.
        </li>
        <li>
          <strong>Unsplash</strong> &mdash; some article images are served from Unsplash&apos;s image
          CDN, which receives your IP address as part of loading the image.
        </li>
      </ul>
      <p>
        Pages also link out to external sites such as GitHub, LinkedIn and WhatsApp. Once you follow
        a link off this site, this policy no longer applies.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You may ask us to confirm what personal data we hold about you, to correct it, or to delete
        it. In practice the only personal data we hold directly is contact-form correspondence.
        Email <a href="mailto:info@bennyhinn.life">info@bennyhinn.life</a> and we will action the
        request within 30 days. Depending on where you live, you may also have rights under the
        Kenya Data Protection Act 2019, the EU/UK GDPR, or the CCPA.
      </p>

      <h2>7. Children</h2>
      <p>
        This site is aimed at a professional and technical audience and is not directed at children
        under 13. We do not knowingly collect personal information from children. If you believe a
        child has sent us personal information, contact us and we will delete it.
      </p>

      <h2>8. Data security</h2>
      <p>
        The site is served over HTTPS and contact submissions are transmitted over encrypted
        connections. No method of transmission or storage is completely secure, so we cannot
        guarantee absolute security.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this policy to reflect changes in our practices or in the law. Material
        changes will be reflected in the &quot;Last updated&quot; date at the top of this page.
        Continued use of the site after a change constitutes acceptance of the revised policy.
      </p>

      <h2>10. Contact</h2>
      <p>
        Benny Hinn Mathew &mdash; Nairobi, Kenya
        <br />
        Email: <a href="mailto:info@bennyhinn.life">info@bennyhinn.life</a>
        <br />
        Or use the <Link href="/contact">contact form</Link>.
      </p>
    </PageShell>
  );
}
