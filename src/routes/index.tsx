import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Plus,
  Minus,
  RotateCcw,
  Pencil,
  Trash2,
  Check,
  Copy,
  Download,
  Share2,
  MessageSquare,
  FileText,
  Table,
  Settings,
  Sun,
  Moon,
  Smartphone,
  CalendarPlus,
  X,
  User as UserIcon,
} from "lucide-react";
import {
  type Accent,
  type CounterField,
  type Profile,
  type TallyEvent,
  DEFAULT_FIELDS,
  MAX_EVENTS,
  canCreateEvent,
  eventShareMessage,
  eventText,
  eventTotal,
  exportCsv,
  exportText,
  getProfile,
  getStoredActiveEventId,
  getStoredEvents,
  saveProfile,
  saveStoredEvents,
  setStoredActiveEventId,
  stamp,
} from "@/lib/tallyo";
import { lightTap, strongTap } from "@/lib/haptics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tallyo — Premium People Counter" },
      {
        name: "description",
        content:
          "Count people, vehicles, and attendees with glowing neon controls, timestamps, instant exports, and WhatsApp sharing.",
      },
      { property: "og:title", content: "Tallyo — Premium People Counter" },
      {
        property: "og:description",
        content:
          "Count people, vehicles, and attendees with glowing neon controls, timestamps, instant exports, and WhatsApp sharing.",
      },
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
    const isNative =
      typeof window !== "undefined" &&
      ((window as any).Capacitor?.isNativePlatform?.() ||
        (window as any).Capacitor?.platform === "android");
    setInstalled(isNative || window.matchMedia("(display-mode: standalone)").matches);

    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    const done = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", h);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  const install = async () => {
    if (evt) {
      await evt.prompt();
      setEvt(null);
    } else {
      alert("To install Tallyo: open your browser menu and choose “Install app” or “Add to Home Screen”.");
    }
  };

  return { installed, install };
}

function Index() {
  const prefs = usePrefs();
  const [ready, setReady] = useState(false);
  const [profile, setProfileState] = useState<Profile>(() => getProfile());

  useEffect(() => {
    setReady(true);
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
      import("@capacitor/splash-screen")
        .then(({ SplashScreen }) => {
          SplashScreen.hide({ fadeOutDuration: 400 }).catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  const updateProfile = (p: Profile) => {
    saveProfile(p);
    setProfileState(p);
  };

  if (!ready) return <div className="min-h-screen bg-background" />;

  return <Dashboard profile={profile} onUpdateProfile={updateProfile} prefs={prefs} />;
}

/* ---------- Shared UI Styles ---------- */
const btnNeon =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-neon px-5 py-3 font-bold text-neon-foreground glow transition hover:brightness-110 active:scale-95 disabled:opacity-50 text-base shadow-lg";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-2xl border bg-card px-4 py-2.5 text-sm font-semibold transition hover:border-neon hover:text-neon active:scale-95";
const input =
  "w-full rounded-2xl border bg-background px-4 py-3 outline-none transition focus:border-neon focus:ring-2 focus:ring-neon/30 text-base";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/icon-192.png" alt="" width={38} height={38} className="h-9 w-9 rounded-xl shadow-md" />
      <div>
        <span className="font-display text-xl font-extrabold tracking-tight">Tallyo</span>
        <span className="block text-[10px] uppercase font-bold tracking-widest text-neon -mt-1">
          by Raven
        </span>
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-3 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border bg-card p-6 shadow-2xl animate-in fade-in-90 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between border-b pb-3">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-background hover:text-foreground transition"
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Dashboard ---------- */
type Prefs = ReturnType<typeof usePrefs>;

function Dashboard({
  profile,
  onUpdateProfile,
  prefs,
}: {
  profile: Profile;
  onUpdateProfile: (p: Profile) => void;
  prefs: Prefs;
}) {
  const [events, setEventsState] = useState<TallyEvent[]>(() => {
    const list = getStoredEvents();
    if (list.length > 0) return list;
    // Auto-create initial default event so the usher is immediately ready
    const now = new Date().toISOString();
    const initial: TallyEvent = {
      id: crypto.randomUUID(),
      name: `Event - ${stamp(now)}`,
      notes: "Front Entrance",
      createdAt: now,
      updatedAt: now,
      fields: DEFAULT_FIELDS.map((f) => ({ ...f, count: 0 })),
      tiles: [],
    };
    saveStoredEvents([initial]);
    return [initial];
  });

  const eventsRef = useRef(events);
  const [activeId, setActiveId] = useState<string | null>(() => {
    const stored = getStoredActiveEventId();
    if (stored && events.some((e) => e.id === stored)) return stored;
    return events[0]?.id ?? null;
  });

  const [activeFieldId, setActiveFieldId] = useState<string>("men");
  const [stepSize, setStepSize] = useState<number>(1);
  const [bump, setBump] = useState<number>(0);

  // Modals
  const [modal, setModal] = useState<
    null | "new" | "edit-event" | "addField" | "editDirect" | "export" | "settings"
  >(null);
  const [exportTargetIds, setExportTargetIds] = useState<string[] | null>(null);

  const { installed, install } = useInstall();

  const setEvents = (fn: (list: TallyEvent[]) => TallyEvent[]) => {
    const next = fn(eventsRef.current);
    eventsRef.current = next;
    saveStoredEvents(next);
    setEventsState(next);
  };

  const active = events.find((e) => e.id === activeId) ?? null;
  const activeField = active?.fields.find((f) => f.id === activeFieldId) ?? active?.fields[0] ?? null;

  // Ensure activeFieldId always points to a valid field
  useEffect(() => {
    if (active && (!activeField || !active.fields.some((f) => f.id === activeFieldId))) {
      if (active.fields.length > 0) {
        setActiveFieldId(active.fields[0].id);
      }
    }
  }, [active, activeFieldId, activeField]);

  // Persist active event id selection
  useEffect(() => {
    setStoredActiveEventId(activeId);
  }, [activeId]);

  const nowIso = () => new Date().toISOString();

  // Hardware / Bluetooth / Volume Keys listener for counting without looking at screen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "+" || e.key === "=" || e.key === "ArrowUp" || e.code === "VolumeUp") {
        e.preventDefault();
        changeCount(stepSize);
      } else if (
        e.key === "-" ||
        e.key === "_" ||
        e.key === "ArrowDown" ||
        e.code === "VolumeDown"
      ) {
        e.preventDefault();
        changeCount(-stepSize);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const changeCount = (delta: number, targetFieldId?: string) => {
    if (!active) return;
    const fid = targetFieldId || activeField?.id;
    if (!fid) return;

    setEvents((list) =>
      list.map((ev) => {
        if (ev.id !== active.id) return ev;
        return {
          ...ev,
          updatedAt: nowIso(),
          fields: ev.fields.map((f) => {
            if (f.id !== fid) return f;
            const nextVal = Math.max(0, f.count + delta);
            return { ...f, count: nextVal };
          }),
        };
      })
    );

    setBump((b) => b + 1);
    void strongTap();
  };

  const setExactCount = (targetFieldId: string, value: number) => {
    if (!active) return;
    setEvents((list) =>
      list.map((ev) => {
        if (ev.id !== active.id) return ev;
        return {
          ...ev,
          updatedAt: nowIso(),
          fields: ev.fields.map((f) => (f.id === targetFieldId ? { ...f, count: value } : f)),
        };
      })
    );
    void strongTap();
  };

  const addCustomField = (name: string) => {
    if (!active || !name.trim()) return;
    const newField: CounterField = {
      id: crypto.randomUUID(),
      name: name.trim(),
      count: 0,
    };
    setEvents((list) =>
      list.map((ev) =>
        ev.id === active.id
          ? { ...ev, fields: [...ev.fields, newField], updatedAt: nowIso() }
          : ev
      )
    );
    setActiveFieldId(newField.id);
    void lightTap();
  };

  const removeField = (fieldId: string) => {
    if (!active) return;
    if (active.fields.length <= 1) {
      alert("An event must have at least one category.");
      return;
    }
    const target = active.fields.find((f) => f.id === fieldId);
    if (!confirm(`Delete category "${target?.name}"?`)) return;

    setEvents((list) =>
      list.map((ev) =>
        ev.id === active.id
          ? { ...ev, fields: ev.fields.filter((f) => f.id !== fieldId), updatedAt: nowIso() }
          : ev
      )
    );
  };

  const createEvent = (name: string, notes?: string) => {
    if (!canCreateEvent(eventsRef.current)) {
      alert(`Limit of ${MAX_EVENTS} events reached. Please delete an older event first.`);
      return;
    }
    const t = nowIso();
    const ev: TallyEvent = {
      id: crypto.randomUUID(),
      name: name || `Event ${stamp(t)}`,
      notes: notes || "",
      createdAt: t,
      updatedAt: t,
      fields: DEFAULT_FIELDS.map((df) => ({ ...df, count: 0 })),
      tiles: [],
    };
    setEvents((l) => [ev, ...l]);
    setActiveId(ev.id);
    setModal(null);
  };

  const updateEventDetails = (name: string, notes: string) => {
    if (!active) return;
    setEvents((list) =>
      list.map((e) =>
        e.id === active.id ? { ...e, name: name.trim() || e.name, notes: notes.trim(), updatedAt: nowIso() } : e
      )
    );
    setModal(null);
  };

  const totalAllPeople = events.reduce((s, e) => s + eventTotal(e), 0);

  return (
    <div className="safe-area relative min-h-screen overflow-x-clip selection:bg-neon selection:text-neon-foreground">
      <div className="halo pointer-events-none absolute -top-52 left-1/2 h-[720px] w-[720px] -translate-x-1/2" />

      {/* Top Header */}
      <header className="relative mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4">
        <div className="min-w-0 shrink-0"><Logo /></div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {!installed && (
            <button
              className={btnGhost + " px-3 py-2.5 sm:px-4"}
              onClick={install}
              title="Install app for quick offline access"
            >
              <Smartphone size={16} />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          <button
            className={btnGhost + " px-3 py-2.5 sm:px-4"}
            aria-label="Toggle theme"
            onClick={() => prefs.setTheme(prefs.theme === "dark" ? "light" : "dark")}
          >
            {prefs.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            onClick={() => setModal("settings")}
            aria-label="Profile and Settings"
            className="flex items-center gap-2 rounded-full border bg-card p-1 pr-3 transition hover:border-neon"
          >
            <Avatar profile={profile} size={32} />
            <span className="hidden text-sm font-semibold sm:inline">{profile.name}</span>
            <Settings size={16} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="relative mx-auto grid min-w-0 max-w-5xl gap-4 px-3 pb-16 sm:gap-6 sm:px-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Counter Section */}
        <section className="min-w-0 rounded-3xl border bg-card/85 p-4 backdrop-blur-md shadow-xl sm:p-7">
          {active ? (
            <div className="flex flex-col">
              {/* Event Name & Actions */}
              <div className="flex min-w-0 flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-neon/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-neon">
                      Active Event
                    </span>
                    <button
                      onClick={() => setModal("edit-event")}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold text-muted-foreground hover:bg-background hover:text-foreground transition"
                      title="Rename event or add notes"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                  </div>
                  <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                    {active.name}
                  </h1>
                  {active.notes ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{active.notes}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    Started {stamp(active.createdAt)}
                  </p>
                </div>

                {/* Grand Total Badge */}
                <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border-2 border-neon/50 bg-background/80 px-3 py-2 text-right shadow-inner sm:block sm:px-4 sm:py-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Total Count
                  </p>
                  <p className="font-display text-2xl font-extrabold tabular-nums text-neon sm:text-4xl">
                    {eventTotal(active)}
                  </p>
                </div>
              </div>

              {/* Category Pills (Men, Women, Children, Bike, Car, + Custom) */}
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Select Category
                  </span>
                  <button
                    onClick={() => setModal("addField")}
                    className="inline-flex items-center gap-1 text-xs font-bold text-neon hover:underline"
                  >
                    <Plus size={14} /> Add Category
                  </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {active.fields.map((f) => {
                    const isSelected = f.id === activeField?.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          setActiveFieldId(f.id);
                          void lightTap();
                        }}
                        className={`flex min-w-[100px] flex-col items-start rounded-2xl border px-3.5 py-2.5 text-left transition shrink-0 ${
                          isSelected
                            ? "border-neon bg-neon/10 glow ring-1 ring-neon"
                            : "bg-background hover:border-neon/50"
                        }`}
                      >
                        <span className="text-xs font-semibold text-muted-foreground">
                          {f.name}
                        </span>
                        <span className="font-display text-2xl font-extrabold tabular-nums text-foreground">
                          {f.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Counting Area */}
              {activeField && (
                <div className="my-5 flex min-w-0 flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-background/50 px-3 py-5 text-center sm:px-4 sm:py-6">
                  <div className="flex items-center gap-2">
                    <span className="max-w-full break-words text-xs font-extrabold uppercase tracking-widest text-neon sm:text-sm">
                      Counting: {activeField.name}
                    </span>
                  </div>

                  {/* Big Number - Clickable to direct edit */}
                  <button
                    onClick={() => setModal("editDirect")}
                    className="group my-2 flex flex-col items-center focus:outline-none"
                    title="Tap number to type exact count"
                  >
                    <div
                      key={bump}
                      className="max-w-full break-all font-display text-6xl font-black tabular-nums text-glow duration-150 animate-in zoom-in-95 sm:text-8xl lg:text-9xl group-hover:scale-105 transition"
                    >
                      {activeField.count}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground/70 group-hover:text-neon transition">
                      Tap number to edit directly ✏️
                    </span>
                  </button>

                  {/* Step Selector Chips (+1, +5, +10) */}
                  <div className="mb-6 mt-1 flex items-center gap-2 rounded-xl bg-card border p-1">
                    <span className="px-2 text-xs font-semibold text-muted-foreground">Step:</span>
                    {[1, 5, 10].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setStepSize(s);
                          void lightTap();
                        }}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                          stepSize === s
                            ? "bg-neon text-neon-foreground shadow"
                            : "hover:bg-background text-foreground"
                        }`}
                      >
                        +{s}
                      </button>
                    ))}
                  </div>

                  {/* Giant Touch Buttons: Minus & Plus with Heavy Haptics */}
                  <div className="flex w-full items-center justify-center gap-4 sm:gap-8">
                    <button
                      aria-label={`Subtract ${stepSize} from ${activeField.name}`}
                      onClick={() => changeCount(-stepSize)}
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border-2 border-neon bg-card text-neon glow transition active:scale-90 hover:brightness-110 sm:h-28 sm:w-28 shadow-lg"
                    >
                      <Minus size={42} strokeWidth={3} />
                    </button>

                    <button
                      aria-label={`Add ${stepSize} to ${activeField.name}`}
                      onClick={() => changeCount(stepSize)}
                      className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-neon text-neon-foreground glow transition active:scale-90 hover:brightness-110 sm:h-36 sm:w-36 shadow-2xl"
                    >
                      <Plus size={64} strokeWidth={3.5} />
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Steppers on Every Category Row (Super convenient for usher at the door) */}
              <div className="mt-2">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quick Stepper for All Categories
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {active.fields.map((f) => (
                    <div
                      key={f.id}
                      className={`flex items-center justify-between rounded-2xl border p-3 bg-background/80 transition ${
                        f.id === activeField?.id ? "border-neon/60 ring-1 ring-neon/40" : ""
                      }`}
                    >
                      <div
                        className="min-w-0 cursor-pointer flex-1"
                        onClick={() => {
                          setActiveFieldId(f.id);
                          void lightTap();
                        }}
                      >
                        <p className="truncate text-sm font-bold text-foreground">{f.name}</p>
                        <p className="font-display text-xl font-black tabular-nums text-neon">
                          {f.count}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => changeCount(-1, f.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card text-muted-foreground hover:border-neon hover:text-neon active:scale-90 transition"
                          aria-label={`Minus one ${f.name}`}
                        >
                          <Minus size={16} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => changeCount(1, f.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon text-neon-foreground font-bold active:scale-90 hover:brightness-110 transition shadow"
                          aria-label={`Add one ${f.name}`}
                        >
                          <Plus size={18} strokeWidth={2.5} />
                        </button>
                        {active.fields.length > 1 && (
                          <button
                            onClick={() => removeField(f.id)}
                            className="p-1.5 text-muted-foreground/50 hover:text-destructive transition"
                            title={`Remove category ${f.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event Bottom Actions */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    className={btnNeon}
                    onClick={() => {
                      setExportTargetIds([active.id]);
                      setModal("export");
                    }}
                  >
                    <Share2 size={18} /> Share & Export
                  </button>

                  <button
                    className={btnGhost}
                    onClick={() => {
                      if (
                        confirm(
                          `Reset all counts in "${active.name}" to 0? This cannot be undone.`
                        )
                      ) {
                        setEvents((list) =>
                          list.map((e) =>
                            e.id === active.id
                              ? {
                                  ...e,
                                  fields: e.fields.map((f) => ({ ...f, count: 0 })),
                                  updatedAt: nowIso(),
                                }
                              : e
                          )
                        );
                        void strongTap();
                      }
                    }}
                  >
                    <RotateCcw size={16} /> Reset Counts
                  </button>
                </div>

                <button
                  className={btnGhost}
                  onClick={() => {
                    if (canCreateEvent(events)) setModal("new");
                    else
                      alert(
                        `You have reached the maximum of ${MAX_EVENTS} events. Please delete an older event.`
                      );
                  }}
                >
                  <CalendarPlus size={16} /> New Event
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-extrabold tracking-tight">No Active Event</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Create a new event to start counting attendees and vehicles.
              </p>
              <button className={btnNeon + " mt-6 px-8 py-4 text-lg"} onClick={() => setModal("new")}>
                <CalendarPlus size={20} /> Create New Event
              </button>
            </div>
          )}
        </section>

        {/* Sidebar: Events List & Global Stats */}
        <aside className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="All Events" value={events.length} />
            <StatCard label="Total Counted" value={totalAllPeople} />
          </div>

          <div className="min-w-0 rounded-3xl border bg-card/85 p-4 backdrop-blur-md shadow-xl sm:p-5">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-base font-bold">Saved Events</h2>
              <button
                className={btnGhost + " text-xs py-1.5 px-3"}
                onClick={() => {
                  setExportTargetIds(null);
                  setModal("export");
                }}
                disabled={!events.length}
              >
                <FileText size={14} /> Export All
              </button>
            </div>

            {events.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No events found.</p>
            )}

            <ul className="space-y-2.5">
              {events.map((e) => {
                const isActive = e.id === activeId;
                return (
                  <li
                    key={e.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition ${
                      isActive ? "border-neon bg-neon/5 ring-1 ring-neon" : "hover:border-neon/40"
                    }`}
                  >
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setActiveId(e.id);
                        void lightTap();
                      }}
                    >
                      <p className="truncate text-sm font-bold text-foreground">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.fields.length} categories · {stamp(e.createdAt)}
                      </p>
                    </button>

                    <div className="flex items-center gap-3">
                      <span className="font-display text-xl font-extrabold tabular-nums text-neon">
                        {eventTotal(e)}
                      </span>
                      <button
                        aria-label={`Delete event ${e.name}`}
                        className="text-muted-foreground hover:text-destructive transition p-1"
                        onClick={() => {
                          if (confirm(`Delete "${e.name}"? This cannot be undone.`)) {
                            setEvents((l) => l.filter((x) => x.id !== e.id));
                            if (activeId === e.id) {
                              const remaining = events.filter((x) => x.id !== e.id);
                              setActiveId(remaining[0]?.id ?? null);
                            }
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="relative -mt-8 pb-8 text-center text-xs tracking-wider text-muted-foreground/60">
        Tallyo by Raven — Simple, Fast & Offline-First
      </footer>

      {/* Modals */}
      {modal === "new" && (
        <NewEventModal
          onClose={() => setModal(null)}
          onCreate={createEvent}
        />
      )}

      {modal === "edit-event" && active && (
        <EditEventModal
          event={active}
          onClose={() => setModal(null)}
          onSave={updateEventDetails}
        />
      )}

      {modal === "addField" && (
        <AddFieldModal
          onClose={() => setModal(null)}
          onAdd={addCustomField}
        />
      )}

      {modal === "editDirect" && activeField && (
        <EditDirectCountModal
          fieldName={activeField.name}
          currentCount={activeField.count}
          onClose={() => setModal(null)}
          onSave={(v) => {
            setExactCount(activeField.id, v);
            setModal(null);
          }}
        />
      )}

      {modal === "export" && (
        <ExportAndShareModal
          events={
            exportTargetIds
              ? events.filter((e) => exportTargetIds.includes(e.id))
              : events
          }
          onClose={() => setModal(null)}
        />
      )}

      {modal === "settings" && (
        <SettingsModal
          profile={profile}
          onUpdateProfile={onUpdateProfile}
          prefs={prefs}
          installed={installed}
          install={install}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ---------- Subcomponents & Modals ---------- */

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border bg-card/85 p-4 backdrop-blur shadow-md">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-3xl font-extrabold tabular-nums text-foreground mt-0.5">
        {value}
      </p>
    </div>
  );
}

function Avatar({ profile, size }: { profile: Profile; size: number }) {
  if (profile.avatar) {
    return (
      <img
        src={profile.avatar}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-full object-cover shadow"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      className="flex items-center justify-center rounded-full bg-neon font-black text-neon-foreground shadow"
    >
      {profile.name.charAt(0).toUpperCase() || "U"}
    </span>
  );
}

function NewEventModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, notes: string) => void;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Modal title="Create New Event" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(name.trim(), notes.trim());
        }}
        className="space-y-4"
      >
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Event Name
          </label>
          <input
            className={input}
            placeholder="e.g. Sunday Morning Service, Wedding, Gate 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Notes / Location (Optional)
          </label>
          <input
            className={input}
            placeholder="e.g. Main entrance, Usher Team A"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Default categories (Men, Women, Children, Bike, Car) will be included automatically.
        </p>

        <button type="submit" className={btnNeon + " w-full mt-2"}>
          <CalendarPlus size={18} /> Start Event
        </button>
      </form>
    </Modal>
  );
}

function EditEventModal({
  event,
  onClose,
  onSave,
}: {
  event: TallyEvent;
  onClose: () => void;
  onSave: (name: string, notes: string) => void;
}) {
  const [name, setName] = useState(event.name);
  const [notes, setNotes] = useState(event.notes || "");

  return (
    <Modal title="Edit Event Details" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(name, notes);
        }}
        className="space-y-4"
      >
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Event Name
          </label>
          <input
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Notes / Location
          </label>
          <input
            className={input}
            placeholder="e.g. Main Entrance, Morning Session"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button type="submit" className={btnNeon + " w-full mt-2"}>
          <Check size={18} /> Save Changes
        </button>
      </form>
    </Modal>
  );
}

function AddFieldModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <Modal title="Add New Category" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            onAdd(name);
            onClose();
          }
        }}
        className="space-y-4"
      >
        <p className="text-sm text-muted-foreground">
          Create an additional counter field (e.g. VIP, Staff, Buses, Volunteers).
        </p>
        <input
          className={input}
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
        <button type="submit" className={btnNeon + " w-full mt-2"}>
          <Plus size={18} /> Add Category
        </button>
      </form>
    </Modal>
  );
}

function EditDirectCountModal({
  fieldName,
  currentCount,
  onClose,
  onSave,
}: {
  fieldName: string;
  currentCount: number;
  onClose: () => void;
  onSave: (val: number) => void;
}) {
  const [val, setVal] = useState(String(currentCount));

  return (
    <Modal title={`Set Count for ${fieldName}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const n = Math.floor(Number(val));
          if (isNaN(n) || n < 0) {
            alert("Please enter a valid number (0 or higher).");
            return;
          }
          onSave(n);
        }}
        className="space-y-4"
      >
        <p className="text-sm text-muted-foreground">
          Type the exact count directly for {fieldName}:
        </p>
        <input
          className={input + " text-2xl font-bold font-display text-center"}
          type="number"
          min="0"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
        />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={btnNeon}>
            <Check size={18} /> Update
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ExportAndShareModal({
  events,
  onClose,
}: {
  events: TallyEvent[];
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"txt" | "csv">("txt");
  const [copied, setCopied] = useState(false);

  const isSingle = events.length === 1;
  const singleEvent = isSingle ? events[0] : null;

  const rawText = exportText(events);
  const rawCsv = exportCsv(events);

  // WhatsApp formatted share text
  const shareText = singleEvent
    ? eventShareMessage(singleEvent)
    : `📊 *TALLYO SUMMARY REPORT*\n\n${rawText}\n— Sent via Tallyo by Raven`;

  const copyText = async () => {
    const textToCopy = mode === "txt" ? shareText : rawCsv;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement("textarea");
        ta.value = textToCopy;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Unable to copy to clipboard.");
    }
  };

  const shareViaWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const shareNative = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Tallyo Count Report",
          text: shareText,
        });
        return;
      } catch {
        // Fall back to whatsapp or copy
      }
    }
    shareViaWhatsApp();
  };

  const downloadFile = () => {
    const isCsv = mode === "csv";
    const content = isCsv ? rawCsv : rawText;
    const ext = isCsv ? "csv" : "txt";
    const mime = isCsv ? "text/csv;charset=utf-8;" : "text/plain;charset=utf-8;";

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tallyo-report-${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCount = events.reduce((s, e) => s + eventTotal(e), 0);

  return (
    <Modal title="Share & Export Report" onClose={onClose}>
      {/* Total Banner */}
      <div className="mb-4 rounded-2xl border-2 border-neon bg-neon/10 p-4 text-center shadow-inner">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {events.length > 1 ? "All Events Total" : "Grand Total"}
        </p>
        <p className="font-display text-5xl font-black text-neon tabular-nums">
          {totalCount}
        </p>
      </div>

      {/* Format Selector: TXT vs CSV */}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border bg-background p-1">
        <button
          onClick={() => setMode("txt")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition ${
            mode === "txt"
              ? "bg-card text-foreground shadow border border-neon/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText size={16} /> Text (WhatsApp)
        </button>
        <button
          onClick={() => setMode("csv")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition ${
            mode === "csv"
              ? "bg-card text-foreground shadow border border-neon/40"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Table size={16} /> Spreadsheet (CSV)
        </button>
      </div>

      {/* Formatted Preview Box */}
      <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-2xl border bg-background/80 p-4 font-mono text-xs text-foreground leading-relaxed">
        {mode === "txt" ? shareText : rawCsv}
      </pre>

      {/* Share Actions - Big and accessible */}
      <div className="mt-5 space-y-2.5">
        <button
          className={
            btnNeon +
            " w-full py-3.5 text-base bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30"
          }
          onClick={shareNative}
        >
          <MessageSquare size={19} />
          <span>Share to WhatsApp / Messages</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button className={btnGhost} onClick={copyText}>
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span>{copied ? "Copied!" : "Copy Report"}</span>
          </button>

          <button className={btnGhost} onClick={downloadFile}>
            <Download size={16} />
            <span>Download .{mode}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SettingsModal({
  profile,
  onUpdateProfile,
  prefs,
  installed,
  install,
  onClose,
}: {
  profile: Profile;
  onUpdateProfile: (p: Profile) => void;
  prefs: Prefs;
  installed: boolean;
  install: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const fileRef = useRef<HTMLInputElement>(null);

  const onAvatarFile = (f?: File) => {
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const s = Math.min(img.width, img.height);
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
        onUpdateProfile({ ...profile, avatar: c.toDataURL("image/jpeg", 0.85) });
      }
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };

  return (
    <Modal title="Profile & Preferences" onClose={onClose}>
      {/* Profile info: Photo & Name */}
      <div className="flex items-center gap-4 border-b pb-5">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-full ring-2 ring-neon/60 transition hover:ring-neon p-0.5"
          title="Tap to change photo"
        >
          <Avatar profile={profile} size={70} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onAvatarFile(e.target.files?.[0])}
        />

        <div className="flex-1 space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Your Name / Role
          </label>
          <input
            className={input}
            value={name}
            placeholder="e.g. Usher Mary"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim()) onUpdateProfile({ ...profile, name: name.trim() });
            }}
          />
          <p className="text-[11px] text-muted-foreground">Tap avatar photo to change picture</p>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="mt-5">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Appearance
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              onClick={() => prefs.setTheme(t)}
              className={`${btnGhost} ${
                prefs.theme === t ? "border-neon text-neon bg-neon/10" : ""
              }`}
            >
              {t === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{t === "dark" ? "Dark Mode" : "Light Mode"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Colors */}
      <div className="mt-5">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Neon Accent Color
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => prefs.setAccent(a.id)}
              className={`${btnGhost} justify-start ${
                prefs.accent === a.id ? "border-neon bg-neon/10 ring-1 ring-neon" : ""
              }`}
            >
              <span
                className="h-4 w-4 rounded-full mr-1.5"
                style={{ background: a.swatch, boxShadow: `0 0 10px ${a.swatch}` }}
              />
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* App Install / Mobile */}
      <div className="mt-6 border-t pt-4">
        <button
          className={btnNeon + " w-full"}
          onClick={install}
          disabled={installed}
        >
          <Smartphone size={17} />
          <span>{installed ? "App is Installed" : "Install App to Device"}</span>
        </button>
      </div>

      <p className="mt-5 text-center text-xs text-muted-foreground/60">
        Tallyo by Raven — 100% Offline & Stored Locally
      </p>
    </Modal>
  );
}
