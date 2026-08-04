import { describe, expect, it } from 'vitest';
import { canAccessCoupleContent, isMaster, type MembershipRole } from './permissions';

describe('canAccessCoupleContent', () => {
  it.each<[MembershipRole, boolean]>([
    ['master', true],
    ['partner', true],
    ['family', false],
    ['guest', false],
  ])('role=%s -> %s', (role, expected) => {
    expect(canAccessCoupleContent(role)).toBe(expected);
  });

  it('role이 없으면 거부한다', () => {
    expect(canAccessCoupleContent(null)).toBe(false);
    expect(canAccessCoupleContent(undefined)).toBe(false);
  });
});

describe('isMaster', () => {
  it('master만 true', () => {
    expect(isMaster('master')).toBe(true);
    expect(isMaster('partner')).toBe(false);
    expect(isMaster('family')).toBe(false);
    expect(isMaster('guest')).toBe(false);
  });

  it('role이 없으면 false', () => {
    expect(isMaster(null)).toBe(false);
    expect(isMaster(undefined)).toBe(false);
  });
});
