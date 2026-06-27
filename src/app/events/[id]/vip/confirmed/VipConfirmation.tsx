"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEventDate } from "@/lib/formatEvent";

type ConfirmationResponse = {
  ready: boolean;
  reservation?: { id: string; status: string; fee: number; entries_included: number };
  event?: { name: string; event_date: string };
  booth?: { label: string };
};

export default function VipConfirmation({ sessionId }: { sessionId?: string }) {
  const [data, setData] = useState<ConfirmationResponse | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let attempt = 0;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/vip/reservation?session_id=${sessionId}`);
        const json: ConfirmationResponse = await res.json();
        if (cancelled) return;
        setData(json);
        if (!json.ready && attempt < 10) {
          attempt++;
          setTimeout(poll, 2000);
        } else if (!json.ready) {
          setTimedOut(true);
        }
      } catch {
        if (!cancelled && attempt < 10) {
          attempt++;
          setTimeout(poll, 2000);
        }
      }
    }

    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <main className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
        <p className="text-text-muted">Invalid confirmation link.</p>
      </main>
    );
  }

  if (timedOut) {
    return (
      <main className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-text font-semibold">Taking longer than expected</p>
          <p className="text-text-muted text-sm">
            Your payment went through but the reservation is still being confirmed.
            Refresh in a moment.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-plum-bright text-sm underline underline-offset-2"
          >
            Refresh page
          </button>
        </div>
      </main>
    );
  }

  if (!data?.ready) {
    return (
      <main className="min-h-screen bg-bg text-text flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-plum border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-muted text-sm">Confirming your reservation…</p>
        </div>
      </main>
    );
  }

  const { reservation, event, booth } = data;

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-gold text-xl font-bold">✓</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="font-display text-3xl font-bold text-text">
              Booth Reserved
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
              VIP
            </span>
          </div>
          {event && (
            <p className="text-text-muted text-sm mt-1">
              {event.name} · {formatEventDate(event.event_date)}
            </p>
          )}
        </div>

        {/* Confirmation card */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-dim text-xs uppercase tracking-wider mb-1">
                Your booth
              </p>
              <p className="font-display text-2xl font-bold text-text">
                {booth?.label ?? "—"}
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-success/10 text-success border border-success/20">
              Confirmed
            </span>
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-dim">Entries included</span>
              <span className="text-text-muted">
                {reservation?.entries_included ?? 8}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-dim">Bottle minimum</span>
              <span className="text-text-muted">1 bottle required</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-dim">Reservation fee</span>
              <span className="text-text-muted">
                ${reservation?.fee ?? 50}
              </span>
            </div>
          </div>

          <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 text-center">
            <p className="text-text-muted text-sm font-medium">
              Reserved — see you at the door
            </p>
            <p className="text-text-dim text-xs mt-0.5">
              Show this page or give your name at VIP check-in
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/events"
            className="text-text-dim text-sm hover:text-text-muted transition-colors"
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    </main>
  );
}
