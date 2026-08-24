import PageShell from '@/components/PageShell';
import ContactForm from '@/components/ContactForm';

export const metadata = {
  title: 'Contact',
  description:
    'Get in touch with Benny Hinn Mathew — email, phone, WhatsApp, LinkedIn and GitHub, or send a message directly from this page.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact | Benny Hinn Mathew',
    description: 'Email, phone, WhatsApp or send a message directly.',
    url: 'https://bennyhinn.life/contact',
    type: 'website',
  },
};

const METHODS = [
  {
    label: 'Email',
    value: 'info@bennyhinn.life',
    href: 'mailto:info@bennyhinn.life',
    note: 'Best for detailed enquiries and corrections.',
  },
  {
    label: 'Phone',
    value: '+254 114 092 304',
    href: 'tel:+254114092304',
    note: 'Weekdays, 9am–6pm East Africa Time (UTC+3).',
  },
  {
    label: 'WhatsApp',
    value: 'Message on WhatsApp',
    href: 'https://wa.me/254114092304',
    note: 'Quickest route for short questions.',
  },
  {
    label: 'LinkedIn',
    value: 'benny-mathew',
    href: 'https://www.linkedin.com/in/benny-mathew',
    note: 'Professional enquiries and networking.',
  },
  {
    label: 'GitHub',
    value: 'coderbenny',
    href: 'https://github.com/coderbenny',
    note: 'Open-source work and code discussion.',
  },
];

export default function ContactPage() {
  return (
    <PageShell
      active="/contact"
      title="CONTACT"
      intro="Work enquiries, questions about an article, or a correction — all of it is welcome."
    >
      <h2>Send a message</h2>
      <p>
        The form below reaches my inbox directly. I read everything and usually reply within two
        working days. If your question is about a specific article, mentioning the title helps me
        answer properly.
      </p>

      <ContactForm />

      <h2>Other ways to reach me</h2>
      <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
        {METHODS.map((m) => (
          <a
            key={m.label}
            href={m.href}
            target={m.href.startsWith('http') ? '_blank' : undefined}
            rel={m.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="block p-5 rounded-2xl bg-gradient-to-b from-[#141414] to-[#0a0a0a] border border-[#2a2a2a] hover:border-[#ff6b6b] transition-colors"
          >
            <span className="block text-[10px] font-bold tracking-widest uppercase text-[#ffb733] mb-2">
              {m.label}
            </span>
            <span className="block text-slate-100 font-semibold mb-1 break-words">{m.value}</span>
            <span className="block text-xs text-slate-500 leading-relaxed">{m.note}</span>
          </a>
        ))}
      </div>

      <h2>Where I&apos;m based</h2>
      <p>
        Nairobi, Kenya (East Africa Time, UTC+3). I work with teams across African and European time
        zones, and I&apos;m comfortable with fully remote engagements.
      </p>

      <h2>What I&apos;m usually asked about</h2>
      <ul>
        <li>Telecom VAS integrations — SMS, MMS, IVR and USSD across African carriers.</li>
        <li>M-PESA and Paystack payment flows, especially webhook reliability and idempotency.</li>
        <li>Flask and Next.js architecture reviews, and moving workloads onto GCP.</li>
        <li>Putting machine-learning models behind a production API without wrecking latency.</li>
      </ul>
    </PageShell>
  );
}
