import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatEventDate, formatPrice } from "@/lib/formatEvent";
import TicketPurchaseForm from "./TicketPurchaseForm";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const clientId = process.env.CLIENT_ID;

  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, event_date, price, flyer_url, dj_lineup, genre")
    .eq("client_id", clientId)
    .eq("id", id)
    .single();

  if (error || !event) notFound();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-8 transition-colors"
        >
          ‹ All Events
        </Link>

        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-zinc-900 mb-8">
          {event.flyer_url ? (
            <Image
              src={event.flyer_url}
              alt={`${event.name} flyer`}
              width={600}
              height={600}
              className="object-cover w-full h-full"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-pink-900 to-zinc-900 flex flex-col items-center justify-center gap-3">
              <span className="text-6xl">🎵</span>
              <span className="text-zinc-400 text-sm">Flyer coming soon</span>
            </div>
          )}
        </div>

        <div className="mb-6">
          <p className="text-zinc-400 text-sm mb-1">
            {formatEventDate(event.event_date)}
          </p>
          <h1 className="text-3xl font-bold tracking-tight leading-tight mb-2">
            {event.name}
          </h1>
          <span
            className={`inline-block text-sm font-semibold px-3 py-1 rounded-full ${
              event.price === 0
                ? "bg-green-900/50 text-green-300 border border-green-800"
                : "bg-zinc-800 text-zinc-200 border border-zinc-700"
            }`}
          >
            {formatPrice(event.price)}
          </span>
        </div>

        <div className="space-y-4 mb-10">
          {event.dj_lineup && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">DJ Lineup</p>
              <p className="text-white text-sm">{event.dj_lineup}</p>
            </div>
          )}
          {event.genre && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Music</p>
              <p className="text-white text-sm">{event.genre}</p>
            </div>
          )}
        </div>

        {/* ── BUY TICKETS SECTION ───────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5">
            {event.price === 0 ? "Get Your Free Ticket" : "Buy Tickets"}
          </h2>
          <TicketPurchaseForm eventId={event.id} price={event.price} />
        </div>
      </div>
    </main>
  );
}
