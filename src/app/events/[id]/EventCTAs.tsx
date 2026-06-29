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
      <div className="flex gap-3">
        {/* Door Tickets — plum tinted (Option B) */}
        <button
          type="button"
          onClick={() => setTicketsOpen((o) => !o)}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-plum/10 border border-plum/60 shadow-[0_0_22px_rgba(176,31,144,0.18)] rounded-2xl py-4 px-3 transition-colors text-center hover:bg-plum/15 hover:border-plum/80"
        >
          <span className="text-sm font-medium text-text leading-tight">
            {isFree ? "Get Free Ticket" : `Door Tickets · $${price}`}
          </span>
          <span className="text-[12px] font-normal leading-tight" style={{ color: "#D8A8CC" }}>
            General entry
          </span>
        </button>

        {/* VIP Reservation — gold accent */}
        <Link
          href={`/events/${eventId}/vip`}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-surface border border-gold/40 hover:border-gold/60 rounded-2xl py-4 px-3 transition-colors text-center"
        >
          <span className="text-sm font-medium text-gold leading-tight">
            VIP Reservation · $50
          </span>
          <span className="text-[12px] font-normal leading-tight text-gold/65">
            Includes 8 entries • 1-bottle minimum
          </span>
        </Link>
      </div>

      {/* Collapsible ticket form — grid-rows 0fr→1fr + opacity, no framer-motion */}
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
