export function formatEventDate(dateStr: string): string {
  // Parse as local date to avoid UTC timezone shifting the day
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatPrice(price: number): string {
  return price === 0 ? "Free Entry" : `$${price}`;
}
