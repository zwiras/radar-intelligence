'use client';

import { useEffect, useRef, useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { tFor, type Locale } from '@/lib/i18n-dict';

const LANG_LABEL: Record<string, string> = {
  it: 'Italiano', en: 'English', es: 'Español', fr: 'Français',
  de: 'Deutsch', pt: 'Português', zh: '中文', ar: 'العربية',
};

/** Lingua di lettura preferita: cookie condiviso col futuro selettore di lingua. */
function readTarget(): string {
  if (typeof document === 'undefined') return 'it';
  const m = document.cookie.match(/(?:^|;\s*)sr_locale=([a-z]{2})/);
  return m?.[1] ?? 'it';
}

type Tr = { title: string | null; content: string };

// Titolo + testo della mention con traduzione ON-DEMAND del singolo post: un
// pulsante traduce al volo questa sola mention nella lingua di lettura, senza
// toccare il resto della pagina. Toggle per tornare all'originale.
export function MentionBody({ id, lang, url, title, content, allowTranslate }: {
  id: number;
  lang: string | null;
  url: string | null;
  title: string | null;
  content: string | null;
  /** false quando la pagina è già tradotta a livello globale (pulsante inutile). */
  allowTranslate: boolean;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [showTr, setShowTr] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const [uiLocale, setUiLocale] = useState<Locale>('en');
  const [tr, setTr] = useState<Tr | null>(null);
  const contentRef = useRef<HTMLParagraphElement>(null);
  // Keep the initial client render identical to the server render. The browser
  // preference is read only after hydration, when it can safely update the UI.
  const [target, setTarget] = useState('it');
  useEffect(() => {
    setTarget(readTarget());
    const locale = document.documentElement.lang;
    setUiLocale(locale === 'it' || locale === 'pl' ? locale : 'en');
  }, []);

  const on = showTr && tr !== null;
  const dTitle = on ? (tr!.title ?? title) : title;
  const dContent = on ? tr!.content : content;

  useEffect(() => {
    const element = contentRef.current;
    if (!element || on) {
      setCanExpand(false);
      return;
    }
    if (expanded) {
      setCanExpand(true);
      return;
    }
    const check = () => setCanExpand(element.scrollHeight > element.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, [dContent, expanded, on]);

  async function toggle() {
    if (state === 'loading') return;
    if (tr) { setShowTr((v) => !v); return; } // già tradotto: toggle mostra/originale
    setState('loading');
    try {
      const res = await fetch('/api/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, lang: target }),
      });
      if (!res.ok) { setState('error'); return; }
      setTr((await res.json()) as Tr);
      setState('done'); setShowTr(true);
    } catch {
      setState('error');
    }
  }

  const label = LANG_LABEL[target] ?? target.toUpperCase();
  const t = tFor(uiLocale);
  const showBtn = allowTranslate && (!lang || lang !== target);

  return (
    <>
      {dTitle && (
        <h3 className="mt-1.5 text-sm font-semibold leading-snug">
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-sky-300">{dTitle}</a>
          ) : dTitle}
        </h3>
      )}
      {dContent && dContent !== dTitle && (
        <>
          <p ref={contentRef} className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-300 ${on || expanded ? '' : 'line-clamp-3'}`}>{dContent}</p>
          {!on && canExpand && (
            <button onClick={() => setExpanded((value) => !value)}
              className="mt-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-sky-400 transition hover:bg-sky-500/10 hover:text-sky-300"
              aria-expanded={expanded}>
              {expanded ? t('ui.showLess', 'show less') : t('ui.showFull', 'show full')}
            </button>
          )}
        </>
      )}
      {showBtn && (
        <button onClick={toggle} disabled={state === 'loading'}
          title={state === 'error' ? 'Translation unavailable (needs the AI key / budget)' : `Translate this post to ${label}`}
          className={`mt-1.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition ${
            on ? 'bg-violet-500/20 text-violet-200'
              : state === 'error' ? 'text-red-400'
              : 'text-slate-500 hover:bg-violet-500/15 hover:text-violet-300'
          }`}>
          {state === 'loading' ? <Loader2 className="size-3 animate-spin" /> : <Languages className="size-3" />}
          {on ? 'show original' : state === 'error' ? 'retry translation' : `translate · ${label}`}
        </button>
      )}
    </>
  );
}
