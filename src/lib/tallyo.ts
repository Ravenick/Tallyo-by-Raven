export type User = { email: string; hash: string; name: string; avatar?: string };
export type Tile = { id: string; value: number; savedAt: string };
export type TallyEvent = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** The active (unsaved) counter. */
  count: number;
  /** Saved counts; the main total is their sum. */
  tiles: Tile[];
};
export type Accent = "cyan" | "lime" | "pink" | "amber";

export const MAX_EVENTS = 10;

const USERS = "tallyo_users";
const SESSION = "tallyo_session";
const eventsKey = (e: string) => `tallyo_events_${e}`;

const read = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

export async function hashPw(pw: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("tallyo:" + pw));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const getUsers = () => read<Record<string, User>>(USERS, {});
export const saveUser = (u: User) => write(USERS, { ...getUsers(), [u.email]: u });
export const getSession = () => localStorage.getItem(SESSION);
export const setSession = (e: string | null) =>
  e ? localStorage.setItem(SESSION, e) : localStorage.removeItem(SESSION);

/** Upgrades events saved by older versions (count only, no tiles). */
export function normalizeEvent(raw: Partial<TallyEvent> & { id: string }): TallyEvent {
  const now = new Date().toISOString();
  const updatedAt = raw.updatedAt ?? now;
  if (Array.isArray(raw.tiles)) {
    return { name: "Event", createdAt: updatedAt, ...raw, updatedAt, count: raw.count ?? 0, tiles: raw.tiles } as TallyEvent;
  }
  const legacy = raw.count ?? 0;
  return {
    id: raw.id,
    name: raw.name ?? "Event",
    createdAt: raw.createdAt ?? updatedAt,
    updatedAt,
    count: 0,
    tiles: legacy > 0 ? [{ id: crypto.randomUUID(), value: legacy, savedAt: updatedAt }] : [],
  };
}

export const getEvents = (e: string) =>
  read<(Partial<TallyEvent> & { id: string })[]>(eventsKey(e), []).map(normalizeEvent);
export const saveEvents = (e: string, ev: TallyEvent[]) => write(eventsKey(e), ev);

export const eventTotal = (e: TallyEvent) => e.tiles.reduce((s, t) => s + t.value, 0);
export const canCreateEvent = (events: TallyEvent[]) => events.length < MAX_EVENTS;

export const stamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function eventText(e: TallyEvent) {
  const lines = e.tiles.map((t, i) => `  Count ${i + 1}: ${t.value}`);
  const last = e.tiles.at(-1);
  return [
    e.name,
    ...(lines.length ? lines : ["  (no saved counts)"]),
    `  Last count recorded: ${last ? stamp(last.savedAt) : "—"}`,
    `  MAIN TOTAL: ${eventTotal(e)} (as of ${stamp(e.updatedAt)})`,
  ].join("\n");
}

export function exportText(events: TallyEvent[]) {
  const total = events.reduce((s, e) => s + eventTotal(e), 0);
  const body = events.map(eventText).join("\n\n");
  return events.length > 1 ? `${body}\n\nALL EVENTS TOTAL: ${total}\n` : `${body}\n`;
}
