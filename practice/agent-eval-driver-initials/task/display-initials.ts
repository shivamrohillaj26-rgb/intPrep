/**
 * Avatar initials for a driver.
 * Both names present: first initial + last initial (Jane Doe → JD).
 * Only a first name: first two letters, or one letter if the name is one character.
 * Only a last name: first two letters, or one letter if the name is one character.
 */
export function driverAvatarInitialsFromNames(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();
  const fg = [...first];
  const lg = [...last];

  if (fg.length === 0 && lg.length === 0) {
    return '';
  }

  if (lg.length > 0) {
    if (fg.length > 0 && fg[0] && lg[0]) {
      return `${fg[0]}${lg[0]}`.toLocaleUpperCase();
    }
    if (lg.length >= 2) {
      return `${lg[0]}${lg[1]}`.toLocaleUpperCase();
    }
    return (lg[0] ?? '').toLocaleUpperCase();
  }

  if (fg.length >= 2) {
    return `${fg[0]}${fg[1]}`.toLocaleUpperCase();
  }
  return (fg[0] ?? '').toLocaleUpperCase();
}
