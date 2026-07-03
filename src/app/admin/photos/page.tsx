import { supabaseAdmin } from "@/lib/supabase-admin";
import { getClientBySlug } from "@/lib/get-client";
import PhotoUploader from "./PhotoUploader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPhotosPage() {
  const client = await getClientBySlug("midnight-club");

  // If client doesn't resolve, render the uploader anyway — it will gate on passcode
  // and the API routes will notFound() on bad slug server-side.
  const clientId = client?.id ?? null;

  const [eventsResult, albumsResult] = await Promise.all([
    clientId
      ? supabaseAdmin
          .from("events")
          .select("id, name, event_date")
          .eq("client_id", clientId)
          .order("event_date", { ascending: false })
      : Promise.resolve({ data: [] }),
    clientId
      ? supabaseAdmin
          .from("photo_albums")
          .select("id, title, event_id")
          .eq("client_id", clientId)
          .order("shoot_date", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const events = (eventsResult.data ?? []) as { id: string; name: string; event_date: string }[];
  const albums = (albumsResult.data ?? []) as { id: string; title: string; event_id: string }[];

  return <PhotoUploader events={events} albums={albums} clientId={clientId ?? ""} />;
}
