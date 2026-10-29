import { openOfflineDatabase } from './nativeDatabase';
export async function eraseOfflineUser(userId: string): Promise<void> {
  await (await openOfflineDatabase()).eraseUser(userId);
}
