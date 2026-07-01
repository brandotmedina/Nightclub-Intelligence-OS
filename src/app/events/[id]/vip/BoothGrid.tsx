"use client";

import { useState, useEffect, useCallback } from "react";
import FloorMap from "./FloorMap";
import { midnightClubLayout } from "./venues/midnight-club-layout";

type Area = {
  id: string;
  name: string;
  is_bookable: boolean;
};

type Booth = {
  id: string;
  area_id: string;
  label: string;
  booking_mode: string; // 'online' | 'inquiry'
};

type Phase =
  | { kind: "browse" }
  | { kind: "form"; boothId: string }
  | { kind: "submitting"; boothId: string }
  | { kind: "held"; boothId: string; reservationId: string; holdExpiresAt: string }
  | { kind: "paying"; boothId: string; reservationId: string; holdExpiresAt: string }
  | { kind: "expired" };

// Schema defaults
const BOOTH_FEE = 50;
const ENTRIES_INCLUDED = 8;

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Countdown({ holdExpiresAt, onExpired }: { holdExpiresAt: string; onExpired: () => void }) {
  const getRemaining = useCallback(
    () => new Date(holdExpiresAt).getTime() - Date.now(),
    [holdExpiresAt]
  );
  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    if (remaining <= 0) { onExpired(); return; }
    const id = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r <= 0) { clearInterval(id); onExpired(); }
    }, 500);
    return () => clearInterval(id);
  }, [getRemaining, onExpired, remaining]);

  const urgent = remaining < 120_000; // last 2 min

  return (
    <span className={`tabular-nums font-mono font-semibold ${urgent ? "text-red-400" : "text-gold"}`}>
      {formatCountdown(remaining)}
    </span>
  );
}

export default function BoothGrid({
  areas,
  booths,
  takenBoothIds: takenBoothIdList,
  eventId,
}: {
  areas: Area[];
  booths: Booth[];
  takenBoothIds: string[];
  eventId: string;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "browse" });
  const [localTaken, setLocalTaken] = useState<Set<string>>(
    () => new Set(takenBoothIdList)
  );
  const [activeRoom, setActiveRoom] = useState(midnightClubLayout.rooms[0].id);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bottleAck, setBottleAck] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const boothsByArea = new Map<string, Booth[]>();
  for (const booth of booths) {
    const list = boothsByArea.get(booth.area_id) ?? [];
    list.push(booth);
    boothsByArea.set(booth.area_id, list);
  }

  const selectedBoothId =
    phase.kind === "form" ||
    phase.kind === "submitting" ||
    phase.kind === "held" ||
    phase.kind === "paying"
      ? phase.boothId
      : null;

  const selectedBooth = booths.find((b) => b.id === selectedBoothId) ?? null;

  function handleSelectBooth(boothId: string) {
    if (phase.kind !== "browse") return;
    setPhase({ kind: "form", boothId });
    setFormError(null);
  }

  function handleDeselect() {
    setPhase({ kind: "browse" });
    setFormError(null);
    setBottleAck(false);
  }

  async function handleReserve() {
    if (phase.kind !== "form") return;
    const boothId = phase.boothId;
    setPhase({ kind: "submitting", boothId });
    setFormError(null);

    try {
      const res = await fetch("/api/vip/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, boothId, name, phone, email, bottleAck }),
      });

      const data = await res.json();

      if (res.status === 409 && data.error === "booth_taken") {
        // Mark booth taken locally so it renders Taken immediately
        setLocalTaken((prev) => new Set([...prev, boothId]));
        setPhase({ kind: "browse" });
        setFormError("That booth was just taken — please pick another.");
        return;
      }

      if (!res.ok) throw new Error(data.error ?? "reserve_error");

      setPhase({
        kind: "held",
        boothId,
        reservationId: data.reservationId,
        holdExpiresAt: data.holdExpiresAt,
      });
    } catch {
      setPhase({ kind: "form", boothId });
      setFormError("Something went wrong. Please try again.");
    }
  }

  const canSubmit =
    phase.kind === "form" &&
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    email.trim().length > 0 &&
    bottleAck;

  async function handlePayment() {
    if (phase.kind !== "held") return;
    const { reservationId, boothId, holdExpiresAt } = phase;
    setPhase({ kind: "paying", boothId, reservationId, holdExpiresAt });

    try {
      const res = await fetch("/api/vip/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });

      const data = await res.json();

      if (res.status === 410) {
        // Hold expired between Slice 2 and now
        setPhase({ kind: "expired" });
        return;
      }

      if (!res.ok) throw new Error(data.error ?? "checkout_error");

      window.location.href = data.url;
    } catch {
      // Restore held state so user can retry
      setPhase({ kind: "held", boothId, reservationId, holdExpiresAt });
      setFormError("Could not start checkout. Please try again.");
    }
  }

  // ── Held state ──────────────────────────────────────────────────────────────
  if (phase.kind === "held" || phase.kind === "paying") {
    const holdExpiresAt = phase.holdExpiresAt;
    return (
      <div className="space-y-5">
        <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto">
            <span className="text-gold text-xl">⏱</span>
          </div>
          <div>
            <p className="text-text-dim text-xs uppercase tracking-widest mb-1">
              Booth held for you
            </p>
            <p className="font-display text-2xl font-bold text-text">
              {selectedBooth?.label}
            </p>
          </div>
          <div className="bg-surface-2 border border-border rounded-xl px-4 py-3">
            <p className="text-text-dim text-xs mb-1">Time remaining</p>
            <Countdown
              holdExpiresAt={holdExpiresAt}
              onExpired={() => setPhase({ kind: "expired" })}
            />
          </div>
          <div className="text-left bg-surface-2 border border-border rounded-xl px-4 py-3 space-y-1">
            <p className="text-text-dim text-xs uppercase tracking-wider mb-2">Summary</p>
            <p className="text-text-muted text-sm">{selectedBooth?.label} · ${BOOTH_FEE} reservation fee</p>
            <p className="text-text-muted text-sm">Includes {ENTRIES_INCLUDED} entries</p>
            <p className="text-text-muted text-sm">1-bottle minimum required</p>
          </div>
        </div>

        <button
          type="button"
          disabled={phase.kind === "paying"}
          onClick={handlePayment}
          className="block w-full bg-plum hover:bg-plum-bright disabled:opacity-40 disabled:cursor-not-allowed text-text font-semibold py-4 rounded-2xl text-center transition-colors shadow-[0_0_24px_rgba(176,31,144,0.35)]"
        >
          {phase.kind === "paying"
            ? "Redirecting to payment…"
            : `Continue to payment — $${BOOTH_FEE}`}
        </button>

        <p className="text-text-dim text-xs text-center">
          Complete payment before the timer expires to confirm your booth.
        </p>
      </div>
    );
  }

  // ── Expired state ────────────────────────────────────────────────────────────
  if (phase.kind === "expired") {
    return (
      <div className="space-y-5">
        <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-3">
          <p className="font-display text-lg font-semibold text-text">Hold expired</p>
          <p className="text-text-muted text-sm">
            Your hold has expired — this booth may now be available to others.
          </p>
          <button
            type="button"
            onClick={() => {
              setPhase({ kind: "browse" });
              setFormError(null);
              setBottleAck(false);
            }}
            className="text-plum-bright text-sm underline underline-offset-2"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  // ── Browse / form / submitting ───────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {formError && (
        <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-2.5">
          {formError}
        </p>
      )}

      {/* Non-bookable area inquiry panels (e.g. Patio Lounge) */}
      {areas.filter((area) => !area.is_bookable).map((area) => (
        <section key={area.id}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-display text-base font-semibold text-text">
              {area.name}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-text-dim border border-border">
              Inquiry only
            </span>
          </div>
          <div className="bg-surface border border-border rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <p className="text-text-muted text-sm">
              This area is available by request only.
            </p>
            {(() => {
              const inquiryPhone = process.env.NEXT_PUBLIC_VIP_INQUIRY_PHONE;
              return inquiryPhone ? (
                <a
                  href={`tel:${inquiryPhone}`}
                  className="shrink-0 text-xs text-text-muted hover:text-text transition-colors underline underline-offset-2"
                >
                  Call to reserve
                </a>
              ) : (
                <span className="shrink-0 text-xs font-semibold text-text-dim border border-border rounded-xl px-3 py-2 bg-surface-2">
                  Call the venue to reserve
                </span>
              );
            })()}
          </div>
        </section>
      ))}

      {/* Interactive floor map — replaces the booth-card grid */}
      <FloorMap
        layout={midnightClubLayout}
        activeRoom={activeRoom}
        onRoomChange={setActiveRoom}
        areas={areas}
        booths={booths}
        selectedBoothId={selectedBoothId}
        takenBoothIds={localTaken}
        onBoothSelect={handleSelectBooth}
        isIdle={phase.kind === "browse"}
        inquiryPhone={process.env.NEXT_PUBLIC_VIP_INQUIRY_PHONE}
      />

      {/* Sticky bottom — identity form + reserve */}
      <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
        <div className="max-w-lg mx-auto px-4">
          <div className="pointer-events-auto pb-6 pt-10 bg-gradient-to-t from-bg via-bg/95 to-transparent">
            {selectedBooth && (phase.kind === "form" || phase.kind === "submitting") ? (() => {
              const isSubmitting = phase.kind === "submitting";
              return (
              <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-dim text-xs uppercase tracking-wider">
                      Reserve
                    </p>
                    <p className="font-display text-base font-semibold text-text">
                      {selectedBooth.label} · ${BOOTH_FEE} min
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeselect}
                    className="text-text-dim hover:text-text-muted text-sm transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Fields */}
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-plum/60 transition-colors text-sm"
                  />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone Number"
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-plum/60 transition-colors text-sm"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-plum/60 transition-colors text-sm"
                  />
                </div>

                {/* Bottle minimum acknowledgement */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bottleAck}
                    onChange={(e) => setBottleAck(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-plum shrink-0"
                  />
                  <span className="text-text-muted text-xs leading-relaxed">
                    I acknowledge a 1-bottle minimum purchase is required for VIP booths
                  </span>
                </label>

                {/* Reserve button */}
                <button
                  type="button"
                  disabled={!canSubmit || isSubmitting}
                  onClick={handleReserve}
                  className="w-full bg-plum hover:bg-plum-bright disabled:opacity-40 disabled:cursor-not-allowed text-text font-semibold py-4 rounded-2xl transition-colors shadow-[0_0_24px_rgba(176,31,144,0.35)]"
                >
                  {isSubmitting ? "Holding booth…" : `Reserve — $${BOOTH_FEE}`}
                </button>
              </div>
              );
            })() : phase.kind === "browse" && !selectedBooth ? (
              <div className="bg-surface/80 border border-border rounded-2xl px-5 py-4 text-center backdrop-blur-sm">
                <p className="text-text-muted text-sm">
                  Select an available booth above
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
