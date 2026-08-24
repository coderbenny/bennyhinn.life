'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | success | error

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
      setForm({ name: '', email: '', message: '' });
    } catch {
      setStatus('error');
    }
  }

  const inputClass =
    'w-full rounded-xl bg-[#141414] border border-[#2a2a2a] px-4 py-3 text-slate-100 placeholder-slate-600 focus:border-[#ff6b6b] focus:outline-none transition-colors';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 not-prose max-w-xl">
      <div>
        <label htmlFor="cf-name" className="block text-sm text-slate-400 mb-2">
          Your name
        </label>
        <input
          id="cf-name"
          name="name"
          type="text"
          required
          value={form.name}
          onChange={set('name')}
          placeholder="Jane Wanjiru"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="cf-email" className="block text-sm text-slate-400 mb-2">
          Email address
        </label>
        <input
          id="cf-email"
          name="email"
          type="email"
          required
          value={form.email}
          onChange={set('email')}
          placeholder="jane@example.com"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="cf-message" className="block text-sm text-slate-400 mb-2">
          Message
        </label>
        <textarea
          id="cf-message"
          name="message"
          required
          rows={6}
          value={form.message}
          onChange={set('message')}
          placeholder="What would you like to talk about?"
          className={`${inputClass} resize-y`}
        />
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="self-start px-6 py-3 rounded-xl bg-[#ff6b6b] text-white font-semibold uppercase tracking-wider text-sm hover:bg-[#ff5252] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>

      <p aria-live="polite" className="text-sm min-h-[1.25rem]">
        {status === 'success' && (
          <span className="text-emerald-400">Thanks — your message is on its way. I usually reply within two working days.</span>
        )}
        {status === 'error' && (
          <span className="text-[#ff6b6b]">
            That didn&apos;t send. Please email info@bennyhinn.life directly.
          </span>
        )}
      </p>

      <p className="text-xs text-slate-500 leading-relaxed">
        Your name, email and message are used only to reply to you. See the{' '}
        <a href="/privacy-policy" className="underline hover:text-[#ff6b6b]">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
