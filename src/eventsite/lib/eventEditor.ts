import type { EventDocument, EventRegistrationField, TicketTier } from './eventModels';

export function parseList(input: string) {
  return input
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function serializeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item)).join('\n');
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
}

export function combineDateTime(date: string, time: string) {
  return `${date || new Date().toISOString().slice(0, 10)}T${time || '00:00'}`;
}

export function buildEventEditorDraft(event: Partial<EventDocument> & { ticketTiers?: TicketTier[]; registrationFormFields?: EventRegistrationField[] } | null | undefined) {
  if (!event) return null;

  return {
    name: event.name || '',
    description: event.description || '',
    startDate: (event.startAt || '').slice(0, 10),
    startTime: (event.startAt || '').slice(11, 16),
    endDate: (event.endAt || '').slice(0, 10),
    endTime: (event.endAt || '').slice(11, 16),
    visibility: event.visibility || 'public',
    status: event.status || 'published',
    currency: event.currency || 'INR',
    ticketTiersEnabled: Boolean(event.ticketTiersEnabled ?? true),
    venue: event.venue || '',
    location: event.location || '',
    badgeLabel: event.badgeLabel || '',
    heroImageUrl: event.heroImageUrl || '',
    contactEmail: event.contactEmail || '',
    organizerBio: event.organizerBio || '',
    agenda: serializeList(event.agenda),
    highlights: serializeList(event.highlights),
    whatToExpect: serializeList(event.whatToExpect),
    includes: serializeList(event.includes),
    registrationNote: event.registrationNote || '',
    tiers: Array.isArray(event.ticketTiers) && event.ticketTiers.length
      ? event.ticketTiers.map((tier) => ({ ...tier, price: Number(tier.price || 0), capacity: Number(tier.capacity || 0) }))
      : [{ id: 'tier1', name: 'General Pass', price: 199, capacity: 200 }],
    questions: Array.isArray(event.registrationFormFields) && event.registrationFormFields.length
      ? event.registrationFormFields.map((question) => ({ ...question, optionsText: (question.options || []).join('\n') }))
      : [{ id: 'q1', label: '', type: 'text', required: false, optionsText: '' }],
  };
}
