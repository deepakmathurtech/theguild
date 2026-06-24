import React from 'react';
import { Link } from 'react-router-dom';
import { User, MapPin, Shield, Award, Phone, Mail, ExternalLink, Building2, BadgeCheck, BadgeX } from 'lucide-react';
import type { GuildUser, GuildRole, GuildRank, VerificationStatus } from '../types/guild';

/** Partial contact data for simple display */
export interface ContactInfo {
  uid: string;
  fullName: string;
  photoURL?: string;
  phone?: string;
  email?: string;
  city?: string;
  branchId?: string;
  branchName?: string;
  role?: string;
  guildRank?: GuildRank;
  verificationStatus?: VerificationStatus;
}

interface GuildContactCardProps {
  /** The Guild user to display (full GuildUser or partial ContactInfo) */
  contact: GuildUser | ContactInfo;
  /** Label for the contact role (e.g., "Receptionist", "Guild Contact", "Coordinator") */
  roleLabel?: string;
  /** Show contact information (phone, email) - only show with proper permissions */
  showContactInfo?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Callback for additional actions */
  onContactClick?: () => void;
}

/** Get display name for role */
function getRoleDisplayName(role: string | GuildRole | undefined): string {
  if (!role) return 'Guild Member';
  const names: Record<string, string> = {
    applicant: 'Applicant',
    member: 'Member',
    contributor: 'Contributor',
    receptionistCandidate: 'Receptionist Candidate',
    receptionist: 'Receptionist',
    cityGuildMaster: 'City Guild Master',
    stateGuildMaster: 'State Guild Master',
    centralGuildMaster: 'Central Guild Master',
    nationalGuildMaster: 'National Guild Master',
    guildFounder: 'Guild Founder',
    founder: 'Founder',
    organizationRepresentative: 'Organization Representative',
    organization: 'Organization'
  };
  return names[role] ?? role;
}

/** Get color for guild rank */
function getRankColor(rank: string | undefined): string {
  if (!rank) return 'text-gray-400';
  const colors: Record<string, string> = {
    'S': 'text-yellow-400',
    'A': 'text-orange-400',
    'B': 'text-red-400',
    'C': 'text-pink-400',
    'D': 'text-purple-400',
    'E': 'text-blue-400',
    'F': 'text-gray-400',
    'Applicant': 'text-gray-500'
  };
  return colors[rank] ?? 'text-gray-400';
}

/** Verification badge component */
function VerificationBadge({ status }: { status: string | undefined }) {
  const isVerified = status === 'verified';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${isVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
      {isVerified ? <BadgeCheck size={12} /> : <BadgeX size={12} />}
      {isVerified ? 'Verified' : 'Pending'}
    </span>
  );
}

export default function GuildContactCard({
  contact,
  roleLabel = 'Guild Contact',
  showContactInfo = false,
  compact = false
}: GuildContactCardProps) {
  // Extract common properties from both types
  const contactAny = contact as unknown as {
    uid: string;
    fullName: string;
    photoURL?: string;
    phone?: string;
    email?: string;
    city?: string;
    branchId?: string;
    branchName?: string;
    role?: string;
    guildRank?: string;
    verificationStatus?: string;
  };
  const profileUrl = `/member/${contactAny.uid}`;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        {contactAny.photoURL ? (
          <img
            src={contactAny.photoURL}
            alt={contactAny.fullName}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[var(--primary)]/20 flex items-center justify-center">
            <User size={12} className="text-[var(--primary)]" />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">{contactAny.fullName}</span>
          <span className="text-[9px] text-[var(--text-muted)]">{getRoleDisplayName(contactAny.role)}</span>
        </div>
        <Link to={profileUrl} className="text-[var(--primary)] hover:underline text-xs">
          <ExternalLink size={12} />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-md">
      {/* Header - Role Label */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {roleLabel}
        </span>
        <VerificationBadge status={contactAny.verificationStatus} />
      </div>

      {/* Contact Info */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {contactAny.photoURL ? (
          <img
            src={contactAny.photoURL}
            alt={contactAny.fullName}
            className="w-12 h-12 rounded-xl object-cover border border-[var(--border)]"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/20 flex items-center justify-center border border-[var(--primary)]/30">
            <User size={24} className="text-[var(--primary)]" />
          </div>
        )}

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
            {contactAny.fullName}
          </h4>
          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
            <Award size={12} className={getRankColor(contactAny.guildRank)} />
            Rank {contactAny.guildRank || 'N/A'}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
            <Shield size={10} />
            {getRoleDisplayName(contactAny.role)}
          </p>
        </div>
      </div>

      {/* Location */}
      {(contactAny.branchName || contactAny.city) && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <MapPin size={12} />
            {contactAny.branchName && <span>{contactAny.branchName}</span>}
            {contactAny.branchName && contactAny.city && <span> • </span>}
            {contactAny.city && <span>{contactAny.city}</span>}
          </div>
        </div>
      )}

      {/* Contact Info (if permitted) */}
      {showContactInfo && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
          {contactAny.phone && (
            <a href={`tel:${contactAny.phone}`} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--primary)]">
              <Phone size={12} />
              {contactAny.phone}
            </a>
          )}
          {contactAny.email && (
            <a href={`mailto:${contactAny.email}`} className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--primary)]">
              <Mail size={12} />
              <span className="truncate">{contactAny.email}</span>
            </a>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-[var(--border)] flex gap-2">
        <Link
          to={profileUrl}
          className="flex-1 primary text-xs py-2 px-3 rounded-lg font-semibold text-center hover:bg-[var(--primary-dark)] flex items-center justify-center gap-1"
        >
          <User size={12} />
          View Profile
        </Link>
        {contactAny.branchId && (
          <Link
            to={`/branches/${contactAny.branchId}`}
            className="flex-1 secondary text-xs py-2 px-3 rounded-lg font-semibold text-center flex items-center justify-center gap-1"
          >
            <Building2 size={12} />
            Branch
          </Link>
        )}
      </div>
    </div>
  );
}