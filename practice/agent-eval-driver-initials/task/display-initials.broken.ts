/**
 * Baseline the agent started from.
 * Bug: when both names exist, only the first letter is returned (Jane Doe → J).
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
    if (fg.length > 0 && fg[0]) {
      return fg[0].toLocaleUpperCase();
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
