"use client";

import { useState } from "react";
import Link from "next/link";
import TicketPurchaseForm from "./TicketPurchaseForm";

export default function EventCTAs({
  eventId,
  price,
  isFree,
}: {
  eventId: string;
  price: number;
  isFree: boolean;
}) {
  const [ticketsOpen, setTicketsOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Button row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Door Tickets — plum primary */}
        <button
          type="button"
          onClick={() => setTicketsOpen((o) => !o)}
          className="flex flex-col items-center justify-center gap-0.5 bg-plum hover:bg-plum-bright text-text font-semibold py-4 px-3 rounded-2xl transition-colors shadow-[0_0_24px_rgba(176,31,144,0.35)] text-center"
        >
          <span className="text-sm font-semibold leading-tight">
            {isFree ? "Get Free Ticket" : `Door Tickets · $${price}`}
          </span>
          <span className="text-xs text-text/60 font-normal">
            General entry
          </span>
        </button>

        {/* VIP Reservation — gold accent */}
        <Link
          href={`/events/${eventId}/vip`}
          className="flex flex-col items-center justify-center gap-0.5 bg-surface border border-gold/40 hover:border-gold/70 text-gold font-semibold py-4 px-3 rounded-2xl transition-colors text-center"
        >
          <span className="text-sm font-semibold leading-tight">
            VIP Reservation · $50
          </span>
          <span className="text-xs text-gold/50 font-normal">
            Includes 8 entries • 1-bottle minimum
          </span>
        </Link>
      </div>

      {/* Collapsible ticket form — grid-rows trick, no JS height calc */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
        style={{
          gridTemplateRows: ticketsOpen ? "1fr" : "0fr",
          opacity: ticketsOpen ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="bg-surface border border-border rounded-2xl p-6 pt-5">
            <TicketPurchaseForm eventId={eventId} price={price} />
          </div>
        </div>
      </div>
    </div>
  );
}
