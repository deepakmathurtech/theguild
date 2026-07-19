import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { EventStatus } from '../eventsite/lib/eventModels';

type EventPlatformSelectionContextValue = {
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  selectedEventStatus: EventStatus | null;
  setSelectedEventStatus: (status: EventStatus | null) => void;
};

const EventPlatformSelectionContext = createContext<EventPlatformSelectionContextValue | undefined>(undefined);

export function EventPlatformSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventStatus, setSelectedEventStatus] = useState<EventStatus | null>(null);

  const setSelectedEventIdSafe = useCallback((id: string | null) => setSelectedEventId(id), []);
  const setSelectedEventStatusSafe = useCallback((status: EventStatus | null) => setSelectedEventStatus(status), []);

  const value = useMemo(
    () => ({
      selectedEventId,
      setSelectedEventId: setSelectedEventIdSafe,
      selectedEventStatus,
      setSelectedEventStatus: setSelectedEventStatusSafe,
    }),
    [selectedEventId, selectedEventStatus, setSelectedEventIdSafe, setSelectedEventStatusSafe]
  );

  return <EventPlatformSelectionContext.Provider value={value}>{children}</EventPlatformSelectionContext.Provider>;
}

export function useEventPlatformSelection() {
  const ctx = useContext(EventPlatformSelectionContext);
  if (!ctx) {
    throw new Error('useEventPlatformSelection must be used within EventPlatformSelectionProvider');
  }
  return ctx;
}

