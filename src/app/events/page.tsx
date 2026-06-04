import { supabase } from "@/lib/supabase";
import EventCard from "@/components/EventCard";

export default async function EventsPage() {
  const today = new Date().toISOString().split("T")[0];

  const clientId = process.env.CLIENT_ID;

  const { data: events, error } = await supabase
    .from("events")
    .select("id, name, event_date, price, flyer_url")
    .eq("client_id", clientId)
    .gte("event_date", today)
    .order("event_date", { ascending: true });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Upcoming Events</h1>
        <p className="text-zinc-400 text-sm mb-8">Tap an event for details</p>

        {error ? (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
            <p className="font-semibold mb-1">Could not load events</p>
            <p>{error.message}</p>
          </div>
        ) : !events || events.length === 0 ? (
          <p className="text-zinc-500 text-sm">No upcoming events scheduled.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
