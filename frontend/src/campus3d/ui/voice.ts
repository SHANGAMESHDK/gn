import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang } from '../i18n';

// Minimal typing for the Web Speech API (not in lib.dom for every browser).
interface SpeechResultEvent { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }
interface Recognizer {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null; onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type RecognizerCtor = new () => Recognizer;

function ctor(): RecognizerCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/** Voice search in Indian English or Tamil, following the page language. */
export function useVoiceSearch(lang: Lang, onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognizer | null>(null);
  const cb = useRef(onText);
  useEffect(() => { cb.current = onText; }, [onText]);
  const supported = typeof window !== 'undefined' && !!ctor();

  const stop = useCallback(() => { rec.current?.stop(); setListening(false); }, []);
  const start = useCallback(() => {
    const C = ctor();
    if (!C) return;
    rec.current?.abort();
    const r = new C();
    r.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results).map((x) => x[0].transcript).join(' ').trim();
      // drop trailing punctuation the recogniser adds
      cb.current(text.replace(/[.?!।]+$/u, ''));
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    try { r.start(); setListening(true); } catch { setListening(false); }
  }, [lang]);

  useEffect(() => () => rec.current?.abort(), []);
  return { supported, listening, start, stop };
}
