"use client";

import { useEffect, useRef, useState } from "react";
import { formatEventDate } from "@/lib/formatEvent";

type Phase = "auth" | "select-event" | "scanning";
type ResultStatus = "valid" | "already_used" | "wrong_event" | "not_found";
type ScanResult = { status: ResultStatus; checkedInAt?: string } | null;
type Event = { id: string; name: string; event_date: string };

export default function DoorTool() {
  const [phase, setPhase] = useState<Phase>("auth");
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const storedPassRef = useRef("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function selectEvent(ev: Event) {
    setSelectedEvent(ev);
    setScanResult(null);
    setPhase("scanning");
  }

  function clearResult() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setScanResult(null);
    try {
      scannerRef.current?.resume();
    } catch {}
  }

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

  // ── Auth screen ──────────────────────────────────────────────────────────
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

  // ── Event selection ──────────────────────────────────────────────────────
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

  // ── Scanning ─────────────────────────────────────────────────────────────
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-black">
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
        <div className="w-16" />
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div
          id="qr-reader"
          className="w-full max-w-sm rounded-2xl overflow-hidden"
        />
        <p className="text-zinc-600 text-sm mt-5 text-center">
          Point camera at a ticket QR code
        </p>
      </div>

      {/* Full-screen result overlay */}
      {scanResult && resultConfig && (
        <div
          className={`fixed inset-0 ${resultConfig.bg} flex flex-col items-center justify-center z-50 select-none`}
          onClick={clearResult}
        >
          <p className="text-white font-black leading-none"
             style={{ fontSize: "clamp(6rem, 30vw, 10rem)" }}>
            {resultConfig.icon}
          </p>
          <p className="text-white font-black mt-4 text-center px-6"
             style={{ fontSize: "clamp(2rem, 10vw, 3rem)" }}>
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
