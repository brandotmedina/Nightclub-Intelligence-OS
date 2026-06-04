import Link from "next/link";
import Image from "next/image";
import { formatEventDate, formatPrice } from "@/lib/formatEvent";

type Event = {
  id: number;
  name: string;
  date: string;
  price: number;
  flyer_url: string | null;
};

export default function EventCard({ event }: { event: Event }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-center gap-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 transition-colors group"
    >
      {/* Flyer thumbnail */}
      <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center">
        {event.flyer_url ? (
          <Image
            src={event.flyer_url}
            alt={`${event.name} flyer`}
            width={80}
            height={80}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
            <span className="text-2xl">🎵</span>
          </div>
        )}
      </div>

      {/* Event info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-400 mb-0.5">
          {formatEventDate(event.date)}
        </p>
        <h2 className="text-white font-semibold text-base leading-snug truncate group-hover:text-purple-300 transition-colors">
          {event.name}
        </h2>
        <p
          className={`text-sm font-medium mt-1 ${
            event.price === 0 ? "text-green-400" : "text-zinc-300"
          }`}
        >
          {formatPrice(event.price)}
        </p>
      </div>

      {/* Chevron */}
      <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 text-lg">
        ›
      </span>
    </Link>
  );
}
