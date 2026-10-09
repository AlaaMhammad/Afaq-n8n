"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Minimal typing for the Web Speech API (not in lib.dom for every TS version). */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

/**
 * Voice input through the browser's Web Speech API. Recognition runs in the browser —
 * no audio reaches our servers. `supported` is false on the server and where the API is missing
 * (e.g. Firefox), so the mic button simply isn't rendered there.
 */
export function useSpeechInput({ locale, onTranscript }: { locale: "ar" | "en"; onTranscript: (text: string) => void }) {
  const supported = useSyncExternalStore(noopSubscribe, () => recognitionConstructor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const callback = useRef(onTranscript);

  useEffect(() => {
    callback.current = onTranscript;
  }, [onTranscript]);

  const stop = useCallback(() => {
    recognition.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Recognition = recognitionConstructor();
    if (!Recognition || recognition.current) return;

    const instance = new Recognition();
    instance.lang = locale === "ar" ? "ar-SA" : "en-US";
    instance.interimResults = true;
    instance.continuous = false;
    instance.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      callback.current(text);
    };
    instance.onend = instance.onerror = () => {
      recognition.current = null;
      setListening(false);
    };
    recognition.current = instance;
    setListening(true);
    instance.start();
  }, [locale]);

  useEffect(() => () => recognition.current?.stop(), []);

  return { supported, listening, start, stop };
}
