export type Profile = {
  name: string;
  avatar?: string;
};

export type CounterField = {
  id: string;
  name: string;
  count: number;
};

export type Tile = {
  id: string;
  value: number;
  savedAt: string;
  note?: string;
};

export type TallyEvent = {
  id: string;
  name: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  fields: CounterField[];
  tiles: Tile[];
  /** Legacy count retained for backwards compatibility */
  count?: number;
};

export type Accent = "cyan" | "lime" | "pink" | "amber";

export const MAX_EVENTS = 15;

export const DEFAULT_FIELDS: { id: string; name: string }[] = [
  { id: "men", name: "Men" },
  { id: "women", name: "Women" },
  { id: "children", name: "Children" },
  { id: "bike", name: "Bike" },
  { id: "car", name: "Cars" },
];

const PROFILE_KEY = "tallyo_profile";
const EVENTS_KEY = "tallyo_events";
const ACTIVE_EVENT_KEY = "tallyo_active_event_id";
const LEGACY_USERS_KEY = "tallyo_users";
const LEGACY_SESSION_KEY = "tallyo_session";

const read = <T>(k: string, fallback: T): T => {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(k) : null;
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (k: string, v: unknown) => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(k, JSON.stringify(v));
    }
  } catch {
    // LocalStorage write fail protection
  }
};

/** Get the user's local profile (Name & Avatar photo) */
export function getProfile(): Profile {
  const existing = read<Profile | null>(PROFILE_KEY, null);
  if (existing) return existing;

  // Migrate legacy user profile if present
  try {
    const session = typeof localStorage !== "undefined" ? localStorage.getItem(LEGACY_SESSION_KEY) : null;
    const users = read<Record<string, { name: string; avatar?: string }>>(LEGACY_USERS_KEY, {});
    if (session && users[session]) {
      const p: Profile = { name: users[session].name || "Usher", avatar: users[session].avatar };
      saveProfile(p);
      return p;
    }
  } catch {}

  return { name: "Usher" };
}

export function saveProfile(p: Profile) {
  write(PROFILE_KEY, p);
}

/** Upgrades events saved by older versions (e.g. without fields array) */
export function normalizeEvent(raw: Partial<TallyEvent> & { id: string }): TallyEvent {
  const now = new Date().toISOString();
  const updatedAt = raw.updatedAt ?? now;
  const createdAt = raw.createdAt ?? updatedAt;
  const name = raw.name || "Event";
  const notes = raw.notes || "";
  const tiles: Tile[] = Array.isArray(raw.tiles) ? raw.tiles : [];

  let fields: CounterField[] = [];
  if (Array.isArray(raw.fields) && raw.fields.length > 0) {
    fields = raw.fields.map((f) => ({
      id: f.id || crypto.randomUUID(),
      name: f.name || "Field",
      count: typeof f.count === "number" && !isNaN(f.count) && f.count >= 0 ? f.count : 0,
    }));
  } else {
    // Generate default categories: Men, Women, Children, Bike, Car
    const legacyCount = typeof raw.count === "number" ? raw.count : 0;
    fields = DEFAULT_FIELDS.map((df, idx) => ({
      id: df.id,
      name: df.name,
      count: idx === 0 ? legacyCount : 0,
    }));
  }

  return {
    id: raw.id,
    name,
    notes,
    createdAt,
    updatedAt,
    fields,
    tiles,
  };
}

/** Load all events stored locally, migrating any legacy session-keyed events */
export function getStoredEvents(): TallyEvent[] {
  let list = read<(Partial<TallyEvent> & { id: string })[]>(EVENTS_KEY, []);

  // Check if legacy user session events exist and need migration
  if (!list.length) {
    try {
      const session = typeof localStorage !== "undefined" ? localStorage.getItem(LEGACY_SESSION_KEY) : null;
      if (session) {
        const legacyEvents = read<(Partial<TallyEvent> & { id: string })[]>(`tallyo_events_${session}`, []);
        if (legacyEvents.length) {
          list = legacyEvents;
          write(EVENTS_KEY, list);
        }
      }
    } catch {}
  }

  return list.map(normalizeEvent);
}

export function saveStoredEvents(events: TallyEvent[]) {
  write(EVENTS_KEY, events);
}

export function getStoredActiveEventId(): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(ACTIVE_EVENT_KEY) : null;
  } catch {
    return null;
  }
}

export function setStoredActiveEventId(id: string | null) {
  try {
    if (typeof localStorage !== "undefined") {
      if (id) localStorage.setItem(ACTIVE_EVENT_KEY, id);
      else localStorage.removeItem(ACTIVE_EVENT_KEY);
    }
  } catch {}
}

/** Main total is sum of active field counts plus any saved milestone tiles */
export function eventTotal(e: TallyEvent): number {
  const fieldsSum = (e.fields || []).reduce((sum, f) => sum + (f.count || 0), 0);
  const tilesSum = (e.tiles || []).reduce((sum, t) => sum + (t.value || 0), 0);
  return fieldsSum + tilesSum;
}

export const canCreateEvent = (events: TallyEvent[]) => events.length < MAX_EVENTS;

export const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Formatted text report for a single event */
export function eventText(e: TallyEvent): string {
  const lines: string[] = [];
  lines.push(e.name);
  lines.push(`Timestamp: ${stamp(new Date().toISOString())}`);
  for (const f of e.fields) {
    lines.push(`${f.name}: ${f.count}`);
  }
  lines.push(`Total: ${eventTotal(e)}`);
  return lines.join("\n");
}

/** Formatted text for multiple events */
export function exportText(events: TallyEvent[]): string {
  const total = events.reduce((s, e) => s + eventTotal(e), 0);
  const body = events.map(eventText).join("\n\n" + "—".repeat(32) + "\n\n");
  return events.length > 1
    ? `${body}\n\n================================\nALL EVENTS TOTAL: ${total}\n`
    : `${body}\n`;
}

/** WhatsApp & Messaging friendly share text (Clean, readable with emojis for easy scanning) */
export function eventShareMessage(e: TallyEvent): string {
  const lines: string[] = [];
  lines.push(e.name);
  lines.push(`Timestamp: ${stamp(new Date().toISOString())}`);
  for (const f of e.fields) {
    lines.push(`${f.name}: ${f.count}`);
  }
  lines.push(`Total: ${eventTotal(e)}`);
  return lines.join("\n");
}

/** One compact row per event, with a column for each category and export timestamp. */
export function exportCsv(events: TallyEvent[]): string {
  const categoryNames = [...new Set(events.flatMap((event) => event.fields.map((field) => field.name)))];
  const rows: string[][] = [["Event", "Timestamp", ...categoryNames, "Total"]];
  const timestamp = stamp(new Date().toISOString());
  for (const ev of events) {
    rows.push([
      ev.name,
      timestamp,
      ...categoryNames.map((name) => String(ev.fields.find((field) => field.name === name)?.count ?? 0)),
      String(eventTotal(ev)),
    ]);
  }

  return rows
    .map((cols) =>
      cols
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\r\n");
}
