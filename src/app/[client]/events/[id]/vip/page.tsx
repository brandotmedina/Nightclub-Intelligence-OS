import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";
import { formatEventDate } from "@/lib/formatEvent";
import BoothGrid from "@/app/events/[id]/vip/BoothGrid";

export const dynamic = "force-dynamic";

type Area = { id: string; name: string; is_bookable: boolean };
type Booth = { id: string; area_id: string; label: string; booking_mode: string };

export default async function VipPage({
  params,
}: {
  params: Promise<{ client: string; id: string }>;
}) {
  const { client: slug, id: eventId } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const now = new Date().toISOString();
  const clientId = client.id;
  const inquiryPhone = (client.settings?.vip_inquiry_phone as string | undefined) ?? undefined;

  const { data: event, error: eventErr } = await supabaseAdmin
    .from("events")
    .select("id, name, event_date, vip_enabled")
    .eq("client_id", clientId)
    .eq("id", eventId)
    .single();

  if (eventErr || !event) notFound();
  if (!event.vip_enabled) redirect(`/${slug}/events/${eventId}`);

  const [{ data: areas }, { data: booths }] = await Promise.all([
    supabaseAdmin
      .from("venue_areas")
      .select("id, name, is_bookable")
      .eq("client_id", clientId)
      .order("name"),
    supabaseAdmin
      .from("booths")
      .select("id, area_id, label, booking_mode")
      .eq("client_id", clientId)
      .order("label"),
  ]);

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
        <Link
          href={`/${slug}/events/${eventId}`}
          className="inline-flex items-center gap-1 text-text-dim hover:text-text-muted text-sm mb-6 transition-colors"
        >
          ← Event Details
        </Link>

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

        <BoothGrid
          areas={(areas ?? []) as Area[]}
          booths={(booths ?? []) as Booth[]}
          takenBoothIds={takenBoothIds}
          eventId={eventId}
          clientSlug={slug}
          inquiryPhone={inquiryPhone}
        />
      </div>
    </main>
  );
}
