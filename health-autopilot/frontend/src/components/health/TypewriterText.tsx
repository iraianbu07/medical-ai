'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  text: string;
  speed?: number; // ms per character
  onComplete?: () => void;
  seenToday?: boolean;
}

export default function TypewriterText({ text, speed = 22, onComplete, seenToday = false }: Props) {
  const [displayed, setDisplayed] = useState(seenToday ? text : '');
  const [cursorVisible, setCursorVisible] = useState(!seenToday);
  const [done, setDone] = useState(seenToday);
  const intervalRef = useRef<NodeJS.Timeout>();
  const fadeRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (seenToday) {
      setDisplayed(text);
      setCursorVisible(false);
      setDone(true);
      return;
    }

    let i = 0;
    setDisplayed('');
    setDone(false);
    setCursorVisible(true);

    intervalRef.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(intervalRef.current);
        setDone(true);
        onComplete?.();
        // Fade cursor after 1s
        fadeRef.current = setTimeout(() => setCursorVisible(false), 1000);
      }
    }, speed);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(fadeRef.current);
    };
  }, [text, speed, seenToday]);

  return (
    <span style={{
      fontFamily: 'Satoshi, sans-serif',
      fontSize: 'var(--text-base)',
      color: 'var(--text-primary)',
      lineHeight: 1.65,
    }}>
      {displayed}
      {cursorVisible && (
        <span
          className="typewriter-cursor"
          style={{ color: 'var(--accent-primary)', marginLeft: 1 }}
        >|</span>
      )}
    </span>
  );
}
