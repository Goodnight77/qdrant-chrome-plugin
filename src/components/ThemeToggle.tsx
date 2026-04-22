import { useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'dark' | 'light';
const STORAGE_KEY = 'qdrant-theme';

function systemPref(): 'dark' | 'light' {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function apply(mode: ThemeMode) {
  const resolved = mode === 'system' ? systemPref() : mode;
  document.documentElement.setAttribute('data-theme', resolved);
}

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {}
  return 'system';
}

const NEXT: Record<ThemeMode, ThemeMode> = {
  system: 'dark',
  dark: 'light',
  light: 'system',
};

const LABEL: Record<ThemeMode, string> = {
  system: 'Auto',
  dark: 'Dark',
  light: 'Light',
};

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(readStored);

  useEffect(() => {
    apply(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => apply('system');
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [mode]);

  const next = NEXT[mode];
  return (
    <button
      type="button"
      className={`theme-toggle mode-${mode}`}
      onClick={() => setMode(next)}
      title={`Theme: ${LABEL[mode]} — click for ${LABEL[next]}`}
      aria-label={`Theme: ${LABEL[mode]}`}
    >
      <span className="theme-toggle-icon" aria-hidden>
        {mode === 'system' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="14" rx="2" />
            <path d="M8 20h8M12 18v2" />
          </svg>
        )}
        {mode === 'dark' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        )}
        {mode === 'light' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        )}
      </span>
      <span className="theme-toggle-label">{LABEL[mode]}</span>
    </button>
  );
}
