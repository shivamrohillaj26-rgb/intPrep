import { describe, expect, it } from 'vitest';

import { driverAvatarInitialsFromNames } from '../task/display-initials';

describe('driverAvatarInitialsFromNames', () => {
  it('uses first + last initial when both names exist', () => {
    expect(driverAvatarInitialsFromNames('Jane', 'Doe')).toBe('JD');
  });

  it('uses first two letters of first name when last name is empty', () => {
    expect(driverAvatarInitialsFromNames('Alexander', '')).toBe('AL');
  });

  it('uses a single letter when first name is one character and last is empty', () => {
    expect(driverAvatarInitialsFromNames('J', '')).toBe('J');
  });

  it('handles leading and trailing whitespace', () => {
    expect(driverAvatarInitialsFromNames('  Mo  ', '')).toBe('MO');
  });

  it('uses two letters of last name when first is empty and last has two or more characters', () => {
    expect(driverAvatarInitialsFromNames('', 'Smith')).toBe('SM');
    expect(driverAvatarInitialsFromNames('', 'Lee')).toBe('LE');
  });

  it('uses one letter of last name when first is empty and last is a single character', () => {
    expect(driverAvatarInitialsFromNames('', 'K')).toBe('K');
  });

  it('returns empty when both are empty', () => {
    expect(driverAvatarInitialsFromNames('', '')).toBe('');
    expect(driverAvatarInitialsFromNames('   ', '  ')).toBe('');
  });
});
