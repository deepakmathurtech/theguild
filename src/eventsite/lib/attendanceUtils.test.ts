import { describe, expect, it } from 'vitest';
import { extractProfileUrlFromScanValue, normalizePublicProfileUrl } from './attendanceUtils';

describe('normalizePublicProfileUrl', () => {
  it('normalizes full profile URLs to app-relative paths', () => {
    expect(normalizePublicProfileUrl('https://example.com/member/user-123/')).toBe('/member/user-123');
  });

  it('preserves guild profile paths', () => {
    expect(normalizePublicProfileUrl('/g/guild-456')).toBe('/g/guild-456');
  });

  it('rejects invalid values', () => {
    expect(normalizePublicProfileUrl('not-a-url')).toBeNull();
  });
});

describe('extractProfileUrlFromScanValue', () => {
  it('extracts app profile links from QR payloads', () => {
    expect(extractProfileUrlFromScanValue('https://guild.example/member/user-123')).toBe('/member/user-123');
    expect(extractProfileUrlFromScanValue('/g/guild-456')).toBe('/g/guild-456');
    expect(extractProfileUrlFromScanValue('not-a-url')).toBeNull();
  });
});
