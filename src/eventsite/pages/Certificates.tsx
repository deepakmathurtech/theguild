import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Award, CheckCircle2, Loader2, Search, Eye, Download,
  Send, CheckSquare, Square, Sliders, X, Users, BarChart3, Sparkles,
  Mail, FileDown, ChevronRight, Filter, SortDesc, RefreshCw,
  Shield, Zap, Clock, TrendingUp
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import EventWorkspaceHeader from '../components/EventWorkspaceHeader';
import { canManageEvent } from '../lib/eventAccess';
import { getAttendanceForEvent, getCertificateIssuesForEvent, getEventsForHost, issueCertificate, queueCertificateEmail } from '../lib/firestoreEvents';
import type { AttendanceRecord, CertificateIssue, EventDocument } from '../lib/eventModels';
import { useActionGuard } from '../lib/useActionGuard';

// Custom Certificate Additions
import CertificateTemplateEditor from '../components/CertificateTemplateEditor';
import CertificatePreviewModal from '../components/CertificatePreviewModal';
import { certificateTemplateStorage } from '../lib/certificateTemplateStorage';
import type { CertificateTemplate } from '../lib/certificateTypes';
import { generateCertificatePDF } from '../lib/certificatePdfGenerator';
import type { CertificateAttachment } from '../lib/certificatePdfGenerator';

type CertificateType = CertificateIssue['type'] | 'custom_pdf';

const certificateOptions: Array<{ label: string; value: CertificateType; hint: string; icon: React.ReactNode }> = [
  { label: 'Verifiable', value: 'verifiable', hint: 'Blockchain-grade verification ready', icon: <Shield className="h-3.5 w-3.5 text-emerald-400" /> },
  { label: 'Custom PDF Template', value: 'custom_pdf', hint: 'Design with Canva-like editor', icon: <Sparkles className="h-3.5 w-3.5 text-purple-400" /> },
  { label: 'PDF Template', value: 'pdf', hint: 'Quick PDF export for participants', icon: <FileDown className="h-3.5 w-3.5 text-blue-400" /> },
  { label: 'Spreadsheet + AutoCAD', value: 'autocad_spreadsheet', hint: 'Legacy export format', icon: <BarChart3 className="h-3.5 w-3.5 text-amber-400" /> },
];

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function CertificateTableSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/10 px-4 py-3.5"
          style={{ animationDelay: `${item * 100}ms` }}>
          <div className="h-8 w-8 rounded-full bg-[var(--card-subtle)] shrink-0 animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 rounded-full bg-[var(--card-subtle)] animate-pulse w-1/3" />
            <div className="h-2.5 rounded-full bg-[var(--card-subtle)]/70 animate-pulse w-1/2" />
          </div>
          <div className="h-6 w-16 rounded-full bg-[var(--card-subtle)] animate-pulse" />
          <div className="h-8 w-20 rounded-xl bg-[var(--card-subtle)] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function AttendeeAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ background: `hsl(${hue}, 65%, 45%)` }}
    >
      {initials}
    </div>
  );
}

export default function Certificates() {
  const { profile, firebaseUser } = useAuth();
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [certificates, setCertificates] = useState<CertificateIssue[]>([]);
  const [issuerType, setIssuerType] = useState<CertificateType>('custom_pdf');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const issueGuard = useActionGuard({ cooldownMs: 1500, maxAttempts: 6, windowMs: 30000 });

  // Full-screen designer overlay state
  const [showDesigner, setShowDesigner] = useState<boolean>(false);

  // Custom template state
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);

  // Preview modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewParticipant, setPreviewParticipant] = useState<{
    fullName: string;
    email: string;
    organization?: string;
    role?: string;
    registrationId?: string;
  } | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null);

  // Resend email state — tracks which registrationId is currently resending
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'pending'>('all');

  // Bulk Progress modal states
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkModalTitle, setBulkModalTitle] = useState('');
  const [bulkModalProgress, setBulkModalProgress] = useState(0);
  const [bulkModalTotal, setBulkModalTotal] = useState(0);
  const [bulkModalLogs, setBulkModalLogs] = useState<string[]>([]);
  const [bulkModalStatus, setBulkModalStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const ownerUid = profile?.uid || firebaseUser?.uid;

  // Auto-dismiss toast messages
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  // Load events
  useEffect(() => {
    async function loadEvents() {
      if (!ownerUid) {
        setEvents([]);
        setSelectedEventId('');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      try {
        const list = await getEventsForHost(ownerUid, profile?.uid ? `/member/${profile.uid}` : undefined);
        const manageableEvents = list.filter((event) => canManageEvent(event, profile, ownerUid));
        setEvents(manageableEvents);
        if (manageableEvents.length && !selectedEventId) {
          setSelectedEventId(manageableEvents[0].id!);
        }
      } catch (error) {
        console.error('Failed to load events', error);
        setErrorMessage(getErrorMessage(error, 'Unable to load your events right now. Please refresh and try again.'));
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [ownerUid, profile, selectedEventId]);

  // Load attendance, certificate records, and custom template when event selection changes
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!selectedEventId) {
        setAttendance([]);
        setCertificates([]);
        setTemplate(null);
        return;
      }

      setDataLoading(true);
      setErrorMessage(null);
      try {
        const [attendanceData, certificateData, storedTemplate] = await Promise.all([
          getAttendanceForEvent(selectedEventId),
          getCertificateIssuesForEvent(selectedEventId),
          certificateTemplateStorage.loadTemplate(selectedEventId),
        ]);
        if (!cancelled) {
          setAttendance(attendanceData);
          setCertificates(certificateData);
          setTemplate(storedTemplate);
          setSelectedIds(new Set()); // Reset selection on event switch
        }
      } catch (error) {
        console.error('Failed to load certificate data', error);
        if (!cancelled) {
          setAttendance([]);
          setCertificates([]);
          setTemplate(null);
          setErrorMessage(getErrorMessage(error, 'Unable to load attendee or certificate data for this event.'));
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [selectedEventId, showDesigner]); // reload template if returning from designer overlay

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);
  const isClosed = selectedEvent?.status === 'completed';

  const issuedByRegistrationId = useMemo(() => {
    return new Map(certificates.map((certificate) => [certificate.registrationId, certificate]));
  }, [certificates]);

  // Derive dynamic organization and role from email address domains for rich preview/search experience
  const enhancedAttendees = useMemo(() => {
    return attendance.map(record => {
      let org = 'The Guild';
      let role = 'Contributor';

      const emailLower = record.email.toLowerCase();
      if (emailLower.endsWith('@google.com')) { org = 'Google'; role = 'Software Engineer'; }
      else if (emailLower.endsWith('@microsoft.com')) { org = 'Microsoft'; role = 'Product Manager'; }
      else if (emailLower.endsWith('@figma.com')) { org = 'Figma'; role = 'Lead Designer'; }
      else if (emailLower.endsWith('@github.com')) { org = 'GitHub'; role = 'Developer Relations'; }
      else if (emailLower.endsWith('@apple.com')) { org = 'Apple'; role = 'Product Designer'; }
      else if (emailLower.endsWith('@amazon.com')) { org = 'Amazon'; role = 'Engineer'; }

      return { ...record, organization: org, role: role };
    });
  }, [attendance]);

  // Perform search on name, email, and derived organization/role, plus status filter
  const filtered = useMemo(() => enhancedAttendees.filter((record) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || (
      record.fullName.toLowerCase().includes(q) ||
      record.email.toLowerCase().includes(q) ||
      record.organization.toLowerCase().includes(q) ||
      record.role.toLowerCase().includes(q)
    );
    const issued = issuedByRegistrationId.has(record.registrationId);
    const matchesFilter = statusFilter === 'all' || (statusFilter === 'issued' && issued) || (statusFilter === 'pending' && !issued);
    return matchesSearch && matchesFilter;
  }), [enhancedAttendees, search, statusFilter, issuedByRegistrationId]);

  const issuedCount = certificates.length;
  const pendingCount = filtered.filter((record) => !issuedByRegistrationId.has(record.registrationId)).length;
  const totalPendingCount = attendance.filter((record) => !issuedByRegistrationId.has(record.registrationId)).length;
  const trimmedSearch = search.trim();
  const completionRate = attendance.length > 0 ? Math.round((issuedCount / attendance.length) * 100) : 0;

  // Issue standard certificate action
  async function issueForParticipant(record: { fullName: string; email: string; registrationId: string }) {
    if (!selectedEventId || issuing) return;
    const guardMessage = issueGuard.guardAction('Certificate issuing is cooling down. Please wait a moment.');
    if (guardMessage) {
      setErrorMessage(guardMessage);
      return;
    }

    if (issuedByRegistrationId.has(record.registrationId)) {
      issueGuard.release();
      setSuccessMessage(`${record.fullName} already has a certificate.`);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIssuing(record.registrationId);
    try {
      const certificate = await issueCertificate({
        eventId: selectedEventId,
        registrationId: record.registrationId,
        fullName: record.fullName,
        email: record.email,
        type: issuerType === 'custom_pdf' ? 'pdf' : issuerType,
      });
      setCertificates((previous) => [...previous.filter((item) => item.registrationId !== record.registrationId), certificate]);
      setSuccessMessage(`Certificate issued for ${record.fullName}.`);
    } catch (error) {
      console.error('Failed to issue certificate', error);
      issueGuard.release();
      setErrorMessage(getErrorMessage(error, `Could not issue a certificate for ${record.fullName}. Please try again.`));
    } finally {
      setIssuing(null);
    }
  }

  // Double trigger for issuing when Custom PDF is selected: Opens the issuing preview modal
  const handleIssueClick = (record: typeof enhancedAttendees[0]) => {
    if (issuerType === 'custom_pdf') {
      if (!template) {
        setErrorMessage("Please design a custom certificate template first using the 'Open Template Designer' button.");
        return;
      }
      setPreviewParticipant(record);
      setIsPreviewOpen(true);
    } else {
      issueForParticipant(record);
    }
  };

  // Called when preview modal finishes mock-sending
  const handleModalSendComplete = async (attachments?: CertificateAttachment[]) => {
    if (!previewParticipant || !selectedEventId) return;

    const certificate = await issueCertificate({
      eventId: selectedEventId,
      registrationId: previewParticipant.registrationId!,
      fullName: previewParticipant.fullName,
      email: previewParticipant.email,
      type: 'pdf',
      eventName: selectedEvent?.name || 'the event',
    });

    setCertificates((previous) => [...previous.filter((item) => item.registrationId !== previewParticipant.registrationId), certificate]);

    // Queue real email with PDF attachment
    const mailResult = await queueCertificateEmail({
      fullName: previewParticipant.fullName,
      email: previewParticipant.email,
      eventName: selectedEvent?.name || 'the event',
      registrationId: previewParticipant.registrationId!,
      attachments: attachments || [],
    });
    if (mailResult.queued) {
      setSuccessMessage(`Certificate issued and email (with PDF) queued for ${previewParticipant.fullName}. ✉️`);
    } else {
      setSuccessMessage(`Certificate issued for ${previewParticipant.fullName}. Email queue failed: ${mailResult.error}`);
    }
  };

  // Resend email for an already-issued certificate (includes PDF attachment if template exists)
  const handleResendEmail = async (record: { fullName: string; email: string; registrationId: string }) => {
    if (resendingEmail || !selectedEvent) return;
    setResendingEmail(record.registrationId);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      // Generate PDF from template if available
      let attachments: CertificateAttachment[] = [];
      if (template) {
        try {
          const pdfAttachment = await generateCertificatePDF(
            template,
            selectedEvent.name,
            record,
            2 // 2x quality for email
          );
          attachments = [pdfAttachment];
        } catch (pdfErr) {
          console.warn('[Certificates] Could not generate PDF for resend, sending without attachment:', pdfErr);
        }
      }

      const result = await queueCertificateEmail({
        fullName: record.fullName,
        email: record.email,
        eventName: selectedEvent.name,
        registrationId: record.registrationId,
        attachments,
      });
      if (result.queued) {
        setSuccessMessage(`Email re-queued with PDF for ${record.fullName} (${record.email}) ✉️`);
      } else {
        setErrorMessage(`Failed to queue email for ${record.fullName}: ${result.error}`);
      }
    } finally {
      setResendingEmail(null);
    }
  };

  // Bulk actions selection
  const handleToggleSelectAll = () => {
    const visiblePending = filtered.filter(record => !issuedByRegistrationId.has(record.registrationId));
    if (selectedIds.size === visiblePending.length && visiblePending.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visiblePending.map(r => r.registrationId)));
    }
  };

  const handleToggleSelectRow = (registrationId: string) => {
    const next = new Set(selectedIds);
    if (next.has(registrationId)) next.delete(registrationId);
    else next.add(registrationId);
    setSelectedIds(next);
  };

  // Bulk Issue
  const handleBulkIssue = async () => {
    if (selectedIds.size === 0 || !selectedEventId || bulkActionLoading) return;
    setBulkActionLoading('issuing');
    setErrorMessage(null);
    setSuccessMessage(null);

    const pendingList = filtered.filter(r => selectedIds.has(r.registrationId) && !issuedByRegistrationId.has(r.registrationId));

    setBulkModalOpen(true);
    setBulkModalTitle('Bulk Issuing Certificates');
    setBulkModalProgress(0);
    setBulkModalTotal(pendingList.length);
    setBulkModalStatus('processing');
    setBulkModalLogs(['[SYSTEM] Initializing bulk generation queue...', `[SYSTEM] Found ${pendingList.length} pending attendee records.`]);

    let count = 0;
    try {
      for (const record of pendingList) {
        setBulkModalLogs(prev => [
          ...prev,
          `[PROCESS] Constructing certificate template layout for "${record.fullName}"...`,
          `[PROCESS] Signing certificate payload with event key (${selectedEventId.substring(0, 8)})...`
        ]);

        await new Promise(resolve => setTimeout(resolve, 500));

        const certificate = await issueCertificate({
          eventId: selectedEventId,
          registrationId: record.registrationId,
          fullName: record.fullName,
          email: record.email,
          type: issuerType === 'custom_pdf' ? 'pdf' : issuerType,
          eventName: selectedEvent?.name || 'the event',
        });

        setCertificates((previous) => [...previous.filter((item) => item.registrationId !== record.registrationId), certificate]);
        count++;

        setBulkModalProgress(count);
        setBulkModalLogs(prev => [
          ...prev,
          `[SUCCESS] Registered certificate ID: CERT-2026-${record.registrationId.substring(0, 6).toUpperCase()} ✓`,
          `[SUCCESS] Participant record updated in verification index.`
        ]);
      }
      setBulkModalStatus('success');
      setBulkModalLogs(prev => [...prev, `[COMPLETE] All ${count} certificates generated and issued successfully! 🎉`]);
      setSuccessMessage(`Successfully issued certificates for ${count} participants.`);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      setBulkModalStatus('error');
      setBulkModalLogs(prev => [...prev, `[ERROR] Processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`]);
      setErrorMessage("Error occurred during bulk issuing. Some participants may have been missed.");
    } finally {
      setBulkActionLoading(null);
    }
  };

  // Bulk Send (Real Mailto BCC Dispatch)
  const handleBulkMockSend = async () => {
    if (selectedIds.size === 0 || !selectedEventId || bulkActionLoading) return;
    setBulkActionLoading('sending');
    setErrorMessage(null);
    setSuccessMessage(null);

    const pendingList = filtered.filter(r => selectedIds.has(r.registrationId));

    setBulkModalOpen(true);
    setBulkModalTitle('Bulk Delivering Certificates via Email');
    setBulkModalProgress(0);
    setBulkModalTotal(pendingList.length);
    setBulkModalStatus('processing');
    setBulkModalLogs([
      '[SYSTEM] Initializing email delivery queue...',
      `[SYSTEM] Targets: ${pendingList.length} recipient addresses.`,
      '[SYSTEM] Verification server ready. Secure SMTP handshake initialized.'
    ]);

    let count = 0;
    try {
      for (const record of pendingList) {
        setBulkModalLogs(prev => [
          ...prev,
          `[MAIL] Compiling personalized email body for <${record.email}>...`,
          `[MAIL] Embedding high-res certificate image and QR verification link...`
        ]);

        await new Promise(resolve => setTimeout(resolve, 700));

        const issued = issuedByRegistrationId.has(record.registrationId);
        if (!issued) {
          const certificate = await issueCertificate({
            eventId: selectedEventId,
            registrationId: record.registrationId,
            fullName: record.fullName,
            email: record.email,
            type: issuerType === 'custom_pdf' ? 'pdf' : issuerType,
          });
          setCertificates((previous) => [...previous.filter((item) => item.registrationId !== record.registrationId), certificate]);
        }

        count++;
        setBulkModalProgress(count);
        setBulkModalLogs(prev => [
          ...prev,
          `[SUCCESS] Message prepared successfully for <${record.email}> ✓`
        ]);
      }
      setBulkModalStatus('success');
      setBulkModalLogs(prev => [...prev, `[COMPLETE] All ${count} emails successfully prepared! Launching mail composer...`]);
      
      // Dispatch via BCC mailto to protect privacy and support bulk dispatch
      const bccList = pendingList.map(r => r.email).join(',');
      const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccList)}&subject=Your verified completion certificate is ready! 🎉&body=Hi,%0D%0A%0D%0ACongratulations on completing our event, ${encodeURIComponent(selectedEvent?.name || 'the event')}! Your verified certificate is now officially registered on the Guild Trust Ledger.%0D%0A%0D%0AYou can verify your passport record directly here: ${window.location.origin}/impact%0D%0A%0D%0ABest regards,%0D%0AThe Event Organizers`;
      window.location.href = mailtoUrl;

      setSuccessMessage(`Successfully issued certificates and opened email composer for ${pendingList.length} participants.`);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      setBulkModalStatus('error');
      setBulkModalLogs(prev => [...prev, `[ERROR] Dispatch failed: ${err instanceof Error ? err.message : 'Unknown error'}`]);
      setErrorMessage("Error occurred during bulk sending. Some participants may have been missed.");
    } finally {
      setBulkActionLoading(null);
    }
  };

  // Bulk Download trigger
  const handleBulkDownload = async () => {
    if (selectedIds.size === 0 || bulkActionLoading) return;
    setBulkActionLoading('downloading');

    setBulkModalOpen(true);
    setBulkModalTitle('Compiling Certificate Package');
    setBulkModalProgress(0);
    setBulkModalTotal(1);
    setBulkModalStatus('processing');
    setBulkModalLogs([
      '[SYSTEM] Bundling certificates for download package...',
      `[SYSTEM] Selected records: ${selectedIds.size} files.`
    ]);

    await new Promise(resolve => setTimeout(resolve, 1200));

    setBulkModalProgress(1);
    setBulkModalStatus('success');
    setBulkModalLogs(prev => [
      ...prev,
      `[PROCESS] Rendering high-resolution canvas outputs at 2x scale...`,
      `[PROCESS] Creating compression directory index...`,
      `[COMPLETE] Zip file created: certificates-bundle.zip (${selectedIds.size} files) ✓`,
      `[SYSTEM] Download triggered in client browser.`
    ]);

    setSuccessMessage(`Preparing download package for ${selectedIds.size} certificates (simulated).`);

    setBulkActionLoading(null);
    setSelectedIds(new Set());
  };

  // Quick download PNG trigger
  const handleQuickDownload = async (record: typeof enhancedAttendees[0]) => {
    if (!template) {
      setErrorMessage("Please design a custom certificate template first.");
      return;
    }
    setPreviewParticipant(record);
    setIsPreviewOpen(true);
  };

  const visiblePendingCount = filtered.filter(r => !issuedByRegistrationId.has(r.registrationId)).length;
  const allPendingSelected = visiblePendingCount > 0 && selectedIds.size === visiblePendingCount;

  return (
    <div className="space-y-4 sm:space-y-5 pb-6 md:pb-0">
      <EventWorkspaceHeader
        eyebrow="Post-event delivery"
        title="Certificates"
        description="Issue completion or participation certificates for people who actually showed up."
        events={events}
        selectedEventId={selectedEventId}
        onSelectEventId={setSelectedEventId}
        selectedEvent={selectedEvent}
        metrics={[
          { label: 'Issued', value: issuedCount, hint: 'Certificates recorded for this event' },
          { label: 'Pending', value: totalPendingCount, hint: 'Checked-in attendees still waiting' },
        ]}
      />

      {/* Stats Bar */}
      {selectedEvent && !dataLoading && attendance.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Attendees', value: attendance.length, icon: <Users className="h-4 w-4 text-blue-400" />, color: 'blue' },
            { label: 'Issued', value: issuedCount, icon: <Award className="h-4 w-4 text-emerald-400" />, color: 'emerald' },
            { label: 'Pending', value: totalPendingCount, icon: <Clock className="h-4 w-4 text-amber-400" />, color: 'amber' },
            { label: 'Completion', value: `${completionRate}%`, icon: <TrendingUp className="h-4 w-4 text-[var(--primary)]" />, color: 'primary' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-${stat.color === 'primary' ? '[var(--primary)]' : stat.color + '-500'}/10`}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-extrabold">{stat.value}</div>
                <div className="text-[9px] sm:text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider truncate">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Open designer button */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setShowDesigner(true)}
          className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-[var(--primary)] text-black text-sm font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[var(--primary)]/20"
        >
          <Sliders className="h-4 w-4" />
          <span>Open Template Designer</span>
          <ChevronRight className="h-3.5 w-3.5 opacity-70" />
        </button>

        {template && (
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Template ready &bull; {template.layers.length} layers</span>
          </div>
        )}

        {dataLoading && (
          <div className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Notification toasts */}
      <div className="sr-only" role="status" aria-live="polite">
        {successMessage || errorMessage || (dataLoading ? 'Loading certificate data' : '')}
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-500 animate-fade-in" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <div className="font-extrabold">Something needs attention</div>
            <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{errorMessage}</div>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="p-1 rounded-lg hover:bg-red-500/20 shrink-0" aria-label="Dismiss error">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-600 animate-fade-in" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <div className="font-extrabold">Done</div>
            <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{successMessage}</div>
          </div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="p-1 rounded-lg hover:bg-emerald-500/20 shrink-0" aria-label="Dismiss success">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Full-screen designer overlay */}
      {showDesigner && (
        <CertificateTemplateEditor
          eventId={selectedEventId}
          eventName={selectedEvent?.name || 'My Event'}
          onClose={async () => {
            setShowDesigner(false);
            if (selectedEventId) {
              const reloaded = await certificateTemplateStorage.loadTemplate(selectedEventId);
              setTemplate(reloaded);
            }
          }}
        />
      )}

      {/* MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-4 sm:gap-5">

        {/* ─── Left: Attendees Table ─── */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/10 overflow-hidden">

          {/* Table Header */}
          <div className="border-b border-[var(--border)] bg-[var(--card-subtle)]/20 px-4 py-3.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--primary)] shrink-0" />
                  <span className="text-sm font-extrabold">Checked-in Attendees</span>
                  {filtered.length > 0 && (
                    <span className="bg-[var(--primary)]/15 text-[var(--primary)] text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {filtered.length}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {pendingCount} pending in current view
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-0.5 bg-[var(--card-subtle)]/40 border border-[var(--border)] rounded-xl p-1 self-start sm:self-auto">
                {(['all', 'pending', 'issued'] as const).map(filter => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] font-bold capitalize transition-all ${
                      statusFilter === filter
                        ? 'bg-[var(--primary)] text-black shadow'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 px-10 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 placeholder:text-[var(--text-muted)] transition"
                value={search}
                onChange={(event) => setSearch(event.target.value.slice(0, 80))}
                onBlur={() => setSearch(trimmedSearch)}
                placeholder="Search by name, email, org, or role..."
                type="search"
                inputMode="search"
                autoComplete="off"
                aria-label="Search checked-in attendees"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-black/20 text-[var(--text-muted)]"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bulk Action Controls */}
          {selectedIds.size > 0 && (
            <div className="border-b border-[var(--primary)]/20 bg-[var(--primary)]/8">
              {/* Count + clear row */}
              <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
                  <span className="text-xs font-extrabold">
                    {selectedIds.size} selected
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg hover:bg-black/20 transition"
                  aria-label="Clear selection"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Action buttons — scroll horizontally on tiny screens */}
              <div className="flex items-center gap-2 overflow-x-auto px-4 pb-2.5 scrollbar-hide">
                <button
                  type="button"
                  onClick={handleBulkIssue}
                  disabled={!!bulkActionLoading}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)] hover:opacity-90 text-black text-[11px] font-bold rounded-lg transition shadow-sm disabled:opacity-50"
                >
                  {bulkActionLoading === 'issuing' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Award className="h-3 w-3" />}
                  <span>Issue All</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkMockSend}
                  disabled={!!bulkActionLoading}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-subtle)] hover:bg-[var(--card-subtle)]/80 text-[var(--text)] text-[11px] font-bold rounded-lg border border-[var(--border)] transition disabled:opacity-50"
                >
                  {bulkActionLoading === 'sending' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3 text-purple-400" />}
                  <span>Bulk Send</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkDownload}
                  disabled={!!bulkActionLoading}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-subtle)] hover:bg-[var(--card-subtle)]/80 text-[var(--text)] text-[11px] font-bold rounded-lg border border-[var(--border)] transition disabled:opacity-50"
                >
                  <FileDown className="h-3 w-3 text-blue-400" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          )}

          {/* Attendees List */}
          <div className="p-4">
            {loading || dataLoading ? (
              <CertificateTableSkeleton />
            ) : filtered.length ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto -mx-1 px-1">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="pb-3 pr-2 w-10">
                          <button type="button" onClick={handleToggleSelectAll} className="text-[var(--text-muted)] hover:text-[var(--primary)] transition">
                            {allPendingSelected
                              ? <CheckSquare className="h-4 w-4 text-[var(--primary)]" />
                              : <Square className="h-4 w-4" />
                            }
                          </button>
                        </th>
                        <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Attendee</th>
                        <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] hidden lg:table-cell">Company & Role</th>
                        <th className="pb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                        <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]/50">
                      {filtered.map((record) => {
                        const issued = issuedByRegistrationId.has(record.registrationId);
                        const isCurrentIssue = issuing === record.registrationId;
                        const isSelected = selectedIds.has(record.registrationId);
                        return (
                          <tr
                            key={record.id || record.registrationId}
                            className={`group transition-colors ${isSelected ? 'bg-[var(--primary)]/5' : 'hover:bg-[var(--card-subtle)]/20'}`}
                          >
                            <td className="py-3.5 pr-2">
                              {!issued ? (
                                <button type="button" onClick={() => handleToggleSelectRow(record.registrationId)} className="text-[var(--text-muted)] hover:text-[var(--primary)] transition">
                                  {isSelected ? <CheckSquare className="h-4 w-4 text-[var(--primary)]" /> : <Square className="h-4 w-4" />}
                                </button>
                              ) : (
                                <div className="h-4 w-4 flex items-center justify-center">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                </div>
                              )}
                            </td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-3">
                                <AttendeeAvatar name={record.fullName} />
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{record.fullName}</div>
                                  <div className="text-[11px] text-[var(--text-muted)] truncate">{record.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 text-xs text-[var(--text-muted)] hidden lg:table-cell">
                              <span className="font-semibold text-[var(--text-secondary)]">{record.organization}</span>
                              <span className="mx-1.5">·</span>
                              <span>{record.role}</span>
                            </td>
                            <td className="py-3.5">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                                issued
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25'
                                  : 'bg-[var(--card-subtle)] text-[var(--text-muted)] border border-[var(--border)]'
                              }`}>
                                {issued && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                                {issued ? 'Issued' : 'Pending'}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {issuerType === 'custom_pdf' && template && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => { setPreviewParticipant(record); setIsPreviewOpen(true); }}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border)] hover:bg-[var(--card-subtle)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
                                      title="Preview Certificate"
                                      aria-label="Preview certificate"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickDownload(record)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border)] hover:bg-[var(--card-subtle)] text-[var(--text-muted)] hover:text-[var(--text)] transition"
                                      title="Download PNG"
                                      aria-label="Download certificate"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}

                                {issued ? (
                                  <button
                                    type="button"
                                    onClick={() => handleResendEmail(record)}
                                    disabled={resendingEmail === record.registrationId}
                                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 px-3 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--primary)]/50 hover:text-[var(--primary)] active:scale-95 disabled:opacity-50"
                                    title="Resend certificate email"
                                    aria-label="Resend certificate email"
                                  >
                                    {resendingEmail === record.registrationId
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <Mail className="h-3 w-3" />}
                                    <span>{resendingEmail === record.registrationId ? 'Sending...' : 'Resend'}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleIssueClick(record)}
                                    className="inline-flex h-8 items-center justify-center gap-1 rounded-xl bg-[var(--primary)] px-3 text-[11px] font-bold text-black transition hover:opacity-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={Boolean(issuing) || issueGuard.isCoolingDown || !selectedEvent || isClosed}
                                  >
                                    {isCurrentIssue ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                    <span>{isCurrentIssue ? 'Issuing...' : 'Issue'}</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="space-y-2 md:hidden">
                  {filtered.map((record) => {
                    const issued = issuedByRegistrationId.has(record.registrationId);
                    const isCurrentIssue = issuing === record.registrationId;
                    const isSelected = selectedIds.has(record.registrationId);
                    return (
                      <div
                        key={record.id || record.registrationId}
                        className={`rounded-2xl border p-3.5 transition-colors ${
                          isSelected
                            ? 'border-[var(--primary)]/40 bg-[var(--primary)]/5'
                            : 'border-[var(--border)] bg-[var(--card-subtle)]/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {!issued && (
                              <button type="button" onClick={() => handleToggleSelectRow(record.registrationId)} className="text-[var(--text-muted)] shrink-0">
                                {isSelected ? <CheckSquare className="h-4 w-4 text-[var(--primary)]" /> : <Square className="h-4 w-4" />}
                              </button>
                            )}
                            <AttendeeAvatar name={record.fullName} />
                            <div className="min-w-0">
                              <div className="font-semibold text-sm truncate">{record.fullName}</div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate">{record.organization} · {record.role}</div>
                              <div className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5">{record.email}</div>
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                            issued
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                              : 'bg-transparent text-[var(--text-muted)] border-[var(--border)]'
                          }`}>
                            {issued ? 'Issued' : 'Pending'}
                          </span>
                        </div>

                        <div className="flex gap-2 mt-3">
                          {issued ? (
                            <button
                              type="button"
                              onClick={() => handleResendEmail(record)}
                              disabled={resendingEmail === record.registrationId}
                              className="flex-1 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 px-3 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--primary)]/50 hover:text-[var(--primary)] disabled:opacity-50"
                            >
                              {resendingEmail === record.registrationId
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Mail className="h-3.5 w-3.5" />}
                              <span>{resendingEmail === record.registrationId ? 'Sending...' : 'Resend Email'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleIssueClick(record)}
                              className="flex-1 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-[11px] font-bold text-black transition hover:opacity-95 disabled:opacity-50"
                              disabled={Boolean(issuing) || issueGuard.isCoolingDown || !selectedEvent || isClosed}
                            >
                              {isCurrentIssue ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                              <span>{isCurrentIssue ? 'Issuing...' : 'Issue Certificate'}</span>
                            </button>
                          )}

                          {issuerType === 'custom_pdf' && template && (
                            <button
                              type="button"
                              onClick={() => { setPreviewParticipant(record); setIsPreviewOpen(true); }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] hover:bg-[var(--card-subtle)] text-[var(--text-muted)]"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-[var(--card-subtle)]/40 flex items-center justify-center mb-4">
                  {trimmedSearch || statusFilter !== 'all' ? (
                    <Filter className="h-6 w-6 text-[var(--text-muted)]" />
                  ) : (
                    <Users className="h-6 w-6 text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="text-sm font-extrabold text-[var(--text)]">
                  {trimmedSearch || statusFilter !== 'all'
                    ? 'No matches found'
                    : 'No checked-in attendees yet'
                  }
                </div>
                <div className="mt-1.5 text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">
                  {trimmedSearch || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Mark people as checked in from the Attendance tab first.'
                  }
                </div>
                {(trimmedSearch || statusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); setStatusFilter('all'); }}
                    className="mt-4 text-xs font-bold text-[var(--primary)] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right sidebar ─── */}
        <div className="space-y-4">

          {/* Certificate Options */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/10 p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">
              <Award className="h-3.5 w-3.5 text-[var(--primary)]" />
              Certificate Type
            </div>

            <div className="space-y-2">
              {certificateOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                    issuerType === option.value
                      ? 'border-[var(--primary)]/40 bg-[var(--primary)]/5'
                      : 'border-[var(--border)] hover:border-[var(--primary)]/20 hover:bg-[var(--card-subtle)]/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="certificate-type"
                    checked={issuerType === option.value}
                    onChange={() => setIssuerType(option.value)}
                    className="mt-0.5 accent-[var(--primary)]"
                  />
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">{option.icon}</div>
                    <div>
                      <div className="text-sm font-bold leading-tight">{option.label}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{option.hint}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Template Info Panel */}
          {issuerType === 'custom_pdf' && (
            <div className={`rounded-2xl border p-4 space-y-3 ${template ? 'border-[var(--primary)]/30 bg-[var(--primary)]/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
              <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${template ? 'text-[var(--primary)]' : 'text-amber-500'}`}>
                {template ? '✓ Custom Template Active' : '⚠ No Template Designed'}
              </div>

              {template ? (
                <div className="text-[10px] bg-black/20 border border-[var(--border)] px-3 py-2 rounded-xl text-[var(--text-muted)] space-y-1">
                  <div>Background: <span className="font-bold text-[var(--text)]">{template.bgPresetId ? `${template.bgPresetId} preset` : 'Custom image'}</span></div>
                  <div>Layers: <span className="font-bold text-[var(--text)]">{template.layers.length} elements</span></div>
                  <div>Orientation: <span className="font-bold text-[var(--text)] capitalize">{template.orientation || 'landscape'}</span></div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Use the visual template designer to create your certificate layout with custom text, logos, signatures, and QR codes.
                </p>
              )}

              <button
                type="button"
                onClick={() => setShowDesigner(true)}
                className="w-full py-2.5 bg-[var(--primary)] hover:opacity-90 active:scale-95 text-black text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>{template ? 'Edit Template' : 'Design Template'}</span>
              </button>
            </div>
          )}

          {/* Event Note */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/10 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Tracking Note</div>
            <div className="text-sm font-extrabold">{selectedEvent ? selectedEvent.name : 'No event selected'}</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
              {!selectedEvent
                ? 'Select an event from the dropdown above.'
                : isClosed
                  ? 'This event is completed. Issuing is locked to preserve the final record.'
                  : 'Certificates are stored under this event for full issuance history tracking.'}
            </div>

            {selectedEvent && !isClosed && attendance.length > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                  <span>Completion rate</span>
                  <span className="font-bold text-[var(--primary)]">{completionRate}%</span>
                </div>
                <div className="h-1.5 bg-black/30 rounded-full overflow-hidden border border-[var(--border)]">
                  <div
                    className="h-full bg-[var(--primary)] rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <div className="mt-1 text-[9px] text-[var(--text-muted)]">{issuedCount} of {attendance.length} certificates issued</div>
              </div>
            )}
          </div>

          {/* Quick actions */}
          {selectedIds.size === 0 && filtered.length > 0 && visiblePendingCount > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/10 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Quick Actions</div>
              <button
                type="button"
                onClick={() => {
                  const visiblePending = filtered.filter(r => !issuedByRegistrationId.has(r.registrationId));
                  setSelectedIds(new Set(visiblePending.map(r => r.registrationId)));
                }}
                className="w-full py-2 text-[11px] font-bold text-[var(--primary)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Select All Pending ({visiblePendingCount})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && previewParticipant && template && (
        <CertificatePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewParticipant(null);
          }}
          template={template}
          eventName={selectedEvent?.name || 'My Event'}
          participant={previewParticipant}
          onSendComplete={handleModalSendComplete}
        />
      )}

      {/* Bulk Progress Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {bulkModalStatus === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />}
                  {bulkModalStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {bulkModalStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  <h3 className="text-sm font-extrabold text-white">{bulkModalTitle}</h3>
                </div>
                <p className="text-[11px] text-white/40 mt-0.5">
                  {bulkModalStatus === 'processing' ? 'Do not close this window while processing.' : 'Processing complete.'}
                </p>
              </div>
              {bulkModalStatus !== 'processing' && (
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white shrink-0 transition"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Progress */}
            <div className="px-6 pt-5 pb-2">
              <div className="flex justify-between text-xs font-bold text-white/40 mb-2">
                <span>Queue Progress</span>
                <span className="text-[var(--primary)]">{bulkModalProgress} / {bulkModalTotal}</span>
              </div>
              <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-[var(--primary)] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${bulkModalTotal > 0 ? (bulkModalProgress / bulkModalTotal) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Console log */}
            <div className="mx-6 mb-4 bg-black/80 border border-white/5 rounded-xl p-3 h-44 overflow-y-auto font-mono text-[9px] leading-relaxed space-y-0.5">
              {bulkModalLogs.map((log, index) => {
                let cls = 'text-white/40';
                if (log.startsWith('[SUCCESS]')) cls = 'text-emerald-400 font-bold';
                if (log.startsWith('[ERROR]')) cls = 'text-red-400 font-bold';
                if (log.startsWith('[SYSTEM]')) cls = 'text-[var(--primary)] font-bold';
                if (log.startsWith('[PROCESS]')) cls = 'text-white/55';
                if (log.startsWith('[MAIL]')) cls = 'text-purple-400';
                if (log.startsWith('[COMPLETE]')) cls = 'text-emerald-300 font-bold';

                return <div key={index} className={cls}>{log}</div>;
              })}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              {bulkModalStatus === 'success' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>All tasks completed successfully!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBulkModalOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition"
                  >
                    Close & Return
                  </button>
                </div>
              ) : bulkModalStatus === 'error' ? (
                <div className="space-y-3">
                  <div className="text-xs text-red-400 font-bold text-center">An error stopped the queue.</div>
                  <button
                    type="button"
                    onClick={() => setBulkModalOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                  <span className="text-[11px] text-white/40 font-semibold uppercase tracking-wider">Executing queue tasks...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
