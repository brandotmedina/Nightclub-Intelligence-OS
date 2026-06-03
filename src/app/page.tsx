import { supabase } from "@/lib/supabase";

type VenueArea = {
  id: number;
  name: string;
};

export default async function Home() {
  const { data: venueAreas, error } = await supabase
    .from("venue_areas")
    .select("*");

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Nightclub Intelligence OS
          </h1>
          <p className="mt-2 text-zinc-400 text-sm">Database connection test</p>
        </div>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <h2 className="text-lg font-semibold mb-4 text-zinc-200">
            Venue Areas
          </h2>

          {error ? (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
              <p className="font-semibold mb-1">Connection error</p>
              <p>{error.message}</p>
              <p className="mt-2 text-red-400/70 text-xs">
                Make sure your .env.local file has the correct Supabase URL and
                anon key.
              </p>
            </div>
          ) : !venueAreas || venueAreas.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              No venue areas found. Check that the venue_areas table exists and
              has rows.
            </p>
          ) : (
            <ul className="space-y-3">
              {(venueAreas as VenueArea[]).map((area) => (
                <li
                  key={area.id}
                  className="flex items-center gap-3 bg-zinc-800 rounded-lg px-4 py-3"
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  <span className="text-zinc-100">{area.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!error && venueAreas && venueAreas.length > 0 && (
          <p className="text-center text-green-400 text-sm">
            Connected to Supabase — {venueAreas.length} area
            {venueAreas.length !== 1 ? "s" : ""} loaded
          </p>
        )}
      </div>
    </main>
  );
}
