"use client";

import { useState } from "react";

export default function TicketPurchaseForm({
  eventId,
  price,
  clientSlug,
}: {
  eventId: string;
  price: number;
  clientSlug?: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFree = price === 0;

  // Integer-cents math (mirrors checkout/route.ts)
  const ticketSubtotalCents = Math.round(price * 100) * quantity;
  const taxCents = Math.round(ticketSubtotalCents * 0.06);
  const taxedSubtotalCents = ticketSubtotalCents + taxCents;
  const totalCents = isFree ? 0 : Math.ceil((taxedSubtotalCents + 30) / (1 - 0.029));
  const feeCents = totalCents - taxedSubtotalCents;

  function fmt(cents: number) {
    return (cents / 100).toFixed(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          quantity,
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          ...(clientSlug ? { clientSlug } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Quantity */}
      <div>
        <label className="block text-text-muted text-sm mb-2">Quantity</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-full bg-surface-2 border border-border text-text flex items-center justify-center hover:border-plum/50 transition-colors text-lg leading-none"
          >
            −
          </button>
          <span className="text-text font-semibold text-xl w-6 text-center tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(10, quantity + 1))}
            className="w-10 h-10 rounded-full bg-surface-2 border border-border text-text flex items-center justify-center hover:border-plum/50 transition-colors text-lg leading-none"
          >
            +
          </button>
          {isFree && (
            <span className="text-success text-sm ml-1 font-medium">
              Free Entry
            </span>
          )}
        </div>
      </div>

      {/* Itemized price breakdown for paid events */}
      {!isFree && (
        <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 space-y-2 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Tickets ({quantity} × ${price})</span>
            <span className="tabular-nums">${fmt(ticketSubtotalCents)}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>KY Sales Tax (6%)</span>
            <span className="tabular-nums">${fmt(taxCents)}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Processing Fee</span>
            <span className="tabular-nums">${fmt(feeCents)}</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between text-text font-semibold">
            <span>Total</span>
            <span className="tabular-nums">${fmt(totalCents)}</span>
          </div>
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-text-muted text-sm mb-1.5">
          Full Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-plum/60 transition-colors"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-text-muted text-sm mb-1.5">
          Phone Number
        </label>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 000-0000"
          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-plum/60 transition-colors"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-text-muted text-sm mb-1.5">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-plum/60 transition-colors"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-plum hover:bg-plum-bright disabled:opacity-40 disabled:cursor-not-allowed text-text font-semibold py-4 rounded-2xl transition-colors shadow-[0_0_24px_rgba(176,31,144,0.35)]"
      >
        {loading
          ? isFree
            ? "Reserving…"
            : "Redirecting to payment…"
          : isFree
          ? `Reserve ${quantity > 1 ? `${quantity} ` : ""}Free Ticket${quantity > 1 ? "s" : ""}`
          : `Checkout · $${fmt(totalCents)}`}
      </button>

      {!isFree && (
        <p className="text-text-dim text-xs text-center">Secured by Stripe</p>
      )}
    </form>
  );
}
