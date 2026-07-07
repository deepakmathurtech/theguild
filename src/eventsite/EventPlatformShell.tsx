import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Ticket,
  HandCoins,
  BadgeCheck,
  Megaphone,
  Calendar,
  LayoutDashboard,
} from 'lucide-react';

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
        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-[var(--primary)]/20 text-[var(--primary)] ring-1 ring-[var(--primary)]/30'
            : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--card-subtle)]/50'
        }`
      }
      end={false}
    >
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  );
}

export default function EventPlatformShell() {
  return (
    <div className="bg-[var(--bg)] text-[var(--text)] min-h-[calc(100vh-2rem)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-5 md:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-black font-extrabold text-lg">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-extrabold tracking-tight">Event Management Platform</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Prototype: ticketing + attendance + promotion + certificates in one place.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <a
                className="px-3 py-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-bold text-xs border border-[var(--primary)]/30 hover:bg-[var(--primary)]/15"
                href="/event-platform/ticketing"
              >
                Ticketing
              </a>
              <a
                className="px-3 py-2 rounded-xl bg-[var(--card-subtle)] text-[var(--text-secondary)] font-bold text-xs border border-[var(--border)] hover:bg-[var(--card-subtle)]/60"
                href="/event-platform/attendance"
              >
                Attendance
              </a>
              <a
                className="px-3 py-2 rounded-xl bg-[var(--card-subtle)] text-[var(--text-secondary)] font-bold text-xs border border-[var(--border)] hover:bg-[var(--card-subtle)]/60"
                href="/event-platform/promotion"
              >
                Promotion
              </a>
              <a
                className="px-3 py-2 rounded-xl bg-[var(--card-subtle)] text-[var(--text-secondary)] font-bold text-xs border border-[var(--border)] hover:bg-[var(--card-subtle)]/60"
                href="/event-platform/certificates"
              >
                Certificates
              </a>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
            <aside className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/40 p-2">
              <div className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-70">
                Event Site
              </div>
              <nav className="flex flex-col gap-1">
                <EventNavLink
                  to="/event-platform"
                  label="Overview"
                  icon={LayoutDashboard}
                />
                <EventNavLink
                  to="/event-platform/ticketing"
                  label="Ticketing"
                  icon={Ticket}
                />
                <EventNavLink
                  to="/event-platform/attendance"
                  label="Attendance"
                  icon={BadgeCheck}
                />
                <EventNavLink
                  to="/event-platform/promotion"
                  label="Promotion"
                  icon={Megaphone}
                />
                <EventNavLink
                  to="/event-platform/certificates"
                  label="Certificates"
                  icon={HandCoins}
                />
              </nav>

              <div className="mt-3 px-2 pb-2">
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  This is a UI prototype with mock data.
                </div>
              </div>
            </aside>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 md:p-5">
              <Outlet />
            </section>
          </div>
        </div>

        <div className="text-[10px] text-[var(--text-muted)] mt-4">
          Prototype only — no persistence.
        </div>
      </div>
    </div>
  );
}

