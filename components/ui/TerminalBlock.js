'use client';
import React, { useState, useEffect, useMemo } from 'react';

const CODE_LINES = [
  [
    { text: '// engineer.config.js', cls: 'tk-comment' },
  ],
  [],
  [
    { text: 'const ', cls: 'tk-keyword' },
    { text: 'benny', cls: 'tk-var' },
    { text: ' = {', cls: 'tk-punct' },
  ],
  [
    { text: '  role', cls: 'tk-prop' },
    { text: ': ', cls: 'tk-punct' },
    { text: '"Full Stack & AI Engineer"', cls: 'tk-string' },
    { text: ',', cls: 'tk-punct' },
  ],
  [
    { text: '  frontend', cls: 'tk-prop' },
    { text: ': [', cls: 'tk-punct' },
    { text: '"React"', cls: 'tk-string' },
    { text: ', ', cls: 'tk-punct' },
    { text: '"Next.js"', cls: 'tk-string' },
    { text: ',', cls: 'tk-punct' },
  ],
  [
    { text: '    ', cls: '' },
    { text: '"TypeScript"', cls: 'tk-string' },
    { text: ', ', cls: 'tk-punct' },
    { text: '"TailwindCSS"', cls: 'tk-string' },
    { text: '],', cls: 'tk-punct' },
  ],
  [
    { text: '  backend', cls: 'tk-prop' },
    { text: ': [', cls: 'tk-punct' },
    { text: '"Python"', cls: 'tk-string' },
    { text: ', ', cls: 'tk-punct' },
    { text: '"Flask"', cls: 'tk-string' },
    { text: ',', cls: 'tk-punct' },
  ],
  [
    { text: '    ', cls: '' },
    { text: '"Django"', cls: 'tk-string' },
    { text: ', ', cls: 'tk-punct' },
    { text: '"Node.js"', cls: 'tk-string' },
    { text: '],', cls: 'tk-punct' },
  ],
  [
    { text: '  ai', cls: 'tk-prop' },
    { text: ': [', cls: 'tk-punct' },
    { text: '"LLMs"', cls: 'tk-string' },
    { text: ', ', cls: 'tk-punct' },
    { text: '"Computer Vision"', cls: 'tk-string' },
    { text: '],', cls: 'tk-punct' },
  ],
  [
    { text: '  infra', cls: 'tk-prop' },
    { text: ': [', cls: 'tk-punct' },
    { text: '"Docker"', cls: 'tk-string' },
    { text: ', ', cls: 'tk-punct' },
    { text: '"GCP"', cls: 'tk-string' },
    { text: ', ', cls: 'tk-punct' },
    { text: '"CI/CD"', cls: 'tk-string' },
    { text: '],', cls: 'tk-punct' },
  ],
  [
    { text: '  focus', cls: 'tk-prop' },
    { text: ': ', cls: 'tk-punct' },
    { text: '"VAS & Telecom"', cls: 'tk-string' },
    { text: ',', cls: 'tk-punct' },
  ],
  [
    { text: '  based', cls: 'tk-prop' },
    { text: ': ', cls: 'tk-punct' },
    { text: '"Nairobi, KE"', cls: 'tk-string' },
  ],
  [
    { text: '};', cls: 'tk-punct' },
  ],
  [],
  [
    { text: 'benny', cls: 'tk-var' },
    { text: '.', cls: 'tk-punct' },
    { text: 'ship', cls: 'tk-method' },
    { text: '(); ', cls: 'tk-punct' },
    { text: '// 🚀', cls: 'tk-comment' },
  ],
];

function groupTokens(tokens) {
  const groups = [];
  let cur = null;
  for (const c of tokens) {
    if (cur && cur.cls === c.cls) {
      cur.text += c.char;
    } else {
      cur = { text: c.char, cls: c.cls };
      groups.push(cur);
    }
  }
  return groups;
}

export default function TerminalBlock() {
  const chars = useMemo(() => {
    const result = [];
    CODE_LINES.forEach((line, lineIdx) => {
      line.forEach(token => {
        for (const ch of token.text) {
          result.push({ char: ch, cls: token.cls, lineIdx });
        }
      });
      result.push({ char: '\n', cls: '', lineIdx });
    });
    return result;
  }, []);

  const [charIndex, setCharIndex] = useState(0);
  const isComplete = charIndex >= chars.length;

  useEffect(() => {
    if (isComplete) return;

    const c = chars[charIndex];
    let delay = 40;
    if (c.char === '\n') delay = 90;
    if (c.char === ' ' && charIndex > 0 && chars[charIndex - 1].char === ' ') delay = 12;

    const t = setTimeout(() => setCharIndex(i => i + 1), delay);
    return () => clearTimeout(t);
  }, [charIndex, isComplete, chars]);

  const renderedLines = useMemo(() => {
    const typed = chars.slice(0, charIndex);
    const lines = [];
    let cur = [];
    let li = 0;

    typed.forEach(c => {
      if (c.char === '\n') {
        lines.push({ lineIdx: li, tokens: groupTokens(cur) });
        cur = [];
        li = c.lineIdx + 1;
      } else {
        cur.push(c);
      }
    });

    if (cur.length > 0 || charIndex > 0) {
      lines.push({ lineIdx: li, tokens: groupTokens(cur) });
    }

    return lines;
  }, [charIndex, chars]);

  return (
    <div className="terminal" role="img" aria-label="Animated code terminal showing developer profile">
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="terminal-dot dot-red" />
          <span className="terminal-dot dot-yellow" />
          <span className="terminal-dot dot-green" />
        </div>
        <span className="terminal-title">~/portfolio</span>
        <div className="terminal-tab">engineer.config.js</div>
      </div>
      <div className="terminal-body">
        {renderedLines.map((line, i) => (
          <div key={i} className="terminal-line">
            <span className="terminal-ln">
              {String(line.lineIdx + 1).padStart(2, ' ')}
            </span>
            <span className="terminal-code">
              {line.tokens.map((g, j) => (
                <span key={j} className={g.cls}>{g.text}</span>
              ))}
              {i === renderedLines.length - 1 && (
                <span className={`terminal-cursor${isComplete ? ' blink' : ''}`}>▌</span>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="terminal-footer">
        <span className="terminal-status-dot" />
        <span className="terminal-status-text">
          {isComplete ? 'Ready' : 'Typing...'}
        </span>
      </div>
    </div>
  );
}
