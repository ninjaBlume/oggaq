import { describe, expect, it } from 'vitest';
import { displayPersonName, personInitials } from './person-name';

describe('full names and avatar initials', () => {
  it.each([
    ['Ayşe Yılmaz', 'AY'], ['Ayşe Deniz Yılmaz', 'ADY'],
    ['ipek ışık', 'İI'], ['ışıl çetin', 'IÇ'],
    ['  Ayşe\u00a0 Deniz\n Yılmaz  ', 'ADY'], ['I\u0307pek O\u0308ztürk', 'İÖ'],
    ["Jean-Luc O’Neill", 'JO'], ['Ali Can Deniz Yılmaz', 'ACY'],
    ['Umut', 'U'], ['', ''], [' \t\n', ''],
  ])('shows %s as %s without inventing extra name parts', (name, expected) => {
    expect(personInitials(name)).toBe(expected);
  });
  it('preserves every name part, spelling and case in the full display value', () => {
    expect(displayPersonName('  Ayşe\u00a0 Deniz\n Nur Yılmaz  ')).toBe('Ayşe Deniz Nur Yılmaz');
    expect(displayPersonName('ali de la Cruz')).toBe('ali de la Cruz');
  });
});
