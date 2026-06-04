"use client";

import { useState } from "react";

export default function TicketPurchaseForm({
  eventId,
  price,
}: {
  eventId: number;
  price: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFree = price === 0;
  const total = price * quantity;

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
        <label className="block text-sm text-zinc-400 mb-2">Quantity</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center hover:bg-zinc-700 transition-colors text-lg leading-none"
          >
            −
          </button>
          <span className="text-white font-semibold text-lg w-6 text-center">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(10, quantity + 1))}
            className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center hover:bg-zinc-700 transition-colors text-lg leading-none"
          >
            +
          </button>
          <span className="text-zinc-400 text-sm ml-1">
            {isFree ? "Free Entry" : `$${price} each · $${total} total`}
          </span>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Full Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Phone Number</label>
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 000-0000"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors"
      >
        {loading
          ? isFree
            ? "Getting your ticket…"
            : "Redirecting to payment…"
          : isFree
          ? `Get ${quantity} Free Ticket${quantity > 1 ? "s" : ""}`
          : `Buy ${quantity} Ticket${quantity > 1 ? "s" : ""} · $${total}`}
      </button>

      {!isFree && (
        <p className="text-xs text-zinc-500 text-center">
          Secured by Stripe · you&apos;ll be redirected to complete payment
        </p>
      )}
    </form>
  );
}
