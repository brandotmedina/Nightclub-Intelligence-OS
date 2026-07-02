// Per-client layout asset for Midnight Club, Louisville KY.
// Swap this file when onboarding a new venue — the FloorMap renderer is generic.

export type MapElement = {
  kind: "booth" | "display";
  label?: string;
  /** DB booths.label value — used by Slice B to wire tap → reserve flow */
  boothMatch?: string;
  shape: "rect" | "ellipse";
  x: number;
  y: number;
  w: number;
  h: number;
  note?: string;
};

export type RoomLayout = {
  id: string;
  name: string;
  /** Must match DB venue_areas.name exactly — used to join layout → DB booths */
  areaName: string;
  viewBox: string;
  elements: MapElement[];
};

export type VenueLayout = {
  rooms: RoomLayout[];
};

// Schematic layout — forgiving grid, generous spacing, reads as the real room.
// viewBox: "0 0 100 180" — tall portrait; 24-unit booth height reads as a card.
// Col A ends y=174, 6 units of padding to bottom edge.
const MAIN_FLOOR: RoomLayout = {
  id: "main",
  name: "Main Floor",
  areaName: "Main Floor",
  viewBox: "0 0 100 180",
  elements: [
    // ── Top band — two full-width stacked displays ───────────────────────
    { kind: "display", label: "DJ",  shape: "rect", x: 2, y: 3,  w: 96, h: 10 },
    { kind: "display", label: "BAR", shape: "rect", x: 2, y: 15, w: 96, h: 10 },

    // ── Column A — far-left wall — Booths 1–5 ───────────────────────────
    // x=2, w=22, h=24 each, gap=6 between rows; starts y=30
    { kind: "booth", label: "Booth 1", boothMatch: "Booth 1", shape: "rect", x: 2, y: 30,  w: 22, h: 24 },
    { kind: "booth", label: "Booth 2", boothMatch: "Booth 2", shape: "rect", x: 2, y: 60,  w: 22, h: 24 },
    { kind: "booth", label: "Booth 3", boothMatch: "Booth 3", shape: "rect", x: 2, y: 90,  w: 22, h: 24 },
    { kind: "booth", label: "Booth 4", boothMatch: "Booth 4", shape: "rect", x: 2, y: 120, w: 22, h: 24 },
    { kind: "booth", label: "Booth 5", boothMatch: "Booth 5", shape: "rect", x: 2, y: 150, w: 22, h: 24 },

    // ── Column B — second column, aligned with B2/B3/B4 heights ─────────
    // x=26, w=20, same row rhythm; 4-unit gap between columns
    { kind: "booth", label: "Booth 6", boothMatch: "Booth 6", shape: "rect", x: 26, y: 60,  w: 20, h: 24 },
    { kind: "booth", label: "Booth 7", boothMatch: "Booth 7", shape: "rect", x: 26, y: 90,  w: 20, h: 24 },
    { kind: "booth", label: "Booth 8", boothMatch: "Booth 8", shape: "rect", x: 26, y: 120, w: 20, h: 24 },

    // ── Centre — dance floor block ───────────────────────────────────────
    // 24 units wide, full content height — real presence
    { kind: "display", label: "DANCE FLOOR", shape: "rect", x: 50, y: 30, w: 24, h: 118 },

    // ── Booth 9 — right column, inquiry rect spanning B6→B8 heights ──────
    {
      kind: "booth",
      label: "Booth 9",
      boothMatch: "Booth 9",
      shape: "rect",
      x: 76,
      y: 60,
      w: 22,
      h: 84,
      note: "inquiry",
    },

    // ── Bottom-right BAR — vertical rect, flush to bottom-right corner ──
    { kind: "display", label: "BAR", shape: "rect", x: 88, y: 148, w: 10, h: 30 },
  ],
};

// Schematic layout — Backroom.
// viewBox: "0 0 100 165" — matches Main Floor's roomy feel.
// Content band y=17..148 (131 units). DJ top, BAR bottom, both full width.
const BACKROOM: RoomLayout = {
  id: "backroom",
  name: "Backroom",
  areaName: "Backroom",
  viewBox: "0 0 100 165",
  elements: [
    // ── Top / bottom full-width displays ────────────────────────────────
    { kind: "display", label: "DJ",  shape: "rect", x: 2, y: 3,   w: 96, h: 10 },
    { kind: "display", label: "BAR", shape: "rect", x: 2, y: 153, w: 96, h: 10 },

    // ── Left column — 4 open-seating circles (scenery, non-bookable) ────
    // x=3, w=14, h=14 (~circular); gap=15 between rows
    { kind: "display", label: "Open seating", shape: "ellipse", x: 3, y: 32,  w: 14, h: 14 },
    { kind: "display", label: "Open seating", shape: "ellipse", x: 3, y: 61,  w: 14, h: 14 },
    { kind: "display", label: "Open seating", shape: "ellipse", x: 3, y: 90,  w: 14, h: 14 },
    { kind: "display", label: "Open seating", shape: "ellipse", x: 3, y: 119, w: 14, h: 14 },

    // ── Center — dance floor block (full content height) ─────────────────
    { kind: "display", label: "DANCE FLOOR", shape: "rect", x: 20, y: 17, w: 36, h: 131 },

    // ── Right column — Booths 1–4 (evenly spaced, gap=7) ─────────────────
    // x=60, w=22, h=24; y: 24/55/86/117
    { kind: "booth", label: "Booth 1", boothMatch: "Booth 1", shape: "rect", x: 60, y: 24,  w: 22, h: 24 },
    { kind: "booth", label: "Booth 2", boothMatch: "Booth 2", shape: "rect", x: 60, y: 55,  w: 22, h: 24 },
    { kind: "booth", label: "Booth 3", boothMatch: "Booth 3", shape: "rect", x: 60, y: 86,  w: 22, h: 24 },
    { kind: "booth", label: "Booth 4", boothMatch: "Booth 4", shape: "rect", x: 60, y: 117, w: 22, h: 24 },
  ],
};

export const midnightClubLayout: VenueLayout = {
  rooms: [MAIN_FLOOR, BACKROOM],
};
