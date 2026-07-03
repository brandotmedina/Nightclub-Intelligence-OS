import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";
import EventCard from "@/components/EventCard";

export const dynamic = "force-dynamic";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ client: string }>;
}) {
  const { client: slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const today = new Date().toISOString().split("T")[0];

  const { data: events, error } = await supabaseAdmin
    .from("events")
    .select("id, name, event_date, price, flyer_url")
    .eq("client_id", client.id)
    .gte("event_date", today)
    .order("event_date", { ascending: true });

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-text-dim text-xs tracking-[0.3em] uppercase mb-2">
            Midnight Club
          </p>
          <h1 className="font-display text-3xl font-bold text-text">
            Upcoming Events
          </h1>
        </div>

        {error ? (
          <div className="bg-surface border border-border rounded-xl p-4 text-text-muted text-sm">
            Could not load events. Please try again.
          </div>
        ) : !events || events.length === 0 ? (
          <p className="text-text-muted text-sm">No upcoming events scheduled.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <EventCard event={event} clientSlug={slug} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
