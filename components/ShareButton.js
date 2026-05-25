'use client';

import { useState } from 'react';

export default function ShareButton({ title, url }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const fullUrl = url.startsWith('http') ? url : `https://bennyhinn.life${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: fullUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard(fullUrl);
        }
      }
    } else {
      copyToClipboard(fullUrl);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleShare}
      className="flex items-center gap-1.5 text-slate-400 hover:text-[#ffb733] transition-colors text-xs font-semibold uppercase tracking-wider z-10 relative"
      aria-label="Share post"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"></circle>
        <circle cx="6" cy="12" r="3"></circle>
        <circle cx="18" cy="19" r="3"></circle>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
      </svg>
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
