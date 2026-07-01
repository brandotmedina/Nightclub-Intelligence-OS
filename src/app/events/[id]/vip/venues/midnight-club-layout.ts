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

    // ── Booth 9 — tall private oval, far right (inquiry) ─────────────────
    // 22×96 ellipse — largest element, clearly premium
    {
      kind: "booth",
      label: "Booth 9",
      boothMatch: "Booth 9",
      shape: "ellipse",
      x: 76,
      y: 40,
      w: 22,
      h: 96,
      note: "inquiry",
    },

    // ── Bottom-right BAR — vertical rect, flush to bottom-right corner ──
    { kind: "display", label: "BAR", shape: "rect", x: 88, y: 148, w: 10, h: 30 },
  ],
};

const BACKROOM: RoomLayout = {
  id: "backroom",
  name: "Backroom",
  viewBox: "0 0 100 140",
  elements: [
    // ── Scenery ─────────────────────────────────────────────────────────────
    { kind: "display", label: "BAR", shape: "rect", x: 2, y: 2, w: 96, h: 12 },
    {
      kind: "display",
      label: "VIP TABLES",
      shape: "rect",
      x: 30,
      y: 60,
      w: 40,
      h: 30,
    },

    // ── Standing tables — left column (5 circles) ─────────────────────────
    {
      kind: "display",
      label: "Open seating",
      shape: "ellipse",
      x: 8,
      y: 20,
      w: 14,
      h: 14,
    },
    {
      kind: "display",
      label: "Open seating",
      shape: "ellipse",
      x: 8,
      y: 38,
      w: 14,
      h: 14,
    },
    {
      kind: "display",
      label: "Open seating",
      shape: "ellipse",
      x: 8,
      y: 56,
      w: 14,
      h: 14,
    },
    {
      kind: "display",
      label: "Open seating",
      shape: "ellipse",
      x: 8,
      y: 74,
      w: 14,
      h: 14,
    },
    {
      kind: "display",
      label: "Open seating",
      shape: "ellipse",
      x: 8,
      y: 92,
      w: 14,
      h: 14,
    },

    // ── Right column — Booths 1–4 (Backroom) ────────────────────────────
    {
      kind: "booth",
      label: "Booth 1",
      boothMatch: "Booth 1",
      shape: "rect",
      x: 72,
      y: 20,
      w: 26,
      h: 16,
    },
    {
      kind: "booth",
      label: "Booth 2",
      boothMatch: "Booth 2",
      shape: "rect",
      x: 72,
      y: 40,
      w: 26,
      h: 16,
    },
    {
      kind: "booth",
      label: "Booth 3",
      boothMatch: "Booth 3",
      shape: "rect",
      x: 72,
      y: 60,
      w: 26,
      h: 16,
    },
    {
      kind: "booth",
      label: "Booth 4",
      boothMatch: "Booth 4",
      shape: "rect",
      x: 72,
      y: 80,
      w: 26,
      h: 16,
    },
  ],
};

export const midnightClubLayout: VenueLayout = {
  rooms: [MAIN_FLOOR, BACKROOM],
};
