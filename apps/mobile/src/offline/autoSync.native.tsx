import { useEffect } from 'react';
import { AppState } from 'react-native';
import { ApiError } from '@oggaq/api-client';
import type { StudyContext, User } from '@oggaq/shared-types';
import { api } from '../api';
import { session } from '../storage';
import { openOfflineDatabase } from './nativeDatabase';
import { importCompletedAttempt } from './importCompleted';

/** Keep failures on the device; foreground retries never depend on a screen being open. */
export function OfflineAutoSync({ user, context }: { user: User; context: StudyContext }) {
  useEffect(() => {
    if (context.kind !== 'personal') return;
    let stopped = false, running = false;
    const rejected = new Set<string>();
    const owner = { userId: user.id, contextId: context.id };
    const run = async () => {
      const token = session.token;
      if (running || stopped || !token || AppState.currentState !== 'active') return;
      running = true;
      const active = () => !stopped && session.token === token;
      try {
        const db = await openOfflineDatabase();
        const attempts = await db.attemptSummaries(owner);
        for (const attempt of attempts) {
          if (!active()) break;
          if (attempt.state !== 'completed' || rejected.has(attempt.id) || !attempt.pending) continue;
          try {
            await importCompletedAttempt(db, owner, attempt.id, active, body => api.request('post', '/api/v1/contexts/{context}/offline-exam-imports', { params: { context: context.id }, body }));
          } catch (error) {
            if (error instanceof ApiError && (error.status === 0 || error.status === 429 || error.status >= 500)) break;
            if (error instanceof ApiError && [401, 403].includes(error.status)) break;
            rejected.add(attempt.id);
          }
        }
      } catch {
        // The library reports storage errors, and the queue remains intact.
      } finally { running = false; }
    };
    void run();
    const timer = setInterval(() => void run(), 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void run(); });
    return () => { stopped = true; clearInterval(timer); subscription.remove(); };
  }, [user.id, context.id, context.kind]);
  return null;
}
