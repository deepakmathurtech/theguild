import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Users, Shield, Mail, Phone, Building, HelpCircle, BookOpen } from 'lucide-react';

// Note: This page is intentionally lightweight (texts + cards only).
// Your org sidebar still routes here; update later if you decide to remove it entirely.
export default function OrgTeam() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8 py-4 text-left max-w-4xl mx-auto animate-fade-up">
      <div className="panel p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Your Organization Team</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              This is your relationship workspace inside Guild.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[var(--primary)]" />
            <h2 className="font-bold">Guild Representative</h2>
          </div>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Every organization is supported by a dedicated representative who helps translate your needs
            into verifiable outcomes.
          </p>
          <ul className="mt-3 text-sm text-[var(--text-secondary)] space-y-2 list-disc pl-5">
            <li>Guides how to submit needs and quests</li>
            <li>Helps coordinate verification and review</li>
            <li>Ensures your work moves through the right workflow stages</li>
          </ul>
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building className="w-4 h-4 text-[var(--primary)]" />
            <h2 className="font-bold">Assigned Branch</h2>
          </div>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Your jurisdiction is connected to a Guild branch. Branch officers coordinate capacity,
            scheduling, and verification support.
          </p>
          <ul className="mt-3 text-sm text-[var(--text-secondary)] space-y-2 list-disc pl-5">
            <li>Ensures local capacity availability</li>
            <li>Supports onboarding and compliance checks</li>
            <li>Coordinates escalation when needed</li>
          </ul>
        </div>
      </div>

      <div className="panel p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 border border-[var(--border)] flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-[var(--text)]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">How to get help</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
              Use the Messages section once your representative is assigned. If you don’t see a representative
              yet, your team will appear after verification and assignment.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/org-messages" className="primary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2">
                <Mail className="w-4 h-4" /> Messages
              </Link>
              <Link to="/org-dashboard" className="secondary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Dashboard
              </Link>
            </div>
            {profile && (
              <p className="text-[10px] text-[var(--text-muted)] mt-3">
                Logged in as: <span className="font-bold">{profile.fullName}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

