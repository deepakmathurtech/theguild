import { describe, expect, it } from 'vitest';
import { canManageEvent, getEventAvailabilityMessage, isEventRegistrationOpen } from './eventAccess';

describe('canManageEvent', () => {
  it('allows organization representatives to manage events they belong to', () => {
    const event = { createdBy: 'creator-1', hosts: [] };
    expect(canManageEvent(event, { uid: 'viewer-2', role: 'organizationRepresentative' }, 'viewer-2')).toBe(true);
  });

  it('allows assigned hosts to manage an event via host profile links', () => {
    const event = {
      createdBy: 'creator-1',
      hosts: [{ userId: 'host-42', publicProfileUrl: '/member/host-42', role: 'host' }],
    };

    expect(canManageEvent(event, { uid: 'host-42' }, 'host-42')).toBe(true);
  });

  it('blocks unrelated members from managing an event', () => {
    const event = {
      createdBy: 'creator-1',
      hosts: [{ userId: 'host-42', publicProfileUrl: '/member/host-42', role: 'host' }],
    };

    expect(canManageEvent(event, { uid: 'viewer-3' }, 'viewer-3')).toBe(false);
  });
});

describe('event registration availability', () => {
  it('opens registrations for published public events', () => {
    expect(isEventRegistrationOpen({ status: 'published', visibility: 'public' })).toBe(true);
  });

  it('blocks private registration for private events', () => {
    expect(isEventRegistrationOpen({ status: 'published', visibility: 'private' })).toBe(false);
  });

  it('blocks completed events from public registration', () => {
    expect(isEventRegistrationOpen({ status: 'completed', visibility: 'public' })).toBe(false);
  });

  it('returns a clear message for cancelled events', () => {
    expect(getEventAvailabilityMessage({ status: 'cancelled', visibility: 'public' })).toContain('cancelled');
  });

  it('returns a clear message for completed events', () => {
    expect(getEventAvailabilityMessage({ status: 'completed', visibility: 'public' })).toContain('completed');
  });
});
