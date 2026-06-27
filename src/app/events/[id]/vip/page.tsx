import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatEventDate } from "@/lib/formatEvent";
import BoothGrid from "./BoothGrid";

export const dynamic = "force-dynamic";

type Area = {
  id: string;
  name: string;
  is_bookable: boolean;
};

type Booth = {
  id: string;
  area_id: string;
  label: string;
};

export default async function VipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const clientId = process.env.CLIENT_ID!;
  const now = new Date().toISOString();

  // 1. Load event
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, name, event_date")
    .eq("client_id", clientId)
    .eq("id", eventId)
    .single();

  if (eventErr || !event) notFound();

  // 2. Load venue areas and booths
  const [{ data: areas }, { data: booths }] = await Promise.all([
    supabase
      .from("venue_areas")
      .select("id, name, is_bookable")
      .eq("client_id", clientId)
      .order("name"),
    supabase
      .from("booths")
      .select("id, area_id, label")
      .eq("client_id", clientId)
      .order("label"),
  ]);

  // 3. Load blocking reservations for this event.
  //    Two independent queries to avoid ambiguous compound .or() with nulls:
  //      - confirmed rows always block (hold_expires_at is null for these — intentional)
  //      - held rows block only when hold_expires_at IS NOT NULL AND > now()
  // Uses admin client to bypass RLS — reservations is not exposed to the anon role
  const [{ data: confirmedRows }, { data: heldRows }] = await Promise.all([
    supabaseAdmin
      .from("reservations")
      .select("booth_id")
      .eq("client_id", clientId)
      .eq("event_id", eventId)
      .eq("status", "confirmed"),
    supabaseAdmin
      .from("reservations")
      .select("booth_id")
      .eq("client_id", clientId)
      .eq("event_id", eventId)
      .eq("status", "held")
      .not("hold_expires_at", "is", null)
      .gt("hold_expires_at", now),
  ]);

  const takenBoothIds = [
    ...(confirmedRows ?? []).map((r) => r.booth_id as string),
    ...(heldRows ?? []).map((r) => r.booth_id as string),
  ];

  return (
    <main className="min-h-screen bg-bg text-text pb-28">
<div className="max-w-lg mx-auto px-4 pt-6 pb-6">
        {/* Back link */}
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1 text-text-dim hover:text-text-muted text-sm mb-6 transition-colors"
        >
          ← Event Details
        </Link>

        {/* Header */}
        <div className="mb-8">
          <p className="text-text-dim text-xs tracking-[0.2em] uppercase mb-1">
            {formatEventDate(event.event_date)}
          </p>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-2xl font-bold text-text leading-tight">
              VIP Booth Reservations
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20 tracking-wide">
              VIP
            </span>
          </div>
          <p className="text-text-muted text-sm">{event.name}</p>
        </div>

        {/* Booth grid (client component for selection state) */}
        <BoothGrid
          areas={(areas ?? []) as Area[]}
          booths={(booths ?? []) as Booth[]}
          takenBoothIds={takenBoothIds}
          eventId={eventId}
        />
      </div>
    </main>
  );
}
