import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatEventDate } from "@/lib/formatEvent";
import TicketPurchaseForm from "./TicketPurchaseForm";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const clientId = process.env.CLIENT_ID;

  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, event_date, price, flyer_url, dj_lineup, genre, vip_enabled")
    .eq("client_id", clientId)
    .eq("id", id)
    .single();

  if (error || !event) notFound();

  const isFree = event.price === 0;

  return (
    <>
      <main className="min-h-screen bg-bg text-text pb-28">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-6">
          {/* Back link */}
          <Link
            href="/events"
            className="inline-flex items-center gap-1 text-text-dim hover:text-text-muted text-sm mb-6 transition-colors"
          >
            ← All Events
          </Link>

          {/* Full-size flyer — object-contain so tall flyers show uncropped */}
          <div className="w-full rounded-2xl overflow-hidden bg-surface mb-8 flex items-center justify-center">
            {event.flyer_url ? (
              <Image
                src={event.flyer_url}
                alt={`${event.name} flyer`}
                width={600}
                height={900}
                className="object-contain w-full h-auto max-h-[80vh]"
                priority
              />
            ) : (
              <div className="w-full aspect-square bg-gradient-to-br from-plum/20 via-surface to-bg flex flex-col items-center justify-center gap-3">
                <span className="text-5xl opacity-30">🎵</span>
                <span className="text-text-dim text-sm">Flyer coming soon</span>
              </div>
            )}
          </div>

          {/* Event header */}
          <div className="mb-6">
            <p className="text-text-dim text-xs tracking-[0.2em] uppercase mb-2">
              {formatEventDate(event.event_date)}
            </p>
            <h1 className="font-display text-3xl font-bold text-text leading-tight mb-3">
              {event.name}
            </h1>
            <span
              className={`inline-block text-xs font-semibold px-3 py-1 rounded-full tracking-wide ${
                isFree
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-surface-2 text-text-muted border border-border"
              }`}
            >
              {isFree ? "Free Entry" : `$${event.price}`}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-2 mb-8">
            {event.dj_lineup && (
              <div className="bg-surface border border-border rounded-xl px-4 py-3">
                <p className="text-text-dim text-xs uppercase tracking-wider mb-1">
                  DJ Lineup
                </p>
                <p className="text-text-muted text-sm">{event.dj_lineup}</p>
              </div>
            )}
            {event.genre && (
              <div className="bg-surface border border-border rounded-xl px-4 py-3">
                <p className="text-text-dim text-xs uppercase tracking-wider mb-1">
                  Music
                </p>
                <p className="text-text-muted text-sm">{event.genre}</p>
              </div>
            )}
          </div>

          {/* Ticket form */}
          <div
            id="tickets"
            className="bg-surface border border-border rounded-2xl p-6"
          >
            <h2 className="font-display text-lg font-semibold text-text mb-5">
              {isFree ? "Reserve Your Spot" : "Secure Your Tickets"}
            </h2>
            <TicketPurchaseForm eventId={event.id} price={event.price} />
          </div>

          {/* VIP upsell — only shown when vip_enabled is true for this event */}
          {event.vip_enabled && <Link
            href={`/events/${event.id}/vip`}
            className="mt-4 flex items-center justify-between gap-4 bg-surface border border-gold/25 hover:border-gold/50 rounded-2xl px-5 py-4 transition-colors group"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-display text-base font-semibold text-text">
                  VIP Tables
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 tracking-wide">
                  VIP
                </span>
              </div>
              <p className="text-text-muted text-sm">
                Reserve a booth — $50, includes 8 entries. 1-bottle minimum.
              </p>
            </div>
            <span className="text-gold/60 group-hover:text-gold text-lg transition-colors shrink-0">
              →
            </span>
          </Link>}
        </div>
      </main>

      {/* Sticky bottom CTA — anchors to the ticket form */}
      <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
        <div className="max-w-lg mx-auto px-4">
          <div className="pointer-events-auto pb-6 pt-10 bg-gradient-to-t from-bg to-transparent">
            <a
              href="#tickets"
              className="block w-full bg-plum hover:bg-plum-bright text-text font-semibold py-4 rounded-2xl text-center transition-colors shadow-[0_0_28px_rgba(176,31,144,0.4)]"
            >
              {isFree
                ? "Get Free Ticket"
                : `Buy Tickets · $${event.price}`}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
