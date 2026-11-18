"use client";

import {
  midnightClubLayout,
  type MapElement,
} from "@/app/events/[id]/vip/venues/midnight-club-layout";

export type DoorArea = { id: string; name: string };
export type DoorBooth = { id: string; area_id: string; label: string; booking_mode: string };
export type DoorBoothState = "available" | "booked" | "checked_in";

type RenderState = DoorBoothState | "unmatched";

const COLORS: Record<RenderState, { fill: string; stroke: string; label: string }> = {
  available:  { fill: "#16161b", stroke: "#3a3a44", label: "#6b6b75" },
  booked:     { fill: "#3a2e12", stroke: "#d4af37", label: "#f5d77a" },
  checked_in: { fill: "#0f2e1c", stroke: "#22c55e", label: "#86efac" },
  unmatched:  { fill: "#111114", stroke: "#26262c", label: "#3f3f46" },
};

const SUB_LABEL: Record<RenderState, string | null> = {
  available: null,
  booked: "Booked",
  checked_in: "Checked in",
  unmatched: null,
};

const SCENERY = {
  fill: "rgba(255,255,255,0.04)",
  stroke: "rgba(255,255,255,0.12)",
  label: "rgba(255,255,255,0.30)",
};

// Map uses rooms from the layout only — no Patio tab in the door view.
const ROOMS = midnightClubLayout.rooms;

// ── Scenery (geometry copied from FloorMap.tsx) ─────────────────────────────

function SceneryShape({ el }: { el: MapElement }) {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const isSmall = el.w < 18 && el.h < 18;
  const fontSize = isSmall ? 2.8 : el.w < 30 ? 3.2 : 4;

  if (el.shape === "ellipse") {
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={el.w / 2} ry={el.h / 2}
          fill={SCENERY.fill} stroke={SCENERY.stroke} strokeWidth="0.6" />
        {!isSmall && (
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
            fontSize={fontSize} fill={SCENERY.label} fontFamily="inherit">
            {el.label}
          </text>
        )}
      </g>
    );
  }

  if (el.shape === "arc") {
    const d = el.curve === "down"
      ? `M ${el.x} ${el.y} L ${el.x + el.w} ${el.y} Q ${el.x + el.w / 2} ${el.y + 2 * el.h} ${el.x} ${el.y} Z`
      : `M ${el.x} ${el.y + el.h} L ${el.x + el.w} ${el.y + el.h} Q ${el.x + el.w / 2} ${el.y - el.h} ${el.x} ${el.y + el.h} Z`;
    return (
      <g>
        <path d={d} fill={SCENERY.fill} stroke={SCENERY.stroke} strokeWidth="0.6" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fontSize={fontSize} fill={SCENERY.label} fontFamily="inherit" letterSpacing="0.04em">
          {el.label}
        </text>
      </g>
    );
  }

  return (
    <g>
      <rect x={el.x} y={el.y} width={el.w} height={el.h} rx="1.5"
        fill={SCENERY.fill} stroke={SCENERY.stroke} strokeWidth="0.6" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fill={SCENERY.label} fontFamily="inherit" letterSpacing="0.04em">
        {el.label}
      </text>
    </g>
  );
}

// ── Booth shape ─────────────────────────────────────────────────────────────

function BoothShape({
  el, state, selected, onClick,
}: {
  el: MapElement;
  state: RenderState;
  selected: boolean;
  onClick?: () => void;
}) {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const fontSize = el.w < 20 ? 3 : 3.5;
  const c = COLORS[state];
  const stroke = selected ? "#ffffff" : c.stroke;
  // Stroke widths are in screen px (non-scaling) so "3" means 3px regardless of viewBox.
  const strokeWidth = selected ? 3 : 1.5;
  const subLabel = SUB_LABEL[state];
  const common = {
    fill: c.fill,
    stroke,
    strokeWidth,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
      opacity={state === "unmatched" ? 0.6 : 1}
    >
      {el.shape === "ellipse" ? (
        <ellipse cx={cx} cy={cy} rx={el.w / 2} ry={el.h / 2} {...common} />
      ) : el.shape === "arc" ? (
        <path
          d={el.curve === "down"
            ? `M ${el.x} ${el.y} L ${el.x + el.w} ${el.y} Q ${el.x + el.w / 2} ${el.y + 2 * el.h} ${el.x} ${el.y} Z`
            : `M ${el.x} ${el.y + el.h} L ${el.x + el.w} ${el.y + el.h} Q ${el.x + el.w / 2} ${el.y - el.h} ${el.x} ${el.y + el.h} Z`}
          {...common}
        />
      ) : (
        <rect x={el.x} y={el.y} width={el.w} height={el.h} rx="2" {...common} />
      )}
      <text
        x={cx} y={subLabel ? cy - 3.5 : cy}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fill={c.label} fontFamily="inherit" fontWeight="600"
        pointerEvents="none">
        {el.label}
      </text>
      {subLabel && (
        <text x={cx} y={cy + 4.5} textAnchor="middle" dominantBaseline="middle"
          fontSize={2.8} fill={c.label} fontFamily="inherit" pointerEvents="none">
          {subLabel}
        </text>
      )}
    </g>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function VipDoorMap({
  areas,
  booths,
  stateByBoothId,
  selectedBoothId,
  onBoothSelect,
  activeRoom,
  onRoomChange,
}: {
  areas: DoorArea[];
  booths: DoorBooth[];
  /** Booths absent from this map are "available". */
  stateByBoothId: Map<string, DoorBoothState>;
  selectedBoothId: string | null;
  onBoothSelect: (boothId: string) => void;
  activeRoom: string;
  onRoomChange: (roomId: string) => void;
}) {
  const room = ROOMS.find((r) => r.id === activeRoom) ?? ROOMS[0];

  function resolveRoomBooths(areaName: string) {
    const dbArea = areas.find((a) => a.name === areaName);
    return dbArea ? booths.filter((b) => b.area_id === dbArea.id) : [];
  }

  // Legend counts span every mapped booth across all rooms
  const counts = { available: 0, booked: 0, checked_in: 0 };
  for (const r of ROOMS) {
    const rb = resolveRoomBooths(r.areaName);
    for (const el of r.elements) {
      if (el.kind !== "booth" || !el.boothMatch) continue;
      const b = rb.find((x) => x.label === el.boothMatch);
      if (!b) continue;
      counts[stateByBoothId.get(b.id) ?? "available"]++;
    }
  }

  const roomBooths = resolveRoomBooths(room.areaName);

  return (
    <div>
      {/* Room toggle */}
      <div className="flex gap-2 mb-3">
        {ROOMS.map((r) => {
          const isActive = r.id === room.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onRoomChange(r.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? "bg-zinc-800 border-zinc-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500"
              }`}
            >
              {r.name}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl overflow-hidden border border-zinc-800 bg-black">
        <svg
          viewBox={room.viewBox}
          width="100%"
          style={{ display: "block" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {room.elements.map((el, i) => {
            if (el.kind === "display") return <SceneryShape key={i} el={el} />;
            if (!el.boothMatch) return null;

            const booth = roomBooths.find((b) => b.label === el.boothMatch);
            if (!booth) {
              return <BoothShape key={i} el={el} state="unmatched" selected={false} />;
            }

            // Every matched booth is tappable, including inquiry-mode booths
            return (
              <BoothShape
                key={i}
                el={el}
                state={stateByBoothId.get(booth.id) ?? "available"}
                selected={selectedBoothId === booth.id}
                onClick={() => onBoothSelect(booth.id)}
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-3 text-xs text-zinc-400 flex-wrap">
        <LegendItem state="available" label="Available" n={counts.available} />
        <span className="text-zinc-600">·</span>
        <LegendItem state="booked" label="Booked" n={counts.booked} />
        <span className="text-zinc-600">·</span>
        <LegendItem state="checked_in" label="Checked in" n={counts.checked_in} />
      </div>
    </div>
  );
}

function LegendItem({ state, label, n }: { state: DoorBoothState; label: string; n: number }) {
  const c = COLORS[state];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-3 rounded-sm"
        style={{ background: c.fill, border: `1.5px solid ${c.stroke}` }}
      />
      {label} ({n})
    </span>
  );
}
