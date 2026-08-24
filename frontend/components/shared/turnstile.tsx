'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
  }
}

type Props = { onToken: (token: string | null) => void };

export function Turnstile({ onToken }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey || !element.current) return;
    const render = () => {
      if (!window.turnstile || !element.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(element.current, { sitekey: siteKey, size: 'normal', theme: 'auto', callback: (token: string) => onTokenRef.current(token), 'expired-callback': () => onTokenRef.current(null), 'error-callback': () => onTokenRef.current(null) });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-wahamath-turnstile]');
    if (existing) { existing.addEventListener('load', render); render(); }
    else { const script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true; script.dataset.wahamathTurnstile = 'true'; script.addEventListener('load', render); document.head.appendChild(script); }
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
      onTokenRef.current(null);
    };
  }, [siteKey]);

  if (!siteKey) return <p className="text-xs text-destructive">La protection CAPTCHA n’est pas configurée.</p>;
  return <div className="flex min-h-[65px] w-full items-center justify-center rounded-md" ref={element} />;
}
