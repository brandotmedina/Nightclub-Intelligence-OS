import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { getClientBySlug } from "@/lib/get-client";
import { formatEventDate } from "@/lib/formatEvent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AlbumsPage({
  params,
}: {
  params: Promise<{ client: string }>;
}) {
  const { client: slug } = await params;

  const client = await getClientBySlug(slug);
  if (!client) notFound();

  const { data: albums } = await supabase
    .from("photo_albums")
    .select("id, title, shoot_date, event_id")
    .eq("client_id", client.id)
    .eq("is_published", true)
    .order("shoot_date", { ascending: false });

  // For each album fetch the first photo thumbnail (cover)
  const covers = await Promise.all(
    (albums ?? []).map(async (album) => {
      const { data } = await supabase
        .from("photos")
        .select("thumbnail_url")
        .eq("album_id", album.id)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      return { albumId: album.id, thumbnail_url: data?.thumbnail_url ?? null };
    })
  );

  const coverMap = Object.fromEntries(
    covers.map((c) => [c.albumId, c.thumbnail_url])
  );

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
        <Link
          href={`/${slug}/events`}
          className="inline-flex items-center gap-1 text-text-dim hover:text-text-muted text-sm mb-6 transition-colors"
        >
          ← Events
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-text leading-tight">
            Photo Albums
          </h1>
        </div>

        {!albums || albums.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl opacity-20 mb-4">📷</span>
            <p className="text-text-muted text-base">No albums yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {albums.map((album) => {
              const cover = coverMap[album.id];
              return (
                <Link
                  key={album.id}
                  href={`/${slug}/events/${album.event_id}/photos`}
                  className="group block bg-surface border border-border rounded-2xl overflow-hidden hover:border-plum/40 transition-colors"
                >
                  <div className="aspect-square bg-surface-2 overflow-hidden">
                    {cover ? (
                      <Image
                        src={cover}
                        alt={album.title}
                        width={400}
                        height={400}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-20">📷</span>
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-text font-semibold text-sm leading-tight line-clamp-2">
                      {album.title}
                    </p>
                    {album.shoot_date && (
                      <p className="text-text-dim text-xs mt-1 tracking-wide">
                        {formatEventDate(album.shoot_date)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
