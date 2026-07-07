import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type {
  AttendanceRecord,
  CertificateIssue,
  EventDocument,
  PromotionCampaign,
  TicketRegistration,
  TicketTier,
} from './eventModels';

const EVENTS_COLLECTION = 'events';

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


export async function upsertTicketTiers(eventId: string, tiers: TicketTier[]) {
  // Stored inside the event doc for simplicity in this prototype.
  const ref = doc(db, EVENTS_COLLECTION, eventId);
  await updateDoc(ref, {

    ticketTiers: tiers,
    updatedAt: serverTimestamp(),
  } as any);
}


export async function registerForEvent(input: {
  eventId: string;
  tierId: string;
  fullName: string;
  email: string;
  qty: number;
  answers?: Record<string, string>;
  paymentStatus?: TicketRegistration['paymentStatus'];
  paymentProvider?: EventDocument['paymentProvider'];
  paymentAmount?: number;
  paymentCurrency?: string;
  orderId?: string;
  paymentId?: string;
  paidAt?: string;
}) {
  const qty = Math.max(1, Number(input.qty) || 1);

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
}) {
  const recordId = `att_${input.eventId}_${input.registrationId}`;
  const ref = doc(db, EVENTS_COLLECTION, input.eventId, 'attendance', recordId);



  const payload: AttendanceRecord = {
    eventId: input.eventId,
    registrationId: input.registrationId,
    fullName: input.fullName,
    email: input.email,
    status: 'checked-in',
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

export async function getCertificateIssuesForEvent(eventId: string) {
  const q = query(
    collection(db, EVENTS_COLLECTION, eventId, 'certificateIssues'),
    where('eventId', '==', eventId),
    limit(500)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as (CertificateIssue & { id: string })[];
}

