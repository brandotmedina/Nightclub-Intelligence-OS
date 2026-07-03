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
  clientSlug,
}: {
  sessionId?: string;
  orderId?: string;
  clientSlug?: string;
}) {
  const [data, setData] = useState<OrderResponse | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const slugParam = clientSlug ? `&client_slug=${clientSlug}` : "";
  const pollUrl = sessionId
    ? `/api/orders?session_id=${sessionId}${slugParam}`
    : orderId
    ? `/api/orders?order_id=${orderId}${slugParam}`
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
            Your payment went through but tickets are still being generated.
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
          <p className="text-text-muted text-sm">Confirming your payment…</p>
        </div>
      </main>
    );
  }

  const ticketCount = data.tickets?.length ?? 0;

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-success text-xl font-bold">✓</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-text mb-1">
            You&apos;re In
          </h1>
          {data.event && (
            <p className="text-text-muted text-sm mt-1">
              {data.event.name} · {formatEventDate(data.event.event_date)}
            </p>
          )}
        </div>

        {/* Screenshot notice */}
        <div className="bg-surface border border-border rounded-xl px-4 py-3 mb-8 text-center">
          <p className="text-text-muted text-sm">
            Screenshot {ticketCount > 1 ? "these pages" : "this page"} — your
            QR code{ticketCount > 1 ? "s are" : " is"} your entry pass
          </p>
          <p className="text-text-dim text-xs mt-0.5">
            Show at the door · one scan per entry
          </p>
        </div>

        {/* Tickets */}
        <div className="space-y-5">
          {data.tickets?.map((ticket, i) => (
            <div
              key={ticket.id}
              className="bg-surface border border-border rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-text-muted text-sm">
                  Ticket {i + 1}
                  {ticketCount > 1 ? ` of ${ticketCount}` : ""}
                </span>
                <span className="text-xs bg-success/10 text-success border border-success/20 px-2.5 py-0.5 rounded-full capitalize font-medium">
                  {ticket.status}
                </span>
              </div>

              <div className="bg-white rounded-xl p-5 flex items-center justify-center mb-4">
                <QRCode value={ticket.qr_code} size={200} level="M" />
              </div>

              <p className="text-center text-text-dim text-xs font-mono break-all">
                {ticket.qr_code}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href={clientSlug ? `/${clientSlug}/events` : "/events"}
            className="text-text-dim text-sm hover:text-text-muted transition-colors"
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    </main>
  );
}
