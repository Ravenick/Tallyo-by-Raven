import { describe, expect, it } from "vitest";
import { canCreateEvent, eventTotal, exportText, normalizeEvent, type TallyEvent } from "@/lib/tallyo";

const ev = (id: string, values: number[] = []): TallyEvent => ({
  id, name: `E${id}`, createdAt: "2026-01-01T10:00:00Z", updatedAt: "2026-01-01T12:00:00Z", count: 0,
  tiles: values.map((v, i) => ({ id: `${id}-${i}`, value: v, savedAt: "2026-01-01T11:00:00Z" })),
});

describe("tallyo rules", () => {
  it("main total is the sum of saved tiles", () => {
    expect(eventTotal(ev("a", [12, 30, 8]))).toBe(50);
  });
  it("blocks creating an 11th event", () => {
    expect(canCreateEvent(Array.from({ length: 9 }, (_, i) => ev(String(i))))).toBe(true);
    expect(canCreateEvent(Array.from({ length: 10 }, (_, i) => ev(String(i))))).toBe(false);
  });
  it("export lists each tile and the total, dating only last count and total", () => {
    const t = exportText([ev("a", [12, 30])]);
    expect(t).toContain("Count 1: 12\n");
    expect(t).toContain("Count 2: 30\n");
    expect(t).toContain("MAIN TOTAL: 42");
    expect(t.match(/2026/g)?.length).toBe(2);
  });
  it("upgrades old events into a single tile", () => {
    const e = normalizeEvent({ id: "x", name: "Old", count: 7 } as never);
    expect(eventTotal(e)).toBe(7);
    expect(e.count).toBe(0);
  });
});
