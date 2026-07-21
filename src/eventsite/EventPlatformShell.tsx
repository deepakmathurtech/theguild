import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BadgeCheck, Calendar, HandCoins, History,
  LayoutDashboard, Megaphone, Ticket, ChevronRight,
  Menu, X, ExternalLink, Settings, ShieldAlert,
  ChevronDown, HelpCircle, Layers
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { useAuth } from '../context/AuthContext';
import { useEventPlatformSelection } from '../context/EventPlatformSelectionContext';

function EventNavLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
          isActive
            ? 'bg-[var(--primary)]/15 text-[var(--primary)] border-l-2 border-[var(--primary)] shadow-[inset_4px_0_12px_rgba(220,179,108,0.05)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--card-subtle)]/65 hover:text-white border-l-2 border-transparent'
        }`
      }
      end={true}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

// Mobile bottom tab item
function MobileTab({
  to,
  label,
  icon: Icon,
  onClick,
}: {
  to?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  const content = (
    <>
      <Icon className="h-5 w-5" />
      <span className="text-[10px] mt-0.5">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 flex-col items-center justify-center py-2 text-[10px] font-extrabold text-[var(--text-muted)] hover:text-white transition"
      >
        {content}
      </button>
    );
  }

  return (
    <NavLink
      to={to || '#'}
      end={true}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center justify-center py-2 text-[10px] font-extrabold transition-colors ${
          isActive
            ? 'text-[var(--primary)]'
            : 'text-[var(--text-muted)] hover:text-white'
        }`
      }
    >
      {content}
    </NavLink>
  );
}

export default function EventPlatformShell() {
  const { profile } = useAuth();
  const { selectedEventId, selectedEventStatus } = useEventPlatformSelection();
  const isClosed = selectedEventStatus === 'completed';
  const isOrganizerMode = profile?.role === 'organizationRepresentative' || profile?.role === 'organization';
  const shellTitle = isOrganizerMode ? 'Organizer Platform' : 'Host Platform';
  const shellDescription = isOrganizerMode
    ? 'Manage ticket gates, certificates, and check-ins.'
    : 'Track attendee arrivals and handle post-event delivery.';

  // Selected event metadata state
  const [eventName, setEventName] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('');
  const [fetchingEvent, setFetchingEvent] = useState(false);

  // Mobile navigation drawer toggle
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  useEffect(() => {
    if (!selectedEventId) {
      setEventName('');
      setEventDate('');
      return;
    }

    setFetchingEvent(true);
    const ref = doc(db, 'events', selectedEventId);
    getDoc(ref)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          setEventName(data.name || '');
          if (data.startAt) {
            setEventDate(new Date(data.startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
          }
        }
      })
      .catch((e) => console.error('Failed to fetch selected event name', e))
      .finally(() => setFetchingEvent(false));
  }, [selectedEventId]);

  // Desktop navigation items
  const navItems = [
    ...(isOrganizerMode ? [{ to: '/event-platform', label: 'Overview', icon: LayoutDashboard }] : []),
    ...(isOrganizerMode ? [{ to: '/event-platform/history', label: 'History Archive', icon: History }] : []),
    ...(isOrganizerMode && !isClosed ? [{ to: '/event-platform/ticketing', label: 'Ticketing Gate', icon: Ticket }] : []),
    ...(!isClosed ? [{ to: '/event-platform/attendance', label: isOrganizerMode ? 'Check-in Desk' : 'Arrival Queue', icon: BadgeCheck }] : []),
    ...(isOrganizerMode && !isClosed ? [{ to: '/event-platform/promotion', label: 'Promotion Gate', icon: Megaphone }] : []),
    ...(isOrganizerMode && !isClosed ? [{ to: '/event-platform/certificates', label: 'Certificates Board', icon: HandCoins }] : []),
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      <div className="mx-auto max-w-6xl px-3 pb-24 pt-3 sm:px-4 sm:pb-6 md:px-6 md:py-6">
        
        {/* Header Branding Card */}
        <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--card)] to-[var(--bg-alt)] p-4 shadow-xl mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-black shadow-lg shadow-[var(--primary)]/10">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-extrabold tracking-tight sm:text-lg text-[var(--text)]">{shellTitle}</h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{shellDescription}</p>
              </div>
            </div>

            {/* Quick Hub Navigation Exit */}
            <div className="flex gap-2">
              {isOrganizerMode ? (
                <Link
                  className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-4 py-2 text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/20 transition flex items-center gap-1.5"
                  to="/org-events"
                >
                  <span>Exit to Org Hub</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <Link
                  className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-4 py-2 text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/20 transition flex items-center gap-1.5"
                  to="/event-platform"
                >
                  <span>Host Center</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Layout grid */}
        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)] items-start">
          
          {/* DESKTOP SIDEBAR NAVIGATION */}
          <aside className="hidden md:flex md:flex-col gap-4 min-w-0 self-start sticky top-6">
            
            {/* Selected Event Card Widget */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/60 p-4 space-y-3 shadow-md">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Selected Focus Event</span>
              
              {selectedEventId ? (
                <div className="space-y-2">
                  <div className="font-bold text-[var(--text)] text-xs truncate leading-snug" title={eventName}>
                    {fetchingEvent ? 'Loading name...' : eventName || `ID: ${selectedEventId.slice(0, 8)}`}
                  </div>
                  
                  {eventDate && !fetchingEvent && (
                    <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>{eventDate}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="rounded bg-[var(--card-subtle)]/50 border border-[var(--border)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      #{selectedEventId.slice(0, 8)}
                    </span>
                    <span className={`rounded border px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider ${
                      selectedEventStatus === 'completed'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                        : selectedEventStatus === 'draft'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                          : 'border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]'
                    }`}>
                      {selectedEventStatus || 'Active'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[var(--text-secondary)] italic py-2 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-[var(--primary)] shrink-0" />
                  <span>No event selected. Pick an event within operations.</span>
                </div>
              )}
            </div>

            {/* Sidebar navigation list */}
            <nav className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/40 p-2 flex flex-col gap-1 shadow-md">
              <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {isOrganizerMode ? 'Console Operations' : 'Host Tools'}
              </div>

              {isClosed ? (
                <div className="px-3 py-4 text-xs text-[var(--text-muted)] italic text-center">
                  Event completed. Operations locked.
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {navItems.map((item) => (
                    <EventNavLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
                  ))}
                </div>
              )}
            </nav>

            {/* Quick Helper Banner */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/20 p-3.5 text-[11px] leading-relaxed text-[var(--text-muted)] shadow-sm">
              {isOrganizerMode 
                ? 'Select different events inside Ticketing or Overview to swap workspace contexts.'
                : 'Enter checked-in profiles to confirm credentials and hand off credentials.'}
            </div>
          </aside>

          {/* PAGE CONTENT CONTAINER */}
          <main className="min-w-0 rounded-3xl border border-[var(--border)] bg-[var(--card)]/10 p-3 sm:p-5 md:p-6 shadow-2xl backdrop-blur-sm">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ── */}
      {!isClosed && (
        <nav
          className="fixed bottom-0 inset-x-0 z-40 flex md:hidden border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-xl pb-safe shadow-2xl justify-around"
          aria-label="Mobile navigation tab bar"
        >
          <MobileTab to="/event-platform" label="Overview" icon={LayoutDashboard} />
          <MobileTab to="/event-platform/ticketing" label="Tickets" icon={Ticket} />
          <MobileTab to="/event-platform/attendance" label="Check-in" icon={BadgeCheck} />
          
          {/* More options drawer trigger */}
          <MobileTab
            label="More Menu"
            icon={Menu}
            onClick={() => setShowMobileDrawer(true)}
          />
        </nav>
      )}

      {/* ── MOBILE "MORE" OVERLAY DRAWER ── */}
      {showMobileDrawer && (
        <div className="fixed inset-0 z-50 md:hidden bg-[var(--bg)]/80 backdrop-blur-md animate-fade-in flex items-end">
          
          {/* Backdrop Click Dismiss */}
          <button
            type="button"
            onClick={() => setShowMobileDrawer(false)}
            className="absolute inset-0 cursor-default outline-none"
            aria-label="Dismiss menu overlay"
          />

          {/* Bottom Sheet Card */}
          <div className="w-full bg-[var(--card)] border-t border-[var(--border)] rounded-t-[32px] p-5 space-y-4 relative z-10 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)]/50 pb-3">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Event Platform</span>
                <h4 className="text-sm font-extrabold text-[var(--text)]">More Navigation Actions</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileDrawer(false)}
                className="p-2 rounded-xl bg-[var(--card-subtle)] text-[var(--text-secondary)] hover:text-[var(--text)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Selected event metadata inside drawer */}
            {selectedEventId && (
              <div className="p-3.5 bg-[var(--bg)]/40 border border-[var(--border)] rounded-2xl text-xs space-y-2">
                <span className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-bold block">Current Focus Event</span>
                <div className="font-bold text-[var(--text)] truncate">{fetchingEvent ? 'Loading...' : eventName}</div>
                <div className="flex gap-1.5">
                  <span className="bg-[var(--card-subtle)]/40 px-2 py-0.5 rounded text-[8px] font-mono text-[var(--text-muted)]">#{selectedEventId.slice(0, 8)}</span>
                  <span className="border border-[var(--primary)]/20 text-[8px] font-bold text-[var(--primary)] px-2 py-0.5 rounded uppercase">{selectedEventStatus}</span>
                </div>
              </div>
            )}

            {/* Drawer navigation list */}
            <div className="grid gap-2 text-xs">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMobileDrawer(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 p-3.5 rounded-xl font-bold transition ${
                      isActive ? 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/25' : 'bg-[var(--card-subtle)]/30 border border-[var(--border)] text-[var(--text-secondary)]'
                    }`
                  }
                >
                  <item.icon className="h-4.5 w-4.5 text-[var(--primary)]" />
                  <span>{item.label}</span>
                </NavLink>
              ))}

              <hr className="border-[var(--border)] my-2" />

              {/* Exit link */}
              <Link
                to={isOrganizerMode ? '/org-events' : '/event-platform'}
                onClick={() => setShowMobileDrawer(false)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 font-bold text-[var(--primary)]"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-4.5 w-4.5" />
                  <span>{isOrganizerMode ? 'Exit to Org Hub' : 'Host Home'}</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
