"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import Link from "next/link";
import { formatEventDate } from "@/lib/formatEvent";

type Ticket = {
  id: string;
  qr_code: string;
  price_paid: number;
  status: string;
};

type OrderResponse = {
  ready: boolean;
  order?: { id: string; quantity: number; total: number };
  tickets?: Ticket[];
  event?: { name: string; event_date: string };
};

export default function TicketConfirmation({
  sessionId,
  orderId,
}: {
  sessionId?: string;
  orderId?: string;
}) {
  const [data, setData] = useState<OrderResponse | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const pollUrl = sessionId
    ? `/api/orders?session_id=${sessionId}`
    : orderId
    ? `/api/orders?order_id=${orderId}`
    : null;

  useEffect(() => {
    if (!pollUrl) return;

    let cancelled = false;
    let attempt = 0;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(pollUrl!);
        const json: OrderResponse = await res.json();
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
    return () => {
      cancelled = true;
    };
  }, [pollUrl]);

  if (!pollUrl) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <p className="text-zinc-400">Invalid confirmation link.</p>
      </main>
    );
  }

  if (timedOut) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-zinc-300 font-medium">Taking longer than expected</p>
          <p className="text-zinc-500 text-sm">
            Your payment went through but tickets are still being generated.
            Try refreshing in a moment.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-purple-400 text-sm underline"
          >
            Refresh page
          </button>
        </div>
      </main>
    );
  }

  if (!data?.ready) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">Confirming your payment…</p>
        </div>
      </main>
    );
  }

  const ticketCount = data.tickets?.length ?? 0;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold">You&apos;re in!</h1>
          {data.event && (
            <p className="text-zinc-400 text-sm mt-1">
              {data.event.name} &middot;{" "}
              {formatEventDate(data.event.event_date)}
            </p>
          )}
        </div>

        {/* Screenshot notice */}
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 mb-8 text-center">
          <p className="text-amber-300 text-sm font-medium">
            📸 Screenshot this page to save your ticket
            {ticketCount > 1 ? "s" : ""}
          </p>
          <p className="text-amber-400/70 text-xs mt-1">
            Each QR code is your entry pass — show it at the door
          </p>
        </div>

        {/* Tickets */}
        <div className="space-y-6">
          {data.tickets?.map((ticket, i) => (
            <div
              key={ticket.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-zinc-400 text-sm">
                  Ticket {i + 1}
                  {ticketCount > 1 ? ` of ${ticketCount}` : ""}
                </span>
                <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2.5 py-0.5 rounded-full capitalize">
                  {ticket.status}
                </span>
              </div>

              <div className="bg-white rounded-xl p-5 flex items-center justify-center mb-4">
                <QRCode value={ticket.qr_code} size={200} level="M" />
              </div>

              <p className="text-center text-zinc-600 text-xs font-mono break-all">
                {ticket.qr_code}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/events"
            className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    </main>
  );
}
