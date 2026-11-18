"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { midnightClubLayout } from "@/app/events/[id]/vip/venues/midnight-club-layout";
import VipDoorMap, {
  type DoorArea,
  type DoorBooth,
  type DoorBoothState,
} from "./VipDoorMap";

type Reservation = {
  id: string;
  booth_id: string;
  booth_under_name: string | null;
  entries_included: number | null;
  fee: number | null;
  checked_in_at: string | null;
  customer: { full_name: string | null; phone: string | null };
  is_comp: boolean;
};

type VipData = {
  event: { id: string; name: string; event_date: string; bottle_minimum: number | null };
  areas: DoorArea[];
  booths: DoorBooth[];
  reservations: Reservation[];
};

type ReleaseReason = "no_show" | "cancelled";
type ReleaseStep =
  | { kind: "none" }
  | { kind: "reason" }
  | { kind: "confirm"; reason: ReleaseReason };

const REFRESH_MS = 30_000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error) return `${data.error} (${res.status})`;
  } catch {}
  return `Request failed (${res.status})`;
}

export default function VipDoorView({
  passcode,
  eventId,
}: {
  passcode: string;
  eventId: string;
}) {
  const [data, setData] = useState<VipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState(midnightClubLayout.rooms[0].id);
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);
  const [releaseStep, setReleaseStep] = useState<ReleaseStep>({ kind: "none" });
  const [busy, setBusy] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, eventId }),
      });
      if (!res.ok) {
        setLoadError(`Could not load VIP booths: ${await readError(res)}`);
        return false;
      }
      setData((await res.json()) as VipData);
      setLoadError(null);
      return true;
    } catch {
      setLoadError("Could not load VIP booths: network error");
      return false;
    } finally {
      setLoading(false);
    }
  }, [passcode, eventId]);

  // Initial load + 30s refresh
  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(load, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  const reservationByBooth = useMemo(() => {
    const m = new Map<string, Reservation>();
    for (const r of data?.reservations ?? []) m.set(r.booth_id, r);
    return m;
  }, [data]);

  const stateByBoothId = useMemo(() => {
    const m = new Map<string, DoorBoothState>();
    for (const r of data?.reservations ?? []) {
      m.set(r.booth_id, r.checked_in_at ? "checked_in" : "booked");
    }
    return m;
  }, [data]);

  const selectedBooth = data?.booths.find((b) => b.id === selectedBoothId) ?? null;
  const selectedArea = selectedBooth
    ? data?.areas.find((a) => a.id === selectedBooth.area_id) ?? null
    : null;
  const selectedRes = selectedBoothId ? reservationByBooth.get(selectedBoothId) ?? null : null;

  function selectBooth(boothId: string) {
    setSelectedBoothId(boothId);
    setReleaseStep({ kind: "none" });
    setPanelError(null);
  }

  function closePanel() {
    setSelectedBoothId(null);
    setReleaseStep({ kind: "none" });
    setPanelError(null);
  }

  async function handleCheckIn(undo: boolean) {
    if (!selectedRes) return;
    setBusy(true);
    setPanelError(null);
    try {
      const res = await fetch("/api/staff/vip/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, reservationId: selectedRes.id, undo }),
      });
      if (!res.ok) {
        setPanelError(`${undo ? "Undo check-in" : "Check-in"} failed: ${await readError(res)}`);
      }
      const ok = await load();
      if (!ok) setPanelError((e) => e ?? "Action saved, but refresh failed — tap Refresh.");
    } catch {
      setPanelError(`${undo ? "Undo check-in" : "Check-in"} failed: network error`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease(reason: ReleaseReason) {
    if (!selectedRes) return;
    setBusy(true);
    setPanelError(null);
    try {
      const res = await fetch("/api/staff/vip/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, reservationId: selectedRes.id, reason }),
      });
      if (!res.ok) {
        setPanelError(`Release failed: ${await readError(res)}`);
        setReleaseStep({ kind: "none" });
        await load();
        return;
      }
      await load();
      closePanel();
    } catch {
      setPanelError("Release failed: network error");
      setReleaseStep({ kind: "none" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 max-w-sm mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-zinc-400 text-sm">VIP booths</p>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="text-purple-400 text-sm font-medium hover:text-purple-300 disabled:opacity-50 transition-colors"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loadError && (
        <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-2.5">
          {loadError}
        </p>
      )}

      {!data && !loadError && (
        <p className="text-zinc-500 text-sm text-center py-10">Loading…</p>
      )}

      {data && (
        <VipDoorMap
          areas={data.areas}
          booths={data.booths}
          stateByBoothId={stateByBoothId}
          selectedBoothId={selectedBoothId}
          onBoothSelect={selectBooth}
          activeRoom={activeRoom}
          onRoomChange={setActiveRoom}
        />
      )}

      {/* Detail panel */}
      {data && selectedBooth && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-white text-xl font-bold">
                {selectedBooth.label}
                {!selectedRes && <span className="text-zinc-400 font-normal"> — Available</span>}
              </p>
              {selectedArea && (
                <p className="text-zinc-500 text-sm mt-0.5">{selectedArea.name}</p>
              )}
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="text-zinc-500 hover:text-white text-lg leading-none px-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {selectedRes && (
            <>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold">
                    Under: {selectedRes.booth_under_name || selectedRes.customer.full_name || "—"}
                  </p>
                  {selectedRes.is_comp && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#3a2e12] text-[#f5d77a] border border-[#d4af37]">
                      COMP
                    </span>
                  )}
                </div>
                <p className="text-zinc-300">Guest: {selectedRes.customer.full_name ?? "—"}</p>
                <p className="text-zinc-300">
                  Phone:{" "}
                  {selectedRes.customer.phone ? (
                    <a href={`tel:${selectedRes.customer.phone}`} className="text-purple-400 underline underline-offset-2">
                      {selectedRes.customer.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-zinc-300">Entries: {selectedRes.entries_included ?? "—"}</p>
                <p className="text-zinc-300">Bottle minimum: {data.event.bottle_minimum ?? "—"}</p>
                {selectedRes.checked_in_at && (
                  <p className="text-[#86efac] font-medium">
                    Checked in at {formatTime(selectedRes.checked_in_at)}
                  </p>
                )}
              </div>

              {panelError && (
                <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/40 rounded-xl px-3 py-2">
                  {panelError}
                </p>
              )}

              {releaseStep.kind === "none" && (
                <div className="space-y-3">
                  {selectedRes.checked_in_at ? (
                    <button
                      type="button"
                      onClick={() => handleCheckIn(true)}
                      disabled={busy}
                      className="w-full border border-zinc-500 text-white hover:bg-zinc-800 disabled:opacity-50 font-semibold py-4 rounded-2xl transition-colors"
                    >
                      {busy ? "Working…" : "Undo Check-In"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCheckIn(false)}
                      disabled={busy}
                      className="w-full bg-[#22c55e] hover:brightness-110 disabled:opacity-50 text-black font-bold py-5 rounded-2xl transition text-xl"
                    >
                      {busy ? "Checking in…" : "Check In"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setPanelError(null); setReleaseStep({ kind: "reason" }); }}
                    disabled={busy}
                    className="w-full border border-[#ef4444] text-[#ef4444] hover:bg-red-950/30 disabled:opacity-50 font-semibold py-3 rounded-2xl transition-colors"
                  >
                    Clear Booth
                  </button>
                </div>
              )}

              {releaseStep.kind === "reason" && (
                <div className="space-y-3">
                  <p className="text-zinc-300 text-sm">Why is this booth being cleared?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReleaseStep({ kind: "confirm", reason: "no_show" })}
                      className="border border-zinc-600 text-white hover:bg-zinc-800 font-semibold py-3 rounded-xl transition-colors"
                    >
                      No-show
                    </button>
                    <button
                      type="button"
                      onClick={() => setReleaseStep({ kind: "confirm", reason: "cancelled" })}
                      className="border border-zinc-600 text-white hover:bg-zinc-800 font-semibold py-3 rounded-xl transition-colors"
                    >
                      Cancelled
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReleaseStep({ kind: "none" })}
                    className="w-full text-zinc-400 hover:text-white text-sm py-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {releaseStep.kind === "confirm" && (
                <div className="space-y-3">
                  <p className="text-white text-sm">
                    Release {selectedBooth.label}? It will show as available again. This
                    can&apos;t be undone.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReleaseStep({ kind: "none" })}
                      disabled={busy}
                      className="border border-zinc-600 text-white hover:bg-zinc-800 disabled:opacity-50 font-semibold py-3 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRelease(releaseStep.reason)}
                      disabled={busy}
                      className="bg-[#ef4444] hover:brightness-110 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
                    >
                      {busy ? "Releasing…" : "Release"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {!selectedRes && panelError && (
            <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/40 rounded-xl px-3 py-2">
              {panelError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
