// Keep the full name as one value: given names and compound surnames are not
// reliably separable. Whitespace is normalized only for presentation/input.
export function displayPersonName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

export function personInitials(name: string): string {
  const parts = displayPersonName(name).split(' ').filter(Boolean);
  // Three initials fit the small header badge. For longer names retain the last
  // word as well, instead of silently dropping the surname from the badge.
  const selected = parts.length > 3 ? [parts[0]!, parts[1]!, parts.at(-1)!] : parts;
  return selected.map(part => part.match(/[\p{L}\p{N}]\p{M}*/u)?.[0] ?? '').join('').toLocaleUpperCase('tr-TR');
}
