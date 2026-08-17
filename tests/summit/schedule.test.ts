import assert from "node:assert/strict";
import test from "node:test";
import { buildScheduleDays } from "@/lib/summit/schedule";
import type { SummitRecord } from "@/lib/summit/types";

function record(id: string, fields: Record<string, unknown>): SummitRecord {
  return { id, fields };
}

test("buildScheduleDays groups schedule rows by day and time windows", () => {
  const schedule = [
    record("slot-1", {
      "Day Of Week": "Monday",
      "DateTime Start [Schedule]": ["2026-11-01T09:00:00.000Z"],
      "Venue Name": ["Main hall"],
    }),
    record("slot-2", {
      "Day Of Week": "Monday",
      "DateTime Start [Schedule]": ["2026-11-01T10:00:00.000Z"],
      "Venue Name": ["Main hall"],
    }),
  ];

  const speakers = [
    record("speaker-1", {
      Schedule: ["slot-1"],
      "Talk Format": ["Talk"],
      Title: "Opening keynote",
      "Room/Area": "Room A",
      Description: "Kickoff",
      "DateTime Start [Schedule]": ["2026-11-01T09:00:00.000Z"],
      "DateTime End [Schedule]": ["2026-11-01T09:45:00.000Z"],
    }),
  ];
  const events = [
    record("event-1", {
      Schedule: ["slot-2"],
      Title: "Lunch",
      "Room/Area": "Dining",
      Description: "Buffet",
      "DateTime Start [Schedule]": ["2026-11-01T10:00:00.000Z"],
      "DateTime End [Schedule]": ["2026-11-01T10:30:00.000Z"],
    }),
  ];

  const days = buildScheduleDays(schedule, events, speakers);
  assert.equal(days.length, 1);
  assert.equal(days[0]?.day, "Monday");
  assert.equal(days[0]?.sections.length, 2);
  assert.equal(days[0]?.sections[0]?.data[0]?.id, "speaker-1");
  assert.equal(days[0]?.sections[1]?.data[0]?.id, "event-1");
});

/**
 * Day tab labels used to come from a map of Common Threads' four Adelaide dates
 * hardcoded in schedule.ts, so any other tenant's programme got unnamed tabs.
 */
test("a tenant's programDays name its programme tabs", () => {
  const schedule = [
    record("slot-1", {
      "Day Of Week": "Tuesday",
      "DateTime Start [Schedule]": "2026-09-08T09:00:00.000+10:00",
      "Venue Name": "Rydges Esplanade Resort Cairns",
    }),
  ];
  const events = [
    record("event-1", {
      Schedule: ["slot-1"],
      Title: "Opening plenary",
      "Room/Area": "Kauri Ballroom",
      "DateTime Start [Schedule]": "2026-09-08T09:00:00.000+10:00",
      "DateTime End [Schedule]": "2026-09-08T10:30:00.000+10:00",
    }),
  ];
  const programDays = [
    record("2026-09-08", {
      "Day Of Week": "Tuesday",
      "Date Label": "Tuesday 8th September",
      Title: "Day 1",
      "Venue Name": "Rydges Esplanade Resort Cairns",
    }),
  ];

  const named = buildScheduleDays(schedule, events, [], { programDays });
  assert.equal(named[0]?.filterTitle, "Day 1");
  assert.equal(named[0]?.filterDateLabel, "Tuesday 8th September");
  assert.equal(named[0]?.filterVenue, "Rydges Esplanade Resort Cairns");

  // Without programDays these September dates match nothing, so the tab stays unnamed.
  const unnamed = buildScheduleDays(schedule, events, []);
  assert.equal(unnamed[0]?.filterTitle, undefined);
});

test("event imagery is scoped to the tenant that owns the photos", () => {
  const schedule = [
    record("slot-1", {
      "Day Of Week": "Monday",
      "DateTime Start [Schedule]": "2026-09-07T12:30:00.000+10:00",
    }),
  ];
  const events = [
    record("event-1", {
      Schedule: ["slot-1"],
      Title: "Lunch",
      "DateTime Start [Schedule]": "2026-09-07T12:30:00.000+10:00",
      "DateTime End [Schedule]": "2026-09-07T13:30:00.000+10:00",
    }),
  ];

  const ct = buildScheduleDays(schedule, events, [], { tenantSlug: "common-threads" });
  assert.equal(ct[0]?.sections[0]?.data[0]?.imageUrl, "/images/events/lunch.jpeg");

  // A tenant with no image set gets none, rather than inheriting Adelaide photos.
  const woven = buildScheduleDays(schedule, events, [], { tenantSlug: "woven" });
  assert.equal(woven[0]?.sections[0]?.data[0]?.imageUrl, undefined);
});
