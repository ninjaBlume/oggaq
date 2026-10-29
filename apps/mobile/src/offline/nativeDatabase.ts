import type { OfflineDatabase } from './database';

export async function openOfflineDatabase(): Promise<OfflineDatabase> {
  throw new Error('Çevrimdışı sınav veritabanı yalnız mobil uygulamada kullanılabilir.');
}
