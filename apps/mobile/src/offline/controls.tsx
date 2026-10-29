import type { StudyContext, User, components } from '@oggaq/shared-types';

export type Props = { user: User; context: StudyContext; changed: () => void; exam: components['schemas']['OfficialExam'] };
export function OfflineDownload(_props: Props) { return null; }
export function OfflineShelf(_props: { user: User; context: StudyContext; kind: 'deneme' | 'ders'; education: 'basic' | 'renewal'; weapon: 'armed' | 'unarmed'; revision: number; open: (id: string) => void }) { return null; }
