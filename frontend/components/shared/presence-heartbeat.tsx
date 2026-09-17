'use client';

import { useEffect } from 'react';
import { apiUrl } from '@/lib/api-url';
import { supabase } from '@/lib/supabase/client';

const HEARTBEAT_INTERVAL_MS = 30_000;

/** Records activity while an authenticated workspace is visible. */
export function PresenceHeartbeat() {
  useEffect(() => {
    let sending = false;
    const sendHeartbeat = async () => {
      if (sending || document.visibilityState !== 'visible' || !navigator.onLine) return;
      sending = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await fetch(`${apiUrl}/api/presence/heartbeat`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
      } finally { sending = false; }
    };
    void sendHeartbeat();
    const interval = window.setInterval(() => void sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
    const handleVisibility = () => { if (document.visibilityState === 'visible') void sendHeartbeat(); };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', sendHeartbeat);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', sendHeartbeat);
    };
  }, []);
  return null;
}
