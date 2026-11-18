"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatEventDate } from "@/lib/formatEvent";
import { midnightClubLayout } from "@/app/events/[id]/vip/venues/midnight-club-layout";
import VipDoorMap, {
  type DoorArea,
  type DoorBooth,
  type DoorBoothState,
} from "@/app/door/VipDoorMap";

type EventItem = { id: string; name: string; event_date: string };

type Reservation = {
  id: string;
  booth_id: string;
  booth_under_name: string | null;
  entries_included: number | null;
  fee: number | null;
  checked_in_at: string | null;
  source: string;
  customer: { full_name: string | null; phone: string | null };
  is_comp: boolean;
};

type VipData = {
  event: { id: string; name: string; event_date: string; bottle_minimum: number | null };
  areas: DoorArea[];
  booths: DoorBooth[];
  reservations: Reservation[];
};

type ReserveType = "manual" | "comp";
type ReleaseReason = "no_show" | "cancelled";
type ReleaseStep =
  | { kind: "none" }
  | { kind: "reason" }
  | { kind: "confirm"; reason: ReleaseReason };

const REFRESH_MS = 30_000;

const SOURCE_LABEL: Record<string, string> = {
  online: "Online",
  manual: "Manual",
  comp: "Comp",
};

const inputClass =
  "w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-plum/60 transition-colors text-sm";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error) return `${data.error} (${res.status})`;
  } catch {}
  return `Request failed (${res.status})`;
}

export default function AdminVipView() {
  // ── Auth (mirrors /admin/photos) ────────────────────────────────────────
  const [phase, setPhase] = useState<"auth" | "ready">("auth");
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const passcodeRef = useRef("");

  // ── Events ──────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string>("");

  // ── Booth data ──────────────────────────────────────────────────────────
  const [data, setData] = useState<VipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState(midnightClubLayout.rooms[0].id);

  // ── Panel ───────────────────────────────────────────────────────────────
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [underName, setUnderName] = useState("");
  const [reserveType, setReserveType] = useState<ReserveType>("manual");
  const [releaseStep, setReleaseStep] = useState<ReleaseStep>({ kind: "none" });
  const [busy, setBusy] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(false);
    try {
      const res = await fetch("/api/staff/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) { setAuthError(true); return; }
      passcodeRef.current = passcode;

      const evRes = await fetch("/api/staff/vip/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!evRes.ok) {
        setEventsError(`Could not load events: ${await readError(evRes)}`);
      } else {
        const evData = await evRes.json();
        const list = (evData.events ?? []) as EventItem[];
        setEvents(list);
        setEventId(list[0]?.id ?? "");
      }
      setPhase("ready");
    } catch {
      setEventsError("Could not load events: network error");
      setPhase("ready");
    } finally {
      setAuthLoading(false);
    }
  }

  const load = useCallback(async (): Promise<boolean> => {
    if (!eventId) return false;
    setLoading(true);
    try {
      const res = await fetch("/api/staff/vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcodeRef.current, eventId }),
      });
      if (!res.ok) {
        setLoadError(`Could not load booths: ${await readError(res)}`);
        return false;
      }
      const next = (await res.json()) as VipData;
      setData(next.event.id === eventId ? next : null);
      setLoadError(null);
      return true;
    } catch {
      setLoadError("Could not load booths: network error");
      return false;
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Load on event change + 30s refresh
  useEffect(() => {
    if (phase !== "ready" || !eventId) return;
    const first = setTimeout(load, 0);
    const id = setInterval(load, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [phase, eventId, load]);

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

  function resetForm() {
    setGuestName("");
    setPhone("");
    setUnderName("");
    setReserveType("manual");
  }

  function selectBooth(boothId: string) {
    setSelectedBoothId(boothId);
    setReleaseStep({ kind: "none" });
    setPanelError(null);
    resetForm();
  }

  function closePanel() {
    setSelectedBoothId(null);
    setReleaseStep({ kind: "none" });
    setPanelError(null);
    resetForm();
  }

  function changeEvent(id: string) {
    setEventId(id);
    setData(null);
    setLoadError(null);
    closePanel();
  }

  const canReserve = guestName.trim().length > 0 && phone.trim().length > 0;

  async function handleReserve(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBoothId || !canReserve) return;
    setBusy(true);
    setPanelError(null);
    try {
      const res = await fetch("/api/staff/vip/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode: passcodeRef.current,
          eventId,
          boothId: selectedBoothId,
          guestName: guestName.trim(),
          phone: phone.trim(),
          underName: underName.trim() || undefined,
          type: reserveType,
        }),
      });
      if (res.status === 409) {
        setPanelError("Booth was just taken — refreshing");
        await load();
        return;
      }
      if (!res.ok) {
        setPanelError(`Reserve failed: ${await readError(res)}`);
        return;
      }
      resetForm();
      const ok = await load();
      if (!ok) setPanelError("Booked, but refresh failed — tap Refresh.");
    } catch {
      setPanelError("Reserve failed: network error");
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
        body: JSON.stringify({ passcode: passcodeRef.current, reservationId: selectedRes.id, reason }),
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

  // ── Auth screen ───────────────────────────────────────────────────────────
  if (phase === "auth") {
    return (
      <main className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p className="text-4xl mb-3">🍾</p>
            <h1 className="font-display text-2xl font-bold">VIP Bookings</h1>
            <p className="text-text-dim text-sm mt-1">Staff access only</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="password"
              required
              autoFocus
              placeholder="Staff passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-4 text-text text-center text-xl tracking-widest placeholder:text-text-dim focus:outline-none focus:border-plum/60 transition-colors"
            />
            {authError && (
              <p className="text-red-400 text-sm text-center">Incorrect passcode</p>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-plum hover:bg-plum-bright disabled:opacity-50 text-text font-semibold py-4 rounded-2xl transition-colors"
            >
              {authLoading ? "Verifying…" : "Enter"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── Main screen ───────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="max-w-xl mx-auto px-4 pt-8 pb-16 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">VIP Bookings</h1>
          <p className="text-text-dim text-sm mt-1">Midnight Club · Staff only</p>
        </div>

        {eventsError && <ErrorBox>{eventsError}</ErrorBox>}

        {/* Event picker */}
        <div>
          <label className="block text-text-muted text-sm mb-2">Event</label>
          {events.length === 0 ? (
            <p className="text-text-dim text-sm">No upcoming events</p>
          ) : (
            <select
              value={eventId}
              onChange={(e) => changeEvent(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-plum/60 transition-colors"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} — {formatEventDate(ev.event_date)}
                </option>
              ))}
            </select>
          )}
        </div>

        {eventId && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-text-muted text-sm">Booths</p>
              <button
                type="button"
                onClick={() => load()}
                disabled={loading}
                className="text-plum-bright text-sm font-medium hover:underline underline-offset-2 disabled:opacity-50"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {loadError && <ErrorBox>{loadError}</ErrorBox>}
            {!data && !loadError && (
              <p className="text-text-dim text-sm text-center py-10">Loading…</p>
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
          </>
        )}

        {/* Panel */}
        {data && selectedBooth && (
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-bold text-text">
                  {selectedRes ? selectedBooth.label : `Reserve ${selectedBooth.label}`}
                </p>
                {selectedArea && <p className="text-text-dim text-sm mt-0.5">{selectedArea.name}</p>}
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="text-text-dim hover:text-text-muted text-lg leading-none px-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {panelError && <ErrorBox>{panelError}</ErrorBox>}

            {/* Available → reserve form */}
            {!selectedRes && (
              <form onSubmit={handleReserve} className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Guest name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="tel"
                  required
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder={guestName.trim() || "Booth under name (optional)"}
                  value={underName}
                  onChange={(e) => setUnderName(e.target.value)}
                  className={inputClass}
                />
                <p className="text-text-dim text-xs -mt-1">Booth under name — leave blank to use guest name</p>

                <div className="flex gap-2">
                  {(
                    [
                      ["manual", "Paid (manual)"],
                      ["comp", "Comp"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setReserveType(id)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        reserveType === id
                          ? "bg-plum text-text border-plum"
                          : "bg-surface-2 border-border text-text-muted hover:border-plum/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!canReserve || busy}
                  className="w-full bg-plum hover:bg-plum-bright disabled:opacity-40 disabled:cursor-not-allowed text-text font-semibold py-4 rounded-2xl transition-colors"
                >
                  {busy ? "Reserving…" : `Reserve ${selectedBooth.label}`}
                </button>
              </form>
            )}

            {/* Booked / checked in → details + clear */}
            {selectedRes && (
              <>
                <div className="space-y-1.5 text-sm">
                  <p className="text-text font-semibold">
                    Under: {selectedRes.booth_under_name || selectedRes.customer.full_name || "—"}
                  </p>
                  <p className="text-text-muted">Guest: {selectedRes.customer.full_name ?? "—"}</p>
                  <p className="text-text-muted">
                    Phone:{" "}
                    {selectedRes.customer.phone ? (
                      <a href={`tel:${selectedRes.customer.phone}`} className="text-plum-bright underline underline-offset-2">
                        {selectedRes.customer.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </p>
                  <p className="text-text-muted">Entries: {selectedRes.entries_included ?? "—"}</p>
                  <p className="text-text-muted">Bottle minimum: {data.event.bottle_minimum ?? "—"}</p>
                  <p className="text-text-muted">
                    Source: {SOURCE_LABEL[selectedRes.source] ?? selectedRes.source}
                  </p>
                  {selectedRes.checked_in_at && (
                    <p className="text-[#86efac] font-medium">
                      Checked in at {formatTime(selectedRes.checked_in_at)}
                    </p>
                  )}
                </div>

                {releaseStep.kind === "none" && (
                  <button
                    type="button"
                    onClick={() => { setPanelError(null); setReleaseStep({ kind: "reason" }); }}
                    disabled={busy}
                    className="w-full border border-[#ef4444] text-[#ef4444] hover:bg-red-950/30 disabled:opacity-50 font-semibold py-3 rounded-2xl transition-colors"
                  >
                    Clear Booth
                  </button>
                )}

                {releaseStep.kind === "reason" && (
                  <div className="space-y-3">
                    <p className="text-text-muted text-sm">Why is this booth being cleared?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setReleaseStep({ kind: "confirm", reason: "no_show" })}
                        className="bg-surface-2 border border-border text-text hover:border-plum/40 font-semibold py-3 rounded-xl transition-colors"
                      >
                        No-show
                      </button>
                      <button
                        type="button"
                        onClick={() => setReleaseStep({ kind: "confirm", reason: "cancelled" })}
                        className="bg-surface-2 border border-border text-text hover:border-plum/40 font-semibold py-3 rounded-xl transition-colors"
                      >
                        Cancelled
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReleaseStep({ kind: "none" })}
                      className="w-full text-text-dim hover:text-text-muted text-sm py-2 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {releaseStep.kind === "confirm" && (
                  <div className="space-y-3">
                    <p className="text-text text-sm">
                      Release {selectedBooth.label}? It will show as available again. This
                      can&apos;t be undone.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setReleaseStep({ kind: "none" })}
                        disabled={busy}
                        className="bg-surface-2 border border-border text-text hover:border-plum/40 disabled:opacity-50 font-semibold py-3 rounded-xl transition-colors"
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
          </div>
        )}
      </div>
    </main>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-2.5">
      {children}
    </p>
  );
}
