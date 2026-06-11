"use client";

import { useEffect, useRef, useState } from "react";
import { formatEventDate } from "@/lib/formatEvent";

type Phase = "auth" | "select-event" | "scanning";
type ScanView = "scan" | "lookup";
type ResultStatus = "valid" | "already_used" | "wrong_event" | "not_found";
type ScanResult = { status: ResultStatus; checkedInAt?: string } | null;
type EventItem = { id: string; name: string; event_date: string };
type GuestResult = {
  customerId: string;
  fullName: string;
  phone: string;
  total: number;
  used: number;
  remaining: number;
};
type GuestCounts = { total: number; used: number; remaining: number };

export default function DoorTool() {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("auth");
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // ── Scanner state ──────────────────────────────────────────────────────────
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const storedPassRef = useRef("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Lookup state ───────────────────────────────────────────────────────────
  const [view, setView] = useState<ScanView>("scan");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GuestResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestResult | null>(null);
  const [guestCounts, setGuestCounts] = useState<GuestCounts | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // ── Auth ───────────────────────────────────────────────────────────────────
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
      if (!res.ok) {
        setAuthError(true);
        return;
      }
      storedPassRef.current = passcode;
      const evRes = await fetch("/api/staff/events");
      const evData = await evRes.json();
      setEvents(evData.events ?? []);
      setPhase("select-event");
    } finally {
      setAuthLoading(false);
    }
  }

  function selectEvent(ev: EventItem) {
    setSelectedEvent(ev);
    setScanResult(null);
    setView("scan");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedGuest(null);
    setGuestCounts(null);
    setSearchDone(false);
    setPhase("scanning");
  }

  function clearResult() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setScanResult(null);
    try {
      scannerRef.current?.resume();
    } catch {}
  }

  // ── Scanner init ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "scanning" || !selectedEvent) return;

    let stopped = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped) return;
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          async (text: string) => {
            try {
              await scanner.pause(true);
            } catch {}
            if (timerRef.current) clearTimeout(timerRef.current);

            const res = await fetch("/api/staff/checkin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                passcode: storedPassRef.current,
                qrCode: text,
                eventId: selectedEvent.id,
              }),
            });
            const data = await res.json();
            setScanResult(data);

            timerRef.current = setTimeout(() => {
              setScanResult(null);
              try {
                scanner.resume();
              } catch {}
            }, 4000);
          },
          () => {} // per-frame decode errors — silent
        )
        .catch(console.error);
    });

    return () => {
      stopped = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [phase, selectedEvent]);

  // ── Pause/resume scanner when switching to lookup view ─────────────────────
  useEffect(() => {
    if (!scannerRef.current) return;
    if (view === "lookup") {
      try {
        scannerRef.current.pause(true);
      } catch {}
    } else {
      try {
        scannerRef.current.resume();
      } catch {}
    }
  }, [view]);

  // ── Guest search ───────────────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || !selectedEvent) return;
    setSearching(true);
    setSearchDone(false);
    setSelectedGuest(null);
    setGuestCounts(null);
    try {
      const res = await fetch("/api/staff/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode: storedPassRef.current,
          eventId: selectedEvent.id,
          query: searchQuery.trim(),
        }),
      });
      const data = await res.json();
      setSearchResults(data.results ?? []);
      setSearchDone(true);
    } finally {
      setSearching(false);
    }
  }

  function openGuest(guest: GuestResult) {
    setSelectedGuest(guest);
    setGuestCounts({ total: guest.total, used: guest.used, remaining: guest.remaining });
  }

  async function checkIn(all: boolean) {
    if (!selectedGuest || !selectedEvent || !guestCounts) return;
    setCheckingIn(true);
    try {
      const res = await fetch("/api/staff/checkin-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode: storedPassRef.current,
          customerId: selectedGuest.customerId,
          eventId: selectedEvent.id,
          all,
        }),
      });
      const data = await res.json();
      setGuestCounts({
        total: guestCounts.total,
        used: guestCounts.total - data.remaining,
        remaining: data.remaining,
      });
    } finally {
      setCheckingIn(false);
    }
  }

  function switchView(next: ScanView) {
    if (next === "scan") {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedGuest(null);
      setGuestCounts(null);
      setSearchDone(false);
    }
    setView(next);
  }

  // ── Auth screen ────────────────────────────────────────────────────────────
  if (phase === "auth") {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p className="text-5xl mb-3">🚪</p>
            <h1 className="text-2xl font-bold">Door Check-In</h1>
            <p className="text-zinc-500 text-sm mt-1">Staff access only</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="password"
              required
              autoFocus
              placeholder="Staff passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-4 text-white text-center text-xl tracking-widest placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
            {authError && (
              <p className="text-red-400 text-sm text-center">Incorrect passcode</p>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-colors text-lg"
            >
              {authLoading ? "Verifying…" : "Enter"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── Event selection ────────────────────────────────────────────────────────
  if (phase === "select-event") {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <div className="max-w-sm mx-auto space-y-6">
          <div className="text-center pt-4">
            <h1 className="text-2xl font-bold">Select Tonight&apos;s Event</h1>
            <p className="text-zinc-500 text-sm mt-1">
              All ticket scans will be validated against this event
            </p>
          </div>
          {events.length === 0 ? (
            <p className="text-zinc-500 text-center py-10">No events found</p>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => selectEvent(ev)}
                  className="w-full bg-zinc-900 border border-zinc-700 hover:border-purple-500 active:bg-zinc-800 rounded-2xl p-5 text-left transition-colors"
                >
                  <p className="font-semibold text-white text-lg">{ev.name}</p>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    {formatEventDate(ev.event_date)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Scanning phase ─────────────────────────────────────────────────────────
  const resultConfig = scanResult
    ? ({
        valid: {
          bg: "bg-green-500",
          icon: "✓",
          label: "VALID",
          sub: "Entry granted",
        },
        already_used: {
          bg: "bg-red-600",
          icon: "✗",
          label: "ALREADY USED",
          sub: scanResult.checkedInAt
            ? `Scanned at ${new Date(scanResult.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "This ticket was already scanned",
        },
        wrong_event: {
          bg: "bg-amber-500",
          icon: "!",
          label: "WRONG EVENT",
          sub: "Ticket belongs to a different event",
        },
        not_found: {
          bg: "bg-red-600",
          icon: "?",
          label: "INVALID / NOT FOUND",
          sub: "No matching ticket",
        },
      } as const)[scanResult.status]
    : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-black shrink-0">
        <button
          onClick={() => {
            setPhase("select-event");
            setScanResult(null);
          }}
          className="text-zinc-400 text-sm hover:text-white transition-colors py-1 px-2"
        >
          ← Event
        </button>
        <div className="text-center">
          <p className="text-white font-semibold text-sm leading-tight">
            {selectedEvent?.name}
          </p>
          <p className="text-zinc-500 text-xs">
            {selectedEvent && formatEventDate(selectedEvent.event_date)}
          </p>
        </div>
        <button
          onClick={() => switchView(view === "scan" ? "lookup" : "scan")}
          className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors py-1 px-2"
        >
          {view === "scan" ? "Look up" : "Scanner"}
        </button>
      </div>

      {/* Scanner view — kept in DOM so the camera stream stays alive */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-4"
        style={{ display: view === "scan" ? "flex" : "none" }}
      >
        <div
          id="qr-reader"
          className="w-full max-w-sm rounded-2xl overflow-hidden"
        />
        <p className="text-zinc-600 text-sm mt-5 text-center">
          Point camera at a ticket QR code
        </p>
      </div>

      {/* Lookup view */}
      {view === "lookup" && (
        <div className="flex-1 overflow-y-auto">
          {!selectedGuest ? (
            /* Search screen */
            <div className="p-4 space-y-4 max-w-sm mx-auto">
              <p className="text-zinc-400 text-sm text-center pt-2">
                Search by guest name or phone number
              </p>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Name or phone…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchDone(false);
                  }}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold px-4 py-3 rounded-xl transition-colors shrink-0"
                >
                  {searching ? "…" : "Search"}
                </button>
              </form>

              {searchDone && searchResults.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-6">
                  No guests found for this event
                </p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((guest) => (
                    <button
                      key={guest.customerId}
                      onClick={() => openGuest(guest)}
                      className="w-full bg-zinc-900 border border-zinc-700 hover:border-purple-500 active:bg-zinc-800 rounded-xl px-4 py-4 text-left transition-colors"
                    >
                      <p className="text-white font-semibold">{guest.fullName}</p>
                      <p className="text-zinc-500 text-sm mt-0.5">{guest.phone}</p>
                      <p className="text-xs mt-2">
                        <span className="text-zinc-400">
                          {guest.total} ticket{guest.total !== 1 ? "s" : ""}
                        </span>
                        <span className="text-zinc-600"> · </span>
                        <span className={guest.used > 0 ? "text-amber-400" : "text-zinc-500"}>
                          {guest.used} checked in
                        </span>
                        <span className="text-zinc-600"> · </span>
                        <span className={guest.remaining > 0 ? "text-green-400" : "text-zinc-500"}>
                          {guest.remaining} remaining
                        </span>
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Guest detail screen */
            <div className="p-4 max-w-sm mx-auto space-y-5">
              <button
                onClick={() => {
                  setSelectedGuest(null);
                  setGuestCounts(null);
                }}
                className="text-zinc-400 text-sm hover:text-white transition-colors pt-2 block"
              >
                ← Back to results
              </button>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <p className="text-white text-xl font-bold">{selectedGuest.fullName}</p>
                <p className="text-zinc-500 text-sm mt-0.5">{selectedGuest.phone}</p>
                {guestCounts && (
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-zinc-800 rounded-xl py-3">
                      <p className="text-white text-2xl font-bold">{guestCounts.total}</p>
                      <p className="text-zinc-400 text-xs mt-0.5">Total</p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl py-3">
                      <p className={`text-2xl font-bold ${guestCounts.used > 0 ? "text-amber-400" : "text-zinc-500"}`}>
                        {guestCounts.used}
                      </p>
                      <p className="text-zinc-400 text-xs mt-0.5">In</p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl py-3">
                      <p className={`text-2xl font-bold ${guestCounts.remaining > 0 ? "text-green-400" : "text-zinc-500"}`}>
                        {guestCounts.remaining}
                      </p>
                      <p className="text-zinc-400 text-xs mt-0.5">Left</p>
                    </div>
                  </div>
                )}
              </div>

              {guestCounts && guestCounts.remaining > 0 ? (
                <div className="space-y-3">
                  <button
                    onClick={() => checkIn(false)}
                    disabled={checkingIn}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-5 rounded-2xl transition-colors text-xl"
                  >
                    {checkingIn ? "Checking in…" : "Check in 1"}
                  </button>
                  {guestCounts.remaining > 1 && (
                    <button
                      onClick={() => checkIn(true)}
                      disabled={checkingIn}
                      className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-colors"
                    >
                      {checkingIn
                        ? "Checking in…"
                        : `Check in all ${guestCounts.remaining} remaining`}
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 text-center">
                  <p className="text-zinc-400">All tickets checked in ✓</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Full-screen scan result overlay */}
      {scanResult && resultConfig && (
        <div
          className={`fixed inset-0 ${resultConfig.bg} flex flex-col items-center justify-center z-50 select-none`}
          onClick={clearResult}
        >
          <p
            className="text-white font-black leading-none"
            style={{ fontSize: "clamp(6rem, 30vw, 10rem)" }}
          >
            {resultConfig.icon}
          </p>
          <p
            className="text-white font-black mt-4 text-center px-6"
            style={{ fontSize: "clamp(2rem, 10vw, 3rem)" }}
          >
            {resultConfig.label}
          </p>
          <p className="text-white/80 mt-3 text-center px-8 text-lg leading-snug">
            {resultConfig.sub}
          </p>
          <p className="text-white/40 text-sm mt-10">Tap to scan next</p>
        </div>
      )}
    </main>
  );
}
