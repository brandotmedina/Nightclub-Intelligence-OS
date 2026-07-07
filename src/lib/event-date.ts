export function isPastEvent(eventDate: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  return eventDate < today;
}
