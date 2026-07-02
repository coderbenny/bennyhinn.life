'use client';
import { useState } from 'react';
import SectionTitle from '../ui/SectionTitle';
import ContactMethod from '../ui/ContactMethod';

const contacts = [
  { icon: '📧', label: 'Email', value: 'info@bennyhinn.life', href: 'mailto:info@bennyhinn.life' },
  { icon: '📱', label: 'Phone', value: '+254-114-092-304', href: 'tel:+254114092304' },
  { icon: '💼', label: 'LinkedIn', value: 'benny-mathew', href: 'https://www.linkedin.com/in/benny-mathew' },
  { icon: '💻', label: 'GitHub', value: 'coderbenny', href: 'https://github.com/coderbenny' },
];

export default function ContactSlide() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | success | error

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="contact" className="slide overflow-y-auto">
      <div className="slide-content py-12">
        <SectionTitle number="04" title="LET'S BUILD TOGETHER" />

        <div className="contact-content">
          <p className="contact-description">
            I&apos;m always interested in hearing about new opportunities, collaborations, or just having a chat about technology and innovation.
          </p>

          <div className="contact-methods">
            {contacts.map((contact, idx) => (
              <ContactMethod key={contact.label} {...contact} delay={idx * 0.1} />
            ))}
          </div>

          <form onSubmit={handleSubmit} className="contact-form">
            <div className="contact-form-row">
              <input
                className="contact-input"
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={set('name')}
                required
                disabled={status === 'sending'}
              />
              <input
                className="contact-input"
                type="email"
                placeholder="Your email"
                value={form.email}
                onChange={set('email')}
                required
                disabled={status === 'sending'}
              />
            </div>
            <textarea
              className="contact-input contact-textarea"
              placeholder="Your message"
              value={form.message}
              onChange={set('message')}
              required
              rows={4}
              disabled={status === 'sending'}
            />
            <div className="contact-form-footer">
              <button
                type="submit"
                className="btn-base btn-primary"
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Sending…' : 'Send Message'}
              </button>
              {status === 'success' && (
                <span className="contact-feedback contact-feedback--success">
                  ✓ Message sent — I&apos;ll be in touch soon.
                </span>
              )}
              {status === 'error' && (
                <span className="contact-feedback contact-feedback--error">
                  Something went wrong. Email me directly.
                </span>
              )}
            </div>
          </form>

          <div className="location">
            <span className="location-icon">📍</span>
            <span>Based in Nairobi, Kenya</span>
          </div>
        </div>
      </div>
    </section>
  );
}