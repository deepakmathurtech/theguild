export type EventVisibility = 'public' | 'unlisted' | 'private';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed' | 'archived';
export type PaymentProvider = 'none' | 'razorpay' | 'cashfree' | 'stripe';
export type EventFormFieldType = 'text' | 'email' | 'number' | 'textarea' | 'select';

export type EventRegistrationField = {
  id: string;
  label: string;
  type: EventFormFieldType;
  required: boolean;
  options?: string[];
};

export type EventDocument = {
  id?: string;
  slug: string;
  urlPath?: string;
  name: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  timezone?: string;
  currency?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  organizationId: string;
  organizationName: string;
  status: EventStatus;
  visibility: EventVisibility;
  paymentProvider?: PaymentProvider;
  paymentConfig?: {
    platformCommissionPercent?: number;
    taxPercent?: number;
  };

  // ticketing
  ticketTiersEnabled: boolean;
  registrationFormFields?: EventRegistrationField[];
  hosts?: EventHostAssignment[];
  payoutStatus?: 'pending' | 'ready' | 'requested' | 'released';
  payoutRequestedAt?: string;
  payoutRequestedBy?: string;
  payoutReadyAt?: string;
  payoutReleasedAt?: string;
  payoutReleaseNote?: string;

  // public page
  heroImageUrl?: string;
  badgeLabel?: string;
  venue?: string;
  location?: string;
  organizerBio?: string;
  agenda?: string;
  highlights?: string[];
  whatToExpect?: string[];
  includes?: string[];
  contactEmail?: string;
  registrationNote?: string;
};

export type TicketTier = {
  id: string;
  name: string;
  price: number;
  capacity: number;
};

export type EventHostAssignment = {
  id?: string;
  userId: string;
  displayName?: string;
  email?: string;
  publicProfileUrl?: string;
  role: 'host';
  grantedAt?: string;
  grantedBy?: string;
};

export type TicketRegistration = {
  id?: string;
  eventId: string;
  tierId: string;
  fullName: string;
  email: string;
  qty: number;
  status: 'confirmed' | 'cancelled';
  answers?: Record<string, string>;
  userId?: string;
  profileUrl?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentProvider?: PaymentProvider;
  paymentAmount?: number;
  paymentCurrency?: string;
  orderId?: string;
  paymentId?: string;
  paidAt?: string;
  createdAt: string;
};

export type AttendanceRecord = {
  id?: string;
  eventId: string;
  registrationId: string;
  fullName: string;
  email: string;
  status: 'checked-in' | 'not-checked-in';
  checkedInBy?: string;
  checkedInByName?: string;
  checkInAt?: string;
  updatedAt?: string;
};

export type PromotionCampaign = {
  id?: string;
  eventId: string;
  message: string;
  channels: {
    instagram: boolean;
    whatsapp: boolean;
    email: boolean;
  };
  createdAt: string;
  updatedAt?: string;
};

export type CertificateType = 'verifiable' | 'pdf' | 'autocad_spreadsheet';

export type CertificateIssue = {
  id?: string;
  eventId: string;
  registrationId: string;
  fullName: string;
  email: string;
  type: CertificateType;
  issued: boolean;
  issuedAt?: string;
  txHash?: string;
  createdAt: string;
};

