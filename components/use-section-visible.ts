'use client';
import { useEffect, useState } from 'react';

/** Hide a mobile shortcut once the actual controls enter the viewport. */
export function useSectionVisible(id: string, enabled = true) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const section = enabled ? document.getElementById(id) : null;
    if (!section || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [id, enabled]);
  return visible;
}

export function focusSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  section.focus({ preventScroll: true });
  section.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'start',
  });
}
