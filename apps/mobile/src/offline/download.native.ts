import * as Crypto from 'expo-crypto';
import { api } from '../api';
import { session } from '../storage';
import { openOfflineDatabase } from './nativeDatabase';
import { storeExamPackage } from './package';
import type { Owner } from './database';

/** Only commit a full response for the exact device session that requested it. */
export async function downloadOfflineExam(owner: Owner, examId: string, active: () => boolean = () => true): Promise<void> {
  const token = session.token;
  if (!token) throw new Error('Sınavı indirmek için giriş yap.');
  const response = await api.request('get', '/api/v1/contexts/{context}/offline-exams/{exam}', { params: { context: owner.contextId, exam: examId } });
  if (session.token !== token || !active()) throw new Error('Oturum değişti; sınav indirilmedi.');
  const db = await openOfflineDatabase();
  if (session.token !== token || !active()) throw new Error('Oturum değişti; sınav indirilmedi.');
  await storeExamPackage(db, owner, examId, response.data, value => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value), () => session.token === token && active());
}
