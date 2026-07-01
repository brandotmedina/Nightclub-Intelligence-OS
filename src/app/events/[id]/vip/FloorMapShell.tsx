"use client";

import { useState } from "react";
import FloorMap from "./FloorMap";
import { midnightClubLayout } from "./venues/midnight-club-layout";

export default function FloorMapShell() {
  const [activeRoom, setActiveRoom] = useState(
    midnightClubLayout.rooms[0].id
  );

  return (
    <FloorMap
      layout={midnightClubLayout}
      activeRoom={activeRoom}
      onRoomChange={setActiveRoom}
    />
  );
}
