import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import { ApiError, cursorFromLink } from '@oggaq/api-client';
import type { StudyContext, User, components } from '@oggaq/shared-types';
import { api } from '../api';
import { session } from '../storage';
import { Text } from '../text';
import { useTheme } from '../themeContext';
import { downloadOfflineExam } from './download';
import { openOfflineDatabase } from './nativeDatabase';
import { examsToPrepare, prepareQueue } from './preparePlan';

type Exam = components['schemas']['OfficialExam'];
type Status = { userId: string; contextId: string; ready: number; total: number; unavailable: number; working: boolean; failed?: boolean };
let status: Status | null = null;
const listeners = new Set<() => void>();
function publish(next: Status | null) { status = next; listeners.forEach(listener => listener()); }

/** Work only while foregrounded; every completed package is independently committed and resumable. */
export function OfflineAutoPrepare({ user, context }: { user: User; context: StudyContext }) {
  useEffect(() => {
    if (context.kind !== 'personal') return;
    let stopped = false, running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const owner = { userId: user.id, contextId: context.id };
    const rejected = new Set<string>();
    const token = session.token;
    const active = () => !stopped && !!token && session.token === token && AppState.currentState === 'active';
    const schedule = (ms: number) => { if (!stopped) timer = setTimeout(() => void run(), ms); };
    const run = async () => {
      if (running || !active()) return;
      running = true;
      if (!status || status.userId !== owner.userId || status.contextId !== owner.contextId) publish({ ...owner, ready: 0, total: 0, unavailable: 0, working: true });
      try {
        const all: Exam[] = [];
        let cursor: string | undefined;
        do {
          const page = await api.request('get', '/api/v1/official-exams', { query: { per_page: 100, cursor } });
          if (!active()) return;
          all.push(...page.data);
          const next = cursorFromLink(page.links.next);
          if (next && next === cursor) throw new Error('Sınav listesi doğrulanamadı.');
          cursor = next;
        } while (cursor);
        const revisions = await api.request('get', '/api/v1/contexts/{context}/offline-exam-revisions', { params: { context: owner.contextId } });
        if (!active()) return;
        const db = await openOfflineDatabase();
        const stored = await db.packagePreparationData(owner);
        if (!active()) return;
        const candidates = all.filter(exam => exam.question_count > 0);
        const missing = await examsToPrepare(candidates, stored.map(row => `{ "exam": ${row.exam}, "claim": ${row.claim} }`), revisions.data, value => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value));
        if (!active()) return;
        let ready = candidates.length - missing.length;
        const pending = missing.filter(exam => !rejected.has(exam.id)).sort((a, b) =>
          Number(a.subject !== null) - Number(b.subject !== null) || b.year - a.year
          || (Number(b.exam_number) || 0) - (Number(a.exam_number) || 0)
          || Number(a.weapon_status !== 'armed') - Number(b.weapon_status !== 'armed'));
        publish({ ...owner, ready, total: candidates.length, unavailable: rejected.size, working: pending.length > 0 });
        await prepareQueue(pending, active, exam => downloadOfflineExam(owner, exam.id, active),
          (error, exam) => {
            if (!(error instanceof ApiError) || ![404, 409, 422].includes(error.status)) return false;
            rejected.add(exam.id); return true;
          }, (_exam, saved) => {
            if (saved) ready++;
            publish({ ...owner, ready, total: candidates.length, unavailable: rejected.size, working: true });
          }, () => new Promise<void>(resolve => setTimeout(resolve, 1500)));
        if (!active()) return;
        publish({ ...owner, ready, total: candidates.length, unavailable: rejected.size, working: false });
        schedule(10 * 60_000);
      } catch {
        // Network/storage failure leaves already committed packages and retries on return or later.
        if (active()) {
          if (status?.userId === owner.userId && status.contextId === owner.contextId) publish({ ...status, working: false, failed: true });
          schedule(60_000);
        }
      } finally { running = false; }
    };
    // Leave startup and the first screen responsive before preparing the archive.
    schedule(5000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && !running) { if (timer) clearTimeout(timer); void run(); }
    });
    return () => { stopped = true; if (timer) clearTimeout(timer); subscription.remove(); if (status?.userId === owner.userId && status.contextId === owner.contextId) publish(null); };
  }, [user.id, context.id, context.kind]);
  return null;
}

export function OfflinePreparationStatus({ user, context }: { user: User; context: StudyContext }) {
  const [, render] = useState(0);
  const { styles } = useTheme();
  useEffect(() => { const listener = () => render(n => n + 1); listeners.add(listener); return () => { listeners.delete(listener); }; }, []);
  if (!status || status.userId !== user.id || status.contextId !== context.id) return null;
  if (status.failed) return <Text accessibilityLiveRegion="polite" style={styles.muted}>Çevrimdışı hazırlık tamamlanamadı; otomatik olarak yeniden denenecek.{status.total ? ` Hazır: ${status.ready}/${status.total}.` : ''}</Text>;
  if (!status.total) return <Text style={styles.muted}>Sınavlar çevrimdışı kullanım için hazırlanıyor…</Text>;
  const message = status.unavailable ? ` · ${status.unavailable} sınav hazırlanamadı` : '';
  return <Text accessibilityLiveRegion="polite" style={styles.muted}>{status.working ? 'Çevrimdışı hazırlık' : 'Çevrimdışı hazır'}: {status.ready}/{status.total} sınav{message}</Text>;
}

/** Refresh the local shelf in batches, without re-reading the whole archive for every package. */
export function useOfflinePreparationRevision(user: User, context: StudyContext): number {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let bucket = -1;
    const listener = () => {
      if (!status || status.userId !== user.id || status.contextId !== context.id) return;
      const next = Math.floor(status.ready / 10) * 2 + (status.working ? 0 : 1);
      if (next !== bucket) { bucket = next; setRevision(value => value + 1); }
    };
    listeners.add(listener); listener();
    return () => { listeners.delete(listener); };
  }, [user.id, context.id]);
  return revision;
}
