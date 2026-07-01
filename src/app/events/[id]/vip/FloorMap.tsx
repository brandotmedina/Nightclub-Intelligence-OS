"use client";

import type { VenueLayout, MapElement } from "./venues/midnight-club-layout";

type Props = {
  layout: VenueLayout;
  activeRoom: string;
  onRoomChange: (roomId: string) => void;
};

function SceneryRect({ el }: { el: MapElement }) {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const isSmall = el.w < 18 && el.h < 18;
  const fontSize = isSmall ? 2.8 : el.w < 30 ? 3.2 : 4;

  if (el.shape === "ellipse") {
    return (
      <g>
        <ellipse
          cx={cx}
          cy={cy}
          rx={el.w / 2}
          ry={el.h / 2}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.6"
        />
        {!isSmall && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fontSize}
            fill="rgba(255,255,255,0.3)"
            fontFamily="inherit"
          >
            {el.label}
          </text>
        )}
      </g>
    );
  }

  return (
    <g>
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        rx="1.5"
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.6"
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fill="rgba(255,255,255,0.3)"
        fontFamily="inherit"
        letterSpacing="0.04em"
      >
        {el.label}
      </text>
    </g>
  );
}

function BoothRect({ el }: { el: MapElement }) {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const isInquiry = el.note === "inquiry";
  const fontSize = el.w < 20 ? 3 : 3.5;

  if (el.shape === "ellipse") {
    // Booth 9 — big oval, gold outline
    return (
      <g>
        <ellipse
          cx={cx}
          cy={cy}
          rx={el.w / 2}
          ry={el.h / 2}
          fill="rgba(212,175,55,0.06)"
          stroke={isInquiry ? "rgba(212,175,55,0.5)" : "rgba(212,175,55,0.7)"}
          strokeWidth="0.8"
          strokeDasharray={isInquiry ? "2 1.5" : undefined}
        />
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize}
          fill="rgba(212,175,55,0.8)"
          fontFamily="inherit"
          fontWeight="600"
        >
          {el.label}
        </text>
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={2.8}
          fill="rgba(212,175,55,0.5)"
          fontFamily="inherit"
        >
          Inquiry
        </text>
      </g>
    );
  }

  return (
    <g>
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        rx="2"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.7"
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fill="rgba(255,255,255,0.75)"
        fontFamily="inherit"
        fontWeight="500"
      >
        {el.label}
      </text>
    </g>
  );
}

export default function FloorMap({ layout, activeRoom, onRoomChange }: Props) {
  const room = layout.rooms.find((r) => r.id === activeRoom) ?? layout.rooms[0];

  return (
    <div className="mb-6">
      {/* Room toggle */}
      <div className="flex gap-2 mb-3">
        {layout.rooms.map((r) => {
          const isActive = r.id === activeRoom;
          return (
            <button
              key={r.id}
              onClick={() => onRoomChange(r.id)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={
                isActive
                  ? {
                      background: "rgba(212,175,55,0.12)",
                      border: "1px solid rgba(212,175,55,0.5)",
                      color: "rgba(212,175,55,1)",
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.4)",
                    }
              }
            >
              {r.name}
            </button>
          );
        })}
      </div>

      {/* SVG map — width 100%, height auto so full room fits mobile width */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox={room.viewBox}
          width="100%"
          style={{ display: "block" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {room.elements.map((el, i) =>
            el.kind === "display" ? (
              <SceneryRect key={i} el={el} />
            ) : (
              <BoothRect key={i} el={el} />
            )
          )}
        </svg>
      </div>

      <p className="text-center text-xs mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>
        Floor map — interactive selection coming soon
      </p>
    </div>
  );
}
