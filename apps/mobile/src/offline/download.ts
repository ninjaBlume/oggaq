import type { Owner } from './database';

export async function downloadOfflineExam(_owner: Owner, _examId: string, _active?: () => boolean): Promise<void> {
  throw new Error('Çevrimdışı sınav indirme yalnız mobil uygulamada kullanılabilir.');
}
