import { describe, expect, it } from "vitest";
import {
  canCreateEvent,
  eventShareMessage,
  eventTotal,
  exportCsv,
  exportText,
  normalizeEvent,
  type TallyEvent,
} from "@/lib/tallyo";

const createSampleEvent = (id: string): TallyEvent => ({
  id,
  name: `Event ${id}`,
  notes: "Gate A",
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T12:00:00Z",
  fields: [
    { id: "men", name: "Men", count: 20 },
    { id: "women", name: "Women", count: 35 },
    { id: "children", name: "Children", count: 10 },
    { id: "bike", name: "Bike", count: 2 },
    { id: "car", name: "Car", count: 8 },
  ],
  tiles: [{ id: "t1", value: 5, savedAt: "2026-01-01T11:00:00Z" }],
});

describe("tallyo categorized counting rules", () => {
  it("main total is the sum of category fields plus saved milestone tiles", () => {
    const ev = createSampleEvent("1");
    // 20 + 35 + 10 + 2 + 8 = 75 from fields + 5 from tiles = 80
    expect(eventTotal(ev)).toBe(80);
  });

  it("checks event limits according to MAX_EVENTS", () => {
    const list = Array.from({ length: 14 }, (_, i) => createSampleEvent(String(i)));
    expect(canCreateEvent(list)).toBe(true);
    const fullList = Array.from({ length: 15 }, (_, i) => createSampleEvent(String(i)));
    expect(canCreateEvent(fullList)).toBe(false);
  });

  it("exports plain category totals with an export timestamp", () => {
    const ev = createSampleEvent("1");
    const text = exportText([ev]);
    expect(text).toContain("Men: 20");
    expect(text).toContain("Women: 35");
    expect(text).toContain("Children: 10");
    expect(text).toContain("Bike: 2");
    expect(text).toContain("Car: 8");
    expect(text).toContain("Timestamp:");
    expect(text).toContain("Total: 80");
    expect(text).not.toContain("Notes:");
  });

  it("shares the same plain category totals and timestamp", () => {
    const ev = createSampleEvent("1");
    const share = eventShareMessage(ev);
    expect(share).toContain("Event 1");
    expect(share).toContain("Timestamp:");
    expect(share).toContain("Men: 20");
    expect(share).toContain("Women: 35");
    expect(share).toContain("Total: 80");
  });

  it("generates a compact CSV row with category totals and timestamp", () => {
    const ev = createSampleEvent("1");
    const csv = exportCsv([ev]);
    expect(csv).toContain('"Event","Timestamp","Men","Women","Children","Bike","Car","Total"');
    expect(csv).toContain('"Event 1"');
    expect(csv).toContain('"20"');
    expect(csv).toContain('"35"');
    expect(csv).toContain('"80"');
  });

  it("normalizes legacy events without fields into default categories", () => {
    const legacy = normalizeEvent({ id: "old-1", name: "Old Service", count: 42 } as never);
    expect(legacy.fields.length).toBe(5);
    expect(legacy.fields[0].name).toBe("Men");
    expect(legacy.fields[0].count).toBe(42);
    expect(legacy.fields[1].name).toBe("Women");
    expect(legacy.fields[1].count).toBe(0);
    expect(eventTotal(legacy)).toBe(42);
  });
});
