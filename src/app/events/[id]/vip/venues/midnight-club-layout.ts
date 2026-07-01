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

// viewBox: "0 0 100 150" — portrait, fits mobile width
const MAIN_FLOOR: RoomLayout = {
  id: "main",
  name: "Main Floor",
  viewBox: "0 0 100 150",
  elements: [
    // ── Scenery ─────────────────────────────────────────────────────────────
    { kind: "display", label: "DJ", shape: "rect", x: 2, y: 2, w: 96, h: 12 },
    {
      kind: "display",
      label: "DANCE FLOOR",
      shape: "rect",
      x: 30,
      y: 20,
      w: 36,
      h: 72,
    },
    { kind: "display", label: "BAR", shape: "rect", x: 2, y: 134, w: 96, h: 14 },

    // ── Left column — Booths 1–4 ─────────────────────────────────────────
    {
      kind: "booth",
      label: "Booth 1",
      boothMatch: "Booth 1",
      shape: "rect",
      x: 2,
      y: 20,
      w: 26,
      h: 16,
    },
    {
      kind: "booth",
      label: "Booth 2",
      boothMatch: "Booth 2",
      shape: "rect",
      x: 2,
      y: 38,
      w: 26,
      h: 16,
    },
    {
      kind: "booth",
      label: "Booth 3",
      boothMatch: "Booth 3",
      shape: "rect",
      x: 2,
      y: 56,
      w: 26,
      h: 16,
    },
    {
      kind: "booth",
      label: "Booth 4",
      boothMatch: "Booth 4",
      shape: "rect",
      x: 2,
      y: 74,
      w: 26,
      h: 16,
    },

    // ── Inner-left column — Booths 5–8 ──────────────────────────────────
    {
      kind: "booth",
      label: "Booth 5",
      boothMatch: "Booth 5",
      shape: "rect",
      x: 2,
      y: 94,
      w: 26,
      h: 14,
    },
    {
      kind: "booth",
      label: "Booth 6",
      boothMatch: "Booth 6",
      shape: "rect",
      x: 2,
      y: 110,
      w: 26,
      h: 14,
    },
    {
      kind: "booth",
      label: "Booth 7",
      boothMatch: "Booth 7",
      shape: "rect",
      x: 30,
      y: 94,
      w: 18,
      h: 14,
    },
    {
      kind: "booth",
      label: "Booth 8",
      boothMatch: "Booth 8",
      shape: "rect",
      x: 30,
      y: 110,
      w: 18,
      h: 14,
    },

    // ── Booth 9 — large right-side oval (inquiry) ────────────────────────
    {
      kind: "booth",
      label: "Booth 9",
      boothMatch: "Booth 9",
      shape: "ellipse",
      x: 70,
      y: 46,
      w: 28,
      h: 52,
      note: "inquiry",
    },
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
