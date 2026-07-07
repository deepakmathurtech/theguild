import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getEventsForOwner, getPromotionCampaignForEvent, upsertPromotionCampaign } from '../lib/firestoreEvents';
import type { EventDocument, PromotionCampaign } from '../lib/eventModels';

export default function PromotionChannel() {
  const { profile, firebaseUser } = useAuth();
  const [events, setEvents] = useState<(EventDocument & { id: string })[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState({ instagram: true, whatsapp: true, email: false });
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        const list = await getEventsForOwner(ownerUid);
        setEvents(list);
        if (list.length && !selectedEventId) {
          setSelectedEventId(list[0].id!);
        }
      } catch (error) {
        console.error('Failed to load events', error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [ownerUid]);

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

  const selectedEvent = events.find((event) => event.id === selectedEventId) || null;

  async function saveCampaign() {
    if (!selectedEventId) return;
    setSaving(true);
    setSavedMessage(null);
    try {
      await upsertPromotionCampaign({
        eventId: selectedEventId,
        message,
        channels,
      });
      setSavedMessage('Campaign saved for this event.');
    } catch (error) {
      console.error('Failed to save campaign', error);
      setSavedMessage('Unable to save campaign right now.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base md:text-lg font-extrabold tracking-tight">Promotion channel</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-2">
          Save campaign messaging and delivery channels for each event in the organizer workspace.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Selected event</div>
        <div className="mt-3">
          <select
            className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm md:max-w-xs"
            value={selectedEventId}
            onChange={(event) => setSelectedEventId(event.target.value)}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Campaign message</div>
          <textarea
            className="mt-3 w-full min-h-[140px] rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Share a message for attendees and partners"
          />

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-[var(--text-secondary)]">
              {selectedEvent ? `This will be saved to ${selectedEvent.name}.` : 'Choose an event to save the campaign.'}
            </div>
            <button
              type="button"
              onClick={saveCampaign}
              disabled={saving || !selectedEventId}
              className="px-4 py-2 rounded-xl bg-[var(--primary)] text-black font-extrabold text-xs hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save campaign'}
            </button>
          </div>
          {savedMessage ? <div className="mt-3 text-sm text-[var(--primary)]">{savedMessage}</div> : null}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-subtle)]/20 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">Delivery channels</div>

          <div className="mt-3 space-y-3">
            {[
              { key: 'instagram', label: 'Instagram' },
              { key: 'whatsapp', label: 'WhatsApp' },
              { key: 'email', label: 'Email' },
            ].map((channel) => (
              <label key={channel.key} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
                <div>
                  <div className="text-sm font-extrabold">{channel.label}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">Use this channel for the event campaign</div>
                </div>
                <input
                  type="checkbox"
                  checked={(channels as any)[channel.key]}
                  onChange={(event) => setChannels((previous) => ({ ...previous, [channel.key]: event.target.checked }))}
                />
              </label>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]/30 p-3">
            <div className="text-xs text-[var(--text-muted)] font-bold uppercase">Event note</div>
            <div className="text-sm font-extrabold mt-2">{selectedEvent ? selectedEvent.name : 'No event selected'}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-2">Promotion data is stored under the selected event so it stays tied to the organizer workflow.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

