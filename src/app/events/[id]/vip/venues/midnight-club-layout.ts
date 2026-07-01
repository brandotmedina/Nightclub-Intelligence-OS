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

// viewBox: "0 0 100 145" — taller portrait; booth h=22 in w=24 space ≈ square card
const MAIN_FLOOR: RoomLayout = {
  id: "main",
  name: "Main Floor",
  viewBox: "0 0 100 145",
  elements: [
    // ── Top displays (stacked) ───────────────────────────────────────────
    { kind: "display", label: "DJ",  shape: "rect", x: 2, y: 2,  w: 96, h: 8 },
    { kind: "display", label: "BAR", shape: "rect", x: 2, y: 11, w: 96, h: 8 },

    // ── Column A — far-left wall — Booths 1–5 (top→bottom) ──────────────
    { kind: "booth", label: "Booth 1", boothMatch: "Booth 1", shape: "rect", x: 2, y: 21,  w: 24, h: 22 },
    { kind: "booth", label: "Booth 2", boothMatch: "Booth 2", shape: "rect", x: 2, y: 44,  w: 24, h: 22 },
    { kind: "booth", label: "Booth 3", boothMatch: "Booth 3", shape: "rect", x: 2, y: 67,  w: 24, h: 22 },
    { kind: "booth", label: "Booth 4", boothMatch: "Booth 4", shape: "rect", x: 2, y: 90,  w: 24, h: 22 },
    { kind: "booth", label: "Booth 5", boothMatch: "Booth 5", shape: "rect", x: 2, y: 113, w: 24, h: 22 },

    // ── Column B — staggered (aligned with B2/B3/B4 heights) ────────────
    { kind: "booth", label: "Booth 6", boothMatch: "Booth 6", shape: "rect", x: 27, y: 44, w: 20, h: 22 },
    { kind: "booth", label: "Booth 7", boothMatch: "Booth 7", shape: "rect", x: 27, y: 67, w: 20, h: 22 },
    { kind: "booth", label: "Booth 8", boothMatch: "Booth 8", shape: "rect", x: 27, y: 90, w: 20, h: 22 },

    // ── Center — dance floor ─────────────────────────────────────────────
    { kind: "display", label: "DANCE FLOOR", shape: "rect", x: 49, y: 21, w: 16, h: 114 },

    // ── Booth 9 — tall oval, far right (inquiry) ─────────────────────────
    {
      kind: "booth",
      label: "Booth 9",
      boothMatch: "Booth 9",
      shape: "ellipse",
      x: 67,
      y: 32,
      w: 30,
      h: 80,
      note: "inquiry",
    },

    // ── Bottom-right BAR — directly under Booth 9 ────────────────────────
    { kind: "display", label: "BAR", shape: "rect", x: 67, y: 114, w: 30, h: 9 },
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
