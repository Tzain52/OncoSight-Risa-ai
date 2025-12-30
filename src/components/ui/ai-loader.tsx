"use client";

import { useEffect, useState } from "react";
import { BrainCircuit } from "lucide-react";

const THINKING_MESSAGES = [
  "Ingesting Patient History...",
  "Analyzing Biomarker Trends...",
  "Cross-referencing Safety Protocols...",
  "Synthesizing Clinical Summary...",
  "Finalizing Dashboard...",
];

interface AiLoaderProps {
  fullscreen?: boolean;
}

export function AiLoader({ fullscreen = false }: AiLoaderProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    const intervalId = setInterval(() => {
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
        setIsVisible(true);
      }, 150);
    }, 800);

    return () => {
      clearInterval(intervalId);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div
      className={`relative flex ${fullscreen ? "h-full w-full" : "min-h-[220px] w-full"} flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-600`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <BrainCircuit className="h-7 w-7 animate-pulse text-slate-500" strokeWidth={1.5} />
      </div>
      <p
        className={`mt-4 font-mono text-sm tracking-wide transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {THINKING_MESSAGES[messageIndex]}
      </p>
    </div>
  );
}
