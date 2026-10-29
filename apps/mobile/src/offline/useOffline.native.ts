import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { apiUrl } from '../api';
import { checkReachability } from './reachability';

export function useOffline(enabled: boolean): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let stopped = false, running = false;
    const check = async () => {
      if (running || AppState.currentState !== 'active') return;
      running = true;
      try {
        const online = await checkReachability(signal => fetch(`${apiUrl}/api/v1/health/ready`, { method: 'HEAD', signal, cache: 'no-store' }));
        if (!stopped) setOffline(!online);
      } finally { running = false; }
    };
    void check();
    const timer = setInterval(() => void check(), 8000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void check(); });
    return () => { stopped = true; clearInterval(timer); subscription.remove(); };
  }, [enabled]);
  return offline;
}
