import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Eye, EyeOff, Minus, Plus, Moon, Sun, Download, Copy, FileText, Settings, LogOut,
  Smartphone, CalendarPlus, X, Merge, RotateCcw, Trash2, Check, Save, Pencil,
} from "lucide-react";
import {
  type Accent, type TallyEvent, type User, MAX_EVENTS, canCreateEvent, eventTotal, exportText,
  getEvents, getSession, getUsers, hashPw, saveEvents, saveUser, setSession, stamp,
} from "@/lib/tallyo";
import { strongTap } from "@/lib/haptics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tallyo — Premium People Counter" },
      { name: "description", content: "Count people at events with glowing neon controls, timestamps and instant exports." },
      { property: "og:title", content: "Tallyo — Premium People Counter" },
      { property: "og:description", content: "Count people at events with glowing neon controls, timestamps and instant exports." },
    ],
  }),
  component: Index,
});

const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: "cyan", label: "Electric Cyan", swatch: "oklch(0.86 0.15 200)" },
  { id: "lime", label: "Neon Lime", swatch: "oklch(0.88 0.22 130)" },
  { id: "pink", label: "Hot Pink", swatch: "oklch(0.68 0.26 350)" },
  { id: "amber", label: "Cyber Amber", swatch: "oklch(0.82 0.17 75)" },
];

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

function usePrefs() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [accent, setAccent] = useState<Accent>("cyan");
  useEffect(() => {
    setTheme((localStorage.getItem("tallyo_theme") as "dark" | "light") || "dark");
    setAccent((localStorage.getItem("tallyo_accent") as Accent) || "cyan");
  }, []);
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", theme === "dark");
    el.dataset["accent"] = accent;
    localStorage.setItem("tallyo_theme", theme);
    localStorage.setItem("tallyo_accent", accent);
  }, [theme, accent]);
  return { theme, setTheme, accent, setAccent };
}

function useInstall() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const isNative = typeof window !== "undefined" && ((window as any).Capacitor?.isNativePlatform?.() || (window as any).Capacitor?.platform === "android");
    setInstalled(isNative || window.matchMedia("(display-mode: standalone)").matches);
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    const done = () => { setInstalled(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", done); };
  }, []);
  const install = async () => {
    if (evt) { await evt.prompt(); setEvt(null); }
    else alert("To install Tallyo: open your browser menu and choose “Install app” or “Add to Home Screen”.");
  };
  return { installed, install };
}

function Index() {
  const prefs = usePrefs();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const s = getSession();
    if (s) setUser(getUsers()[s] ?? null);
    setReady(true);
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
      import("@capacitor/splash-screen")
        .then(({ SplashScreen }) => {
          SplashScreen.hide({ fadeOutDuration: 400 }).catch(() => {});
        })
        .catch(() => {});
    }
  }, []);
  if (!ready) return <div className="min-h-screen bg-background" />;
  return user ? (
    <Dashboard user={user} setUser={setUser} prefs={prefs} />
  ) : (
    <AuthScreen onAuth={setUser} />
  );
}

/* ---------- UI bits ---------- */
const btnNeon = "inline-flex items-center justify-center gap-2 rounded-xl bg-neon px-4 py-2.5 font-semibold text-neon-foreground glow transition hover:brightness-110 active:scale-95 disabled:opacity-50";
const btnGhost = "inline-flex items-center justify-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-medium transition hover:border-neon hover:text-neon active:scale-95";
const input = "w-full rounded-xl border bg-background px-4 py-3 outline-none transition focus:border-neon focus:ring-2 focus:ring-neon/30";

function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input className={input + " pr-12"} type={show ? "text" : "password"} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} required minLength={6} />
      <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-neon">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/icon-192.png" alt="" width={36} height={36} className="h-9 w-9 rounded-xl" />
      <span className="font-display text-xl font-bold tracking-tight">Tallyo</span>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Auth ---------- */
function AuthScreen({ onAuth }: { onAuth: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const key: string = email.trim().toLowerCase();
    const domain = key.split("@")[0] ?? key;
    const users = getUsers();
    const hash = await hashPw(pw);
    if (mode === "signup") {
      if (users[key]) return setErr("An account with this email already exists.");
      const u: User = { email: key, hash, name: name.trim() || domain };
      saveUser(u); setSession(key); onAuth(u);
    } else {
      const u = users[key];
      if (!u || u.hash !== hash) return setErr("Email or password is incorrect.");
      setSession(key); onAuth(u);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="halo pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2" />
      <form onSubmit={submit} className="relative w-full max-w-sm space-y-4 rounded-3xl border bg-card/80 p-8 backdrop-blur">
        <Logo />
        <div>
          <h1 className="text-3xl font-bold">{mode === "login" ? "Welcome back" : "Create account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Count every guest, beautifully.</p>
        </div>
        {mode === "signup" && <input className={input} placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />}
        <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <PasswordField value={pw} onChange={setPw} placeholder="Password (min 6)" />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button className={btnNeon + " w-full py-3"}>{mode === "login" ? "Log in" : "Sign up"}</button>
        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? "New here?" : "Have an account?"}{" "}
          <button type="button" className="font-semibold text-neon" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }}>
            {mode === "login" ? "Create one" : "Log in"}
          </button>
        </p>
        <p className="pt-2 text-center text-xs tracking-wider text-muted-foreground/60">Tallyo by Raven</p>
      </form>
    </div>
  );
}

/* ---------- Dashboard ---------- */
type Prefs = ReturnType<typeof usePrefs>;

function Dashboard({ user, setUser, prefs }: { user: User; setUser: (u: User | null) => void; prefs: Prefs }) {
  const [events, setEventsState] = useState<TallyEvent[]>(() => getEvents(user.email));
  const eventsRef = useRef(events);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "new" | "export" | "settings">(null);
  const [exportIds, setExportIds] = useState<string[] | null>(null);
  const [bump, setBump] = useState(0);
  const { installed, install } = useInstall();

  // Every change is written to storage synchronously, before re-render.
  const setEvents = (fn: (l: TallyEvent[]) => TallyEvent[]) => {
    const next = fn(eventsRef.current);
    eventsRef.current = next;
    saveEvents(user.email, next);
    setEventsState(next);
  };
  const active = events.find((e) => e.id === activeId) ?? null;
  const total = events.reduce((s, e) => s + eventTotal(e), 0);
  const now = () => new Date().toISOString();

  const update = (id: string, fn: (e: TallyEvent) => TallyEvent) =>
    setEvents((list) => list.map((e) => (e.id === id ? { ...fn(e), updatedAt: now() } : e)));

  const change = (d: number) => {
    if (!active) return;
    update(active.id, (e) => ({ ...e, count: Math.max(0, e.count + d) }));
    setBump((b) => b + 1);
    void strongTap();
  };
  const saveCount = () => {
    if (!active || active.count <= 0) return;
    update(active.id, (e) => ({ ...e, tiles: [...e.tiles, { id: crypto.randomUUID(), value: e.count, savedAt: now() }], count: 0 }));
  };
  const editTile = (tid: string) => {
    if (!active) return;
    const t = active.tiles.find((x) => x.id === tid);
    const v = prompt("Update this count:", String(t?.value ?? 0));
    if (v === null) return;
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n) || n < 0) return alert("Please enter a whole number of 0 or more.");
    update(active.id, (e) => ({ ...e, tiles: e.tiles.map((x) => (x.id === tid ? { ...x, value: n } : x)) }));
  };
  const deleteTile = (tid: string) => {
    if (!active || !confirm("Delete this count? It will be removed from the main total.")) return;
    update(active.id, (e) => ({ ...e, tiles: e.tiles.filter((x) => x.id !== tid) }));
  };

  const openNew = () => {
    if (!canCreateEvent(eventsRef.current)) {
      alert(`You've reached the limit of ${MAX_EVENTS} events. Please delete an existing event before creating a new one.`);
      return;
    }
    setModal("new");
  };
  const createFresh = (name: string) => {
    if (!canCreateEvent(eventsRef.current)) return openNew();
    const t = now();
    const ev: TallyEvent = { id: crypto.randomUUID(), name: name || `Event ${stamp(t)}`, createdAt: t, updatedAt: t, count: 0, tiles: [] };
    setEvents((l) => [ev, ...l]); setActiveId(ev.id); setModal(null);
  };
  const resume = (id: string) => { setActiveId(id); setModal(null); };
  const mergeInto = (targetId: string, sourceId: string) => {
    const src = eventsRef.current.find((e) => e.id === sourceId);
    if (!src || targetId === sourceId) return;
    setEvents((l) => l.filter((e) => e.id !== sourceId).map((e) => e.id === targetId
      ? { ...e, tiles: [...e.tiles, ...src.tiles], count: e.count + src.count, updatedAt: now() } : e));
    if (activeId === sourceId) setActiveId(targetId);
  };

  return (
    <div className="safe-area relative min-h-screen overflow-hidden">
      <div className="halo pointer-events-none absolute -top-60 left-1/2 h-[700px] w-[700px] -translate-x-1/2" />
      <header className="relative mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          {!installed && <button className={btnGhost} onClick={install}><Smartphone size={16} /><span className="hidden sm:inline">Install</span></button>}
          <button className={btnGhost} aria-label="Toggle theme" onClick={() => prefs.setTheme(prefs.theme === "dark" ? "light" : "dark")}>
            {prefs.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => setModal("settings")} aria-label="Settings" className="flex items-center gap-2 rounded-full border bg-card p-1 pr-3 transition hover:border-neon">
            <Avatar user={user} size={30} />
            <Settings size={16} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-5xl gap-6 px-4 pb-16 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border bg-card/80 p-6 backdrop-blur sm:p-8">
          {active ? (
            <div className="flex flex-col items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon">Event</p>
              <h1 className="mt-2 text-2xl font-bold">{active.name}</h1>
              <p className="text-sm text-muted-foreground">Started {stamp(active.createdAt)}</p>
              <div className="mt-5 rounded-2xl border border-neon/60 px-6 py-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Main total</p>
                <p className="font-display text-4xl font-bold tabular-nums text-neon">{eventTotal(active)}</p>
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current count</p>
              <div key={bump} className="font-display mb-6 mt-1 text-8xl font-bold tabular-nums text-glow animate-in zoom-in-95 duration-150 sm:text-9xl">{active.count}</div>
              <div className="flex items-center gap-6">
                <button aria-label="Remove one" onClick={() => change(-1)} className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-neon bg-card text-neon glow transition active:scale-90 sm:h-28 sm:w-28">
                  <Minus size={40} strokeWidth={2.5} />
                </button>
                <button aria-label="Add one" onClick={() => change(1)} className="flex h-32 w-32 items-center justify-center rounded-full bg-neon text-neon-foreground glow transition hover:brightness-110 active:scale-90 sm:h-36 sm:w-36">
                  <Plus size={56} strokeWidth={2.5} />
                </button>
              </div>
              <button className={btnNeon + " mt-6 px-8 py-3"} onClick={saveCount} disabled={active.count <= 0}><Save size={18} />Save Count</button>
              <p className="mt-3 text-xs text-muted-foreground">Saved automatically · Save Count adds a tile and starts a new count</p>

              <div className="mt-6 w-full text-left">
                <h3 className="mb-2 font-semibold">Saved counts ({active.tiles.length})</h3>
                {active.tiles.length === 0 ? (
                  <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">No saved counts yet.</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {active.tiles.map((t, i) => (
                      <li key={t.id} className="rounded-2xl border bg-background/60 p-3">
                        <p className="text-xs text-muted-foreground">Count {i + 1}</p>
                        <p className="font-display text-2xl font-bold tabular-nums">{t.value}</p>
                        <div className="mt-1 flex gap-3 text-muted-foreground">
                          <button aria-label="Update count" className="hover:text-neon" onClick={() => editTile(t.id)}><Pencil size={14} /></button>
                          <button aria-label="Delete count" className="hover:text-destructive" onClick={() => deleteTile(t.id)}><Trash2 size={14} /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button className={btnGhost} onClick={() => { setExportIds([active.id]); setModal("export"); }}><FileText size={16} />Export event</button>
                <button className={btnGhost} onClick={openNew}><CalendarPlus size={16} />New Event</button>
                <button className={btnGhost} onClick={() => setActiveId(null)}>Close</button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <h1 className="text-4xl font-bold">Hi, {user.name} 👋</h1>
              <p className="mt-2 max-w-sm text-muted-foreground">Start a new event to open the counter. You can keep up to {MAX_EVENTS} events.</p>
              <button className={btnNeon + " mt-8 px-8 py-4 text-lg"} onClick={openNew}><CalendarPlus size={20} />New Event</button>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label={`Events (max ${MAX_EVENTS})`} value={events.length} />
            <Stat label="Total people" value={total} />
          </div>
          <div className="rounded-3xl border bg-card/80 p-5 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Events</h2>
              <button className={btnGhost} onClick={() => { setExportIds(null); setModal("export"); }} disabled={!events.length}><FileText size={16} />Export all</button>
            </div>
            {events.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No events yet.</p>}
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className={`flex items-center justify-between gap-2 rounded-2xl border p-3 transition ${e.id === activeId ? "border-neon" : ""}`}>
                  <button className="min-w-0 flex-1 text-left" onClick={() => resume(e.id)}>
                    <p className="truncate font-semibold">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.tiles.length} counts · {stamp(e.createdAt)}</p>
                  </button>
                  <span className="font-display text-xl font-bold tabular-nums text-neon">{eventTotal(e)}</span>
                  <button aria-label="Delete event" className="text-muted-foreground hover:text-destructive" onClick={() => { if (confirm(`Delete “${e.name}”?`)) { setEvents((l) => l.filter((x) => x.id !== e.id)); if (activeId === e.id) setActiveId(null); } }}>
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>

      <footer className="relative -mt-10 pb-8 text-center text-xs tracking-wider text-muted-foreground/60">
        Tallyo by Raven
      </footer>

      {modal === "new" && <NewEventModal events={events} onClose={() => setModal(null)} onFresh={createFresh} onResume={resume} onMerge={mergeInto} activeId={activeId} />}
      {modal === "export" && <ExportModal events={exportIds ? events.filter((e) => exportIds.includes(e.id)) : events} onClose={() => setModal(null)} />}
      {modal === "settings" && (
        <SettingsModal user={user} setUser={setUser} prefs={prefs} onClose={() => setModal(null)} installed={installed} install={install} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border bg-card/80 p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Avatar({ user, size }: { user: User; size: number }) {
  return user.avatar ? (
    <img src={user.avatar} alt="" width={size} height={size} style={{ width: size, height: size }} className="rounded-full object-cover" />
  ) : (
    <span style={{ width: size, height: size, fontSize: size * 0.42 }} className="flex items-center justify-center rounded-full bg-neon font-bold text-neon-foreground">
      {user.name.charAt(0).toUpperCase()}
    </span>
  );
}

function NewEventModal({ events, onClose, onFresh, onResume, onMerge, activeId }: {
  events: TallyEvent[]; onClose: () => void; onFresh: (n: string) => void; onResume: (id: string) => void;
  onMerge: (t: string, s: string) => void; activeId: string | null;
}) {
  const [name, setName] = useState("");
  const [mergeSrc, setMergeSrc] = useState(activeId ?? "");
  const [mergeTgt, setMergeTgt] = useState("");
  return (
    <Modal title="New Event" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onFresh(name.trim()); }} className="space-y-3">
        <p className="text-sm text-muted-foreground">Start fresh — stamped {stamp(new Date().toISOString())}</p>
        <input className={input} placeholder="Event name (optional)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <button className={btnNeon + " w-full"}><RotateCcw size={16} />Start fresh count</button>
      </form>
      {events.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 font-semibold">Add to a previous event</h3>
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {events.map((e) => (
              <li key={e.id}>
                <button onClick={() => onResume(e.id)} className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition hover:border-neon">
                  <span className="min-w-0"><span className="block truncate font-medium">{e.name}</span><span className="text-xs text-muted-foreground">{stamp(e.createdAt)}</span></span>
                  <span className="font-display font-bold text-neon">{eventTotal(e)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {events.length > 1 && (
        <>
          <h3 className="mb-2 mt-6 font-semibold">Merge two events</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <select className={input} value={mergeSrc} onChange={(e) => setMergeSrc(e.target.value)}>
              <option value="">Merge this…</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name} ({eventTotal(e)})</option>)}
            </select>
            <select className={input} value={mergeTgt} onChange={(e) => setMergeTgt(e.target.value)}>
              <option value="">…into this</option>
              {events.filter((e) => e.id !== mergeSrc).map((e) => <option key={e.id} value={e.id}>{e.name} ({eventTotal(e)})</option>)}
            </select>
          </div>
          <button className={btnGhost + " mt-2 w-full"} disabled={!mergeSrc || !mergeTgt} onClick={() => { onMerge(mergeTgt, mergeSrc); onResume(mergeTgt); }}>
            <Merge size={16} />Merge & open
          </button>
        </>
      )}
    </Modal>
  );
}

function ExportModal({ events, onClose }: { events: TallyEvent[]; onClose: () => void }) {
  const text = exportText(events);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  const download = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        const file = new File([text], `tallyo-${new Date().toISOString().slice(0, 10)}.txt`, { type: "text/plain" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Tallyo Export",
          });
          return;
        }
        await navigator.share({
          title: "Tallyo Export",
          text: text,
        });
        return;
      } catch {
        // Fall back to standard download
      }
    }
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = `tallyo-${new Date().toISOString().slice(0, 10)}.txt`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Modal title="Export" onClose={onClose}>
      <div className="mb-3 rounded-2xl border-2 border-primary bg-background p-4 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-foreground">{events.length > 1 ? "All events total" : "Main total"}</p>
        <p className="font-display text-7xl font-black leading-none text-foreground">{events.reduce((s, e) => s + eventTotal(e), 0)}</p>
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border bg-background p-4 font-mono text-sm text-foreground">{text}</pre>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className={btnNeon} onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied!" : "Copy Raw"}</button>
        <button className={btnGhost} onClick={download}><Download size={16} />Download .txt</button>
      </div>
    </Modal>
  );
}

function SettingsModal({ user, setUser, prefs, onClose, installed, install }: {
  user: User; setUser: (u: User | null) => void; prefs: Prefs; onClose: () => void; installed: boolean; install: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const persist = (u: User) => { saveUser(u); setUser(u); };
  const onFile = (f?: File) => {
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const s = Math.min(img.width, img.height);
      c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
      persist({ ...user, avatar: c.toDataURL("image/jpeg", 0.85) });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };
  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((await hashPw(cur)) !== user.hash) return setMsg("Current password is incorrect.");
    persist({ ...user, hash: await hashPw(next) }); setCur(""); setNext(""); setMsg("Password updated ✓");
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="flex items-center gap-4">
        <button onClick={() => fileRef.current?.click()} className="rounded-full ring-2 ring-neon/50 transition hover:ring-neon" aria-label="Change profile picture">
          <Avatar user={user} size={72} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex-1 space-y-2">
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && persist({ ...user, name: name.trim() })} aria-label="Display name" />
          <p className="text-xs text-muted-foreground">{user.email} · tap photo to change</p>
        </div>
      </div>

      <h3 className="mb-2 mt-6 font-semibold">Appearance</h3>
      <div className="grid grid-cols-2 gap-2">
        {(["dark", "light"] as const).map((t) => (
          <button key={t} onClick={() => prefs.setTheme(t)} className={`${btnGhost} ${prefs.theme === t ? "border-neon text-neon" : ""}`}>
            {t === "dark" ? <Moon size={16} /> : <Sun size={16} />}{t === "dark" ? "Dark" : "Light"}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {ACCENTS.map((a) => (
          <button key={a.id} onClick={() => prefs.setAccent(a.id)} className={`${btnGhost} justify-start ${prefs.accent === a.id ? "border-neon" : ""}`}>
            <span className="h-4 w-4 rounded-full" style={{ background: a.swatch, boxShadow: `0 0 12px ${a.swatch}` }} />{a.label}
          </button>
        ))}
      </div>

      <h3 className="mb-2 mt-6 font-semibold">Change password</h3>
      <form onSubmit={changePw} className="space-y-2">
        <PasswordField value={cur} onChange={setCur} placeholder="Current password" />
        <PasswordField value={next} onChange={setNext} placeholder="New password" />
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <button className={btnGhost + " w-full"}>Update password</button>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button className={btnNeon} onClick={install} disabled={installed}><Smartphone size={16} />{installed ? "Installed" : "Install app"}</button>
        <button className={btnGhost} onClick={() => { setSession(null); setUser(null); }}><LogOut size={16} />Log out</button>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground/70">Built by Raven</p>
    </Modal>
  );
}
