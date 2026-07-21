import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { notifyUser } from '../../lib/repository';
import { normalizePublicProfileUrl } from './attendanceUtils';
import type {
  AttendanceRecord,
  CertificateIssue,
  EventDocument,
  EventHostAssignment,
  PromotionCampaign,
  TicketRegistration,
  TicketTier,
} from './eventModels';

const EVENTS_COLLECTION = 'events';
const STAFF_ROLES = ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'] as const;

function nowIso() {
  return new Date().toISOString();
}

export async function createEvent(event: Omit<EventDocument, 'createdAt' | 'updatedAt'> & { createdBy: string }) {
  if (!event.organizationId || !event.organizationName) {
    throw new Error('Events must be linked to an organization.');
  }

  const eventsCol = collection(db, EVENTS_COLLECTION);





  const payload: EventDocument = {
    ...event,
    status: event.status || 'draft',
    paymentProvider: event.paymentProvider || 'none',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const ref = await addDoc(eventsCol, payload as any);
  return { id: ref.id, ...payload };
}

export async function getEventBySlug(slug: string) {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    where('slug', '==', slug),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as any) } as (EventDocument & { id: string });
}

export async function getEventsForOwner(ownerUid: string) {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    where('createdBy', '==', ownerUid),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as (EventDocument & { id: string })[];
}

export async function getEventsForHost(hostUid: string, profileUrl?: string) {
  const ownedEvents = await getEventsForOwner(hostUid);
  const normalizedProfileUrl = normalizePublicProfileUrl(profileUrl);

  // Always include the /member/<uid> form in case host identifiers are saved that way.
  const hostUidVariants = new Set<string>([hostUid, `/member/${hostUid}`]);

  const allEventsQuery = query(collection(db, EVENTS_COLLECTION), limit(500));
  const allEventsSnap = await getDocs(allEventsQuery);
  const assignedEvents = allEventsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }) as EventDocument & { id: string })
    .filter((event) => {
      const hosts = Array.isArray(event.hosts) ? event.hosts : [];
      const isHostMatch = hosts.some((host: any) => {
        // Support multiple possible host identifier shapes because the UI may store different keys.
        const rawHostIdentifiers = [
          host.userId,
          host.hostUid,
          host.uid,
          host.profileUrl,
          host.publicProfileUrl,
          host.displayName,
          host.name,
          host.email,
        ];

        const hostIdentifiers = rawHostIdentifiers
          .filter((value): value is string => Boolean(value))
          .map((value) => normalizePublicProfileUrl(value) ?? value);

        const sameUser = hostIdentifiers.some((identifier) => {
          if (!identifier) return false;
          const normalizedIdentifier = normalizePublicProfileUrl(identifier) ?? identifier;
          return (
            normalizedIdentifier === hostUid ||
            normalizedIdentifier === `/member/${hostUid}` ||
            normalizedIdentifier === `/g/${hostUid}` ||
            normalizedIdentifier === hostUid.replace(/^\/member\//, '')
          );
        });

        const sameVariant = hostIdentifiers.some((identifier) => hostUidVariants.has(identifier));

        const sameProfile = normalizedProfileUrl
          ? hostIdentifiers.some((identifier) => identifier === normalizedProfileUrl)
          : false;

        const sameDisplayName = typeof host.displayName === 'string' && typeof profileUrl === 'string' && host.displayName === profileUrl;

        return sameUser || sameVariant || sameProfile || sameDisplayName;
      });

      return isHostMatch || Boolean(event.createdBy && event.createdBy === hostUid);
    });

  const merged = [...ownedEvents, ...assignedEvents];
  const uniqueById = new Map<string, EventDocument & { id: string }>();
  merged.forEach((event) => {
    if (event.id) uniqueById.set(event.id, event);
  });

  return Array.from(uniqueById.values());
}

export async function upsertTicketTiers(eventId: string, tiers: TicketTier[]) {
  // Stored inside the event doc for simplicity in this prototype.
  const ref = doc(db, EVENTS_COLLECTION, eventId);
  await updateDoc(ref, {

    ticketTiers: tiers,
    updatedAt: serverTimestamp(),
  } as any);
}

export async function updateEventDetails(eventId: string, updates: Partial<EventDocument> & { ticketTiers?: TicketTier[]; registrationFormFields?: any[] }) {
  const ref = doc(db, EVENTS_COLLECTION, eventId);
  await setDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return updates;
}

async function notifyStaffOfEventAction(eventName: string, eventId: string, actorUid: string | undefined, title: string, body: string, source: string) {
  const usersSnap = await getDocs(query(
    collection(db, 'users'),
    where('role', 'in', STAFF_ROLES as unknown as string[]),
    where('archiveStatus', '==', 'active')
  ));

  const recipients = usersSnap.docs.map((d) => d.id).filter((uid) => uid !== actorUid);
  await Promise.all(recipients.map((uid) => notifyUser(uid, 'general_alert', title, body, '/event-platform/ticketing', 'high')));

  if (actorUid) {
    await notifyUser(actorUid, 'general_alert', 'Event update received', `${eventName} has been updated and the staff team has been notified.`, '/event-platform/ticketing', 'medium');
  }
}

export async function updateEventStatus(eventId: string, status: EventDocument['status'], actorUid?: string) {
  const ref = doc(db, EVENTS_COLLECTION, eventId);
  const payoutMeta = status === 'completed'
    ? {
        payoutStatus: 'ready' as const,
        payoutReadyAt: nowIso(),
        payoutReleaseNote: 'Event marked completed. Organizer payout is now eligible for release.',
      }
    : {};
  await setDoc(ref, { status, updatedAt: serverTimestamp(), ...payoutMeta }, { merge: true });

  if (status === 'completed') {
    const eventSnap = await getDoc(ref);
    const eventName = (eventSnap.data() as any)?.name || 'An event';
    await notifyStaffOfEventAction(eventName, eventId, actorUid, 'Event completed', `${eventName} is now marked completed and payout review is ready.`, 'event-completion');
  }

  return status;
}

export async function requestEventPayout(input: {
  eventId: string;
  eventName: string;
  actorUid?: string;
  receptionistUid?: string;
  note?: string;
}) {
  const ref = doc(db, EVENTS_COLLECTION, input.eventId);
  const payload = {
    payoutStatus: 'requested' as const,
    payoutRequestedAt: nowIso(),
    payoutRequestedBy: input.actorUid || 'system',
    payoutReleaseNote: input.note || 'Organizer requested payout release for this event.',
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload, { merge: true });

  await notifyStaffOfEventAction(
    input.eventName,
    input.eventId,
    input.actorUid,
    'Payout demand received',
    `${input.eventName} has requested a payout release. Review the event and settle the organizer payout.`,
    'event-payout-request'
  );

  return payload;
}

export async function registerForEvent(input: {
  eventId: string;
  tierId: string;
  fullName: string;
  email: string;
  qty: number;
  answers?: Record<string, string>;
  userId?: string;
  profileUrl?: string;
  paymentStatus?: TicketRegistration['paymentStatus'];
  paymentProvider?: EventDocument['paymentProvider'];
  paymentAmount?: number;
  paymentCurrency?: string;
  orderId?: string;
  paymentId?: string;
  paidAt?: string;
}) {
  const qty = Math.max(1, Number(input.qty) || 1);

  if (input.paymentStatus === 'pending') {
    return null;
  }

  // Validate seat availability before inserting.
  const eventRef = doc(db, EVENTS_COLLECTION, input.eventId);
  const eventSnap = await getDoc(eventRef);
  if (!eventSnap.exists()) {
    throw new Error('Event not found');
  }

  const eventData = eventSnap.data() as any;
  const tiers: TicketTier[] = (eventData.ticketTiers || []) as TicketTier[];
  const tier = tiers.find((t) => t.id === input.tierId);
  if (!tier) {
    throw new Error('Ticket tier not found');
  }

  const regsCol = collection(db, EVENTS_COLLECTION, input.eventId, 'registrations');

  const q = query(
    regsCol,
    where('eventId', '==', input.eventId),
    where('tierId', '==', input.tierId)
  );
  const snap = await getDocs(q);

  const sold = snap.docs.reduce((sum, d) => sum + Number((d.data() as any).qty || 0), 0);

  const remaining = Number(tier.capacity || 0) - sold;
  if (qty > remaining) {
    throw new Error('Not enough seats remaining');
  }

  const payload: TicketRegistration = {
    eventId: input.eventId,
    tierId: input.tierId,
    fullName: input.fullName,
    email: input.email,
    qty,
    answers: input.answers || {},
    userId: input.userId,
    profileUrl: input.profileUrl,
    paymentStatus: input.paymentStatus || 'paid',
    paymentProvider: input.paymentProvider || 'none',
    paymentAmount: input.paymentAmount,
    paymentCurrency: input.paymentCurrency,
    orderId: input.orderId,
    paymentId: input.paymentId,
    paidAt: input.paidAt,
    status: 'confirmed',
    createdAt: nowIso(),
  };

  const ref = await addDoc(regsCol, payload as any);
  return { id: ref.id, ...payload } as TicketRegistration & { id: string };
}


export async function markRegistrationPaid(input: {
  eventId: string;
  registrationId: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency?: string;
  provider?: EventDocument['paymentProvider'];
}) {
  const ref = doc(db, EVENTS_COLLECTION, input.eventId, 'registrations', input.registrationId);
  const payload = {
    paymentStatus: 'paid' as const,
    paymentProvider: input.provider || 'razorpay',
    paymentAmount: input.amount,
    paymentCurrency: input.currency || 'INR',
    paymentId: input.paymentId,
    orderId: input.orderId,
    paidAt: nowIso(),
    updatedAt: nowIso(),
  };
  await updateDoc(ref, payload as any);
  return payload;
}

export async function getRegistrationsForEvent(eventId: string) {
  const q = query(
    collection(db, EVENTS_COLLECTION, eventId, 'registrations'),
    where('eventId', '==', eventId),
    limit(500)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as (TicketRegistration & { id: string })[];
}


export async function markAttendance(input: {
  eventId: string;
  registrationId: string;
  fullName: string;
  email: string;
  status: 'checked-in';
  checkedInBy?: string;
  checkedInByName?: string;
}) {
  const recordId = `att_${input.eventId}_${input.registrationId}`;
  const ref = doc(db, EVENTS_COLLECTION, input.eventId, 'attendance', recordId);



  const payload: AttendanceRecord = {
    eventId: input.eventId,
    registrationId: input.registrationId,
    fullName: input.fullName,
    email: input.email,
    status: 'checked-in',
    checkedInBy: input.checkedInBy,
    checkedInByName: input.checkedInByName,
    checkInAt: nowIso(),
    updatedAt: nowIso(),
  };

  await setDoc(ref, payload as any, { merge: true });
  return { id: recordId, ...payload } as AttendanceRecord & { id: string };
}

export async function getAttendanceForEvent(eventId: string) {
  const q = query(
    collection(db, EVENTS_COLLECTION, eventId, 'attendance'),
    where('eventId', '==', eventId),
    limit(500)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as (AttendanceRecord & { id: string })[];
}


export async function setEventHosts(eventId: string, hosts: EventHostAssignment[]) {
  const ref = doc(db, EVENTS_COLLECTION, eventId);
  await setDoc(ref, { hosts }, { merge: true });
  return hosts;
}

export async function getEventHosts(eventId: string) {
  const ref = doc(db, EVENTS_COLLECTION, eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [] as EventHostAssignment[];
  const hosts = (snap.data() as any)?.hosts || [];
  return hosts as EventHostAssignment[];
}

export async function findRegistrationByProfileUrl(eventId: string, profileUrl: string) {
  const q = query(
    collection(db, EVENTS_COLLECTION, eventId, 'registrations'),
    where('profileUrl', '==', profileUrl),
    limit(20)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docData = snap.docs[0];
  return { id: docData.id, ...(docData.data() as any) } as TicketRegistration & { id: string };
}

export async function getPromotionCampaignForEvent(eventId: string) {
  const ref = doc(db, EVENTS_COLLECTION, eventId, 'promotionCampaigns', eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as (PromotionCampaign & { id: string });
}

export async function upsertPromotionCampaign(input: {
  eventId: string;
  message: string;
  channels: PromotionCampaign['channels'];
}) {
  const ref = doc(db, EVENTS_COLLECTION, input.eventId, 'promotionCampaigns', input.eventId);
  const payload: PromotionCampaign = {
    eventId: input.eventId,
    message: input.message,
    channels: input.channels,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await setDoc(ref, payload as any, { merge: true });
  return { id: ref.id, ...payload };
}

export async function issueCertificate(input: {
  eventId: string;
  registrationId: string;
  fullName: string;
  email: string;
  type: CertificateIssue['type'];
  eventName?: string;
}) {
  const ref = doc(db, EVENTS_COLLECTION, input.eventId, 'certificateIssues', `${input.eventId}_${input.registrationId}`);
  const payload: CertificateIssue = {
    eventId: input.eventId,
    registrationId: input.registrationId,
    fullName: input.fullName,
    email: input.email,
    type: input.type,
    issued: true,
    issuedAt: nowIso(),
    createdAt: nowIso(),
  };
  await setDoc(ref, payload as any, { merge: true });
  return { id: ref.id, ...payload };
}

/**
 * Sends a certificate notification email via the /api/send-email Vercel serverless function.
 * Uses Resend API server-side — no Firebase Blaze plan or extensions required.
 * Returns { queued: true, messageId } on success or { queued: false, error } on failure.
 */
export async function queueCertificateEmail(input: {
  fullName: string;
  email: string;
  eventName: string;
  registrationId: string;
}): Promise<{ queued: true; messageId: string } | { queued: false; error: string }> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: input.email,
        fullName: input.fullName,
        eventName: input.eventName,
        registrationId: input.registrationId,
      }),
    });

    const result = await response.json() as { success: boolean; messageId?: string; message?: string };

    if (!response.ok || !result.success) {
      const errMsg = result.message || `HTTP ${response.status}`;
      console.error(`[Guild Mail] ❌ Failed to send email for ${input.email}:`, errMsg);
      return { queued: false, error: errMsg };
    }

    console.log(`[Guild Mail] ✅ Email sent to ${input.email}. Resend ID: ${result.messageId}`);
    return { queued: true, messageId: result.messageId || 'sent' };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Guild Mail] ❌ Network error sending email for ${input.email}:`, errMsg);
    return { queued: false, error: errMsg };
  }
}


export async function getCertificateIssuesForEvent(eventId: string) {
  const q = query(
    collection(db, EVENTS_COLLECTION, eventId, 'certificateIssues'),
    where('eventId', '==', eventId),
    limit(500)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as (CertificateIssue & { id: string })[];
}

