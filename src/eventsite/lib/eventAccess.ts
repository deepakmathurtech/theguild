import { normalizePublicProfileUrl } from './attendanceUtils';

type EventLike = {
  createdBy?: string;
  hosts?: Array<{ userId?: string; hostUid?: string; uid?: string; profileUrl?: string; publicProfileUrl?: string; displayName?: string; name?: string }>;
  status?: string;
  visibility?: string;
  ticketTiersEnabled?: boolean;
};

type AuthLike = {
  uid?: string;
  role?: string;
  organizationId?: string;
  organizationName?: string;
  email?: string;
};

export type EventViewerRole = 'guest' | 'attendee' | 'host' | 'organizer';

export function canManageEvent(event: EventLike | null | undefined, auth: AuthLike | null | undefined, fallbackUid?: string) {
  if (!event) return false;
  const currentUid = auth?.uid || fallbackUid;
  if (!currentUid) return false;

  const isOrgRole = auth?.role === 'organizationRepresentative' || auth?.role === 'organization';
  if (isOrgRole) {
    return true;
  }

  if (event.createdBy && event.createdBy === currentUid) {
    return true;
  }

  const hosts = Array.isArray(event.hosts) ? event.hosts : [];
  const normalizedProfileUrl = normalizePublicProfileUrl(auth?.uid ? `/member/${auth.uid}` : undefined);

  return hosts.some((host) => {
    const candidateIdentifiers = [
      host.userId,
      host.hostUid,
      host.uid,
      host.profileUrl,
      host.publicProfileUrl,
      host.displayName,
      host.name,
    ].filter((value): value is string => Boolean(value));

    const normalizedCandidates = candidateIdentifiers.map((value) => normalizePublicProfileUrl(value) ?? value);

    return normalizedCandidates.some((identifier) => {
      return identifier === currentUid || identifier === `/member/${currentUid}` || identifier === normalizedProfileUrl;
    });
  });
}

export function getEventViewerRole(event: EventLike | null | undefined, auth: AuthLike | null | undefined, fallbackUid?: string): EventViewerRole {
  const currentUid = auth?.uid || fallbackUid;
  if (!currentUid) {
    return 'guest';
  }

  if (canManageEvent(event, auth, fallbackUid)) {
    return auth?.role === 'organizationRepresentative' || auth?.role === 'organization' ? 'organizer' : 'host';
  }

  return 'attendee';
}

export function isEventRegistrationOpen(event: { status?: string; visibility?: string; ticketTiersEnabled?: boolean } | null | undefined) {
  if (!event) return false;
  if (event.status === 'cancelled') return false;
  if (event.status === 'draft') return false;
  if (event.status === 'completed') return false;
  if (event.visibility === 'private') return false;
  return Boolean(event.ticketTiersEnabled ?? true);
}

export function getEventAvailabilityMessage(event: { status?: string; visibility?: string; ticketTiersEnabled?: boolean } | null | undefined) {
  if (!event) return 'This event is not available right now.';
  if (event.status === 'cancelled') return 'This event has been cancelled.';
  if (event.status === 'draft') return 'This event is still in draft mode.';
  if (event.status === 'completed') return 'This event is completed and is no longer accepting public registrations.';
  if (event.visibility === 'private') return 'This event is private and not accepting public registrations.';
  if (event.ticketTiersEnabled === false) return 'Ticketing is disabled for this event.';
  return 'Registrations are currently open.';
}
