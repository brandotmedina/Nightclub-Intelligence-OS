"use client";

import type { VenueLayout, MapElement } from "./venues/midnight-club-layout";

type Area = { id: string; name: string; is_bookable: boolean };
type Booth = { id: string; area_id: string; label: string; booking_mode: string };

type BoothStatus = "available" | "selected" | "taken" | "inquiry" | "inert";

export type Props = {
  layout: VenueLayout;
  activeRoom: string;
  onRoomChange: (roomId: string) => void;
  // Interactive props (Slice B)
  areas: Area[];
  booths: Booth[];
  selectedBoothId: string | null;
  takenBoothIds: Set<string>;
  onBoothSelect: (boothId: string) => void;
  isIdle: boolean;
  inquiryPhone?: string;
};

// Deduplicate console warnings across renders — one warning per unresolved label
const warnedMatches = new Set<string>();

// ── Style tables ─────────────────────────────────────────────────────────────

const FILL: Record<BoothStatus | "display", string> = {
  available: "rgba(255,255,255,0.06)",
  selected:  "rgba(176,31,144,0.15)",
  taken:     "rgba(255,255,255,0.02)",
  inquiry:   "rgba(212,175,55,0.06)",
  inert:     "rgba(255,255,255,0.04)",
  display:   "rgba(255,255,255,0.04)",
};

const STROKE: Record<BoothStatus | "display", string> = {
  available: "rgba(255,255,255,0.22)",
  selected:  "rgba(176,31,144,0.85)",
  taken:     "rgba(255,255,255,0.08)",
  inquiry:   "rgba(212,175,55,0.5)",
  inert:     "rgba(255,255,255,0.14)",
  display:   "rgba(255,255,255,0.12)",
};

const LABEL_FILL: Record<BoothStatus | "display", string> = {
  available: "rgba(255,255,255,0.75)",
  selected:  "rgba(255,255,255,0.95)",
  taken:     "rgba(255,255,255,0.28)",
  inquiry:   "rgba(212,175,55,0.85)",
  inert:     "rgba(255,255,255,0.35)",
  display:   "rgba(255,255,255,0.30)",
};

// ── Scenery (display) ─────────────────────────────────────────────────────────

function SceneryShape({ el }: { el: MapElement }) {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const isSmall = el.w < 18 && el.h < 18;
  const fontSize = isSmall ? 2.8 : el.w < 30 ? 3.2 : 4;

  if (el.shape === "ellipse") {
    return (
      <g>
        <ellipse
          cx={cx} cy={cy} rx={el.w / 2} ry={el.h / 2}
          fill={FILL.display} stroke={STROKE.display} strokeWidth="0.6"
        />
        {!isSmall && (
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
            fontSize={fontSize} fill={LABEL_FILL.display} fontFamily="inherit">
            {el.label}
          </text>
        )}
      </g>
    );
  }

  return (
    <g>
      <rect x={el.x} y={el.y} width={el.w} height={el.h} rx="1.5"
        fill={FILL.display} stroke={STROKE.display} strokeWidth="0.6"
      />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fill={LABEL_FILL.display} fontFamily="inherit"
        letterSpacing="0.04em">
        {el.label}
      </text>
    </g>
  );
}

// ── Booth shape ───────────────────────────────────────────────────────────────

type BoothShapeProps = {
  el: MapElement;
  status: BoothStatus;
  onClick?: () => void;
  inquiryPhone?: string;
};

function BoothShape({ el, status, onClick, inquiryPhone }: BoothShapeProps) {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const fontSize = el.w < 20 ? 3 : 3.5;
  const fill = FILL[status];
  const stroke = STROKE[status];
  const labelFill = LABEL_FILL[status];
  const strokeWidth = status === "selected" ? 1.2 : 0.7;
  const strokeDash = status === "inquiry" ? "2 1.5" : undefined;
  const opacity = status === "taken" ? 0.45 : 1;
  const filter = status === "selected" ? "url(#plum-glow)" : undefined;
  const cursor = onClick ? "pointer" : status === "taken" ? "not-allowed" : "default";

  // Sub-label beneath the booth name
  const subLabel =
    status === "taken"     ? "Taken"    :
    status === "selected"  ? "Selected" :
    status === "inquiry"   ? (inquiryPhone ? "Call to reserve" : "Call venue") :
    null;

  if (el.shape === "ellipse") {
    const shapes = (
      <g opacity={opacity} filter={filter} style={{ cursor }} onClick={onClick}>
        <ellipse
          cx={cx} cy={cy} rx={el.w / 2} ry={el.h / 2}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        />
        <text
          x={cx} y={subLabel ? cy - 4 : cy}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={fontSize} fill={labelFill} fontFamily="inherit" fontWeight="600">
          {el.label}
        </text>
        {subLabel && (
          <text x={cx} y={cy + 5} textAnchor="middle" dominantBaseline="middle"
            fontSize={2.8} fill={labelFill} fontFamily="inherit">
            {subLabel}
          </text>
        )}
      </g>
    );

    // Wrap inquiry in SVG <a> for tel: link
    if (status === "inquiry" && inquiryPhone) {
      return (
        <a href={`tel:${inquiryPhone}`} style={{ cursor: "pointer" }}>
          {shapes}
        </a>
      );
    }
    return shapes;
  }

  // rect booth
  return (
    <g opacity={opacity} filter={filter} style={{ cursor }} onClick={onClick}>
      <rect x={el.x} y={el.y} width={el.w} height={el.h} rx="2"
        fill={fill} stroke={stroke} strokeWidth={strokeWidth}
      />
      <text
        x={cx} y={subLabel ? cy - 3.5 : cy}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fill={labelFill} fontFamily="inherit" fontWeight="500">
        {el.label}
      </text>
      {subLabel && (
        <text x={cx} y={cy + 4.5} textAnchor="middle" dominantBaseline="middle"
          fontSize={2.8} fill={labelFill} fontFamily="inherit">
          {subLabel}
        </text>
      )}
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FloorMap({
  layout, activeRoom, onRoomChange,
  areas, booths,
  selectedBoothId, takenBoothIds, onBoothSelect, isIdle, inquiryPhone,
}: Props) {
  // "patio" is a synthetic tab — no layout room, no map, call-only panel
  const PATIO_ID = "patio";
  const isPatio = activeRoom === PATIO_ID;

  const room = !isPatio
    ? (layout.rooms.find((r) => r.id === activeRoom) ?? layout.rooms[0])
    : null;

  // Resolve DB area for the active map room, then narrow booths to that area
  const dbArea = room ? areas.find((a) => a.name === room.areaName) : null;
  const roomBooths = dbArea ? booths.filter((b) => b.area_id === dbArea.id) : [];

  // All tabs: layout rooms + Patio synthetic tab
  const tabs = [
    ...layout.rooms.map((r) => ({ id: r.id, label: r.name })),
    { id: PATIO_ID, label: "Patio Lounge" },
  ];

  return (
    <div className="mb-6">
      {/* Room / area toggle — 3 tabs */}
      <div className="flex gap-2 mb-3">
        {tabs.map((tab) => {
          const isActive = tab.id === activeRoom;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onRoomChange(tab.id)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={
                isActive
                  ? { background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.5)", color: "rgba(212,175,55,1)" }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Patio tab — call-only panel, no map */}
      {isPatio && (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "10px",
          padding: "28px 20px",
          textAlign: "center",
        }}>
          <p style={{ color: "rgba(212,175,55,0.75)", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
            Patio Lounge
          </p>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.875rem", marginBottom: "20px" }}>
            Available by request only
          </p>
          {inquiryPhone ? (
            <a
              href={`tel:${inquiryPhone}`}
              style={{
                display: "inline-block",
                background: "rgba(212,175,55,0.1)",
                border: "1px solid rgba(212,175,55,0.35)",
                color: "rgba(212,175,55,0.9)",
                borderRadius: "12px",
                padding: "12px 24px",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Call to reserve
            </a>
          ) : (
            <span style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.4)",
              borderRadius: "12px",
              padding: "12px 24px",
              fontSize: "0.875rem",
            }}>
              Call the venue to reserve
            </span>
          )}
        </div>
      )}

      {/* SVG floor map — fit-to-width, entire room visible, no scroll */}
      {!isPatio && room && (
        <>
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            overflow: "hidden",
          }}>
            <svg
              viewBox={room.viewBox}
              width="100%"
              style={{ display: "block" }}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Plum glow for selected booths */}
                <filter id="plum-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2.5"
                    floodColor="rgba(176,31,144,0.6)" floodOpacity="1" />
                </filter>
              </defs>

              {room.elements.map((el, i) => {
                // Scenery — purely presentational
                if (el.kind === "display") return <SceneryShape key={i} el={el} />;

                // Booth — must have a boothMatch
                if (!el.boothMatch) return null;

                // Resolve DB booth by label within this room's area
                const booth = roomBooths.find((b) => b.label === el.boothMatch);

                if (!booth) {
                  const warnKey = `${room.id}:${el.boothMatch}`;
                  if (!warnedMatches.has(warnKey)) {
                    console.warn(
                      `FloorMap: no DB booth found for boothMatch="${el.boothMatch}" ` +
                      `in room "${room.id}" (areaName="${room.areaName}"). ` +
                      `Rendering inert. Check that venue_areas.name matches the layout areaName.`
                    );
                    warnedMatches.add(warnKey);
                  }
                  return <BoothShape key={i} el={el} status="inert" />;
                }

                // Inquiry booth (e.g. Booth 9) — tel: link, never enters booking flow
                if (booth.booking_mode === "inquiry") {
                  return (
                    <BoothShape
                      key={i} el={el} status="inquiry"
                      inquiryPhone={inquiryPhone}
                    />
                  );
                }

                // Online booth — derive status from passed-in props only
                const isTaken = takenBoothIds.has(booth.id);
                const isSelected = selectedBoothId === booth.id;
                const status: BoothStatus = isTaken ? "taken" : isSelected ? "selected" : "available";
                const canTap = isIdle && !isTaken;

                return (
                  <BoothShape
                    key={i}
                    el={el}
                    status={status}
                    onClick={canTap ? () => onBoothSelect(booth.id) : undefined}
                  />
                );
              })}
            </svg>
          </div>

          <p className="text-center text-xs mt-2" style={{ color: "rgba(255,255,255,0.22)" }}>
            Tap an available booth to reserve
          </p>
        </>
      )}
    </div>
  );
}
