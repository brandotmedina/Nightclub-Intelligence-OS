import Link from "next/link";
import Image from "next/image";
import { formatEventDate, formatPrice } from "@/lib/formatEvent";

type Event = {
  id: string;
  name: string;
  event_date: string;
  price: number;
  flyer_url: string | null;
};

export default function EventCard({ event, clientSlug }: { event: Event; clientSlug?: string }) {
  const isFree = event.price === 0;
  const href = clientSlug ? `/${clientSlug}/events/${event.id}` : `/events/${event.id}`;

  return (
    <Link
      href={href}
      className="flex items-center gap-4 bg-surface hover:bg-surface-2 border border-border hover:border-plum/40 rounded-2xl p-4 transition-colors group"
    >
      {/* Flyer thumbnail */}
      <div className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-surface-2">
        {event.flyer_url ? (
          <Image
            src={event.flyer_url}
            alt={`${event.name} flyer`}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-plum/20 to-surface-2 flex items-center justify-center">
            <span className="text-2xl opacity-50">🎵</span>
          </div>
        )}
      </div>

      {/* Event info */}
      <div className="flex-1 min-w-0">
        <p className="text-text-dim text-xs mb-0.5">
          {formatEventDate(event.event_date)}
        </p>
        <h2 className="font-display text-text font-semibold text-base leading-snug truncate group-hover:text-plum-bright transition-colors">
          {event.name}
        </h2>
        <p
          className={`text-sm font-medium mt-1 ${
            isFree ? "text-success" : "text-text-muted"
          }`}
        >
          {formatPrice(event.price)}
        </p>
      </div>

      <span className="text-text-dim group-hover:text-plum transition-colors shrink-0 text-lg">
        ›
      </span>
    </Link>
  );
}
