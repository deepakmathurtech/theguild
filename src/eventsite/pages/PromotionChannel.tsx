import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Mail, MessageCircleMore, Share2 } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import EventWorkspaceHeader from '../components/EventWorkspaceHeader';
import { canManageEvent } from '../lib/eventAccess';
import { getEventsForHost, getPromotionCampaignForEvent, upsertPromotionCampaign } from '../lib/firestoreEvents';
import type { EventDocument } from '../lib/eventModels';
import { useActionGuard } from '../lib/useActionGuard';

const MAX_CAMPAIGN_LENGTH = 1200;

export default function PromotionChannel() {
  const { profile, firebaseUser } = useAuth();
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState({ instagram: true, whatsapp: true, email: false });
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const saveGuard = useActionGuard({ cooldownMs: 10000, maxAttempts: 2, windowMs: 30000 });

  const ownerUid = profile?.uid || firebaseUser?.uid;

  useEffect(() => {
    async function loadEvents() {
      if (!ownerUid) {
        setEvents([]);
        setSelectedEventId('');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const list = await getEventsForHost(ownerUid, profile?.uid ? `/member/${profile.uid}` : undefined);
        const manageableEvents = list.filter((event) => canManageEvent(event, profile, ownerUid));
        setEvents(manageableEvents);
        if (manageableEvents.length && !selectedEventId) {
          setSelectedEventId(manageableEvents[0].id!);
        }
      } catch (error) {
        console.error('Failed to load events', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [ownerUid, profile, selectedEventId]);

  useEffect(() => {
    async function loadCampaign() {
      if (!selectedEventId) {
        setMessage('');
        setChannels({ instagram: true, whatsapp: true, email: false });
        return;
      }

      try {
        const campaign = await getPromotionCampaignForEvent(selectedEventId);
        if (campaign) {
          setMessage(campaign.message || '');
          setChannels(campaign.channels || { instagram: true, whatsapp: true, email: false });
        } else {
          setMessage('');
          setChannels({ instagram: true, whatsapp: true, email: false });
        }
      } catch (error) {
        console.error('Failed to load campaign', error);
      }
    }

    loadCampaign();
  }, [selectedEventId]);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) || null, [events, selectedEventId]);

  async function saveCampaign() {
    if (!selectedEventId) return;
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setErrorMessage('Write a campaign message before saving.');
      return;
    }

    const guardMessage = saveGuard.guardAction(`Campaign save is cooling down. Try again in ${Math.max(1, saveGuard.remainingSeconds)} seconds.`);
    if (guardMessage) {
      setErrorMessage(guardMessage);
      return;
    }

    setSaving(true);
    setSavedMessage(null);
    setErrorMessage(null);
    try {
      await upsertPromotionCampaign({
        eventId: selectedEventId,
        message: trimmedMessage,
        channels,
      });
      setSavedMessage('Campaign saved for this event.');
    } catch (error) {
      console.error('Failed to save campaign', error);
      setErrorMessage('Unable to save campaign right now.');
      saveGuard.release();
    } finally {
      setSaving(false);
    }
  }

  const activeChannels = Object.values(channels).filter(Boolean).length;
  const messageLength = message.trim().length;

  return (
    <div className="space-y-5">
      <EventWorkspaceHeader
        eyebrow="Campaign planning"
        title="Promotion channel"
        description="Shape the event story, decide where it should go, and keep a saved launch message attached to the event workspace."
        events={events}
        selectedEventId={selectedEventId}
        onSelectEventId={setSelectedEventId}
        selectedEvent={selectedEvent}
        metrics={[
          { label: 'Active channels', value: activeChannels, hint: 'Instagram, WhatsApp, and email toggles' },
          { label: 'Message status', value: message.trim() ? 'Ready to publish' : 'Draft needed', hint: selectedEvent ? `For ${selectedEvent.name}` : 'Pick an event first' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            <Share2 className="h-3.5 w-3.5" />
            Campaign message
          </div>
          <textarea
            className="mt-3 w-full min-h-[180px] rounded-2xl border border-[var(--border)] bg-transparent px-4 py-3 text-sm"
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, MAX_CAMPAIGN_LENGTH))}
            placeholder="Share a message for attendees and partners"
            maxLength={MAX_CAMPAIGN_LENGTH}
            aria-describedby="campaign-message-count"
          />

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-[var(--text-secondary)]" id="campaign-message-count">
              {selectedEvent ? `This campaign will be saved to ${selectedEvent.name}.` : 'Choose an event to save the campaign.'}
              <span className="mt-1 block">{messageLength}/{MAX_CAMPAIGN_LENGTH} characters</span>
            </div>
            <button
              type="button"
              onClick={saveCampaign}
              disabled={saving || saveGuard.isCoolingDown || !selectedEventId || !message.trim()}
              className="min-h-11 w-full rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-extrabold text-black transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? 'Saving...' : saveGuard.isCoolingDown ? `Wait ${saveGuard.remainingSeconds}s` : 'Save campaign'}
            </button>
          </div>
          <div className="sr-only" aria-live="polite">{savedMessage || errorMessage || ''}</div>
          {savedMessage ? <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-600">{savedMessage}</div> : null}
          {errorMessage ? <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500" role="alert">{errorMessage}</div> : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Delivery channels</div>
            <div className="mt-3 space-y-3">
              {[
                { key: 'instagram', label: 'Instagram', hint: 'Post-ready social teaser', icon: CalendarDays },
                { key: 'whatsapp', label: 'WhatsApp', hint: 'Fast community reshares', icon: MessageCircleMore },
                { key: 'email', label: 'Email', hint: 'Longer launch copy and reminders', icon: Mail },
              ].map((channel) => {
                const Icon = channel.icon;
                return (
                  <label key={channel.key} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/50 p-2">
                        <Icon className="h-4 w-4 text-[var(--primary)]" />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold">{channel.label}</div>
                        <div className="mt-1 text-xs text-[var(--text-secondary)]">{channel.hint}</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={(channels as Record<string, boolean>)[channel.key]}
                      onChange={(event) => setChannels((previous) => ({ ...previous, [channel.key]: event.target.checked }))}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 space-y-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Event note</div>
              <div className="mt-2 text-sm font-extrabold">{selectedEvent ? selectedEvent.name : 'No event selected'}</div>
              <div className="mt-2 text-xs text-[var(--text-secondary)]">
                Promotion data is stored under the selected event so it stays tied to the organizer workflow.
              </div>
            </div>

            {selectedEvent && (
              <div className="pt-3 border-t border-[var(--border)] space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Shareable Public Link</div>
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--input-bg)] p-2">
                  <span className="text-[11px] text-[var(--text-secondary)] truncate flex-1 font-mono select-all">
                    {`${window.location.origin}/event-platform/e/${selectedEvent.slug}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/event-platform/e/${selectedEvent.slug}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-all ${
                      copied ? 'bg-emerald-600 text-white' : 'bg-[var(--primary)] text-black hover:opacity-90'
                    }`}
                  >
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && !events.length ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4 text-sm text-[var(--text-secondary)]">
          Loading event campaigns...
        </div>
      ) : null}
    </div>
  );
}
