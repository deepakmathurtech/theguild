import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CalendarDays, HandCoins, Megaphone, Plus, Sparkles, Ticket, ArrowRight, Users, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';
import { getEventsForOwner } from '../eventsite/lib/firestoreEvents';
import type { EventDocument } from '../eventsite/lib/eventModels';

const featureCards = [
  {
    title: 'Create event',
    description: 'Launch a new public event page with ticket tiers and organization details.',
    href: '/org-events/maker',
    icon: Plus,
    accent: 'from-[var(--primary)] to-[var(--accent)]',
  },
  {
    title: 'Ticketing',
    description: 'Manage ticket tiers, registrations, and seat availability.',
    href: '/event-platform/ticketing',
    icon: Ticket,
    accent: 'from-[var(--accent)] to-[var(--primary)]',
  },
  {
    title: 'Attendance',
    description: 'Check guests in and keep a live list of who attended.',
    href: '/event-platform/attendance',
    icon: BadgeCheck,
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'Promotion',
    description: 'Push campaign messaging across your preferred channels.',
    href: '/event-platform/promotion',
    icon: Megaphone,
    accent: 'from-fuchsia-500 to-purple-500',
  },
  {
    title: 'Certificates',
    description: 'Issue participation or completion certificates after the event.',
    href: '/event-platform/certificates',
    icon: HandCoins,
    accent: 'from-amber-500 to-orange-500',
  },
] as const;

export default function OrgEvents() {
  const { profile, firebaseUser } = useAuth();
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const ownerUid = profile?.uid || firebaseUser?.uid;

  useEffect(() => {
    async function loadEvents() {
      if (!ownerUid) {
        setLoading(false);
        return;
      }

      try {
        const list = await getEventsForOwner(ownerUid);
        setEvents(list);
        if (!selectedEventId && list[0]?.id) {
          setSelectedEventId(list[0].id);
        }
      } catch (error) {
        console.error('Failed to load org events', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [ownerUid]);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);

  return (
    <>
      <SEO
        title="Organization Events"
        description="Create and manage partner events, ticketing, attendance, promotion, and certificates from your organization workspace."
        noIndex={true}
      />
      <div className="max-w-6xl mx-auto px-4 py-8 md:px-6">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card-subtle)]/30 p-5 md:p-7 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--primary)]">
                <Sparkles className="w-3.5 h-3.5" />
                Organization Event Hub
              </div>
              <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight">
                Create, host, and grow events from your org workspace
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
                Give your organization a full event operating system with public pages, ticketing, attendance, promotion campaigns, and certificates in one place.
              </p>
            </div>
            <Link
              to="/org-events/maker"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-2.5 text-sm font-extrabold text-black transition hover:opacity-95"
            >
              <Plus className="w-4 h-4" />
              Create event
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  to={card.href}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-4 transition hover:-translate-y-0.5 hover:bg-[var(--card-subtle)]/70"
                >
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-black`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="mt-3 text-sm font-extrabold">{card.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{card.description}</p>
                  <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                    Open workspace
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--card-subtle)]/20 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold">Your organization events</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {profile?.organizationName || 'Your organization'} can manage all published and draft events here.
              </p>
            </div>
            <Link to="/org-events/maker" className="text-sm font-bold text-[var(--primary)] hover:underline">
              New event
            </Link>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-3">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-secondary)]">
                  Loading your events…
                </div>
              ) : events.length > 0 ? (
                events.map((event) => {
                  const isSelected = selectedEvent?.id === event.id;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEventId(event.id)}
                      className={`rounded-2xl border p-4 text-left transition ${isSelected ? 'border-[var(--primary)]/40 bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--card-subtle)]/40 hover:bg-[var(--card-subtle)]/70'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-extrabold">{event.name}</div>
                          <div className="mt-1 text-xs text-[var(--text-secondary)]">
                            {event.startAt ? new Date(event.startAt).toLocaleString() : 'Schedule pending'}
                          </div>
                        </div>
                        <div className="rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                          {event.status || 'draft'}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                          {event.ticketTiersEnabled ? 'Ticketing enabled' : 'No ticketing'}
                        </span>
                        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                          {event.visibility || 'public'}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-secondary)]">
                  <CalendarDays className="mx-auto mb-3 h-6 w-6 text-[var(--text-muted)]" />
                  No events yet. Create your first event to generate a public registration page and launch the full workflow.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-4">
              {selectedEvent ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Selected event</div>
                      <div className="mt-1 text-lg font-extrabold">{selectedEvent.name}</div>
                    </div>
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">
                      Live
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        <Users className="h-3.5 w-3.5" />
                        Registrations
                      </div>
                      <div className="mt-2 text-lg font-extrabold">Ready to track</div>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-3">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Payment flow
                      </div>
                      <div className="mt-2 text-lg font-extrabold">Razorpay enabled</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to={`/event-platform/e/${selectedEvent.slug}`} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold hover:bg-[var(--card-subtle)]/60">
                      <span className="inline-flex items-center gap-2"><ExternalLink className="h-3.5 w-3.5" />Public page</span>
                    </Link>
                    <Link to="/event-platform/ticketing" className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold hover:bg-[var(--card-subtle)]/60">
                      Ticketing
                    </Link>
                    <Link to="/event-platform/attendance" className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold hover:bg-[var(--card-subtle)]/60">
                      Attendance
                    </Link>
                    <Link to="/event-platform/certificates" className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold hover:bg-[var(--card-subtle)]/60">
                      Certificates
                    </Link>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-secondary)]">
                  Select an event to see the next actions and manage its public page, tickets, and attendance flow.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
